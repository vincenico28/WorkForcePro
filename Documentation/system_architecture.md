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
graph LR
    subgraph Client ["💻 Client Tier (React PWA)"]
        UI["React Web Client<br/>(TanStack Query + Audio)"]
    end

    subgraph BaaS ["🛡️ Backend & Gateway (Supabase)"]
        AUTH["Auth & Storage<br/>(GoTrue / S3)"]
        API["PostgREST API<br/>(CRUD Engine)"]
        RT["Realtime Engine<br/>(WebSocket Pub/Sub)"]
    end

    subgraph DB ["🗄️ Database Tier (PostgreSQL 15)"]
        RLS["PostgreSQL Tables & RLS"]
        TRIG["WAL CDC & Event Triggers"]
    end

    subgraph AI ["🤖 AI Microservices"]
        FACE["FastAPI Engine<br/>(OpenCV + dlib)"]
        GEM["Google Gemini 3.5<br/>(HR Intelligence)"]
    end

    %% Client flows
    UI <-->|"1. HTTPS / REST (CRUD & JWT)"| API
    UI <-->|"2. Auth & Storage Uploads"| AUTH
    RT ==>|"3. WebSockets (Live Push)"| UI
    UI -->|"4. POST Base64 Selfie"| FACE
    UI <-->|"5. Context Prompts"| GEM

    %% Backend & DB flows
    API -->|"6. Authorize & Execute"| RLS
    RLS -.->|"7. DB Trigger / WAL CDC"| TRIG
    TRIG -.->|"8. Stream CDC Events"| RT
    FACE -.->|"9. {match: bool}"| UI

    classDef client fill:#e0f2fe,stroke:#0284c7,stroke-width:2px,color:#0369a1;
    classDef baas fill:#f3e8ff,stroke:#9333ea,stroke-width:2px,color:#6b21a8;
    classDef db fill:#ecfdf5,stroke:#059669,stroke-width:2px,color:#047857;
    classDef ai fill:#fffbeb,stroke:#d97706,stroke-width:2px,color:#b45309;

    class UI client;
    class AUTH,API,RT baas;
    class RLS,TRIG db;
    class FACE,GEM ai;
```

### Communication Patterns Summary

| Paradigm | Protocol / Flow | Endpoints | Purpose |
| :--- | :--- | :--- | :--- |
| **Sync REST (CRUD)** | `HTTPS / REST` (JSON) | `React UI` $\leftrightarrow$ `PostgREST` | Fast transactional CRUD on rosters, timesheets, and leaves. |
| **Auth & Documents** | `HTTPS / Multipart` | `React UI` $\leftrightarrow$ `GoTrue / Storage` | Magic Link JWT sessions and encrypted 201 file attachments. |
| **Async Real-Time** | `WebSockets` (`wss://`) | `Realtime` $\rightarrow$ `React UI` | Instant notification chimes, live radar map, and leave updates. |
| **Event Triggers** | `PostgreSQL Internal` | `DB Triggers` $\rightarrow$ `Tables` | Automated announcement broadcast & leave-to-schedule sync. |
| **AI Inferences** | `HTTPS / JSON` | `React UI` $\leftrightarrow$ `FastAPI & Gemini` | 128D facial verification and generative HR assistance. |


