# 📱 DemoApp — Simulated Organization Application for DPDPA Compliance Auditing

> **DemoApp** is a realistic e-commerce and identity management web application designed specifically as the **target environment** to demonstrate real-time auditing and risk assessment with the **PrivGuard DPDPA Compliance Platform**.

---

## 1. Overview & Architecture

DemoApp simulates a full enterprise service (Data Fiduciary) collecting and processing personal data under the **Digital Personal Data Protection Act (DPDPA) 2023** and **DPDP Rules 2025**.

```
┌───────────────────────────────────────────────────────────┐
│              DemoApp (Target Client Application)          │
│              Port: 5001 (Backend) | Port: 5174 (Frontend) │
│                                                           │
│  • User Registration & OTP Auth                           │
│  • Consent Management Lifecycle                           │
│  • E-Commerce Orders & Shipping Address                   │
│  • Intentional Test Scenarios (TEST-001 to TEST-007)      │
│  • DPDPA Statutory Audit Feeds (/api/audit-feed/*)        │
└─────────────────────────────┬─────────────────────────────┘
                              │
               1. Live Async  │  2. Statutory Audit Feeds
               Telemetry      │  (/api/audit-feed/evidence)
                              ▼
┌───────────────────────────────────────────────────────────┐
│               PrivGuard Auditor Platform (Port 5000)       │
│                                                           │
│  • Real-Time PII & Breach Detector                        │
│  • DPDPA Policy Engine (POL-001 to POL-006)               │
│  • Statutory Compliance Score Calculator                  │
│  • Audit Report PDF Generator                             │
└───────────────────────────────────────────────────────────┘
```

> **Note**: DemoApp is the target application being audited; PrivGuard is the autonomous auditing platform.

---

## 2. Technology Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 19, Vite, React Router DOM, Vanilla CSS |
| **Backend** | Node.js, Express.js |
| **Database** | MySQL (Railway Cloud / Local MySQL 8) |
| **Authentication** | JWT (jsonwebtoken) + bcrypt |
| **Logging** | Structured audit logs (MySQL + file storage) |
| **API Documentation**| Swagger UI (`http://localhost:5001/api-docs`) |
| **Auditor Integration** | Async Telemetry Stream & DPDPA Statutory Feeds |

---

## 3. Directory Structure

```
DemoApp/
├── backend/
│   ├── src/
│   │   ├── controllers/      # userController, consentController, auditFeedController, productOrderController
│   │   ├── routes/           # userRoutes, consentRoutes, auditFeedRoutes, productOrderRoutes, adminRoutes
│   │   ├── models/           # db.js (MySQL pool)
│   │   ├── middleware/       # authMiddleware, adminMiddleware
│   │   ├── events/           # eventEmitter.js (streams to PrivGuard via PRIVGUARD_URL)
│   │   ├── utils/            # logger.js, swagger.js
│   │   └── server.js         # Entry point (Port 5001)
│   ├── database/
│   │   ├── schema.sql
│   │   └── seed.sql
│   └── package.json
│
├── frontend/
│   ├── vercel.json           # SPA routing rewrite configuration for Vercel
│   ├── src/
│   │   ├── pages/            # Register, Login, Profile, Products, Orders, Consents, Deletion, AdminPanel
│   │   ├── context/          # AuthContext
│   │   ├── api/              # api.js (Dynamic VITE_API_URL resolution)
│   │   └── App.jsx
│   └── package.json
│
├── docs/
│   ├── data-inventory.json   # Declared Data Inventory (Layer 1 Evidence)
│   └── intentional-dpdpa-test-scenarios.md
└── README.md
```

---

## ☁️ Cloud Deployment Guide (Render & Vercel)

DemoApp is configured for easy split deployment: **Backend on Render** and **Frontend on Vercel**.

```
┌────────────────────────────────────────────────────────┐
│               Frontend on VERCEL                       │
│    URL: https://demoapp-portal.vercel.app              │
│    Config: VITE_API_URL=https://demoapp.onrender.com   │
└───────────────────────────┬────────────────────────────┘
                            │ HTTPS
                            ▼
┌────────────────────────────────────────────────────────┐
│               Backend on RENDER                        │
│    URL: https://demoapp.onrender.com                   │
│    Database: MySQL (Railway / AWS RDS / Local)         │
│    Auditor: PRIVGUARD_URL=https://privguard.onrender   │
└────────────────────────────────────────────────────────┘
```

---

### Step 1: Deploy Backend on Render

