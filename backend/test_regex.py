import re

PLATFORMS = {
    "coursera": {"keys": ["coursera"], "url_pat": r"coursera\.org/verify/([A-Z0-9]+)", "name": "Coursera",
                 "url_tpl": "https://www.coursera.org/verify/{}", "score": 30},
    "udemy": {"keys": ["udemy"], "url_pat": r"udemy\.com/certificate/([A-Z0-9-]+)", "name": "Udemy",
              "url_tpl": "https://www.udemy.com/certificate/{}", "score": 30},
    "udemy_id": {"keys": ["udemy"], "url_pat": r"uc[-_]?([a-f0-9]{8}[-_]?[a-f0-9]{4}[-_]?[a-f0-9]{4}[-_]?[a-f0-9]{4}[-_]?[a-f0-9]{12})",
                 "name": "Udemy", "url_tpl": "https://www.udemy.com/certificate/UC-{}", "score": 25},
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
                    m = re.search(r"ude\.my/([A-Z0-9-]+)", cleaned, re.IGNORECASE)
                    
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

full_text = "Certificate no: UC-8dc9dc68-d1c9-4a29-8d5f-41e87fe65e75\nCertificate url: ude.my/UC-8dc9dc68-d1c9-4a29-8d5f-41e87fe65e75\nUdemy"
cleaned = full_text.replace(" ","").replace("\n","").lower()

m = re.search(r"uc[-_]?([a-f0-9]{8}[-_]?[a-f0-9]{4}[-_]?[a-f0-9]{4}[-_]?[a-f0-9]{4}[-_]?[a-f0-9]{12})", cleaned, re.IGNORECASE)
print(f"m: {m}")
if m:
    print(f"m.group(1): {m.group(1)}")
