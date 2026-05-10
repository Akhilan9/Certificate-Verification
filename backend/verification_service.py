import re, cv2, numpy as np, pytesseract, os, fitz, difflib, json, io, requests, base64
from pyzbar.pyzbar import decode
from datetime import datetime
from PIL import Image
from bs4 import BeautifulSoup

def setup_tesseract():
    paths = [
        r"C:\Program Files\Tesseract-OCR\tesseract.exe",
        r"C:\Program Files (x86)\Tesseract-OCR\tesseract.exe",
        r"C:\Users\Abhi-Akhi\AppData\Local\Tesseract-OCR\tesseract.exe"
    ]
    for p in paths:
        if os.path.exists(p):
            pytesseract.pytesseract.tesseract_cmd = p
            print(f"INFO: Tesseract found: {p}")
            return
    print("WARNING: Tesseract not found in common paths.")

setup_tesseract()

def preprocess_image(image_bytes):
    try:
        nparr = np.frombuffer(image_bytes, np.uint8)
        return cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    except Exception as e:
        print(f"Image error: {e}")
        return None

def extract_text_from_pdf(doc):
    try:
        return "\n".join(page.get_text("text") for page in doc)
    except Exception as e:
        print(f"PDF text error: {e}")
        return ""

def convert_pdf_to_image(doc):
    try:
        if doc.page_count < 1: return None
        pix = doc.load_page(0).get_pixmap(dpi=300, alpha=False)
        return preprocess_image(pix.tobytes("png"))
    except Exception as e:
        print(f"PDF convert error: {e}")
        return None

def extract_qr_data(img):
    attempts = [img]
    try:
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        attempts.append(gray)
        attempts.append(cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY | cv2.THRESH_OTSU)[1])
    except: pass
    for a in attempts:
        decoded = decode(a)
        if decoded:
            results = []
            for obj in decoded:
                try: results.append(obj.data.decode("utf-8"))
                except: pass
            if results: return results
    return []

def extract_text_ocr(img):
    try:
        return pytesseract.image_to_string(img, config=r'--oem 3 --psm 6')
    except Exception as e:
        print(f"OCR error: {e}")
        return ""

def parse_vc_json(json_str):
    try:
        data = json.loads(json_str)
        if "credentialSubject" in data:
            s = data["credentialSubject"]
            return {
                "is_vc": True, "platform": "Verifiable Credential",
                "details": {"name": s.get("issuedTo","Unknown"), "course": s.get("course","Unknown"),
                            "issued_on": s.get("completedOn","Unknown"), "issuer": str(data.get("issuer","Unknown"))}
            }
    except: pass
    return None

# --- PDF METADATA ANALYSIS ---
def check_pdf_metadata(doc):
    try:
        meta = doc.metadata
        producer = meta.get('producer','').lower()
        creator = meta.get('creator','').lower()
        suspicious_tools = ['photoshop','gimp','canva','microsoft word','powerpoint','paint','ilovepdf','inkscape','affinity']
        valid_indicators = ['cisco','netacad','pdflib','itext','reportlab','wkhtmltopdf','chromium','qt',
                           'acrobat distiller','openhtmltopdf','openpdf','skia','parexport','prince',
                           'weasyprint','fpdf','tcpdf','jasperreports','crystal reports']
        for tool in suspicious_tools:
            if tool in producer or tool in creator:
                return {"is_suspicious": True, "reason": f"Editing software '{tool}' detected in metadata.", "producer": producer, "score_mod": -35}
        for ind in valid_indicators:
            if ind in producer or ind in creator:
                return {"is_suspicious": False, "reason": f"Automated generation via '{producer.strip()}'.", "status_override": "Likely Genuine", "producer": producer, "score_mod": 15}
        return {"is_suspicious": False, "reason": f"Neutral metadata producer '{producer}'.", "producer": producer, "score_mod": 0}
    except Exception as e:
        return {"is_suspicious": False, "reason": f"Metadata error: {e}", "producer": "Error", "score_mod": 0}

