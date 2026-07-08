# SIBbackend

## Short Description

SIBbackend is a modular Node.js backend designed to power a business or community platform.  
It provides secure authentication, user and member management, event handling, and scalable domain-based APIs using a clean, maintainable architecture.

---

## Tech Stack

- **Runtime:** Node.js  
- **Framework:** Express.js  
- **Database:** MongoDB (Mongoose)  
- **Authentication:** Firebase Session Cookies  
- **Validation:** express-validator  
- **Module System:** ES Modules (`.mjs`)

---

## Key Features

- Modular, domain-driven API structure
- Secure authentication using Firebase session cookies
- Centralized input validation and error handling
- MongoDB integration with reusable schemas
- Scalable architecture for adding new features
- Clean separation of routes, middleware, utilities, and schemas

---

## API Endpoints

Access the full list of API endpoints in [`/routes.json`](./routes.json).

---

## High-Level Overview

| Category                    | Count   |
| --------------------------- | ------- |
| **Public Endpoints**        | **21**  |
| **Authenticated Endpoints** | **123** |
| **Total API Endpoints**     | **144** |

### Public Routes Total

| Method    | Count  |
| --------- | ------ |
| GET       | 9      |
| POST      | 8      |
| PUT       | 1      |
| DELETE    | 3      |
| **Total** | **21** |

### Authenticated Routes Total Breakdown

| Method    | Count   |
| --------- | ------- |
| GET       | 54      |
| POST      | 36      |
| PUT       | 18      |
| PATCH     | 2       |
| DELETE    | 13      |
| **Total** | **123** |

---
## Architecture

The following diagram represents the high-level system architecture, clearly separating user roles, frontend responsibilities, backend services, and infrastructure dependencies. It is written using Mermaid and can be rendered directly by GitHub.

```mermaid
graph TD
    %% Styles
    classDef frontend fill:#e1f5fe,stroke:#01579b,stroke-width:2px,color:#01579b;
    classDef backend fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px,color:#2e7d32;
    classDef user fill:#fff9c4,stroke:#fbc02d,stroke-width:2px,color:black;
    classDef ext fill:#f3e5f5,stroke:#7b1fa2,stroke-width:2px,color:#4a148c;
    classDef public fill:#ffebee,stroke:#c62828,stroke-width:2px,color:#c62828;

    %% =====================
    %% User Actors
    %% =====================
    subgraph "User Actors"
        A["Admin (Region Owner)"]:::user
        P["President"]:::user
        C["Coordinator"]:::user
        M["Member"]:::user
        V["Public Visitor"]:::user
    end

    %% =====================
    %% Frontend Layer
    %% =====================
    subgraph "Frontend Layer (React + Vite + Tailwind)"

        subgraph "Public Zone"
            Hero["Hero Page"]:::public
            PubGal["Public Gallery (Approved M2M Proofs)"]:::public
        end

        subgraph "Authentication"
            Login["Login UI"]:::frontend
        end

        subgraph "Protected Dashboards"
            AD["Admin Dashboard"]:::frontend
            PD["President Dashboard"]:::frontend
            CD["Coordinator Dashboard"]:::frontend
            MD["Member Dashboard"]:::frontend

            Viz["Recharts – Analytics"]:::frontend
            Anim["GSAP – Animations"]:::frontend
        end
    end

    %% =====================
    %% Backend Layer
    %% =====================
    subgraph "Backend Layer (Custom REST API)"
        API["API Gateway / Controllers"]:::backend
        AuthMw["Session & Role-based Auth Middleware"]:::backend

        subgraph "Business Logic Services"
            RegSvc["Region & Chapter Service"]:::backend
            MemSvc["Membership Service"]:::backend
            SlipSvc["Slip / Referral Service"]:::backend
            NotifSvc["Notification Service (Email + In-App)"]:::backend
        end
    end

    %% =====================
    %% Data & Infrastructure
    %% =====================
    subgraph "Data & Infrastructure"
        FBAuth["Firebase Authentication"]:::ext
        FBStore["Firebase Storage"]:::ext
        DB["Primary Database"]:::ext
    end

    %% =====================
    %% Authentication Flow
    %% =====================
    Login -->|Authenticate| FBAuth
    FBAuth -->|JWT / ID Token| Login
    Login -->|Send Token| API
    API -->|Set Session Cookie| Login

    %% =====================
    %% User Navigation
    %% =====================
    V --> Hero
    V --> PubGal
    A --> AD
    P --> PD
    C --> CD
    M --> MD

    %% =====================
    %% Permission Hierarchy (Read-only Views)
    %% =====================
    PD -.->|Read-only Supervision| CD
    AD -.->|Global Oversight| PD

    %% =====================
    %% Dashboard Actions
    %% =====================
    AD -->|Create Regions / Chapters| RegSvc
    AD -->|Broadcast Notifications| NotifSvc

    PD -->|Create Members / Events| MemSvc
    PD -->|Revoke Roles| MemSvc

    CD -->|Mark Attendance| MemSvc
    CD -->|Approve / Reject Slips| SlipSvc
    CD -->|Low Attendance Alerts| NotifSvc

    MD -->|Submit TYB / Referral / M2M| SlipSvc
    MD -->|Upload Proof| FBStore
    FBStore -->|Proof URL| SlipSvc

    %% =====================
    %% Public Gallery Flow
    %% =====================
    SlipSvc -->|Fetch Approved M2M| PubGal
    FBStore -->|Serve Images| PubGal

    %% =====================
    %% Backend Processing
    %% =====================
    API --> AuthMw
    AuthMw --> RegSvc
    AuthMw --> MemSvc
    AuthMw --> SlipSvc
    AuthMw --> NotifSvc

    RegSvc --> DB
    MemSvc --> DB
    SlipSvc --> DB
    NotifSvc --> DB

    %% =====================
    %% Notifications
    %% =====================
    NotifSvc -->|Email| A
    NotifSvc -->|Email| P
    NotifSvc -->|Email| C
    NotifSvc -->|Email| M
    NotifSvc -->|In-App Notifications| DB

    AD -.->|Fetch Notifications| NotifSvc
    PD -.->|Fetch Notifications| NotifSvc
    CD -.->|Fetch Notifications| NotifSvc
    MD -.->|Fetch Notifications| NotifSvc
```
![System Architecture Diagram 1](docs/architecture/system-architecture1.png)
![System Architecture Diagram 2](docs/architecture/system-architecture2.png)

