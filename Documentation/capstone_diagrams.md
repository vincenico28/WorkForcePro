# Capstone Documentation Diagrams

Based on your requested sections, here is an analysis of which sections benefit most from visual figures, along with the corresponding Mermaid diagrams ready to be embedded into your documentation.

## 2.3 Agile Scrum Methodology
**Requires a diagram:** Yes. Scrum is highly procedural and is best explained visually.

```mermaid
graph LR
    A[Product Backlog] --> B(Sprint Planning)
    B --> C[Sprint Backlog]
    C --> D{Sprint Execution\n1-4 Weeks}
    D -->|Daily| E(Daily Scrum)
    D --> F(Sprint Review)
    F --> G(Sprint Retrospective)
    F --> H[Increment / Release]
```

## 2.4.1 Microservices Architecture
**Requires a diagram:** Yes. A comparison between a monolithic approach and microservices helps define the concept.

```mermaid
graph TD
    subgraph "Monolithic Architecture"
        Client1[Clients] --> Mono[Monolithic App\nUI + Business Logic + Data Access]
        Mono --> DB1[(Single Database)]
    end

    subgraph "Microservices Architecture"
        Client2[Clients] --> API[API Gateway]
        API --> S1[Auth Service]
        API --> S2[Attendance Service]
        API --> S3[AI Microservice]
        
        S1 --> DB2[(Auth DB)]
        S2 --> DB3[(Attendance DB)]
        S3 --> DB4[(AI Storage)]
    end
```

## 2.4.2 Artificial Intelligence (AI)
**Requires a diagram:** Yes. Specifically, demonstrating the AI pipeline for your application (e.g., Facial Recognition).

```mermaid
graph TD
    A["Webcam Capture"] --> B["Image Preprocessing"]
    B --> C["Face Detection <br/>(OpenCV)"]
    C --> D["Feature Extraction <br/>(dlib deep metric learning)"]
    D --> E{"Match Distance &lt; 0.6?"}
    E -->|Yes| F["Identity Verified"]
    E -->|No| G["Verification Failed"]
```

## 2.4.5 Polyglot Persistence
**Requires a diagram:** Yes. Shows how different technologies use the right database for the right job.

```mermaid
graph TD
    A[API Gateway] --> B[Relational Service]
    A --> C[Document Service]
    A --> D[Binary Storage Service]
    
    B --> E[(PostgreSQL\nTransactional Data)]
    C --> F[(MongoDB\nUnstructured Data)]
    D --> G[(Object Storage\nImages/Documents)]
```

## 2.5 DevOps Culture and CI/CD Practices
**Requires a diagram:** Yes. A standard continuous integration and continuous deployment pipeline is essential for this section.

```mermaid
graph LR
    A["Code Push"] --> B["Source Control<br/>(GitHub)"]
    B --> C["Continuous Integration<br/>(Build & Test)"]
    C -->|Pass| D["Continuous Deployment<br/>(Vercel/Render)"]
    C -->|Fail| E["Alert Developer"]
    D --> F["Production Environment"]
```

## 2.6 Enterprise Architecture & System Integration
**Requires a diagram:** Yes. Shows how the different large-scale components (Frontend, BaaS, AI Backend) communicate.

```mermaid
graph TD
    UI[Frontend Client\nReact/Vite]
    BaaS[Backend-as-a-Service\nSupabase]
    AI[AI Engine\nFastAPI/Python]
    
    UI <-->|JWT / HTTPS| BaaS
    UI -->|Base64 Image| AI
    AI -.->|JSON Result| UI
    AI -.->|Validate| BaaS
```

## 2.6.1 System Communication Patterns
**Requires a diagram:** Yes. Illustrates the synchronous (REST/HTTPS), asynchronous (WebSockets/Realtime), event-driven (Database Triggers/CDC), and AI microservice communication patterns across the platform.