1. Go to [Render Dashboard](https://dashboard.render.com/) & click **New + &rarr; Web Service**.
2. Connect your Git repository.
3. Configure the service settings:
   * **Name**: `demoapp-backend`
   * **Root Directory**: `DemoApp/backend` (or `backend` if repo root is `DemoApp`)
   * **Environment**: `Node`
   * **Region**: Choose the closest region (e.g. `Singapore` or `Frankfurt`)
   * **Branch**: `main`
   * **Build Command**: `npm install`
   * **Start Command**: `npm start`
4. Add the following **Environment Variables** in Render:

| Variable Name | Example Value | Description |
|---|---|---|
| `PORT` | `5001` | Server port (*Render injects this*) |
| `DATABASE_HOST` | `ballast.proxy.rlwy.net` | MySQL Host |
| `DATABASE_PORT` | `30390` | MySQL Port |
| `DATABASE_NAME` | `railway` | Database Name |
| `DATABASE_USER` | `root` | Database Username |
| `DATABASE_PASSWORD` | `your_mysql_password` | Database Password |
| `JWT_SECRET_KEY` | `demoapp_production_secret` | JWT Signing Key |
| `PRIVGUARD_URL` | `https://privguard-backend.onrender.com` | Deployed PrivGuard backend URL for telemetry |

5. Click **Create Web Service**. Once deployed, copy your Render URL (e.g. `https://demoapp-backend.onrender.com`).

---

### Step 2: Deploy Frontend on Vercel

1. Go to [Vercel Dashboard](https://vercel.com/) & click **Add New... &rarr; Project**.
2. Import your Git repository.
3. Configure the project:
   * **Framework Preset**: `Vite`
   * **Root Directory**: Click *Edit* and choose `DemoApp/frontend` (or `frontend`)
   * **Build Command**: `npm run build`
   * **Output Directory**: `dist`
   * **Install Command**: `npm install`
4. Expand **Environment Variables** and add:

| Key | Value | Description |
|---|---|---|
| `VITE_API_URL` | `https://demoapp-backend.onrender.com` | Your live Render backend URL (no trailing slash) |

5. Click **Deploy**.
6. SPA routing (e.g. `/profile`, `/consents`, `/admin`) is handled automatically by `vercel.json`.

---

## 4. DPDPA Statutory Audit Feeds (Consumed by PrivGuard)

DemoApp provides structured DPDPA compliance endpoints:

| Endpoint | Method | Description |
|---|---|---|
| `/api/audit-feed/evidence` | `GET` | Consolidated 3-layer statutory evidence package (policy, inventory, logs, events, consents, DB schema) |
| `/api/audit-feed/policy` | `GET` | Standalone DPDP Rules 2025 Digital Privacy Notice |
| `/api/audit-feed/inventory` | `GET` | Declared Data Inventory with lawful bases and retention periods |
| `/api/audit-feed/trigger-test/:scenarioId` | `POST` | Deterministically trigger test scenarios (`TEST-001` through `TEST-007`) |

---

## 5. Controlled DPDPA Test Scenarios

DemoApp contains 7 intentional test scenarios to demonstrate PrivGuard's real-time detection:

| Scenario ID | Name & Description | Statutory Rule | Severity |
|---|---|---|---|
| `TEST-001` | Raw PII (Name, Email, Mobile) logged in plain text | `POL-001` / `POL-002` (Sec 8(5)) | **HIGH** |
| `TEST-002` | Excessive Personal Data Exposure via Profile API | `POL-004` (Sec 6(1)) | **HIGH** |
| `TEST-003` | Consent Failure: Marketing processing post-withdrawal | `POL-004` (Sec 6(4)) | **CRITICAL** |
| `TEST-004` | Purpose Mismatch: Mobile declared for OTP used in Orders | `POL-004` (Sec 6(1)) | **HIGH** |
| `TEST-005` | Storage Limitation: Record age exceeds declared 365 days | `POL-005` (Sec 8(7)) | **MEDIUM** |
| `TEST-006` | Financial PII: Plaintext PAN card in KYC flow | `POL-003` (Sec 8(5)) | **CRITICAL** |
| `TEST-007` | Data Principal Right-to-Erasure Request | `RULE-010` (Sec 12) | **MEDIUM** |

---

## 6. Local Setup & Execution

### Prerequisites
* Node.js v18+
* MySQL 8+ (or pre-configured cloud MySQL database)

---

### Step 1: Backend Setup

```bash
cd DemoApp/backend
npm install
cp .env.example .env  # or configure .env with your MySQL credentials
```

Configure `.env`:
```env
PORT=5001
DATABASE_HOST=localhost
DATABASE_PORT=3306
DATABASE_NAME=sbms
DATABASE_USER=root
DATABASE_PASSWORD=your_mysql_password
JWT_SECRET_KEY=demoapp_jwt_secret
PRIVGUARD_URL=http://localhost:5000
```

Initialize and seed the database:
```bash
npm run setup-db
# Creates all 11 tables and inserts initial users, products, and consents
```

Start the backend:
```bash
npm start
# Running on http://localhost:5001
# Swagger docs at http://localhost:5001/api-docs
```

---

### Step 2: Frontend Setup

```bash
cd DemoApp/frontend
npm install
npm run dev
# Running on http://localhost:5174
```

---

## 7. Demo Accounts

| Role | Email / Username | Password |
|---|---|---|
| **Data Principal (User)** | `user1@example.com` | `Demo@1234` |
| **Data Principal (User 2)**| `user2@example.com` | `Demo@1234` |
| **Application Admin** | `admin` | `password` |

---

## 8. Integration Testing with PrivGuard

To trigger all 7 DPDPA scenarios on DemoApp and verify real-time PrivGuard auditing:

```bash
cd privGaurd/Backend
node demo.js
```
