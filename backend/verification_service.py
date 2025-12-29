
import re
import cv2
import numpy as np
import pytesseract
import requests
import os
import fitz  # PyMuPDF
import difflib
from pyzbar.pyzbar import decode
import json
from pdfminer.high_level import extract_text, extract_pages
from datetime import datetime

# --- TESSERACT SETUP ---
def setup_tesseract():
    possible_tesseract_paths = [
        r"C:\Program Files\Tesseract-OCR\tesseract.exe",
        r"C:\Program Files (x86)\Tesseract-OCR\tesseract.exe",
        r"C:\Users\Abhi-Akhi\AppData\Local\Tesseract-OCR\tesseract.exe"
    ]
    found = False
    for path in possible_tesseract_paths:
        if os.path.exists(path):
            pytesseract.pytesseract.tesseract_cmd = path
            print(f"INFO: Tesseract found and set to: {path}")
            found = True
            break
    
    if not found:
        print("WARNING: Tesseract executable not found in common paths. Relying on system PATH.")

setup_tesseract()
# -----------------------

def preprocess_image(image_bytes):
    try:
        nparr = np.frombuffer(image_bytes, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        return img
    except Exception as e:
        print(f"Error processing image: {e}")
        return None

def extract_text_from_pdf_directly(doc):
    try:
        full_text = []
        for page in doc:
            full_text.append(page.get_text("text"))
        return "\n".join(full_text)
    except Exception as e:
        print(f"Direct PDF Text Error: {e}")
        return ""

def check_pdf_metadata(doc):
    try:
        meta = doc.metadata
        producer = meta.get('producer', '').lower()
        creator = meta.get('creator', '').lower()
        
        print(f"DEBUG METADATA Producer: '{producer}', Creator: '{creator}'")
        
        suspicious_tools = ['photoshop', 'gimp', 'canva', 'microsoft word', 'powerpoint', 'paint', 'ilovepdf']
        
        # Expanded valid list with 'openhtmltopdf', 'openpdf', 'skia'
        valid_indicators = [
            'cisco', 'netacad', 'pdflib', 'itext', 'reportlab', 'wkhtmltopdf', 
            'chromium', 'qt', 'acrobat distiller', 'openhtmltopdf', 'openpdf', 'skia', 'parexport'
        ]
        
        for tool in suspicious_tools:
            if tool in producer or tool in creator:
                return {
                    "is_suspicious": True,
                    "reason": f"Likely FAKE: Metadata indicates editing software '{tool}' was used.",
                    "producer": producer
                }
                
        for indicator in valid_indicators:
            if indicator in producer or indicator in creator:
                return {
                    "is_suspicious": False,
                    "reason": f"Metadata confirms automated generation via '{producer.strip()}'.",
                    "status_override": "Likely Genuine",
                    "producer": producer
                }
        
        return {
            "is_suspicious": False, 
            "reason": f"Metadata producer '{producer}' is neutral/unknown.",
            "producer": producer
        }
        
    except Exception as e:
        return {"is_suspicious": False, "reason": f"Metadata Error: {str(e)}", "producer": "Error"}

def convert_pdf_to_image(doc):
    try:
        if doc.page_count < 1:
            return None
        page = doc.load_page(0) 
        pix = page.get_pixmap(dpi=300, alpha=False) 
        img_data = pix.tobytes("png")
        return preprocess_image(img_data)
    except Exception as e:
        print(f"PDF Conversion Error: {e}")
        return None

def extract_qr_data(img):
    attempts = [img]
    try:
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        attempts.append(gray)
        thresh = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY | cv2.THRESH_OTSU)[1]
        attempts.append(thresh)
    except: pass
    for attempt_img in attempts:
        decoded_objects = decode(attempt_img)
        if decoded_objects:
            results = []
            for obj in decoded_objects:
                try:
                    data = obj.data.decode("utf-8")
                    results.append(data)
                except: pass
            return results
    return []

