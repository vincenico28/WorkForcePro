# 🏢 Smart Workforce Management System

A modern, intelligent, and highly secure human resources and workforce management platform. Designed as a capstone project, this system integrates **advanced AI biometric verification**, **real-time GPS tracking & anomaly detection**, an **embedded AI Assistant**, and comprehensive HR tools into a beautiful, performant user interface.

---

## 🌟 The "AI & Intelligence" Advantage

Unlike traditional HR software, this system actively monitors, verifies, and analyzes workforce data to prevent fraud and assist managers. 

### 1. Mandatory Biometric Attendance (AI Vision)
To ensure the absolute accuracy and integrity of attendance records, the system implements a strict AI verification pipeline:
- **Anti-Buddy Punching:** Utilizes a dedicated Python FastAPI microservice running OpenCV and `dlib` (state-of-the-art deep learning face recognition) to perform facial matching.
- **Liveness & Match Verification:** Employees must verify their identity in real-time using their webcam. The system extracts face encodings and compares them against the registered employee baseline before allowing a clock-in or clock-out event.

### 2. Intelligent GPS Geofencing & Fraud Detection
- **Strict Location Boundaries:** Employees can only clock in if their browser/device GPS coordinates fall within the strictly allowed company radius (Geofence).
- **Impossible Travel Detection (Anomaly AI):** When an employee clocks out, the system calculates the physical distance and time delta between their clock-in and clock-out locations. If the implied travel speed is physically impossible (e.g., >800 km/h, indicating GPS spoofing apps), the system automatically flags the attendance record as `⚠️ SUSPICIOUS LOCATION`.

### 3. Embedded AI Chat Assistant
- **Conversational HR querying:** Built directly into the UI is a smart AI Assistant. HR Managers can ask the AI questions like "Who is on leave today?" or "Summarize the late arrivals," and the AI analyzes the local context to provide instant, actionable insights.

---

## 🧩 Comprehensive System Modules

### 🗺️ 1. Command Center Dashboard
- **Global Field Map:** A real-time, dark-themed interactive map (Leaflet) directly on the dashboard.
- **Live Active Pins:** Employees currently on the clock appear as pulsing, glowing pins on the map.
- **Geofence Visualization:** The organization's allowed radius is drawn on the map, allowing HR to visually verify who is working remotely vs. at HQ.
- **Real-Time KPIs:** Instant metrics for total workforce, present employees, active leaves, and late arrivals.

### 👥 2. Employee Directory & RBAC
- **Granular Permissions:** Four distinct organizational roles: `Super Admin`, `HR Manager`, `Manager`, and `Employee`.
- **UI & DB Security:** Dashboards dynamically adapt to the user's role. PostgreSQL Row-Level Security (RLS) ensures data is completely inaccessible to unauthorized users at the database level.

### ⏱️ 3. Timesheet & Payroll Analytics
- **Automated Aggregation:** Real-time aggregation of daily hours, calculating exact work duration, overtime, and late deductions.
- **Ledger Security:** Timesheets are immutable. Only Super Admins with bypassed RLS can perform bulk corrections.

### 🏖️ 4. Advanced Leave Management
- **Automated Workflows:** Employees submit requests (Vacation, Sick, etc.) which instantly route to Managers for approval.
- **Document Enforcement:** Sick leave requests strictly enforce the uploading of medical certificates (securely stored in Supabase Storage), ensuring compliance before approval.

### 📅 5. Scheduling & Shifts
- **Visual Roster:** Drag-and-drop style calendar for assigning employee shifts, ensuring perfect departmental coverage without overlaps.

---

## ✨ Premium UI/UX Design System

We believe enterprise software shouldn't look boring. The entire platform was designed with a **"Wow Factor"**:
- **Glassmorphism:** The Sidebar, Header, and KPI cards utilize a stunning frosted-glass effect (`backdrop-blur-xl`), giving the app a native desktop feel.
- **Micro-Animations:** Fluid transitions, scaling hover effects on navigation, and interactive charts that respond to user input.
- **Typography:** Uses Google's `Outfit` for strong, modern tech headings and `Inter` for highly readable data tables.
- **Dark Mode Native:** Beautiful high-contrast dark theme utilizing CSS variables and Tailwind.

---

## 🛡️ Enterprise Security Architecture

Data privacy and system integrity are paramount. We've implemented multiple layers of security to protect organizational data from external and internal threats.

- **Strict Row-Level Security (RLS):** Implemented at the PostgreSQL database level. Even if the API is exposed, users can *only* read/write data associated with their own `org_id` and specific role.
- **Role-Based Access Control (RBAC):** UI routing and API endpoints enforce strict capability boundaries between `Super Admin`, `HR Manager`, `Manager`, and `Employee`.
- **Immutable Audit Trails:** Timesheet and Attendance records are append-only for standard users to prevent historical manipulation.
- **Biometric Anti-Spoofing:** The Python OpenCV liveness and face recognition pipeline prevents employees from clocking in using photos or videos of other staff (Buddy Punching).
- **GPS Fraud Prevention:** Velocity-based anomaly detection identifies and flags Impossible Travel (e.g., using a mock location or GPS spoofing app).
- **Secure Document Storage:** Medical certificates and profile images are stored in protected Supabase Storage buckets with time-limited signed URLs and strict RLS download policies.

---

## 🛠️ Technology Stack

### Frontend Architecture
- **Framework:** React 18 + Vite (Blazing fast HMR and optimized builds).
- **Language:** TypeScript for absolute type safety.
- **Styling:** Tailwind CSS v4 + `shadcn/ui` components.
- **Animations:** Framer Motion.
- **State & Data Fetching:** `@tanstack/react-query` (aggressive caching).
- **Maps:** `react-leaflet` with OpenStreetMap.

### Backend Infrastructure (BaaS)
- **Platform:** Supabase (Open Source Firebase Alternative).
- **Database:** PostgreSQL with heavily enforced Row-Level Security (RLS) policies.
- **Authentication:** Supabase Auth (JWT-based secure sessions).
- **Storage:** Supabase Storage buckets for documents and face encodings.

### AI Microservice
- **Framework:** FastAPI (Python 3.10).
- **Computer Vision:** OpenCV (`opencv-python`) and `face_recognition`.
- **Deployment:** Containerized via Docker.

### Hosting & Deployment
- **Frontend App:** Hosted on Vercel utilizing global Edge Network caching.
- **AI Microservice:** Hosted on Render using Infrastructure-as-Code.

---

## 🗄️ Database Schema Summary

The relational PostgreSQL database is designed around a multi-tenant architecture:
1. **`organizations`**: Stores company-wide settings, including the global GPS coordinates and radius for geofencing.
2. **`employees`**: Links to the Supabase `auth.users` table. Contains HR metadata (department, role, salary rate, face registration status).
3. **`timesheet_entries`**: Immutable ledger of all clock-ins and clock-outs, including the raw GPS coordinates and potential anomaly flags.
4. **`leave_requests`**: Tracks dates, leave types, approval status, and linked `attachment_url` for medical documents.
5. **`performance_reviews`**: Stores quarterly evaluations and KPI metrics.
