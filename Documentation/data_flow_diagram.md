# Data Flow Diagrams (DFD)
**Project: Smart Workforce Management System (WorkForcePro)**

This document presents the complete Data Flow Diagram (DFD) specifications for the **Smart Workforce Management System**. It follows standard structured systems analysis principles (Gane & Sarson / Yourdon notations mapped to clean Mermaid specifications) suitable for Capstone Documentation (Chapter 3: System Design & Analysis).

---

## 1. DFD Conventions & Symbol Legend

| Element | Description | Mermaid Representation |
| :--- | :--- | :--- |
| **External Entity** | Sources or destinations of data outside the system boundary (Actors / External APIs). | Rectangle `[Entity Name]` |
| **Process** | Actions, transformations, or computational business logic executed on data. | Rounded Box `(Process ID & Name)` |
| **Data Store** | Persistent repository or database tables holding system state. | Database Symbol `[(D# Store Name)]` |
| **Data Flow** | Directional movement of packets of data or parameters. | Labeled Directed Arrow `-->|Data Payload|` |

---

## 2. Context Diagram (Level 0 DFD)

The Context Diagram establishes the global boundary of the **Smart Workforce Management System**, identifying all interacting external entities and high-level input/output data streams in a clean, non-overlapping horizontal architecture.

```mermaid
graph LR
    %% Left Side: Human Entities
    subgraph Actors ["👥 System Actors"]
        EMP["👤 Employee"]
        MGR["👔 HR Manager / Supervisor"]
        ADM["⚙️ System Administrator"]
    end

    %% Center: System Process
    SYS(["0.0<br/><b>Smart Workforce<br/>Management System</b><br/><i>(WorkForcePro)</i>"])

    %% Right Side: External AI & Cloud Services
    subgraph Services ["🌐 External Services"]
        AI_EXT["🤖 Face Recognition API<br/><i>(FastAPI + dlib)</i>"]
        GEMINI["✨ Google Gemini API<br/><i>(LLM Engine)</i>"]
    end

    %% Employee Interactions
    EMP -->|"Clock-in Image, GPS, Leave Forms"| SYS
    SYS -->|"Timesheets, Roster, Payslips, Chat"| EMP

    %% Manager Interactions
    MGR -->|"Rosters, Leave Approvals, Payroll Runs"| SYS
    SYS -->|"Attendance Feeds, Reports, Alerts"| MGR

    %% Admin Interactions
    ADM -->|"Roles, Geofence Config, Policies"| SYS
    SYS -->|"Audit Logs, System Telemetry"| ADM

    %% External Services Interactions
    SYS -->|"Biometric Vector Payloads"| AI_EXT
    AI_EXT -->|"Face Match Results"| SYS

    SYS -->|"Context Prompts"| GEMINI
    GEMINI -->|"AI Assistant Streams"| SYS

    %% Styling
    style SYS fill:#1d4ed8,stroke:#1e40af,stroke-width:3px,color:#ffffff
    style Actors fill:#f8fafc,stroke:#94a3b8,stroke-width:1px,stroke-dasharray: 4 4
    style Services fill:#f8fafc,stroke:#94a3b8,stroke-width:1px,stroke-dasharray: 4 4
    style EMP fill:#ffffff,stroke:#64748b,stroke-width:2px
    style MGR fill:#ffffff,stroke:#64748b,stroke-width:2px
    style ADM fill:#ffffff,stroke:#64748b,stroke-width:2px
    style AI_EXT fill:#fdf4ff,stroke:#c084fc,stroke-width:2px
    style GEMINI fill:#f0fdf4,stroke:#4ade80,stroke-width:2px
```

---

## 3. Level 1 Data Flow Diagram (Decomposed System Architecture)

The Level 1 DFD decomposes the system into six modular sub-processes, structured across distinct Actor, Process, Storage, and External Service tiers to eliminate visual collisions and edge stacking.