```mermaid
graph TB
    subgraph Client ["💻 Client Tier (React / Vite PWA)"]
        UI_REST["REST Query Client<br/>(TanStack React Query)"]
        UI_WS["Realtime WS Listener<br/>(Supabase Realtime Client)"]
        UI_AI["AI Assistant & Vision Client<br/>(@google/genai / fetch)"]
        UI_AUDIO["Web Audio Synthesizer<br/>(Notification Chime)"]
    end

    subgraph Gateway ["🛡️ API Gateway & Security Tier (Supabase)"]
        AUTH["GoTrue Auth<br/>(JWT & Magic Links)"]
        REST_API["PostgREST API<br/>(CRUD & Stored Procedures)"]
        STORAGE["Object Storage API<br/>(Avatars & Medical Proof)"]
        RT_BROKER["Realtime Engine<br/>(WebSocket Pub/Sub)"]
    end

    subgraph DataTier ["🗄️ Persistence & Event Tier (PostgreSQL 15)"]
        RLS["Row Level Security (RLS)<br/>(Tenant Isolation)"]
        DB_TABLES[("Relational Tables<br/>employees, schedules,<br/>attendance, leaves, payroll")]
        WAL_CDC["WAL / Change Data Capture<br/>(Logical Replication)"]
        TRIGGERS["Database Event Triggers<br/>• trg_broadcast_announcement<br/>• trg_sync_leave_to_schedule"]
    end

    subgraph Microservices ["🤖 Specialized AI Services"]
        FACE_AI["FastAPI Facial Recognition<br/>(OpenCV + dlib / Render)"]
        GEMINI_AI["Google Gemini 3.5 Flash<br/>(LLM Reasoning & Roster AI)"]
    end

    %% 1. Synchronous REST Patterns
    UI_REST -->|"1. HTTPS / REST (JWT Auth)"| AUTH
    UI_REST <-->|"2. HTTPS / REST (CRUD Operations)"| REST_API
    UI_REST <-->|"3. HTTPS / Multi-part Upload"| STORAGE
    REST_API -->|"4. Authorize & Execute"| RLS
    RLS --> DB_TABLES

    %% 2. Asynchronous / Pub-Sub Patterns
    DB_TABLES -->|"5. Transaction Write (WAL)"| WAL_CDC
    WAL_CDC -->|"6. Publish CDC Events"| RT_BROKER
    RT_BROKER ==>|"7. Asynchronous Push (WebSockets)"| UI_WS
    UI_WS -->|"8. Trigger Audio Alert"| UI_AUDIO

    %% 3. In-Database Event-Driven Patterns
    DB_TABLES -.->|"9. Fire Trigger on INSERT/UPDATE"| TRIGGERS
    TRIGGERS -.->|"10. Auto-sync Schedule / Notifications"| DB_TABLES

    %% 4. AI Inference Patterns
    UI_AI -->|"11. POST /api/verify_face (Base64)"| FACE_AI
    FACE_AI -.->|"12. JSON Match Result ({match: bool})"| UI_AI
    UI_AI <-->|"13. JSON RPC / Chat Context Prompts"| GEMINI_AI

    classDef client fill:#e0f2fe,stroke:#0284c7,stroke-width:2px,color:#0369a1;
    classDef gateway fill:#f3e8ff,stroke:#9333ea,stroke-width:2px,color:#6b21a8;
    classDef data fill:#ecfdf5,stroke:#059669,stroke-width:2px,color:#047857;
    classDef ai fill:#fffbeb,stroke:#d97706,stroke-width:2px,color:#b45309;

    class UI_REST,UI_WS,UI_AI,UI_AUDIO client;
    class AUTH,REST_API,STORAGE,RT_BROKER gateway;
    class RLS,DB_TABLES,WAL_CDC,TRIGGERS data;
    class FACE_AI,GEMINI_AI ai;
```

### Communication Patterns Matrix

| Pattern Type | Communication Style | Protocol / Transport | Source Component | Target Component | Purpose & Use Case |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Request-Response (CRUD)** | Synchronous | HTTPS / REST (JSON) | React UI (`TanStack Query`) | Supabase PostgREST | Querying and mutating employees, schedules, timesheets, and payslips. |
| **Authentication & Session** | Synchronous | HTTPS / REST (JWT) | React UI (`Supabase Auth`) | GoTrue Auth Server | Magic Link verification, login tokens, and role-based access control. |
| **Biometric Face Verification** | Synchronous | HTTPS / REST (JSON/Base64) | React UI (Webcam Capture) | FastAPI AI Microservice | Real-time 128D facial landmark extraction and Euclidean distance matching. |
| **Generative HR Intelligence** | Synchronous | HTTPS / REST (JSON) | React UI / Embedded Assistant | Google Gemini 3.5 API | Natural language querying, leave evaluation, and schedule health audits. |
| **Change Data Capture (CDC)** | Asynchronous | Logical Replication (WAL) | PostgreSQL Engine | Supabase Realtime Server | Streaming database table changes (`INSERT`/`UPDATE`) to the broker. |
| **Live Notifications & Radar** | Asynchronous (Push) | WebSockets (`wss://`) | Supabase Realtime Server | React UI (`useNotifications`) | Instant notification delivery, bell animation, and live radar map updates. |
| **Database Event Triggers** | Event-Driven | PostgreSQL Internal Bus | DB Table Event | PL/pgSQL Stored Triggers | Auto-broadcasting announcements and syncing approved leaves to schedules. |
| **Binary Document Uploads** | Synchronous | HTTPS / Multipart | React UI | Supabase Storage Bucket | Storing medical certificates, avatars, and official 201 compliance attachments. |


## 2.7 Conceptual Framework
**Requires a diagram:** Yes. Academic and capstone papers almost always require an Input-Process-Output (IPO) diagram for the conceptual framework.

```mermaid
graph LR
    subgraph Input
        I1[Employee Data]
        I2[Webcam Image]
        I3[GPS Coordinates]
    end
    
    subgraph Process
        P1[Face Registration & Matching]
        P2[Haversine Distance Calculation]
        P3[Timesheet Aggregation]
    end
    
    subgraph Output
        O1[Verified Attendance Record]
        O2[Payroll & Late Analytics]
        O3[Management Dashboard]
    end
    
    Input --> Process
    Process --> Output
```

