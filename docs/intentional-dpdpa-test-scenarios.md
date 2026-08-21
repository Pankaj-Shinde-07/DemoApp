# DemoApp — Intentional DPDPA Test Scenarios

This document describes all intentional compliance test scenarios built into DemoApp.

DemoApp is the **target application** used by the external DPDPA Audit Platform.
These scenarios are deterministic and exist solely to allow the audit platform to demonstrate detection capability.

---

## TEST-001 — Personal Data in Application Logs (RULE-001)

**Location:** `backend/src/utils/logger.js` → `logWithPII()`  
**Triggered by:** User registration (`POST /api/users/register`)  
**What happens:**  
The registration handler intentionally logs `name`, `email`, and `mobileNumber` in plain text inside the application log message and the `application_audit_logs` database table.

**Example log entry:**
```
2025-01-01 10:00:00 [INFO] [USER_REGISTERED] User registered: name=Demo User email=user@example.com mobile=9000000001
```

**Also triggered by:** Order creation — `mobileNumber` appears in the order log.

**Expected detection by audit platform:**  
`RULE-001: Personal data detected in application logs`  
Severity: HIGH

---

## TEST-002 — Excessive Personal Data Exposure via API (RULE-006)

**Location:** `backend/src/controllers/userController.js` → `getProfile()`  
**Endpoint:** `GET /api/users/:id`  
**What happens:**  
The profile endpoint intentionally returns all personal data fields including `dateOfBirth`, `mobileNumber`, `address`, `gender`, and `postalCode` — fields that are not necessary for a basic profile display.

**Example response:**
```json
{
  "id": 1,
  "fullName": "Demo User One",
  "email": "user1@example.com",
  "mobileNumber": "9000000001",
  "dateOfBirth": "1995-06-15",
  "gender": "male",
  "address": "12 Demo Street, Block A",
  "city": "Mumbai",
  "state": "Maharashtra",
  "postalCode": "400001"
}
```

**Expected detection by audit platform:**  
`RULE-006: Excessive personal data exposure via API`  
Severity: HIGH

---

## TEST-003 — Consent Enforcement Failure (RULE-005)

**Location:** `backend/src/controllers/consentController.js` → `withdrawConsent()`  
**Triggered by:** `POST /api/consents/:id/withdraw` for MARKETING purpose  
**What happens:**  
After a user withdraws MARKETING consent, the backend deliberately emits a `MARKETING_PROCESSING` event with `trigger: POST_CONSENT_WITHDRAWAL`. This simulates a scenario where marketing processing continues after consent withdrawal.

**Event sequence generated:**
```
CONSENT_GRANTED   (purpose: MARKETING)
MARKETING_PROCESSING
CONSENT_WITHDRAWN (purpose: MARKETING)
MARKETING_PROCESSING  ← intentional, post-withdrawal
```

**Also present in seed data:** `evt-seed-006` in `data_processing_events` table.

**Expected detection by audit platform:**  
`RULE-005: Processing continued after consent withdrawal`  
Severity: CRITICAL

---

## TEST-004 — Purpose-Use Mismatch (RULE-003)

**Location:**  
- `backend/src/controllers/userController.js` → `login()` and `getProfile()`  
- `backend/src/controllers/productOrderController.js` → `createOrder()`  
- `docs/data-inventory.json` → `mobileNumber` field  

**What happens:**  
The data inventory declares `mobileNumber` purpose as **"OTP verification only"**.  
However, `mobileNumber` is observed in:
- `USER_LOGIN` event (`dataFields: ["email", "mobileNumber"]`)
- `USER_PROFILE_ACCESSED` event
- `ORDER_CREATED` event and log
- Application audit logs

**Expected detection by audit platform:**  
`RULE-003: Declared purpose vs observed use mismatch`  
Data: mobileNumber | Declared: OTP verification | Observed: login, order, profile  
Severity: MEDIUM/HIGH

---

## TEST-005 — Retention Period Exceeded (RULE-007)

**Location:** `backend/database/seed.sql`  
**Record:** `evt-retention-test-001` in `data_processing_events` table  
**What happens:**  
A `MARKETING_PROCESSING` event is seeded with `createdAt = NOW() - 400 days`.  
The data inventory declares marketing data retention as **365 days**.  
This record is intentionally older than the declared retention period.

**Expected detection by audit platform:**  
`RULE-007: Retention period exceeded`  
Data: marketingData | Declared retention: 365 days | Observed: record is 400 days old  
Severity: MEDIUM

---

## Summary Table

| Test ID  | Scenario                          | Rule     | Severity | Trigger                          |
|----------|-----------------------------------|----------|----------|----------------------------------|
| TEST-001 | PII in application logs           | RULE-001 | HIGH     | Registration, Order creation     |
| TEST-002 | Excessive API data exposure       | RULE-006 | HIGH     | GET /api/users/:id               |
| TEST-003 | Consent enforcement failure       | RULE-005 | CRITICAL | Withdraw MARKETING consent       |
| TEST-004 | Purpose-use mismatch (mobile)     | RULE-003 | HIGH     | Login, Profile, Order events     |
| TEST-005 | Retention period exceeded         | RULE-007 | MEDIUM   | Present in seed data at startup  |

---

## Important Notes

- All test scenarios use **synthetic demo data only**. No real personal information is used.
- These scenarios do not constitute automatic legal violations. They are potential compliance risks for review.
- Each scenario is marked with `INTENTIONAL_DPDPA_TEST_CASE` in code comments.
- The external DPDPA Audit Platform should map each finding to the applicable provision of the DPDP Act 2023 and DPDP Rules 2025.
