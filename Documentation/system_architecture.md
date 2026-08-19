# System Architecture Document
**Project: Smart Workforce Management System**

This document outlines the high-level architecture, component interactions, and data flow of the system. The diagrams and explanations below are designed to be included in your Capstone documentation (e.g., Chapter 3: System Design & Architecture).

---

## 1. High-Level System Architecture

The system follows a modern **Service-Oriented Architecture (SOA)**, separating the presentation layer, the data/auth layer, and the heavy computational AI layers into distinct, decoupled services.

```mermaid
graph TD
    subgraph "Client Tier (Frontend)"
        UI["React Web Application\n(Vite + TypeScript)"]
        Map["Leaflet GPS Maps"]
        Cam["Webcam API"]
        Chat["AI Assistant Component"]
    end

    subgraph "Data & Security Tier (BaaS)"
        SupaAuth["Supabase Auth\n(JWT Sessions)"]
        SupaDB[("PostgreSQL Database\n(Row Level Security)")]
        SupaStore["Supabase Storage\n(Object Buckets)"]
        SupaRT["Supabase Realtime\n(WebSockets)"]
    end

    subgraph "AI Microservice Tier (Backend)"
        FastAPI["FastAPI Server\n(Python)"]
        OpenCV["Face Recognition Engine\n(OpenCV + dlib)"]
    end

    subgraph "External LLM Services"
        Gemini["Google Gemini API"]
    end

    %% Connections
    UI <-->|"Authentication (OAuth)"| SupaAuth
    UI <-->|"CRUD Operations (REST)"| SupaDB
    UI <-->|"Document & Image Uploads"| SupaStore
    UI <-->|"Live Notifications & Chat (WebSockets)"| SupaRT
    
    UI -->|"POST Image Payload (Base64)"| FastAPI
    FastAPI <-->|"Matrix Computations"| OpenCV
    FastAPI -.->|"JSON Verification Result"| UI
    
    Chat <-->|"Natural Language Queries"| Gemini
    Chat -.->|"Local State Awareness"| UI
    
    Cam -.->|"Stream"| UI
    Map -.->|"Render"| UI
```

### Tier Breakdown:
1. **Client Tier (Vercel):** The user-facing React application. It handles routing, UI state, form validation, capturing webcam data, rendering live interactive Maps (Leaflet), and managing the context-aware Gemini AI chat assistant.
2. **Data & Security Tier (Supabase):** The central hub for persistent state and real-time connectivity. It utilizes PostgreSQL with strict Row-Level Security (RLS) policies. It also leverages Supabase Realtime (WebSockets) for instantaneous notifications and in-app messaging, alongside Storage buckets for document hosting.
3. **AI Microservice Tier (Render):** A stateless Python application designed specifically to handle heavy C++ matrix computations required for facial recognition. It is completely isolated from the database to ensure the frontend remains highly performant and scalable.
4. **External LLM Services:** Integration with Google's Gemini API to power the conversational AI Assistant, enabling dynamic querying of HR data and automated schedule health-checks.

---

## 2. Core Data Flow: The Attendance Clock-In Process

The most complex interaction in the system is the biometrically-secured, GPS-restricted clock-in process. This sequence diagram illustrates the exact chronological flow of data between the user, the frontend, the AI server, and the database.

