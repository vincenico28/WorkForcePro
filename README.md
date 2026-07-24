# 🏢 Smart Workforce Management System

A modern, intelligent, and highly secure human resources and workforce management platform. Designed as a capstone project, this system integrates advanced AI biometric verification, real-time GPS tracking, and comprehensive HR tools into a beautiful, performant user interface.

## 🌟 Core Features

### 1. AI-Driven Biometric Attendance
- **Anti-Buddy Punching:** Utilizes a dedicated Python FastAPI microservice running OpenCV and `dlib` to perform facial recognition.
- **Liveness & Match Verification:** Employees must verify their identity in real-time using their webcam to successfully clock in or out.

### 2. Geofencing & GPS Tracking
- **Location-Restricted Clock-ins:** Employees can only clock in if their browser/device GPS coordinates fall within the strictly allowed radius of the global office coordinates.
- **Live Attendance Map:** HR Managers and Administrators can view a real-time, interactive map (built with Leaflet) showing exactly where every employee clocked in for the day.

### 3. Advanced Leave Management
- **Automated Workflows:** Employees can submit leave requests (Vacation, Sick, etc.) which are instantly routed to Managers/HR for approval.
- **Document Verification:** Sick leave requests strictly enforce the uploading of medical certificates (securely stored in Supabase Storage), which HR can review before approving.

### 4. Role-Based Access Control (RBAC)
- **Granular Permissions:** Four distinct organizational roles: `Super Admin`, `HR Manager`, `Manager`, and `Employee`.
- **UI & DB Security:** Dashboards dynamically adapt to the user's role. PostgreSQL Row-Level Security (RLS) ensures that data is completely inaccessible to unauthorized users at the database level.

### 5. Timesheet & Payroll Analytics
- Real-time aggregation of daily hours, overtime, and late deductions.
- Intuitive dashboards for both employees (to track their own hours) and management (to monitor organizational productivity).

---

## 🛠️ Technology Stack

### Frontend Architecture (Client-Side)
- **Framework:** React 18 with Vite for blazing-fast Hot Module Replacement and optimized production builds.
- **Language:** TypeScript for end-to-end type safety.
- **Styling:** Tailwind CSS integrated with `shadcn/ui` components for a premium, accessible, and responsive design system.
- **Animations:** Framer Motion for highly polished micro-interactions and page transitions.
- **State & Data Fetching:** `@tanstack/react-query` for aggressive caching and optimistic UI updates.
- **Maps:** `react-leaflet` integrated with OpenStreetMap tiles.

### Backend Infrastructure (BaaS & Database)
- **Platform:** Supabase (Open Source Firebase Alternative).
- **Database:** PostgreSQL with heavily enforced Row-Level Security (RLS) policies.
- **Authentication:** Supabase Auth (JWT-based secure sessions).
- **Storage:** Supabase Storage buckets for handling sensitive employee documents and face encodings.

### AI Microservice (Biometrics)
- **Framework:** FastAPI (Python 3.10).
- **Computer Vision:** OpenCV (`opencv-python`) and `face_recognition` (built on top of `dlib`'s state-of-the-art C++ deep learning face recognition model).
- **Deployment Strategy:** Containerized via Docker (`Dockerfile` configured with parallel build restrictions to accommodate free-tier memory constraints).

### Hosting & Deployment
- **Frontend App:** Hosted on Vercel utilizing global Edge Network caching.
- **AI Microservice:** Hosted on Render using Infrastructure-as-Code (`render.yaml`).

---

## 🗄️ Database Schema Summary

The relational PostgreSQL database is designed around a multi-tenant architecture with the following core entities:

1. **`organizations`**: Stores company-wide settings, including the global GPS coordinates and radius for geofencing.
2. **`employees`**: Links to the Supabase `auth.users` table. Contains HR metadata (department, role, salary rate, face registration status).
3. **`timesheet_entries`**: Immutable ledger of all clock-ins and clock-outs, including the raw GPS coordinates of the event.
4. **`leave_requests`**: Tracks dates, leave types, approval status, and linked `attachment_url` for medical documents.
5. **`performance_reviews`**: Stores quarterly evaluations and KPI metrics.

---

## 🚀 Setup & Installation

### 1. Environment Variables
You must configure the following variables in your `.env` (or Vercel dashboard):
```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_GEMINI_API_KEY=your_gemini_api_key
VITE_API_BASE_URL=your_deployed_ai_service_url
```

### 2. Run the Web Application
```bash
npm install
npm run dev
```

### 3. Run the AI Microservice (Local)
```bash
cd ai-service
python -m venv venv
source venv/bin/activate  # On Windows use `venv\Scripts\activate`
pip install -r requirements.txt
python app.py
```