# --- IMAGE FORENSICS (ELA) ---
def perform_ela_analysis(img):
    try:
        pil_img = Image.fromarray(cv2.cvtColor(img, cv2.COLOR_BGR2RGB))
        buf = io.BytesIO()
        pil_img.save(buf, 'JPEG', quality=90)
        buf.seek(0)
        recompressed = np.array(Image.open(buf))
        original_rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
        min_h = min(original_rgb.shape[0], recompressed.shape[0])
        min_w = min(original_rgb.shape[1], recompressed.shape[1])
        diff = cv2.absdiff(original_rgb[:min_h,:min_w], recompressed[:min_h,:min_w])
        mean_diff = np.mean(diff)
        max_diff = np.max(diff)
        std_diff = np.std(diff)
        if std_diff > 30 and max_diff > 100:
            return {"passed": False, "reason": "High variance in ELA — possible regional editing detected.", "score_mod": -20, "mean": round(float(mean_diff),2), "std": round(float(std_diff),2)}
        return {"passed": True, "reason": "ELA analysis shows uniform compression — no obvious tampering.", "score_mod": 5, "mean": round(float(mean_diff),2), "std": round(float(std_diff),2)}
    except Exception as e:
        return {"passed": True, "reason": f"ELA skipped: {e}", "score_mod": 0, "mean": 0, "std": 0}

# --- TEXT COHERENCE ---
# Strong certificate-specific phrases (not commonly in resumes)
CERT_STRONG_KEYWORDS = ['certificate of completion','certificate of achievement','certificate of participation',
                        'this is to certify','hereby certify','has successfully completed','is awarded to',
                        'awarded to','completion of','course completion','credential id','verify at',
                        'verification url','certificate id','digital credential']
# Weak/general keywords that can appear in both certs and other docs
CERT_WEAK_KEYWORDS = ['certificate','completion','awarded','certify','successfully','completed','course',
                      'credential','instructor','issued','verify','certified']
# Anti-keywords: if these appear, the document is likely NOT a certificate
NON_CERT_KEYWORDS = ['experience','skills','education','objective','responsibilities','employment',
                     'resume','curriculum vitae','cover letter','references','hobbies','strengths',
                     'salary','job description','work history','career','invoice','receipt',
                     'bill to','subtotal','tax','payment','shipping','order','purchase',
                     'dear sir','dear madam','sincerely','regards','to whom it may concern',
                     'gpa','cgpa','semester','internship report','project report','table of contents',
                     'bibliography','abstract','thesis','dissertation']

def check_text_coherence(text):
    lower = text.lower()
    strong_found = [kw for kw in CERT_STRONG_KEYWORDS if kw in lower]
    weak_found = [kw for kw in CERT_WEAK_KEYWORDS if kw in lower]
    anti_found = [kw for kw in NON_CERT_KEYWORDS if kw in lower]

    # If many anti-keywords found, this is NOT a certificate
    if len(anti_found) >= 3:
        return {"is_certificate": False, "keywords_found": len(weak_found), "anti_keywords": len(anti_found),
                "score_mod": -15, "reason": f"Non-certificate document detected ({len(anti_found)} anti-keywords: {', '.join(anti_found[:4])})."}
    # If anti-keywords outnumber certificate keywords, reject
    if len(anti_found) > len(strong_found) + len(weak_found) // 2:
        return {"is_certificate": False, "keywords_found": len(weak_found), "anti_keywords": len(anti_found),
                "score_mod": -10, "reason": f"More non-certificate indicators ({len(anti_found)}) than certificate indicators."}

    # Strong phrases are definitive
    if len(strong_found) >= 1:
        score = min(15 + len(strong_found) * 5 + len(weak_found) * 2, 25)
        return {"is_certificate": True, "keywords_found": len(strong_found) + len(weak_found), "anti_keywords": len(anti_found),
                "score_mod": score, "reason": f"Strong certificate language detected ({', '.join(strong_found[:3])})."}
    # Only weak keywords
    if len(weak_found) >= 4 and len(anti_found) == 0:
        score = min(len(weak_found) * 3, 15)
        return {"is_certificate": True, "keywords_found": len(weak_found), "anti_keywords": 0,
                "score_mod": score, "reason": f"Moderate certificate language ({len(weak_found)} keywords)."}
    if len(weak_found) >= 2 and len(anti_found) == 0:
        return {"is_certificate": True, "keywords_found": len(weak_found), "anti_keywords": 0,
                "score_mod": 5, "reason": f"Weak certificate language ({len(weak_found)} keywords, no anti-indicators)."}

    return {"is_certificate": False, "keywords_found": len(weak_found), "anti_keywords": len(anti_found),
            "score_mod": -10, "reason": "Insufficient certificate language — likely not a certificate."}

