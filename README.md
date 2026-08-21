# DemoApp

**Simulated Organization Application for DPDPA Compliance Testing**

---

## 1. Project Overview

DemoApp is a realistic simulated organization web application built specifically as the **target environment** for an external DPDPA Compliance & Personal Data Risk Assessment Platform.

DemoApp behaves like a real organization's application — it collects personal data, processes it, generates logs, emits consent events, and stores records in a MySQL database. It also contains a controlled set of intentional DPDPA compliance test scenarios so the external audit platform can demonstrate detection capability.

---

## 2. Important Architecture: DemoApp vs DPDPA Audit Platform

```
┌──────────────────────────────────────┐
│              DemoApp                 │
│  Simulated Organization Application  │
│                                      │
│  Generates: users, logs, API events, │
│  consent events, database records    │
└──────────────────┬───────────────────┘
                   │ Evidence
                   ▼
┌──────────────────────────────────────┐
│      DPDPA AUDIT PLATFORM            │
│        (SEPARATE PROJECT)            │
│  Analyzes DemoApp's behavior and     │
│  detects potential compliance risks  │
└──────────────────────────────────────┘
```

**DemoApp is NOT the auditing solution. It is the target being audited.**

---

## 3. Why DemoApp Exists

The external DPDPA Audit Platform needs a realistic target to audit. DemoApp provides:
- Real user registration, login, and profile workflows
- Consent grant/withdrawal events
- Data processing events for every personal-data operation
- Application logs (including intentional PII exposure)
- MySQL database with personal data
- REST APIs (including intentional excessive data exposure)
- Controlled DPDPA test scenarios with deterministic evidence

---

## 4. Technology Stack

| Layer    | Technology                        |
|----------|-----------------------------------|
| Frontend | React 19, Vite, React Router DOM  |
| Backend  | Node.js, Express.js               |
| Database | MySQL                             |
| Auth     | JWT (jsonwebtoken)                |
| Logging  | Winston + MySQL audit table       |
| API Docs | Swagger UI (swagger-jsdoc)        |

---

## 5. Architecture

```
DemoApp/
├── backend/
│   ├── src/
│   │   ├── controllers/     # userController, consentController, productOrderController, adminController
│   │   ├── routes/          # userRoutes, consentRoutes, productOrderRoutes, adminRoutes
│   │   ├── models/          # db.js (MySQL pool)
│   │   ├── middleware/      # authMiddleware, adminMiddleware
│   │   ├── events/          # eventEmitter.js
│   │   ├── utils/           # logger.js, swagger.js
│   │   └── server.js
│   ├── database/
│   │   ├── schema.sql
│   │   └── seed.sql
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── pages/           # Register, Login, Profile, Products, Orders, Consents, Deletion, AdminLogin, AdminPanel
│   │   ├── context/         # AuthContext
│   │   ├── api/             # api.js
│   │   └── App.jsx
│   └── package.json
├── docs/
│   ├── data-inventory.json
│   └── intentional-dpdpa-test-scenarios.md
└── README.md
```

---

## 6. Database Architecture

| Table                    | Purpose                                              |
|--------------------------|------------------------------------------------------|
| users                    | User personal data                                   |
| admin_users              | Admin accounts                                       |
| consents                 | Current consent status per user per purpose          |
| consent_history          | Full audit trail of consent changes                  |
| products                 | Products/services catalogue                          |
| orders                   | User orders                                          |
| order_items              | Line items per order                                 |
| user_addresses           | Saved addresses                                      |
| data_processing_events   | Structured events for every personal-data operation  |
| application_audit_logs   | Application-level audit trail (includes PII test)    |
| data_deletion_requests   | User data deletion requests                          |

---

## 7. API Endpoints

