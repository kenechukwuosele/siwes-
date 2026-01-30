
# 📚 Digital SIWES Management System
**Automating the Industrial Training Experience for the Nigerian Education Sector.**

The Digital SIWES (Student Industrial Work Experience Scheme) App is a comprehensive platform designed to replace traditional paper logbooks. It streamlines the connection between students, industry supervisors, and institution-based supervisors, ensuring transparent logging, real-time monitoring, and seamless grading.

---

## 🌟 Key Features

* **🖨️ Digital Logbook:** Students can record daily activities, attach photos of tasks, and track their progress in real-time.
* **📡 Remote Supervision:** Industry-based and School-based supervisors can review and sign off on entries remotely, eliminating logistical delays.
* **📊 Automated Grading:** Features built-in evaluation forms (Form 8) and grading modules based on ITF standards.
* **📄 PDF Report Generation:** Instantly export the entire 6-month logbook into a standardized PDF format for final submission and defense.
* **🔔 Real-time Notifications:** Alerts for students and supervisors regarding pending approvals or weekly summaries.

## 🛠️ Tech Stack

* **Frontend:** [React.js / Flutter] *(Select your preferred platform)*
* **Backend:** Python (FastAPI / Node.js)
* **Database:** PostgreSQL / MongoDB
* **Storage:** AWS S3 / Cloudinary (for logbook photo uploads)
* **Reporting:** WeasyPrint / ReportLab (for PDF generation)

## 📂 Project Structure

```text
siwes-app/
├── mobile_app/         # Student & Supervisor mobile interface
├── backend/            # API logic and user authentication
├── docs/               # ITF guidelines and project documentation
├── services/           # PDF generation and notification engines
└── tests/              # End-to-end testing for grading logic

```

## 🚦 Quick Start

### 1. Prerequisite

Ensure you have Python 3.10+ and the necessary database drivers installed.

### 2. Setup

```bash
git clone [https://github.com/your-repo/siwes-app.git](https://github.com/your-repo/siwes-app.git)
cd siwes-app
python -m venv .venv
# Windows
.venv\Scripts\activate
pip install -r requirements.txt

```

### 3. Environment Variables

Create a `.env` file with the following:

```env
DATABASE_URL=your_postgres_url
SECRET_KEY=your_secure_hash
SUPERVISOR_GRADES_ENABLED=true

```

### 4. Launch

```bash
# Start the backend server
uvicorn backend.main:app --reload

```

---

## 📖 The Problem It Solves

Traditional SIWES logbooks are prone to damage, loss, and fraudulent entries made at the last minute. This system enforces **daily logging** and provides school supervisors with a transparent timeline of a student's industrial exposure, bridging the distance gap between the university and the internship location.

---

© 2026 Digital SIWES Project - Modernizing Industrial Training in Nigeria.