---

## Getting Started

### Prerequisites

Make sure you have the following installed:

- Node.js (v18 or higher recommended)
- npm
- MongoDB (local or cloud, e.g., MongoDB Atlas)
- Firebase project (for authentication)

### Installation

Clone the repository:

```sh
git clone https://github.com/prem-ramamoorthy/SIBbackend.git
cd SIBbackend
```

Install dependencies:

```sh
npm install
```

Create a `.env` file and configure required environment variables:

```env
# =========================
# Application Configuration
# =========================
PORT=4000
LINK=http://localhost:5173
SESSION_EXPIRY=36000000

# =========================
# Database
# =========================
MONGODB_URL=mongodb+srv://<USERNAME>:<PASSWORD>@<CLUSTER_URL>/<DB_NAME>

# =========================
# Email / Notifications
# =========================
GMAIL=your-email@gmail.com
APP_PASSWORD=your-app-password

# =========================
# Firebase Configuration
# =========================
FIREBASE_API_KEY=your-firebase-api-key
FIREBASE_PROJECT_ID=your-firebase-project-id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk@your-project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_PRIVATE_KEY_HERE\n-----END PRIVATE KEY-----"
STORAGEBUCKET=your-project-id.appspot.com

# =========================
# Admin Configuration
# =========================
ADMIN_UIDS=uid1,uid2,uid3
```

### Run Locally

Start the server using:

```sh
node src/app.mjs
```

The server will start and connect to MongoDB using the provided environment variables.

---

## Folder Structure

```
SIBbackend
├── .gitignore
├── LICENSE
├── Readme.md
├── package-lock.json
├── package.json
└── src
    ├── app.mjs
    ├── index.html
    ├── middlewares.mjs
    ├── schemas.mjs
    ├── validators.mjs
    ├── utils
    │   ├── dateformatter.mjs
    │   └── mongo_connection.mjs
    └── pages
        ├── Auth
        │   ├── firebase.mjs
        │   ├── middleware.mjs
        │   ├── routes.mjs
        │   ├── transporter.mjs
        │   └── validationResult.mjs
        ├── activity
        │   └── activityRoute.mjs
        ├── admin
        │   ├── AdminRoute.mjs
        │   ├── CoordinatorRoute.mjs
        │   ├── regions
        │   │   └── regionRoute.mjs
        │   └── verticals
        │       └── verticalRoute.mjs
        ├── chapter
        │   ├── MainRoute.mjs
        │   ├── chapterMembershipRoute.mjs
        │   ├── chapterRoute.mjs
        │   └── chapterStatisticRoute.mjs
        ├── dashboard
        │   └── dashboardRoute.mjs
        ├── events
        │   └── eventRoute.mjs
        ├── galery
        │   └── galeryRoute.mjs
        ├── meetings
        │   ├── MeetigAttendanceRoute.mjs
        │   └── meetingRoute.mjs
        ├── members
        │   ├── MemberStatisticsRoute.mjs
        │   └── memberRoute.mjs
        ├── notifications
        │   └── notificationRoute.mjs
        ├── profile
        │   ├── profileRoute.mjs
        │   └── profilepagereqiests.mjs
        ├── public
        │   └── public.mjs
        └── slips
            ├── OneToOneRoute.mjs
            ├── VisitorsRoute.mjs
            ├── referralsRoute.mjs
            ├── slipsRoute.mjs
            └── tyftbRoute.mjs
```

---

## Contribution Guide

Please read the contribution guidelines before submitting a PR:  
👉 [CONTRIBUTING.md](./CONTRIBUTING.md)

Contributions are welcome for:

- Bug fixes
- New features
- Documentation improvements
- Performance and security enhancements

---

## Community & Contact

- **Author:** Prem Kumar R  
- **GitHub:** [https://github.com/prem-ramamoorthy](https://github.com/prem-ramamoorthy)
- **email:** prem2005.developer@gmail.com  
- **Project Discussions:** Use GitHub Issues and Pull Requests

For major changes, open an issue first to discuss your proposal.

---

## License

This project is licensed under the MIT License.  
See the license file for details:  
👉 [LICENSE](./LICENSE)
