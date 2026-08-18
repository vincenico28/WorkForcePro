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
    
    style A fill:#f9f,stroke:#333,stroke-width:2px
    style H fill:#bbf,stroke:#333,stroke-width:2px
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
    
    style A fill:#fbb,stroke:#333
    style B fill:#bfb,stroke:#333
    style C fill:#bbf,stroke:#333
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

    SYS(["0.0<br/><b>Smart Workforce<br/>Management System</b><br/><i>(WorkForcePro)</i>"])

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

    style SYS fill:#1d4ed8,stroke:#1e40af,stroke-width:3px,color:#ffffff
    style Actors fill:#f8fafc,stroke:#94a3b8,stroke-width:1px,stroke-dasharray: 4 4
    style Services fill:#f8fafc,stroke:#94a3b8,stroke-width:1px,stroke-dasharray: 4 4
```

