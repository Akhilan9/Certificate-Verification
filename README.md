# Certificate Verification Project
# 🔐 CertVerify Pro – AI Powered Certificate Verification System

## 📌 Overview

**CertVerify Pro** is a modern AI-powered certificate verification platform designed to detect fake, tampered, or suspicious certificates using OCR, forensic analysis, and intelligent verification techniques.

The system provides:

* 📄 Certificate authenticity analysis
* 🔍 OCR-based text extraction
* 🧠 AI-assisted forensic verification
* 📊 Confidence score generation
* 📁 Batch verification support
* 📑 PDF audit report generation
* 🌙 Modern animated UI with Dark/Light mode
* 🔐 User authentication support
* 📚 Verification history tracking

This project combines a **React + Tailwind frontend** with a **FastAPI backend** for high performance and scalability.

---

# ✨ Features

## 🎨 Frontend Features

* Modern glassmorphism UI
* Smooth animations using Framer Motion
* Drag & drop certificate upload
* Batch certificate processing
* Real-time progress tracking
* Interactive verification dashboard
* Dark / Light mode toggle
* PDF forensic report export
* Authentication integration using Firebase
* Responsive design for all devices

## ⚙️ Backend Features

* FastAPI-based REST API
* OCR extraction using Tesseract OCR
* Certificate text analysis
* Confidence score calculation
* Tampering detection logic
* Verification history storage
* PDF & image support
* Structured forensic breakdown response

---

# 🛠️ Tech Stack

## Frontend

* ⚛️ React.js
* ⚡ Vite
* 🎨 Tailwind CSS
* 🎞️ Framer Motion
* 📡 Axios
* 🔥 Firebase Authentication
* 🧩 Lucide React Icons

## Backend

* 🐍 Python
* ⚡ FastAPI
* 🔍 Tesseract OCR
* 📄 PDF/Image Processing
* 🗃️ SQLite Database

---

# 📂 Project Structure

```bash
Certificate Verification/
│
├── backend/
│   ├── main.py
│   ├── verification_service.py
│   ├── requirements.txt
│   ├── history.db
│   └── test_regex.py
│
├── frontend/
│   ├── src/
│   ├── package.json
│   ├── vite.config.js
│   └── tailwind.config.js
│
├── start_app.bat
└── README.md
```

---

# 🚀 Installation Guide

## 1️⃣ Clone the Repository

```bash
git clone <your-repository-link>
cd "Certificate Verification"
```

---

# ⚙️ Backend Setup

## Step 1: Navigate to Backend Folder

```bash
cd backend
```

## Step 2: Create Virtual Environment

```bash
python -m venv venv
```

## Step 3: Activate Environment

### Windows

```bash
venv\Scripts\activate
```

### Linux / Mac

```bash
source venv/bin/activate
```

## Step 4: Install Dependencies

```bash
pip install -r requirements.txt
```

## Step 5: Install Tesseract OCR

Tesseract OCR is required for certificate text extraction.

You can install it using:

```bash
backend/tesseract_installer.exe
```

Make sure Tesseract is added to your system PATH.

## Step 6: Run Backend Server

```bash
uvicorn main:app --reload --port 8001
```

Backend will start at:

```bash
http://localhost:8001
```

API Documentation:

```bash
http://localhost:8001/docs
```

---

# 🎨 Frontend Setup

## Step 1: Navigate to Frontend Folder

```bash
cd frontend
```

## Step 2: Install Dependencies

```bash
npm install
```

## Step 3: Run Frontend

```bash
npm run dev
```

Frontend will run at:

```bash
http://localhost:5173
```

---

# ▶️ One Click Startup (Windows)

You can launch both frontend and backend simultaneously using:

```bash
start_app.bat
```

---

# 📸 Supported File Formats

* PNG
* JPG
* JPEG
* PDF

---

# 📊 Verification Result Includes

Each certificate analysis provides:

* ✅ Verification status
* 📈 Confidence score
* 🔍 Forensic breakdown
* 🧾 Extracted OCR details
* 📄 Downloadable PDF report
* 👤 Extracted candidate image (if available)

---

# 🔐 Authentication

This project uses **Firebase Authentication** for user login and account management.

Supported authentication providers:

* Google Sign-In
* Email/Password Authentication

---

# 🌟 Future Improvements

* Blockchain-based certificate validation
* QR code verification
* AI/ML tampering detection model
* Cloud deployment support
* Admin dashboard
* Email verification workflow
* Multi-language OCR support

---

# 🧠 Use Cases

* Educational certificate verification
* Internship certificate validation
* HR recruitment verification
* Online course certification checking
* Fraud detection systems

---

# 📜 License

This project is developed for educational and research purposes.

---

# 👨‍💻 Author

**Akhilan Vengala**

* Cybersecurity Enthusiast
* Full Stack Developer
* AI & Digital Forensics Learner

---

# ⭐ Support

If you like this project:

* ⭐ Star the repository
* 🍴 Fork the project
* 🛠️ Contribute improvements
* 📢 Share with others

---

## 🚀 Built with Passion using React, FastAPI & AI



# OUTPUT SCREENS - 

<img width="1920" height="1080" alt="Screenshot (453)" src="https://github.com/user-attachments/assets/bf254198-acc1-41ea-80ae-9292425040cc" />
<img width="1920" height="1080" alt="Screenshot (454)" src="https://github.com/user-attachments/assets/e381f54f-821e-4a66-b561-8c40d0c3182c" />
<img width="1920" height="1080" alt="Screenshot (455)" src="https://github.com/user-attachments/assets/ed5543d7-debb-412e-bfb1-3973abe19efb" />
<img width="1920" height="1080" alt="Screenshot (456)" src="https://github.com/user-attachments/assets/928c28d8-e30c-4e65-99ed-c70e2575d547" />
<img width="1920" height="1080" alt="Screenshot (457)" src="https://github.com/user-attachments/assets/673968fd-350c-4e10-ad25-39d8be033e54" />
<img width="1920" height="1080" alt="Screenshot (458)" src="https://github.com/user-attachments/assets/c4792406-00fb-44d1-ba2c-add7ff6a417a" />
<img width="1920" height="1080" alt="Screenshot (459)" src="https://github.com/user-attachments/assets/fbb2484b-3654-49e6-a634-376a5cc3757f" />
<img width="1920" height="1080" alt="Screenshot (460)" src="https://github.com/user-attachments/assets/44d12b4f-3927-4956-b297-900321d6570f" />
<img width="1920" height="1080" alt="Screenshot (461)" src="https://github.com/user-attachments/assets/31c5abe2-1e94-4223-b74e-2f7afa4aa7f1" />
<img width="1920" height="1080" alt="Screenshot (462)" src="https://github.com/user-attachments/assets/e2750429-c3ec-41d6-8555-c0413102a232" />