# --- LAYOUT ANALYSIS ---
def analyze_layout(img):
    try:
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        h, w = gray.shape
        features = {"has_border": False, "has_centered_text": False, "aspect_ok": False, "score_mod": 0}
        ratio = w / h if h > 0 else 0
        if 1.2 < ratio < 1.8 or 0.6 < ratio < 0.85:
            features["aspect_ok"] = True
            features["score_mod"] += 5
        edges = cv2.Canny(gray, 50, 150)
        border_region = np.concatenate([edges[:int(h*0.05),:].flatten(), edges[int(h*0.95):,:].flatten(),
                                        edges[:,:int(w*0.05)].flatten(), edges[:,int(w*0.95):].flatten()])
        if np.mean(border_region) > 15:
            features["has_border"] = True
            features["score_mod"] += 5
        center_strip = gray[:, int(w*0.25):int(w*0.75)]
        side_strip_l = gray[:, :int(w*0.15)]
        side_strip_r = gray[:, int(w*0.85):]
        center_var = np.std(center_strip.astype(float))
        side_var = (np.std(side_strip_l.astype(float)) + np.std(side_strip_r.astype(float))) / 2
        if center_var > side_var:
            features["has_centered_text"] = True
            features["score_mod"] += 5
        return features
    except:
        return {"has_border": False, "has_centered_text": False, "aspect_ok": False, "score_mod": 0}

# --- FACE/PHOTO EXTRACTION ---
def extract_face(img):
    try:
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        # Using the standard Haar Cascade for face detection
        face_cascade_path = cv2.data.haarcascades + 'haarcascade_frontalface_default.xml'
        face_cascade = cv2.CascadeClassifier(face_cascade_path)
        
        # Detect faces
        faces = face_cascade.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=5, minSize=(60, 60))
        
        if len(faces) > 0:
            # Get the largest face if multiple
            faces = sorted(faces, key=lambda x: x[2]*x[3], reverse=True)
            x, y, w, h = faces[0]
            
            # Add some padding around the face
            padding = int(w * 0.2)
            y1 = max(0, y - padding)
            y2 = min(img.shape[0], y + h + padding)
            x1 = max(0, x - padding)
            x2 = min(img.shape[1], x + w + padding)
            
            face_img = img[y1:y2, x1:x2]
            
            # Convert to base64
            _, buffer = cv2.imencode('.jpg', face_img)
            face_base64 = base64.b64encode(buffer).decode('utf-8')
            return f"data:image/jpeg;base64,{face_base64}"
    except Exception as e:
        print(f"Face extraction error: {e}")
    return None

# --- DETAIL EXTRACTION ---
def extract_common_details(full_text):
    details = {}
    lines = [l.strip() for l in full_text.split('\n') if l.strip()]
    # Name
    name_pats = [r"certify that\s*[:\n]*\s*(.*?)\s*(?:has successfully|successfully completed)",
                 r"awarded to\s*[:\n]*\s*(.*?)\s*(?:for|successfully)", r"student\s*name\s*[:\-]?\s*(.*?)(?:\n|$)"]
    instructor_idx, date_idx = -1, -1
    for i, line in enumerate(lines):
        if "Instructor" in line: instructor_idx = i
        if line.startswith("Date ") or re.match(r"^Date\s+[A-Za-z]", line): date_idx = i
    if instructor_idx != -1 and date_idx != -1 and date_idx > instructor_idx and instructor_idx + 1 < len(lines):
        c = lines[instructor_idx + 1]
        if not c.startswith("Date") and len(c) > 2: details['name'] = c.title()
    if 'name' not in details:
        for pat in name_pats:
            m = re.search(pat, full_text, re.IGNORECASE | re.DOTALL)
            if m:
                c = m.group(1).strip().split('\n')[0]
                if 2 < len(c) < 60: details['name'] = c.title(); break
    # Course
    course_pats = [r"completed the\s*[:\n]*\s*(.*?)\s*online course", r"completing\s*[:\n]*\s*(.*?)\s*(?:offered|on|at|date)"]
    cert_idx = -1
    for i, line in enumerate(lines):
        if "CERTIFICATE OF COMPLETION" in line: cert_idx = i; break
    if cert_idx != -1 and instructor_idx != -1 and instructor_idx > cert_idx:
        raw = " ".join(lines[cert_idx+1:instructor_idx]).replace("[NEW]","").strip()
        if len(raw) > 5: details['course'] = raw
    if 'course' not in details:
        for pat in course_pats:
            m = re.search(pat, full_text, re.IGNORECASE | re.DOTALL)
            if m:
                c = m.group(1).strip().replace('\n',' ')
                if len(c) > 4: details['course'] = c; break
    # Date
    date_pats = [r"Date\s+([A-Za-z]+\.?\s+\d{1,2},?\s+\d{4})", r"on\s+([A-Za-z]+\s+\d{1,2},?\s+\d{4})",
                 r"\b(\d{1,2}\s+[A-Za-z]{3,}\s+\d{4})\b", r"\b(\d{4}-\d{2}-\d{2})\b"]
    for pat in date_pats:
        m = re.search(pat, full_text, re.IGNORECASE)
        if m: details['issued_on'] = m.group(1); break
    return details