## 2.8 Theoretical Paradigm
**Requires a diagram:** Yes. Often involves adopting a well-known model like the Technology Acceptance Model (TAM) or DeLone and McLean IS Success Model. Here is a TAM diagram.

```mermaid
graph TD
    A[External Variables\ne.g., Security, UI/UX] --> B[Perceived Usefulness]
    A --> C[Perceived Ease of Use]
    C --> B
    C --> D[Attitude Toward Using]
    B --> D
    B --> E[Behavioral Intention to Use]
    D --> E
    E --> F[Actual System Use]
```

---
### Additional Requested Sections

Here are the diagrams for the remaining sections you requested:

## 2.4 Emerging Technologies (Intro)
This diagram illustrates the convergence of modern technologies into a single intelligent system.

```mermaid
graph TD
    A["Modern Information System"]
    B["Artificial Intelligence"]
    C["Cloud Infrastructure"]
    D["Internet of Things"]
    E["Big Data Analytics"]
    
    B --> A
    C --> A
    D --> A
    E --> A
```

## 2.4.3 Internet of Things (IoT)
Illustrates how physical edge devices (like cameras and GPS modules) transmit data to the cloud.

```mermaid
graph LR
    subgraph "IoT Edge Layer"
        A["Webcam / Sensor"]
        B["GPS Module"]
        C["Mobile Device"]
    end
    
    D["API Gateway"]
    
    subgraph "Cloud / Application Layer"
        E["Database"]
        F["Analytics Engine"]
    end
    
    A --> D
    B --> D
    C --> D
    D --> E
    D --> F
```

## 2.4.4 Data Analytics and Business Intelligence
Shows the data pipeline from raw data generation to business intelligence insights.

```mermaid
graph LR
    A["Raw Data<br/>(Timesheets/GPS)"] --> B["Data Extraction & Cleaning"]
    B --> C["Data Warehouse<br/>(PostgreSQL)"]
    C --> D["Analytics Engine"]
    D --> E["BI Dashboards<br/>(HR Reports)"]
```

## 2.4.8 Software Quality Standards
The classic Software Testing Pyramid, demonstrating standard quality assurance practices.

```mermaid
graph TD
    A["End-to-End (E2E) Tests<br/>(Simulating User Behavior)"]
    B["Integration Tests<br/>(Testing Services together)"]
    C["Unit Tests<br/>(Testing individual functions)"]
    
    A --- B
    B --- C
```

## 2.4.9 Cloud Computing
A breakdown of the standard Cloud Computing service models (IaaS, PaaS, SaaS).

```mermaid
graph TD
    subgraph "SaaS (Software as a Service)"
        A["End-User Application<br/>(React Web App)"]
    end
    
    subgraph "PaaS (Platform as a Service)"
        B["Managed Databases<br/>(Supabase)"]
        C["Application Hosting<br/>(Vercel/Render)"]
    end
    
    subgraph "IaaS (Infrastructure as a Service)"
        D["Virtual Machines / Storage<br/>(AWS/GCP)"]
    end
    
    A --> B
    A --> C
    B --> D
    C --> D
```

## 2.4.10 Edge Computing
Shows the difference between sending heavy processing to the cloud versus processing it locally on the "Edge" (the user's device).

```mermaid
graph TD
    subgraph "Edge Computing (Local)"
        A["User Device"] -->|"Local Preprocessing"| B["Data Reduction"]
    end
    
    subgraph "Cloud Computing (Remote)"
        C["Central Server"] -->|"Heavy AI Processing"| D["Final Result"]
    end
    
    B -->|"Reduced Data Payload"| C
```

---

## 3.x Data Flow Diagrams (DFD)
For the full multi-level Data Flow Diagrams and Data Dictionary, see [data_flow_diagram.md](file:///c:/Users/Nico/Workforce-ManagementPro-main/Documentation/data_flow_diagram.md).

### Context Diagram (Level 0 DFD)
```mermaid
graph LR
    subgraph Actors ["👥 System Actors"]
        EMP["👤 Employee"]
        MGR["👔 HR Manager / Supervisor"]
        ADM["⚙️ System Administrator"]
    end

    SYS(["0.0<br/>Smart Workforce<br/>Management System<br/>(WorkForcePro)"])

    subgraph Services ["🌐 External Services"]
        AI_EXT["🤖 Face Recognition API"]
        GEMINI["✨ Google Gemini API"]
    end

    EMP -->|"Clock-in Image, GPS, Leave Forms"| SYS
    SYS -->|"Timesheets, Roster, Payslips, Chat"| EMP

    MGR -->|"Rosters, Leave Approvals, Payroll Runs"| SYS
    SYS -->|"Attendance Feeds, Reports, Alerts"| MGR

    ADM -->|"Roles, Geofence Config, Policies"| SYS
    SYS -->|"Audit Logs, System Telemetry"| ADM

    SYS -->|"Biometric Vectors"| AI_EXT
    AI_EXT -->|"Match Results"| SYS

    SYS -->|"Context Prompts"| GEMINI
    GEMINI -->|"AI Assistant Replies"| SYS
```