```mermaid
graph LR
    %% Column 1: Actors
    subgraph T_Actors ["👥 External Entities"]
        EMP["👤 Employee"]
        MGR["👔 HR Manager"]
        ADM["⚙️ Admin"]
    end

    %% Column 2: Processes
    subgraph T_Processes ["⚙️ System Processes"]
        P1(["1.0<br/>Authentication & RBAC"])
        P2(["2.0<br/>Biometric & GPS Attendance"])
        P3(["3.0<br/>Shift & Scheduling Engine"])
        P4(["4.0<br/>Leave & Compliance"])
        P5(["5.0<br/>Timesheet & Payroll Sync"])
        P6(["6.0<br/>AI Chat & Realtime Alerts"])
    end

    %% Column 3: Data Stores
    subgraph T_Stores ["🗄️ Database Stores"]
        D1[("D1: Profiles & Roles")]
        D2[("D2: Attendance & Timesheets")]
        D3[("D3: Shifts & Rosters")]
        D4[("D4: Leave & Balances")]
        D5[("D5: Payroll & KPIs")]
        D6[("D6: File Storage Buckets")]
        D7[("D7: Realtime Notifications")]
    end

    %% Column 4: External Services
    subgraph T_Services ["🤖 External Microservices"]
        AI_SRV["🤖 Face Microservice"]
        GEMINI["✨ Gemini 2.5 API"]
    end

    %% --- 1.0 Auth Flows ---
    EMP -->|"Login Info"| P1
    MGR -->|"Credentials"| P1
    ADM -->|"Role Config"| P1
    P1 <-->|"Auth & Policies"| D1
    P1 -.->|"JWT Session"| EMP

    %% --- 2.0 Attendance Flows ---
    EMP -->|"Selfie + GPS"| P2
    P2 <-->|"Check Stored Face"| D1
    P2 -->|"Image Vector"| AI_SRV
    AI_SRV -->|"Match Result"| P2
    P2 -->|"Log Event"| D2
    P2 -->|"Selfie Upload"| D6
    P2 -->|"Geofence Alerts"| D7
    P2 -.->|"Clock Confirmation"| EMP

    %% --- 3.0 Scheduling Flows ---
    MGR -->|"Publish Shifts"| P3
    P3 <-->|"Shift Templates"| D3
    P3 -.->|"View Schedule"| EMP
    P3 -->|"Shift Windows"| P2

    %% --- 4.0 Leave Flows ---
    EMP -->|"Leave Application"| P4
    P4 -->|"Medical Attachments"| D6
    P4 <-->|"Check Quotas"| D4
    P4 -->|"Review Alert"| D7
    MGR -->|"Approve/Reject"| P4
    P4 -->|"Update Balance"| D4
    P4 -->|"Sync On-Leave"| D3
    P4 -.->|"Decision Status"| EMP

    %% --- 5.0 Payroll Flows ---
    D2 -->|"Logged Hours"| P5
    D4 -->|"Paid Leave Days"| P5
    MGR -->|"Run Payroll"| P5
    P5 <-->|"Ledger Records"| D5
    P5 -.->|"Payslip View"| EMP

    %% --- 6.0 AI & Realtime Flows ---
    EMP -->|"Chat Query"| P6
    P6 <-->|"Context Data"| D2
    P6 <-->|"Roster Info"| D3
    P6 -->|"Prompt + Context"| GEMINI
    GEMINI -->|"Streamed Reply"| P6
    P6 -.->|"Assistant Output"| EMP
    D7 <-->|"Live Push/WS"| P6

    %% Styling
    style T_Actors fill:#f8fafc,stroke:#94a3b8,stroke-width:1px,stroke-dasharray: 4 4
    style T_Processes fill:#eff6ff,stroke:#60a5fa,stroke-width:1px,stroke-dasharray: 4 4
    style T_Stores fill:#f0fdf4,stroke:#86efac,stroke-width:1px,stroke-dasharray: 4 4
    style T_Services fill:#fdf4ff,stroke:#d8b4fe,stroke-width:1px,stroke-dasharray: 4 4

    style P1 fill:#2563eb,stroke:#1d4ed8,stroke-width:2px,color:#fff
    style P2 fill:#2563eb,stroke:#1d4ed8,stroke-width:2px,color:#fff
    style P3 fill:#2563eb,stroke:#1d4ed8,stroke-width:2px,color:#fff
    style P4 fill:#2563eb,stroke:#1d4ed8,stroke-width:2px,color:#fff
    style P5 fill:#2563eb,stroke:#1d4ed8,stroke-width:2px,color:#fff
    style P6 fill:#2563eb,stroke:#1d4ed8,stroke-width:2px,color:#fff
```