# --- PLATFORM DETECTORS ---
PLATFORMS = {
    "coursera": {"keys": ["coursera"], "url_pat": r"coursera\.org/verify/([A-Z0-9]+)", "name": "Coursera",
                 "url_tpl": "https://www.coursera.org/verify/{}", "score": 30},
    "udemy": {"keys": ["udemy"], "url_pat": r"udemy\.com/certificate/([A-Z0-9-]+)", "name": "Udemy",
              "url_tpl": "https://www.udemy.com/certificate/{}", "score": 30},
    "udemy_id": {"keys": ["udemy"], "url_pat": r"uc[-_]?([a-z0-9]{8}[-_]?[a-z0-9]{4}[-_]?[a-z0-9]{4}[-_]?[a-z0-9]{4}[-_]?[a-z0-9]{12})",
                 "name": "Udemy", "url_tpl": "https://www.udemy.com/certificate/UC-{}", "score": 25},
    "google": {"keys": ["google","digital garage","google cloud","analytics academy","grow.google"],
               "name": "Google", "score": 20},
    "linkedin": {"keys": ["linkedin learning","linkedin.com/learning"], "name": "LinkedIn Learning", "score": 20},
    "aws": {"keys": ["amazon web services","aws training","aws certified","credly.com"],
            "name": "AWS / Amazon", "score": 20},
    "microsoft": {"keys": ["microsoft","azure","microsoft learn"], "name": "Microsoft", "score": 20},
    "hackerrank": {"keys": ["hackerrank"], "name": "HackerRank", "score": 20},
    "freecodecamp": {"keys": ["freecodecamp","free code camp"], "name": "freeCodeCamp", "score": 20},
    "edx": {"keys": ["edx.org","edx","harvardx","mitx"], "name": "edX", "score": 20},
    "nptel": {"keys": ["nptel","swayam","iit ","indian institute of technology"], "name": "NPTEL / SWAYAM", "score": 20},
    "ibm": {"keys": ["ibm","skillsbuild","ibm skills"], "name": "IBM", "score": 20},
    "simplilearn": {"keys": ["simplilearn"], "name": "Simplilearn", "score": 20},
    "greatlearning": {"keys": ["great learning","greatlearning"], "name": "Great Learning", "score": 20},
    "cisco": {"keys": ["networking academy","cisco","netacad"], "name": "Cisco Networking Academy", "score": 20},
    "servicenow": {"keys": ["servicenow"], "name": "ServiceNow", "score": 20},
    "infosys": {"keys": ["infosys","navigateyournext","springboard"], "name": "Infosys / Springboard", "score": 20},
    "oracle": {"keys": ["oracle university","oracle certified"], "name": "Oracle", "score": 20},
    "salesforce": {"keys": ["salesforce","trailhead"], "name": "Salesforce", "score": 20},
    "databricks": {"keys": ["databricks"], "name": "Databricks", "score": 20},
    "meta": {"keys": ["meta blueprint","facebook blueprint"], "name": "Meta", "score": 20},
}

def detect_platform(cleaned, full_text):
    lower_text = full_text.lower()
    cleaned_lower = cleaned.lower()
    
    best_result = None
    
    for pid, cfg in PLATFORMS.items():
        if any(k in lower_text or k in cleaned_lower for k in cfg["keys"]):
            result = {"platform": cfg["name"], "score_mod": cfg["score"]}
            if "url_pat" in cfg:
                # Also support ude.my for udemy
                pat = cfg["url_pat"]
                m = re.search(pat, cleaned, re.IGNORECASE)
                if not m and pid == "udemy":
                    # Non-greedy match that requires the 'uc-' prefix structure common to all udemy IDs
                    m = re.search(r"ude\.my/(uc[-_]?[a-z0-9-]{30,40})", cleaned, re.IGNORECASE)
                    
                if m:
                    code = m.group(1)
                    if pid == "udemy_id": code = code.replace('_','-')
                    result["verification_url"] = cfg["url_tpl"].format(code)
                    result["id"] = code
                    result["score_mod"] = cfg["score"] + 10
                    return result  # Found a perfect match with URL, return it
            
            # If no URL found yet, save this as a backup result but keep searching
            if not best_result:
                best_result = result
                
    return best_result