| Method | Endpoint                          | Description                                    |
|--------|-----------------------------------|------------------------------------------------|
| POST   | /api/users/register               | Register user (triggers PII log test case)     |
| POST   | /api/users/login                  | Login, returns JWT                             |
| GET    | /api/users/:id                    | Get profile (intentional excessive data)       |
| PUT    | /api/users/:id                    | Update profile                                 |
| GET    | /api/users/:id/events             | Get user's data processing events              |
| POST   | /api/users/:id/deletion-request   | Submit data deletion request                   |
| GET    | /api/products                     | List products                                  |
| GET    | /api/products/:id                 | Get product                                    |
| POST   | /api/orders                       | Create order (triggers purpose mismatch)       |
| GET    | /api/orders/:id                   | Get order                                      |
| GET    | /api/consents/:userId             | Get user consents                              |
| POST   | /api/consents                     | Grant consent                                  |
| POST   | /api/consents/:id/withdraw        | Withdraw consent (triggers enforcement test)   |
| POST   | /api/admin/login                  | Admin login                                    |
| GET    | /api/admin/users                  | Admin: list users                              |
| GET    | /api/admin/orders                 | Admin: list orders                             |
| GET    | /api/admin/consents               | Admin: list consents                           |
| GET    | /api/admin/events                 | Admin: list processing events                  |
| GET    | /api/admin/audit-logs             | Admin: list audit logs                         |
| GET    | /api/admin/deletion-requests      | Admin: list deletion requests                  |

Swagger UI: `http://localhost:5001/api-docs`

---

## 8. Intentional DPDPA Test Scenarios

See `docs/intentional-dpdpa-test-scenarios.md` for full details.

| Test    | Scenario                        | Rule     | Severity |
|---------|---------------------------------|----------|----------|
| TEST-001| PII in application logs         | RULE-001 | HIGH     |
| TEST-002| Excessive API data exposure     | RULE-006 | HIGH     |
| TEST-003| Consent enforcement failure     | RULE-005 | CRITICAL |
| TEST-004| Purpose-use mismatch (mobile)   | RULE-003 | HIGH     |
| TEST-005| Retention period exceeded       | RULE-007 | MEDIUM   |

---

## 9. Setup Instructions

### Prerequisites
- Node.js 18+
- MySQL 8+

### Step 1 — Database Setup

```sql
-- In MySQL client:
source path/to/DemoApp/backend/database/schema.sql
source path/to/DemoApp/backend/database/seed.sql
```

Or run:
```bash
mysql -u root -p < backend/database/schema.sql
mysql -u root -p < backend/database/seed.sql
```

### Step 2 — Backend

```bash
cd backend
npm install
# Edit .env with your MySQL credentials
npm run dev
```

Backend runs on: `http://localhost:5001`  
Swagger docs: `http://localhost:5001/api-docs`

### Step 3 — Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend runs on: `http://localhost:3001`

---

## 10. Environment Variables

```env
PORT=5001
DATABASE_HOST=localhost
DATABASE_PORT=3306
DATABASE_NAME=demoapp_db
DATABASE_USER=root
DATABASE_PASSWORD=your_password
JWT_SECRET_KEY=your_jwt_secret
JWT_EXPIRES_IN=2h
```

---

## 11. Demo Credentials

| Role  | Email / Username       | Password   |
|-------|------------------------|------------|
| User  | user1@example.com      | Demo@1234  |
| User  | user2@example.com      | Demo@1234  |
| Admin | admin                  | password   |

---

## 12. Demo Workflow

1. Register a new user → triggers PII log (TEST-001)
2. Login → triggers purpose mismatch event (TEST-004)
3. View Profile → API returns excessive data (TEST-002)
4. Browse Products → Place an order → triggers mobile in order log (TEST-001 + TEST-004)
5. Go to Consents → Grant MARKETING → Withdraw MARKETING → marketing event still fires (TEST-003)
6. Submit Deletion Request
7. Login as Admin → view Events and Audit Logs to see all generated evidence

---

## 13. Security Considerations

- Passwords are bcrypt-hashed (never stored in plain text)
- JWT tokens expire in 2 hours
- No real personal information is used — all data is synthetic
- Intentional test scenarios are limited to DPDPA data-governance behavior only
- No SQL injection, XSS, or authentication bypass vulnerabilities are intentionally introduced
- Secrets are loaded from environment variables only