---

## 4. Level 2 Data Flow Diagrams (Detailed Sub-Processes)

### 4.1 Level 2 DFD: Process 2.0 (Biometric & Geofenced Attendance Pipeline)

This diagram details how the system validates geofencing, calculates Haversine spatial proximity, runs deep neural metric comparison, and records auditable timesheet entries.

```mermaid
graph TD
    %% Entity & External Services
    EMP["👤 Employee (Client App)"]
    AI_EXT["🤖 Face Recognition API (FastAPI)"]
    
    %% Stores
    D1[("D1: User Profiles & Encodings")]
    D2_1[("D2.1: Attendance Records")]
    D2_2[("D2.2: Timesheet Entries")]
    D2_3[("D2.3: Geofence Audit Log")]
    D6[("D6: Storage (Clock-in Selfies)")]
    D7[("D7: Realtime Notifications")]

    %% Sub-processes of 2.0
    P2_1(("2.1<br/>GPS Coordinate<br/>& Haversine Check"))
    P2_2(("2.2<br/>Facial Vector<br/>Matching"))
    P2_3(("2.3<br/>Anomaly &<br/>Speed Validation"))
    P2_4(("2.4<br/>Timesheet Sync<br/>& State Commit"))

    %% Flows
    EMP -->|"1. Lat/Lng Coordinates"| P2_1
    P2_1 <-->|"Fetch Office Geofence Radius"| D1
    
    P2_1 -->|"Within Boundary: Proceed"| P2_2
    P2_1 -->|"Out of Bounds: Flag Violation"| D2_3
    D2_3 -->|"Alert Supervisor"| D7

    EMP -->|"2. Captured Selfie (Base64)"| P2_2
    P2_2 <-->|"Fetch Reference Biometric Encoding"| D1
    P2_2 -->|"POST /api/verify_face (Euclidean Distance)"| AI_EXT
    AI_EXT -->|"Match Confidence (&lt; 0.6 distance)"| P2_2
    P2_2 -->|"Upload Selfie Image"| D6

    P2_2 -->|"Identity Verified"| P2_3
    P2_3 <-->|"Compare Previous Coordinates & Timestamps"| D2_1
    P2_3 -->|"Calculate Travel Velocity (Max 800 km/h)"| P2_3

    P2_3 -->|"Valid Entry"| P2_4
    P2_4 -->|"Insert Raw Timestamp & GPS"| D2_1
    P2_4 -->|"Auto-Aggregate Daily Work Shift"| D2_2
    P2_4 -->|"Push Attendance Confirmation"| EMP
    P2_4 -->|"Broadcast Live Attendance Feed"| D7

    %% Styling
    style P2_1 fill:#0284c7,stroke:#0369a1,stroke-width:2px,color:#fff
    style P2_2 fill:#0284c7,stroke:#0369a1,stroke-width:2px,color:#fff
    style P2_3 fill:#0284c7,stroke:#0369a1,stroke-width:2px,color:#fff
    style P2_4 fill:#0284c7,stroke:#0369a1,stroke-width:2px,color:#fff
```

---

### 4.2 Level 2 DFD: Process 4.0 (Leave Management & Schedule Synchronization)

This diagram details the leave filing lifecycle, DOLE statutory constraint validation, document upload, supervisor review, and automatic roster synchronization.