# --- CONFIDENCE SCORING ---
def compute_confidence(checks):
    score = 40  # base
    breakdown = []
    for check_name, check_result in checks.items():
        mod = check_result.get("score_mod", 0)
        score += mod
        reason = check_result.get("reason", "")
        breakdown.append({"check": check_name, "impact": mod, "detail": reason})
    score = max(0, min(100, score))
    return score, breakdown

# --- MAIN VERIFICATION ---
def verify_certificate(file_data, filename=""):
    img = None
    doc = None
    is_pdf = filename.lower().endswith(".pdf") or (len(file_data) > 4 and file_data.startswith(b"%PDF"))
    full_text = ""
    metadata_result = {}
    checks = {}

    if is_pdf:
        try:
            doc = fitz.open(stream=file_data, filetype="pdf")
            full_text = extract_text_from_pdf(doc)
            metadata_result = check_pdf_metadata(doc)
            checks["pdf_metadata"] = metadata_result
            img = convert_pdf_to_image(doc)
        except Exception as e:
            return {"status": "Failed", "message": f"Corrupt PDF: {e}", "platform": "Error", "confidence_score": 0, "analysis_breakdown": []}
    else:
        img = preprocess_image(file_data)

    if img is None:
        return {"status": "Failed", "message": "Invalid file format.", "platform": "Error", "confidence_score": 0, "analysis_breakdown": []}

    if len(full_text.strip()) < 10:
        full_text = extract_text_ocr(img)

    # Text coherence
    coherence = check_text_coherence(full_text)
    checks["text_coherence"] = coherence

    # Layout analysis
    layout = analyze_layout(img)
    checks["layout_analysis"] = {"score_mod": layout["score_mod"], "reason": f"Border:{layout['has_border']}, Centered:{layout['has_centered_text']}, Aspect:{layout['aspect_ok']}"}

    # ELA forensics
    ela = perform_ela_analysis(img)
    checks["image_forensics"] = ela

    # Face Extraction
    extracted_face = extract_face(img)
    if extracted_face:
        checks["face_detected"] = {"score_mod": 5, "reason": "Candidate photo detected on certificate."}

    # QR Code
    qr_contents = extract_qr_data(img)
    if qr_contents:
        content = qr_contents[0]
        vc_data = parse_vc_json(content)
        if vc_data:
            checks["qr_verification"] = {"score_mod": 20, "reason": "Valid Verifiable Credential in QR."}
            qr_name = vc_data['details']['name'].strip()
            norm_ocr = " ".join(full_text.split()).lower()
            norm_qr = " ".join(qr_name.split()).lower()
            match = difflib.SequenceMatcher(None, norm_qr, norm_ocr).find_longest_match(0, len(norm_qr), 0, len(norm_ocr))
            ratio = match.size / len(norm_qr) if len(norm_qr) > 3 else 0
            if norm_qr in norm_ocr or ratio > 0.8:
                checks["name_match"] = {"score_mod": 15, "reason": f"QR name '{qr_name}' matches certificate text."}
                score, breakdown = compute_confidence(checks)
                return {**vc_data, "status": "Genuine", "message": f"Verified: Name '{qr_name}' matches.", "confidence_score": score, "analysis_breakdown": breakdown, "method": "QR + OCR Cross-Reference", "extracted_face": extracted_face}
            else:
                checks["name_match"] = {"score_mod": -30, "reason": f"QR name '{qr_name}' does NOT match certificate text."}
                score, breakdown = compute_confidence(checks)
                return {"platform": vc_data.get("platform","Unknown"), "status": "TAMPERED", "message": f"Name Mismatch! QR: '{qr_name}' vs Certificate.", "details": vc_data['details'], "confidence_score": score, "analysis_breakdown": breakdown, "method": "QR Mismatch Detection", "extracted_face": extracted_face}
        if "http" in content or "www" in content:
            checks["qr_url"] = {"score_mod": 20, "reason": f"QR contains verification URL."}
            score, breakdown = compute_confidence(checks)
            return {"platform": "Detected via QR", "verification_url": content, "method": "QR Code", "status": "Found", "confidence_score": score, "analysis_breakdown": breakdown, "details": extract_common_details(full_text), "extracted_face": extracted_face}

    # Platform detection
    cleaned = full_text.replace(" ","").replace("\n","").lower()
    platform = detect_platform(cleaned, full_text)
    details = extract_common_details(full_text)

    if platform:
        checks["platform_detection"] = {"score_mod": platform["score_mod"], "reason": f"Platform identified: {platform['platform']}"}
        # Special handling for platforms with URLs
        if platform.get("verification_url"):
            url = platform["verification_url"]
            checks["verification_url"] = {"score_mod": 15, "reason": "Verification URL extracted."}
            
            # Automated Live Web Verification & Deep Scraping
            try:
                # Use a standard User-Agent to avoid basic blocking
                headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'}
                response = requests.get(url, headers=headers, timeout=5)
                if response.status_code == 200:
                    checks["live_url_check"] = {"score_mod": 10, "reason": "URL is live and reachable (200 OK)."}
                    
                    # Deep Web Scraping
                    soup = BeautifulSoup(response.text, 'html.parser')
                    page_text = soup.get_text().lower()
                    
                    match_found = False
                    if details.get("name") and details["name"].lower() in page_text:
                        checks["deep_scrape_name"] = {"score_mod": 10, "reason": f"Candidate name found on the live webpage."}
                        match_found = True
                    if details.get("course") and details["course"].lower() in page_text:
                        checks["deep_scrape_course"] = {"score_mod": 10, "reason": f"Course name found on the live webpage."}
                        match_found = True
                        
                    if not match_found:
                        checks["deep_scrape_warning"] = {"score_mod": -5, "reason": "Could not verify details directly from page content (page might be protected)."}
                else:
                    checks["live_url_check"] = {"score_mod": -10, "reason": f"URL returned status {response.status_code}."}
            except Exception as e:
                checks["live_url_check"] = {"score_mod": -5, "reason": "Failed to reach verification URL automatically."}
                
            score, breakdown = compute_confidence(checks)
            return {"platform": platform["platform"], "verification_url": url,
                    "id": platform.get("id"), "method": "Pattern Match + Live URL Check", "status": "Found",
                    "message": f"Valid {platform['platform']} Certificate ID found.", "details": details,
                    "confidence_score": score, "analysis_breakdown": breakdown, "extracted_face": extracted_face}

        # Platform detected but no URL
        status = "Unverified (No Public ID)"
        msg = f"{platform['platform']} certificate detected. No public verification URL."
        if is_pdf and metadata_result:
            if metadata_result.get("is_suspicious"):
                status = "SUSPICIOUS"
                msg = metadata_result['reason']
            elif metadata_result.get("status_override"):
                status = metadata_result["status_override"]
                msg = metadata_result['reason']
        score, breakdown = compute_confidence(checks)
        return {"platform": platform["platform"], "verification_url": None, "status": status,
                "message": msg, "details": details, "confidence_score": score, "analysis_breakdown": breakdown, "method": "Platform + Forensics", "extracted_face": extracted_face}

    # Unknown platform — full forensic analysis
    checks["platform_detection"] = {"score_mod": -5, "reason": "No known platform detected."}
    score, breakdown = compute_confidence(checks)

    # Reject non-certificates outright
    if not coherence["is_certificate"]:
        return {"platform": "Not a Certificate", "verification_url": None, "status": "Rejected",
                "message": "This file does not appear to be a certificate. No certificate-related content was detected.",
                "details": None, "confidence_score": max(0, score - 20), "analysis_breakdown": breakdown, "method": "Content Analysis", "extracted_face": extracted_face}

    if score >= 65:
        status = "Likely Genuine"
        msg = "No platform match, but forensic analysis suggests authenticity."
    elif score >= 40:
        status = "Unverified"
        msg = "Certificate structure detected but cannot confirm authenticity."
    else:
        status = "Unverified"
        msg = f"Certificate-like document. Confidence too low to verify."

    return {"platform": "Unknown", "verification_url": None, "status": status, "message": msg,
            "details": details if details else None, "confidence_score": score, "analysis_breakdown": breakdown, "method": "Universal Forensic Analysis", "extracted_face": extracted_face}