def extract_text_ocr(img):
    texts = []
    custom_config = r'--oem 3 --psm 6'
    try:
        text_orig = pytesseract.image_to_string(img, config=custom_config)
        texts.append(text_orig)
    except Exception as e:
        print(f"OCR CRITICAL ERROR: {e}") # Explicitly print error
        pass
    return "\n".join(texts)

def parse_vc_json(json_str):
    try:
        data = json.loads(json_str)
        if "credentialSubject" in data:
            subject = data.get("credentialSubject", {})
            return {
                "is_vc": True,
                "platform": "Infosys / Sunbird (Verifiable Credential)",
                "details": {
                    "name": subject.get("issuedTo", "Unknown"),
                    "course": subject.get("course", "Unknown"),
                    "issued_on": subject.get("completedOn", "Unknown"),
                    "issuer": data.get("issuer", "Unknown")
                }
            }
    except: pass
    return None

def extract_common_details(full_text):
    """
    Helper function to extract Name, Course and Date from certificate text
    using common regex patterns.
    """
    details = {}
    
    # --- Robust Name Extraction ---
    # Strategy A: Textual Sentence Patterns
    name_patterns_text = [
        r"certify that\s*[:\n]*\s*(.*?)\s*(?:has successfully|successfully completed)", 
        r"awarded to\s*[:\n]*\s*(.*?)\s*(?:for|successfully)",   
        r"student\s*name\s*[:\-]?\s*(.*?)(?:\n|$)"
    ]
    
    # Strategy B: Layout Based (Udemy Specific)
    # The name often appears strictly between "Instructors ...." and "Date ..."
    # We find the line index of "Instructors" and "Date" and take the line in between.
    lines = [line.strip() for line in full_text.split('\n') if line.strip()]
    
    # 1. Try Layout based first (High precision for layout-style certs)
    instructor_idx = -1
    date_idx = -1
    for i, line in enumerate(lines):
        if "Instructor" in line or "Instructors" in line:
            instructor_idx = i
        if line.startswith("Date ") or re.match(r"^Date\s+[A-Za-z]", line):
            date_idx = i
            
    if instructor_idx != -1 and date_idx != -1 and date_idx > instructor_idx:
        # The name is likely in between
        # Usually it's the very next line, or one line gap.
        # Let's take the first non-empty line after Instructors
        if instructor_idx + 1 < len(lines):
             candidate = lines[instructor_idx + 1]
             # Basic sanity: not "Date...", not "Length..."
             if not candidate.startswith("Date") and len(candidate) > 2:
                  details['name'] = candidate.title()
    
    # 2. Try Text Patterns if Layout failed
    if 'name' not in details:
        for pat in name_patterns_text:
            match = re.search(pat, full_text, re.IGNORECASE | re.DOTALL)
            if match:
                candidate = match.group(1).strip().split('\n')[0]
                if len(candidate) > 2 and len(candidate) < 60:
                    details['name'] = candidate.title()
                    break

    # --- Robust Course Extraction ---
    # Strategy A: Textual
    course_patterns_text = [
        r"completed the\s*[:\n]*\s*(.*?)\s*online course",
        r"completing\s*[:\n]*\s*(.*?)\s*(?:offered|on|at|date)"
    ]
    
    # Strategy B: Layout (Udemy)
    # Course Name appears between "CERTIFICATE OF COMPLETION" and "Instructors"
    # Often split across lines.
    cert_title_idx = -1
    for i, line in enumerate(lines):
        if "CERTIFICATE OF COMPLETION" in line:
            cert_title_idx = i
            break
            
    if 'course' not in details and cert_title_idx != -1 and instructor_idx != -1 and instructor_idx > cert_title_idx:
        # Join lines between Title and Instructor
        raw_course = []
        for j in range(cert_title_idx + 1, instructor_idx):
            line = lines[j]
            # Filter out common garbage like "[NEW]" or small glitches like "e e" if they are on their own line? 
            # Actually, "e e" is tricky. Let's just join everything for now.
            raw_course.append(line)
        
        course_str = " ".join(raw_course)
        # Cleanup: Remove "[NEW]" if present
        course_str = course_str.replace("[NEW]", "").strip()
        
        if len(course_str) > 5:
             details['course'] = course_str
    
    # 2. Try Text Patterns if Layout failed
    if 'course' not in details:
        for pat in course_patterns_text:
            match = re.search(pat, full_text, re.IGNORECASE | re.DOTALL)
            if match:
                candidate = match.group(1).strip().replace('\n', ' ')
                if len(candidate) > 4:
                    details['course'] = candidate
                    break

    # --- Date Extraction ---
    date_patterns = [
        r"Date\s+([A-Za-z]+\.?\s+\d{1,2},?\s+\d{4})", # "Date Aug. 26, 2021"
        r"on\s+([A-Za-z]+\s+\d{1,2},?\s+\d{4})", 
        r"\b(\d{1,2}\s+[A-Za-z]{3,}\s+\d{4})\b",
        r"\b(\d{4}-\d{2}-\d{2})\b"
    ]
    
    for pat in date_patterns:
        match = re.search(pat, full_text, re.IGNORECASE)
        if match:
            details['issued_on'] = match.group(1)
            break
            
    return details