```mermaid
sequenceDiagram
    autonumber
    actor User
    participant Frontend as React Web App
    participant GPS as Device Geolocation
    participant AI as FastAPI (Render)
    participant DB as Supabase PostgreSQL

    User->>Frontend: Clicks "Clock In" Button
    
    %% GPS Phase
    rect rgb(240, 248, 255)
        note right of Frontend: Phase 1: Spatial Verification
        Frontend->>GPS: Request Current Device Coordinates
        GPS-->>Frontend: Returns Latitude & Longitude
        Frontend->>Frontend: Calculate Haversine Distance to Office
    end
    
    alt Distance > Allowed Radius
        Frontend-->>User: Error: "You are outside the office geofence"
    else Distance ≤ Allowed Radius
        
        %% Biometric Phase
        rect rgb(245, 255, 250)
            note right of Frontend: Phase 2: Biometric Verification
            User->>Frontend: Captures Selfie via Webcam
            Frontend->>AI: POST /api/verify_face (Captured Image + Known Encoding)
            AI->>AI: Run dlib deep learning model comparison
        end

        alt Face Match Failed
            AI-->>Frontend: Return {match: false}
            Frontend-->>User: Error: "Face verification failed"
        else Face Match Success
            AI-->>Frontend: Return {match: true}
            
            %% Database Phase
            rect rgb(255, 250, 240)
                note right of Frontend: Phase 3: Record Transaction
                Frontend->>DB: INSERT INTO timesheet_entries (time, type, coords)
                DB-->>Frontend: Confirm Database Save
            end
            
            Frontend-->>User: Success: "Clocked in successfully!"
        end
    end
```

### Clock-Out Anomaly Detection
When a user attempts to **Clock Out**, the system executes a reverse validation flow that calculates the travel velocity between the original clock-in coordinates and the current clock-out coordinates. If the speed implies impossible travel (e.g., >800 km/h), the record is immediately flagged in the database to prevent GPS spoofing fraud.

---

## 3. Security & Access Architecture

To satisfy enterprise security requirements, the application implements a defense-in-depth approach:

1. **Edge Security:** The frontend is served via Vercel's global CDN, ensuring encrypted HTTPS transit and DDoS protection.
2. **Authentication Security:** Users receive a cryptographically signed JSON Web Token (JWT) upon login via Supabase Auth.
3. **Database Security (RLS):** Before executing any SQL query, PostgreSQL evaluates the JWT. 
   - *Example:* The policy `select_timesheet_org` ensures that a Manager can only query timesheet rows belonging to employees within their specific `org_id`.
4. **Fraud Prevention AI:** Real-time spatial verification (Impossible Travel calculation) and computer-vision based Liveness checks prevent proxy attendance (buddy punching).
5. **Storage Security:** The `leave_attachments` bucket is strictly configured to prevent public file listing, ensuring medical documents remain confidential and only accessible via authenticated, explicit file-path requests.

---

## 4. System Communication Patterns

The architecture coordinates multiple communication styles across client, server, database, and AI microservices:

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

### Communication Flow Summary

1. **Synchronous REST / HTTPS (Request-Response):**
   - The React frontend communicates with the **Supabase PostgREST API** for structured CRUD data operations, passing JWT session headers evaluated against PostgreSQL Row-Level Security (RLS).
   - Medical documents and employee avatars are uploaded directly to **Supabase Object Storage** over HTTPS.

2. **Asynchronous Real-Time (WebSockets / Pub-Sub):**
   - When database records change, PostgreSQL logical replication generates **Write-Ahead Log (WAL) Change Data Capture (CDC)** events.
   - The **Supabase Realtime Engine** publishes these events to subscribed client channels via WebSockets (`wss://`), immediately updating the live Attendance Map radar, unread notification counters, and triggering the in-browser Web Audio synthesized chime.

3. **In-Database Event-Driven Triggers:**
   - PostgreSQL triggers (`trg_broadcast_announcement`, `trg_sync_leave_to_schedule`) automate database-level workflows synchronously within transactions to guarantee ACID integrity.

4. **Dedicated AI Microservice & LLM Inferences:**
   - **Facial Biometrics:** Front-end webcam captures are transmitted as Base64 image payloads to the Python FastAPI microservice on Render for OpenCV + `dlib` 128D metric matching.
   - **Gemini AI Intelligence:** Conversational prompts and roster metrics are sent via Google Gemini 3.5 API for AI-assisted scheduling, leave evaluations, and labor compliance audits.