```mermaid
graph TD
    %% Entities
    EMP["👤 Employee"]
    MGR["👔 HR Manager / Supervisor"]

    %% Data Stores
    D3[("D3: Schedules & Roster")]
    D4_1[("D4.1: Leave Balances & Statutory Quotas")]
    D4_2[("D4.2: Leave Requests")]
    D6[("D6: Storage (Medical / Cert Attachments)")]
    D7[("D7: Realtime Notifications")]

    %% Sub-processes of 4.0
    P4_1(("4.1<br/>Leave Application<br/>& Quota Verification"))
    P4_2(("4.2<br/>Document Attachment<br/>& Verification Storage"))
    P4_3(("4.3<br/>Manager Workflow<br/>& Decision Engine"))
    P4_4(("4.4<br/>Balance Ledger<br/>& Roster Sync"))

    %% Flows
    EMP -->|"1. Leave Form (Dates, Leave Type, Reason)"| P4_1
    P4_1 <-->|"Validate Remaining Balance (DOLE SIL, Maternity, etc.)"| D4_1
    
    EMP -->|"2. Upload Supporting Document (PDF/JPG)"| P4_2
    P4_2 -->|"Store File Object"| D6
    P4_2 -->|"Attach Document URL"| P4_1

    P4_1 -->|"Create Pending Leave Record"| D4_2
    P4_1 -->|"Dispatch Review Alert"| D7
    D7 -->|"Push Notification"| MGR

    MGR -->|"3. Review Application & Document"| P4_3
    P4_3 <-->|"Fetch Request Details & Past Leave History"| D4_2
    MGR -->|"Submit Approval / Rejection Decision"| P4_3

    P4_3 -->|"Record Status Update"| D4_2
    P4_3 -->|"If Approved: Trigger Balance Deduction"| P4_4
    P4_4 -->|"Deduct Allocated Days"| D4_1
    P4_4 -->|"Auto-Populate On-Leave Status in Roster"| D3
    P4_4 -->|"Send Approval Notice"| D7
    D7 -->|"Receive Notification"| EMP

    %% Styling
    style P4_1 fill:#059669,stroke:#047857,stroke-width:2px,color:#fff
    style P4_2 fill:#059669,stroke:#047857,stroke-width:2px,color:#fff
    style P4_3 fill:#059669,stroke:#047857,stroke-width:2px,color:#fff
    style P4_4 fill:#059669,stroke:#047857,stroke-width:2px,color:#fff
```

---

## 5. Data Flow Dictionary

### 5.1 Data Stores

| ID | Data Store Name | Database Tables / Buckets | Description |
| :--- | :--- | :--- | :--- |
| **D1** | User Profiles & Roles | `public.profiles`, `auth.users`, `public.user_roles` | Stores authentication identities, facial biometric vector encodings, home coordinates, and role privileges. |
| **D2** | Attendance & Timesheets | `public.attendance_records`, `public.timesheet_entries`, `public.geofence_events` | Stores raw clock timestamps, latitude/longitude coordinates, device hashes, verified daily work durations, and overtime flags. |
| **D3** | Shift & Scheduling Data | `public.shifts`, `public.schedules`, `public.shift_templates` | Stores work shift templates, recurring weekly schedules, and daily shift assignments. |
| **D4** | Leave & Compliance Records | `public.leave_requests`, `public.leave_balances`, `public.statutory_leave_limits` | Stores leave applications, approval history, remaining allowances, and compliance metadata (e.g. DOLE limits). |
| **D5** | Payroll & Performance Data | `public.payroll_records`, `public.performance_reviews`, `public.kpi_evaluations` | Stores calculated regular pay, overtime compensation, deductions, net salary, and manager evaluation scores. |
| **D6** | Storage Buckets | `avatars`, `leave_attachments` | Cloud object storage for employee avatar images, biometric selfie snapshots, and leave proof documents. |
| **D7** | Realtime & Notifications | `public.notifications`, `public.channels`, `public.messages` | In-app alerts, broadcast announcements, direct communication messages, and real-time activity events. |

---

### 5.2 External Entities

| Entity Name | Category | Primary Responsibilities |
| :--- | :--- | :--- |
| **Employee** | Human Actor | Performs biometric clock-in/out, views schedules, submits leave requests, accesses payslips, chats with AI Assistant and team members. |
| **HR Manager / Supervisor** | Human Actor | Approves leaves, assigns shifts, reviews attendance logs, inspects geofence violations, generates payroll, and posts announcements. |
| **System Administrator** | Human Actor | Manages enterprise organizations, configures geofence parameters, provisions user accounts and roles, monitors security audit logs. |
| **Face Recognition Microservice** | External System / API | Stateless Python (FastAPI + dlib + OpenCV) service performing face detection and 128-d biometric feature vector matching. |
| **Google Gemini API** | External System / API | Multimodal Large Language Model providing natural language processing, intelligent roster analysis, and conversational HR assistance. |