def verify_certificate(file_data, filename=""):
    img = None
    doc = None
    is_pdf = filename.lower().endswith(".pdf") or (len(file_data) > 4 and file_data.startswith(b"%PDF"))
    
    full_text = ""
    metadata_result = {}
    
    if is_pdf:
        try:
            doc = fitz.open(stream=file_data, filetype="pdf")
            full_text = extract_text_from_pdf_directly(doc)
            metadata_result = check_pdf_metadata(doc)
            img = convert_pdf_to_image(doc)
        except Exception as e:
            print(f"PDF Error: {e}")
            return {"status": "Failed", "message": f"Corrupt PDF: {str(e)}", "platform": "Error"}
    else:
        img = preprocess_image(file_data)

    if img is None:
        return {"status": "Failed", "message": "Invalid file format. Could not process image.", "platform": "Error"}
    
    # Force OCR if text is too short OR if it's an image file
    if len(full_text.strip()) < 10:
        print(f"Triggering OCR for {filename}...")
        full_text = extract_text_ocr(img)

    # --- DEBUG LOGGING ---
    # --- DEBUG LOGGING ---
    try:
        # APPEND TO FILE FOR RELIABLE READING
        with open("ocr_log.txt", "a", encoding="utf-8") as f:
            f.write(f"\n\n{'='*20}\n--- LOG START: {filename} ({datetime.now()}) ---\n")
            f.write(f"FULL TEXT:\n{full_text}\n")
            f.write(f"CLEANED TEXT PREVIEW: {full_text.replace(' ', '').replace(chr(10), '').lower()[:200]}...\n")
            f.write("--- LOG END ---\n")
    except Exception as e:
        print(f"Logging Failed: {e}")
    # ---------------------

    # 1. QR Code Check
    qr_contents = extract_qr_data(img)
    if qr_contents:
        content = qr_contents[0]
        vc_data = parse_vc_json(content)
        if vc_data:
            qr_name = vc_data['details']['name'].strip()
            normalized_ocr = " ".join(full_text.split()).lower()
            normalized_qr_name = " ".join(qr_name.split()).lower()
            # Fuzzy Name Match
            # Use finding longest match to be robust against "Name Surname" vs "Surname Name" or partials
            match = difflib.SequenceMatcher(None, normalized_qr_name, normalized_ocr).find_longest_match(0, len(normalized_qr_name), 0, len(normalized_ocr))
            match_len = match.size
            if match_len > 3: # Avoid divide by zero for short names
                 match_ratio = match_len / len(normalized_qr_name)
            else:
                 match_ratio = 0

            
            # Also check direct inclusion as fallback
            if normalized_qr_name in normalized_ocr or match_ratio > 0.8:
                return {**vc_data, "status": "Genuine", "message": f"Verified: Name '{qr_name}' matches."}
            else:
                return {
                    "platform": "Infosys / Sunbird",
                    "status": "TAMPERED",
                    "message": f"Name Mismatch! QR: '{qr_name}' vs Certificate Text.",
                    "details": vc_data['details'] 
                }
        if "http" in content or "www" in content:
            return {"platform": "Detected via QR", "verification_url": content, "method": "QR Code", "status": "Found"}

    # 2. Keyphrase & Pattern Matching
    cleaned_text = full_text.replace(" ", "").replace("\n", "").lower()
    
    # Helper to populate details
    extracted_details = extract_common_details(full_text)

    # Coursera
    coursera_match = re.search(r"coursera\.org/verify/([A-Z0-9]+)", cleaned_text, re.IGNORECASE)
    if coursera_match:
        code = coursera_match.group(1)
        return {
            "platform": "Coursera", 
            "verification_url": f"https://www.coursera.org/verify/{code}", 
            "id": code, 
            "method": "Pattern Match", 
            "status": "Found",
            "message": "Valid Coursera Certificate ID found.",
            "details": extracted_details
        }

    # Udemy
    # Strategy 1: Full URL (High Confidence)
    udemy_match = re.search(r"udemy\.com/certificate/([A-Z0-9-]+)", cleaned_text, re.IGNORECASE)
    if udemy_match:
        code = udemy_match.group(1)
        return {
            "platform": "Udemy", 
            "verification_url": f"https://www.udemy.com/certificate/{code}", 
            "id": code, 
            "method": "Pattern Match", 
            "status": "Found",
            "message": "Valid Udemy Certificate URL found.",
            "details": extracted_details
        }

    # Strategy 2: Relaxed ID Search (Medium Confidence)
    relaxed_udemy = re.search(r"uc[-_]?([a-f0-9]{8}[-_]?[a-f0-9]{4}[-_]?[a-f0-9]{4}[-_]?[a-f0-9]{4}[-_]?[a-f0-9]{12})", cleaned_text, re.IGNORECASE)
    if relaxed_udemy:
         code = "UC-" + relaxed_udemy.group(1).replace('_', '-') 
         return {
             "platform": "Udemy", 
             "verification_url": f"https://www.udemy.com/certificate/{code}", 
             "id": code, 
             "method": "ID Extraction", 
             "status": "Found",
             "message": "Valid Udemy Certificate ID extracted.",
             "details": extracted_details
         }

    # Cisco / NetAcad
    lower_text = full_text.lower()
    if "networking academy" in lower_text or "cisco" in lower_text or "netacad" in lower_text:
        # Re-use common details but allow override if we want specific custom logic later
        # For now, common details logic covers the Cisco patterns too!
        
        # Metadata Analysis for Cisco
        status = "Unverified (No ID)"
        msg = "Instructor-Led Certificate (No Public ID)."
        
        if is_pdf and metadata_result:
            if metadata_result.get("is_suspicious"):
                status = "SUSPICIOUS"
                msg = f"{metadata_result['reason']}"
            elif metadata_result.get("status_override"):
                 status = metadata_result["status_override"]
                 msg = f"{metadata_result['reason']}"
            else:
                 msg += f" (PDF Creator: '{metadata_result['producer']}')."

        return {
            "platform": "Cisco Networking Academy",
            "verification_url": None,
            "status": status,
            "message": msg,
            "details": extracted_details 
        }

    # ServiceNow
    if "servicenow" in cleaned_text:
        sn_details = {}
        # Date
        sn_date_match = re.search(r"Issued:\s*([A-Za-z]+\s+\d{1,2},?\s+\d{4})", full_text, re.IGNORECASE)
        if sn_date_match:
            sn_details['issued_on'] = sn_date_match.group(1)
        
        # Course
        # "Successfully completed certification requirements for" -> Next line is course
        lines = [l.strip() for l in full_text.split('\n') if l.strip()]
        for i, line in enumerate(lines):
            if "Successfully completed certification requirements for" in line:
                if i + 1 < len(lines):
                    sn_details['course'] = lines[i+1]
                break
        
        # Name
        # Usually at the top. Lines 0 and 1.
        # Let's simple take line 0 and 1 joined if they look like names (uppercase?)
        if len(lines) >= 2:
             # Heuristic: ServiceNow names seems to be at the very top
             # If "Successfully..." is at line 2 or 3, then lines 0,1 are name.
             name_parts = []
             for j in range(i): # i is index of "Successfully..." message
                 if len(lines[j]) > 2:
                     name_parts.append(lines[j])
             if name_parts:
                 sn_details['name'] = " ".join(name_parts).title()

        # Metadata Security Check (STRICT MODE)
        if is_pdf and metadata_result:
            if metadata_result.get("is_suspicious"):
                # Case 1: Known Bad Tool (Photoshop, Word, Canva) -> RED
                status = "SUSPICIOUS"
                msg = f"Potential Forgery: {metadata_result['reason']}"
                
            elif metadata_result.get("status_override") == "Likely Genuine":
                # Case 2: Known Good Tool (iText, Skia, Cisco) -> GREEN
                status = "Verified"
                msg = f"Valid ServiceNow Certificate. (Verified ID via Metadata: {metadata_result['producer']})"
                
            else:
                # Case 3: Unknown/Neutral Tool -> AMBER
                # We do NOT trust unknown PDF generators for ServiceNow since there is no public URL.
                status = "Unverified"
                producer = metadata_result.get('producer', 'Unknown')
                msg = f"Certificate has valid layout but unknown PDF creator '{producer}'. Cannot guarantee authenticity."
        else:
             # Image files or no metadata -> AMBER
             status = "Unverified"
             msg = "Valid layout, but file format (Image) lacks metadata for cryptographic verification."

        return {
            "platform": "ServiceNow", 
            "verification_url": None, 
            "status": status, 
            "message": msg,
            "details": sn_details
        }

    # Infosys / Springboard Fallback (Layout Based)
    if any(k in cleaned_text for k in ["infosys", "navigateyournext", "springboard", "thirumala", "arohi"]):
        inf_details = {}
        lines = [l.strip() for l in full_text.split('\n') if l.strip()]
        
        # Name Extraction
        # "The certificate is awarded to" -> Next line
        for i, line in enumerate(lines):
            if "awarded to" in line.lower():
                if i + 1 < len(lines):
                    candidate = lines[i+1]
                    if len(candidate) > 2 and "completing" not in candidate.lower():
                        inf_details['name'] = candidate.title()
                break
        
        # Course Extraction
        # "completing the course" -> Next line
        for i, line in enumerate(lines):
            if "completing the course" in line.lower():
                 if i + 1 < len(lines):
                     inf_details['course'] = lines[i+1]
                 break
                 
        # Date Extraction
        # "Issued on: Wednesday, January 22, 2025"
        date_match = re.search(r"Issued on:\s*(.*)", full_text, re.IGNORECASE)
        if date_match:
            inf_details['issued_on'] = date_match.group(1).strip()
        else:
            # Try finding any date format
            d_match = re.search(r"([A-Za-z]+\s+\d{1,2},?\s+\d{4})", full_text)
            if d_match:
                inf_details['issued_on'] = d_match.group(1)

        return {
            "platform": "Infosys / Springboard", 
            "verification_url": None, 
            "status": "Unverified", 
            "message": "Infosys certificate detected (QR unreadable). Validating layout only.",
            "details": inf_details
        }

    return {
        "platform": "Unknown", 
        "verification_url": None, 
        "message": f"Could not extract data. Text len: {len(full_text)}. Preview: {full_text[:50].replace(chr(10), ' ')}", 
        "status": "Failed"
    }
