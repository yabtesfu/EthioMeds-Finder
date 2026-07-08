# EthioMeds Finder API Documentation

## 1. Overview

EthioMeds Finder is a web application that helps patients find available medicines in approved pharmacies and reserve them online. This document describes the backend REST API.

The backend is a standalone REST API built with **Node.js**, **Express.js**, and **PostgreSQL**. It is consumed by a separate frontend built with vanilla HTML, CSS, and JavaScript. The frontend and backend run on different ports and communicate over HTTP using JSON (and `multipart/form-data` for file uploads).

| Component | Technology | URL |
|---|---|---|
| Backend API | Node.js + Express.js + PostgreSQL | `http://localhost:5050/api` |
| Frontend | HTML / CSS / JavaScript | `http://localhost:5500` |

Key backend features:

- JWT-based authentication
- bcrypt password hashing
- Role-based authorization (patient, pharmacy, admin)
- Parameterized SQL queries against PostgreSQL
- File uploads (prescriptions, ID, face photo) handled with **multer**

## 2. Base URL

All API endpoints are prefixed with:

```
http://localhost:5050/api
```

Example: the login endpoint is `http://localhost:5050/api/auth/login`.

## 3. Authentication

The API uses **JSON Web Tokens (JWT)**.

1. A user registers or logs in.
2. The backend verifies credentials (passwords are compared against bcrypt hashes - plain-text passwords are never stored).
3. The backend signs a JWT containing the user's id and role, and returns it to the client.
4. The frontend stores the token in `localStorage`.
5. For every protected request, the frontend sends the token in the `Authorization` header:

```
Authorization: Bearer <token>
```

If the token is missing, invalid, or expired, protected endpoints return `401 Unauthorized`. If the token is valid but the user's role is not allowed, the endpoint returns `403 Forbidden`.

> The JWT signing secret (`JWT_SECRET`) is stored in the backend `.env` file and is never exposed to the client or committed to Git.

## 4. Roles and Permissions

| Role | Description | Typical permissions |
|---|---|---|
| **Public** | Not logged in | Register, login, browse medicines, search inventory of approved pharmacies |
| **Patient** | Registered user | Everything public can do, plus create reservations, upload prescription documents, view/cancel own reservations |
| **Pharmacy** | Pharmacy staff account | Create/manage own pharmacy profile, manage own inventory, view and approve/reject reservations for their own pharmacy |
| **Admin** | Platform administrator | View platform stats, list all pharmacies, approve/reject pharmacy profiles |

## 5. Standard Response Format

All endpoints return JSON in a consistent envelope.

**Success:**

```json
{
  "success": true,
  "message": "Operation completed successfully",
  "data": {}
}
```

**Error:**

```json
{
  "success": false,
  "message": "Description of what went wrong"
}
```

Common HTTP status codes:

| Code | Meaning |
|---|---|
| 200 | OK - request succeeded |
| 201 | Created - resource created successfully |
| 400 | Bad Request - validation error or missing fields |
| 401 | Unauthorized - missing or invalid token |
| 403 | Forbidden - role not allowed for this action |
| 404 | Not Found - resource does not exist |
| 500 | Internal Server Error |

## 6. Endpoints

### 6.1 Authentication Endpoints

#### POST /api/auth/register

- **Method:** POST
- **URL:** `/api/auth/register`
- **Access:** Public
- **Description:** Creates a new user account. The password is hashed with bcrypt before being stored. The role is `patient` or `pharmacy` (admin accounts are created separately, e.g. by database seeding).

**Request body:**

```json
{
  "name": "Abebe Kebede",
  "email": "abebe@example.com",
  "password": "123456",
  "role": "patient"
}
```

**Response (201):**

```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "user": {
      "id": 1,
      "name": "Abebe Kebede",
      "email": "abebe@example.com",
      "role": "patient"
    },
    "token": "<jwt-token>"
  }
}
```

**curl example:**

```bash
curl -X POST http://localhost:5050/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Abebe Kebede","email":"abebe@example.com","password":"123456","role":"patient"}'
```

**Possible errors:**

| Code | Reason |
|---|---|
| 400 | Missing fields, invalid email, weak password, or email already registered |
| 500 | Server/database error |

#### POST /api/auth/login

- **Method:** POST
- **URL:** `/api/auth/login`
- **Access:** Public
- **Description:** Authenticates a user. The submitted password is compared to the stored bcrypt hash. On success, a JWT token is returned.

**Request body:**

```json
{
  "email": "abebe@example.com",
  "password": "123456"
}
```

**Response (200):**

```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": 1,
      "name": "Abebe Kebede",
      "email": "abebe@example.com",
      "role": "patient"
    },
    "token": "<jwt-token>"
  }
}
```

**curl example:**

```bash
curl -X POST http://localhost:5050/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"abebe@example.com","password":"123456"}'
```

**Possible errors:**

| Code | Reason |
|---|---|
| 400 | Missing email or password |
| 401 | Invalid credentials |
| 500 | Server/database error |

#### GET /api/auth/me

- **Method:** GET
- **URL:** `/api/auth/me`
- **Access:** Any authenticated user (patient, pharmacy, admin)
- **Description:** Returns the profile of the currently logged-in user, based on the JWT token.

**Response (200):**

```json
{
  "success": true,
  "message": "Current user fetched",
  "data": {
    "id": 1,
    "name": "Abebe Kebede",
    "email": "abebe@example.com",
    "role": "patient"
  }
}
```

**curl example:**

```bash
curl http://localhost:5050/api/auth/me \
  -H "Authorization: Bearer <TOKEN>"
```

**Possible errors:**

| Code | Reason |
|---|---|
| 401 | Missing or invalid token |

#### GET /api/auth/admin-only

- **Method:** GET
- **URL:** `/api/auth/admin-only`
- **Access:** Admin
- **Description:** Test/demo endpoint that verifies role-based authorization is working. Only admin tokens can access it.

**Response (200):**

```json
{
  "success": true,
  "message": "Welcome, admin",
  "data": {}
}
```

**curl example:**

```bash
curl http://localhost:5050/api/auth/admin-only \
  -H "Authorization: Bearer <ADMIN_TOKEN>"
```

**Possible errors:**

| Code | Reason |
|---|---|
| 401 | Missing or invalid token |
| 403 | Token is valid but user is not an admin |

### 6.2 Medicines Endpoints

#### GET /api/medicines

- **Method:** GET
- **URL:** `/api/medicines`
- **Access:** Public
- **Description:** Returns the list of medicines in the catalog. Supports optional search/filter query parameters (e.g. `?search=paracetamol`).

**Response (200):**

```json
{
  "success": true,
  "message": "Medicines fetched",
  "data": [
    {
      "id": 1,
      "name": "Paracetamol 500mg",
      "description": "Pain reliever and fever reducer",
      "requires_prescription": false
    },
    {
      "id": 2,
      "name": "Amoxicillin 500mg",
      "description": "Antibiotic",
      "requires_prescription": true
    }
  ]
}
```

**curl example:**

```bash
curl http://localhost:5050/api/medicines
```

**Possible errors:**

| Code | Reason |
|---|---|
| 500 | Server/database error |

#### GET /api/medicines/:id

- **Method:** GET
- **URL:** `/api/medicines/:id`
- **Access:** Public
- **Description:** Returns a single medicine by its id.

**Response (200):**

```json
{
  "success": true,
  "message": "Medicine fetched",
  "data": {
    "id": 2,
    "name": "Amoxicillin 500mg",
    "description": "Antibiotic",
    "requires_prescription": true
  }
}
```

**curl example:**

```bash
curl http://localhost:5050/api/medicines/2
```

**Possible errors:**

| Code | Reason |
|---|---|
| 404 | Medicine not found |
| 500 | Server/database error |

#### POST /api/medicines

- **Method:** POST
- **URL:** `/api/medicines`
- **Access:** Admin (or pharmacy, depending on configuration)
- **Description:** Adds a new medicine to the catalog.

**Request body:**

```json
{
  "name": "Ibuprofen 400mg",
  "description": "Anti-inflammatory pain reliever",
  "requires_prescription": false
}
```

**Response (201):**

```json
{
  "success": true,
  "message": "Medicine created",
  "data": {
    "id": 3,
    "name": "Ibuprofen 400mg",
    "description": "Anti-inflammatory pain reliever",
    "requires_prescription": false
  }
}
```

**curl example:**

```bash
curl -X POST http://localhost:5050/api/medicines \
  -H "Authorization: Bearer <ADMIN_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"name":"Ibuprofen 400mg","description":"Anti-inflammatory pain reliever","requires_prescription":false}'
```

**Possible errors:**

| Code | Reason |
|---|---|
| 400 | Missing/invalid fields |
| 401 | Missing or invalid token |
| 403 | Role not allowed |
| 500 | Server/database error |

### 6.3 Pharmacies Endpoints

#### GET /api/pharmacies

- **Method:** GET
- **URL:** `/api/pharmacies`
- **Access:** Public
- **Description:** Returns the list of **approved** pharmacies. Pending or rejected pharmacies are not shown publicly.

**Response (200):**

```json
{
  "success": true,
  "message": "Pharmacies fetched",
  "data": [
    {
      "id": 1,
      "name": "Bole Pharmacy",
      "address": "Bole Road, Addis Ababa",
      "phone": "+251-911-000000",
      "status": "approved"
    }
  ]
}
```

**curl example:**

```bash
curl http://localhost:5050/api/pharmacies
```

#### POST /api/pharmacies/me

- **Method:** POST
- **URL:** `/api/pharmacies/me`
- **Access:** Pharmacy
- **Description:** Creates (or submits) the pharmacy profile for the logged-in pharmacy user. The profile starts in `pending` status until an admin approves it.

**Request body:**

```json
{
  "name": "Bole Pharmacy",
  "address": "Bole Road, Addis Ababa",
  "phone": "+251-911-000000"
}
```

**Response (201):**

```json
{
  "success": true,
  "message": "Pharmacy profile created and pending approval",
  "data": {
    "id": 1,
    "name": "Bole Pharmacy",
    "address": "Bole Road, Addis Ababa",
    "phone": "+251-911-000000",
    "status": "pending"
  }
}
```

**curl example:**

```bash
curl -X POST http://localhost:5050/api/pharmacies/me \
  -H "Authorization: Bearer <PHARMACY_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"name":"Bole Pharmacy","address":"Bole Road, Addis Ababa","phone":"+251-911-000000"}'
```

**Possible errors:**

| Code | Reason |
|---|---|
| 400 | Missing fields or profile already exists |
| 401 | Missing or invalid token |
| 403 | User is not a pharmacy role |

#### GET /api/pharmacies/me

- **Method:** GET
- **URL:** `/api/pharmacies/me`
- **Access:** Pharmacy
- **Description:** Returns the pharmacy profile belonging to the logged-in pharmacy user, including its approval status.

**Response (200):**

```json
{
  "success": true,
  "message": "Pharmacy profile fetched",
  "data": {
    "id": 1,
    "name": "Bole Pharmacy",
    "address": "Bole Road, Addis Ababa",
    "phone": "+251-911-000000",
    "status": "approved"
  }
}
```

**curl example:**

```bash
curl http://localhost:5050/api/pharmacies/me \
  -H "Authorization: Bearer <PHARMACY_TOKEN>"
```

**Possible errors:**

| Code | Reason |
|---|---|
| 401 | Missing or invalid token |
| 403 | User is not a pharmacy role |
| 404 | Pharmacy profile not created yet |

### 6.4 Admin Endpoints

#### GET /api/admin/stats

- **Method:** GET
- **URL:** `/api/admin/stats`
- **Access:** Admin
- **Description:** Returns platform statistics (counts of users, pharmacies, medicines, reservations, etc.).

**Response (200):**

```json
{
  "success": true,
  "message": "Stats fetched",
  "data": {
    "totalUsers": 25,
    "totalPharmacies": 5,
    "pendingPharmacies": 2,
    "totalMedicines": 40,
    "totalReservations": 60
  }
}
```

**curl example:**

```bash
curl http://localhost:5050/api/admin/stats \
  -H "Authorization: Bearer <ADMIN_TOKEN>"
```

#### GET /api/admin/pharmacies

- **Method:** GET
- **URL:** `/api/admin/pharmacies`
- **Access:** Admin
- **Description:** Returns all pharmacies regardless of status (pending, approved, rejected), so the admin can review them.

**Response (200):**

```json
{
  "success": true,
  "message": "Pharmacies fetched",
  "data": [
    { "id": 1, "name": "Bole Pharmacy", "status": "approved" },
    { "id": 2, "name": "Piassa Pharmacy", "status": "pending" }
  ]
}
```

**curl example:**

```bash
curl http://localhost:5050/api/admin/pharmacies \
  -H "Authorization: Bearer <ADMIN_TOKEN>"
```

#### PATCH /api/admin/pharmacies/:id/approve

- **Method:** PATCH
- **URL:** `/api/admin/pharmacies/:id/approve`
- **Access:** Admin
- **Description:** Approves a pending pharmacy. Approved pharmacies appear in public search and can add inventory.

**Response (200):**

```json
{
  "success": true,
  "message": "Pharmacy approved",
  "data": { "id": 2, "status": "approved" }
}
```

**curl example:**

```bash
curl -X PATCH http://localhost:5050/api/admin/pharmacies/2/approve \
  -H "Authorization: Bearer <ADMIN_TOKEN>"
```

#### PATCH /api/admin/pharmacies/:id/reject

- **Method:** PATCH
- **URL:** `/api/admin/pharmacies/:id/reject`
- **Access:** Admin
- **Description:** Rejects a pharmacy profile. Rejected pharmacies do not appear in public search and cannot add inventory.

**Response (200):**

```json
{
  "success": true,
  "message": "Pharmacy rejected",
  "data": { "id": 2, "status": "rejected" }
}
```

**curl example:**

```bash
curl -X PATCH http://localhost:5050/api/admin/pharmacies/2/reject \
  -H "Authorization: Bearer <ADMIN_TOKEN>"
```

**Possible errors (all admin endpoints):**

| Code | Reason |
|---|---|
| 401 | Missing or invalid token |
| 403 | User is not an admin |
| 404 | Pharmacy not found |

### 6.5 Inventory Endpoints

#### GET /api/inventory/search

- **Method:** GET
- **URL:** `/api/inventory/search`
- **Access:** Public
- **Description:** Searches available medicines across **approved** pharmacies. Supports query parameters such as `?medicine=paracetamol`.

**Response (200):**

```json
{
  "success": true,
  "message": "Inventory search results",
  "data": [
    {
      "inventoryId": 10,
      "medicine": "Paracetamol 500mg",
      "pharmacy": "Bole Pharmacy",
      "price": 25.0,
      "stock": 100,
      "requires_prescription": false
    }
  ]
}
```

**curl example:**

```bash
curl "http://localhost:5050/api/inventory/search?medicine=paracetamol"
```

#### GET /api/inventory/me

- **Method:** GET
- **URL:** `/api/inventory/me`
- **Access:** Pharmacy
- **Description:** Returns the inventory items belonging to the logged-in pharmacy.

**curl example:**

```bash
curl http://localhost:5050/api/inventory/me \
  -H "Authorization: Bearer <PHARMACY_TOKEN>"
```

#### POST /api/inventory/me

- **Method:** POST
- **URL:** `/api/inventory/me`
- **Access:** Pharmacy (approved pharmacies only)
- **Description:** Adds a medicine to the logged-in pharmacy's inventory with price and stock.

**Request body:**

```json
{
  "medicineId": 1,
  "price": 25.0,
  "stock": 100
}
```

**Response (201):**

```json
{
  "success": true,
  "message": "Inventory item added",
  "data": {
    "id": 10,
    "medicineId": 1,
    "price": 25.0,
    "stock": 100
  }
}
```

**curl example:**

```bash
curl -X POST http://localhost:5050/api/inventory/me \
  -H "Authorization: Bearer <PHARMACY_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"medicineId":1,"price":25.0,"stock":100}'
```

**Possible errors:**

| Code | Reason |
|---|---|
| 400 | Missing fields or medicine already in inventory |
| 403 | Pharmacy not approved yet, or wrong role |

#### PATCH /api/inventory/:id

- **Method:** PATCH
- **URL:** `/api/inventory/:id`
- **Access:** Pharmacy (owner of the inventory item)
- **Description:** Updates price and/or stock of an inventory item. A pharmacy can only update its own items.

**Request body:**

```json
{
  "price": 27.5,
  "stock": 80
}
```

**curl example:**

```bash
curl -X PATCH http://localhost:5050/api/inventory/10 \
  -H "Authorization: Bearer <PHARMACY_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"price":27.5,"stock":80}'
```

**Possible errors:**

| Code | Reason |
|---|---|
| 403 | Item belongs to another pharmacy |
| 404 | Inventory item not found |

### 6.6 Reservations Endpoints

#### POST /api/reservations

- **Method:** POST
- **URL:** `/api/reservations`
- **Access:** Patient
- **Description:** Creates a reservation for an available inventory item. If the medicine requires a prescription, the reservation stays incomplete/pending until the prescription documents are uploaded.

**Request body:**

```json
{
  "inventoryId": 10,
  "quantity": 2
}
```

**Response (201):**

```json
{
  "success": true,
  "message": "Reservation created",
  "data": {
    "id": 1,
    "inventoryId": 10,
    "quantity": 2,
    "status": "pending",
    "requiresPrescription": false
  }
}
```

**curl example:**

```bash
curl -X POST http://localhost:5050/api/reservations \
  -H "Authorization: Bearer <PATIENT_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"inventoryId":10,"quantity":2}'
```

**Possible errors:**

| Code | Reason |
|---|---|
| 400 | Not enough stock, invalid quantity |
| 403 | User is not a patient |
| 404 | Inventory item not found |

#### GET /api/reservations/me

- **Method:** GET
- **URL:** `/api/reservations/me`
- **Access:** Patient
- **Description:** Returns all reservations created by the logged-in patient, including their statuses.

**curl example:**

```bash
curl http://localhost:5050/api/reservations/me \
  -H "Authorization: Bearer <PATIENT_TOKEN>"
```

#### PATCH /api/reservations/:id/cancel

- **Method:** PATCH
- **URL:** `/api/reservations/:id/cancel`
- **Access:** Patient (owner of the reservation)
- **Description:** Cancels the patient's own reservation. The record is **not deleted** - its status is changed to `cancelled`, which keeps the history in the database.

**curl example:**

```bash
curl -X PATCH http://localhost:5050/api/reservations/1/cancel \
  -H "Authorization: Bearer <PATIENT_TOKEN>"
```

**Possible errors:**

| Code | Reason |
|---|---|
| 400 | Reservation already cancelled/completed |
| 403 | Reservation belongs to another patient |
| 404 | Reservation not found |

#### GET /api/reservations/pharmacy/me

- **Method:** GET
- **URL:** `/api/reservations/pharmacy/me`
- **Access:** Pharmacy
- **Description:** Returns all reservations made against the logged-in pharmacy's inventory, so staff can review and approve or reject them.

**curl example:**

```bash
curl http://localhost:5050/api/reservations/pharmacy/me \
  -H "Authorization: Bearer <PHARMACY_TOKEN>"
```

#### PATCH /api/reservations/:id/approve

- **Method:** PATCH
- **URL:** `/api/reservations/:id/approve`
- **Access:** Pharmacy (only for reservations on its own inventory)
- **Description:** Approves a reservation. For prescription-required medicines, the pharmacy should review the uploaded documents first.

**curl example:**

```bash
curl -X PATCH http://localhost:5050/api/reservations/1/approve \
  -H "Authorization: Bearer <PHARMACY_TOKEN>"
```

#### PATCH /api/reservations/:id/reject

- **Method:** PATCH
- **URL:** `/api/reservations/:id/reject`
- **Access:** Pharmacy (only for reservations on its own inventory)
- **Description:** Rejects a reservation (e.g. invalid prescription, out of stock).

**curl example:**

```bash
curl -X PATCH http://localhost:5050/api/reservations/1/reject \
  -H "Authorization: Bearer <PHARMACY_TOKEN>"
```

**Possible errors (approve/reject):**

| Code | Reason |
|---|---|
| 400 | Reservation not in a pending state |
| 403 | Reservation belongs to a different pharmacy |
| 404 | Reservation not found |

## 7. File Upload - Prescription Documents

#### POST /api/reservations/:id/prescription

- **Method:** POST
- **URL:** `/api/reservations/:id/prescription`
- **Access:** Patient (owner of the reservation)
- **Content type:** `multipart/form-data`
- **Description:** Uploads the documents required for prescription-only medicines. Uploads are handled by **multer**.

**Form fields:**

| Field | Type | Description |
|---|---|---|
| `facePhoto` | File (image) | Photo of the patient's face |
| `idCard` | File (image) | Government-issued ID card |
| `prescriptionFile` | File (image or PDF) | The prescription document |
| `prescriptionExpiryDate` | Text (YYYY-MM-DD) | Expiry date of the prescription |

**curl example:**

```bash
curl -X POST http://localhost:5050/api/reservations/1/prescription \
  -H "Authorization: Bearer <PATIENT_TOKEN>" \
  -F "prescriptionExpiryDate=2026-12-31" \
  -F "facePhoto=@/path/to/face.jpg" \
  -F "idCard=@/path/to/id-card.jpg" \
  -F "prescriptionFile=@/path/to/prescription.pdf"
```

**Response (200):**

```json
{
  "success": true,
  "message": "Prescription documents uploaded",
  "data": {
    "reservationId": 1,
    "prescriptionExpiryDate": "2026-12-31"
  }
}
```

**Possible errors:**

| Code | Reason |
|---|---|
| 400 | Missing file(s), invalid file type, file too large, missing/expired expiry date |
| 403 | Reservation belongs to another patient |
| 404 | Reservation not found |

**File storage notes:**

- Uploaded files are stored **locally** in `backend/uploads/`.
- This folder is listed in `.gitignore`, so uploaded files are **never pushed to GitHub**.
- File type and size are validated on the server (e.g. only images/PDF, with a maximum size limit).

## 8. Business Rules

1. **Pharmacy approval:** Only pharmacies approved by an admin appear in public search results.
2. **Inventory:** Only approved pharmacies can add or manage inventory.
3. **Reservations:** Patients can reserve medicines that are in stock.
4. **Prescriptions:** Medicines marked `requires_prescription` need a face photo, ID card, prescription document, and prescription expiry date uploaded before the pharmacy can approve the reservation.
5. **Ownership:** Pharmacy users can only approve/reject reservations that belong to their own pharmacy. Patients can only manage their own reservations.
6. **Admin control:** Only admins approve or reject pharmacy profiles.
7. **Soft cancellation:** Cancelled reservations are not deleted; their status is changed to `cancelled` so history is preserved.
8. **Stock handling:** Inventory stock decreases when a reservation is created/confirmed. Cancelled or rejected reservations may restore the stock, depending on the implemented logic.

## 9. Security Notes

- **Password hashing:** All passwords are hashed with bcrypt; plain-text passwords are never stored.
- **JWT authentication:** Protected routes require a valid Bearer token.
- **Role middleware:** Authorization middleware checks the user's role before allowing access to protected routes.
- **SQL injection protection:** All database queries use parameterized values (`$1`, `$2`, …) instead of string concatenation.
- **Secrets:** Sensitive values (database credentials, `JWT_SECRET`) are stored in a `.env` file that is not committed to Git.
- **Uploads:** Uploaded files are stored locally in `backend/uploads/`, excluded from Git, and validated by type and size before being accepted.

## 10. Frontend Integration

The frontend (running at `http://localhost:5500`) communicates with the API as follows:

- All requests are made with `fetch` through a shared `apiRequest` helper function.
- After login/registration, the JWT token is saved in `localStorage`.
- For protected requests, the helper attaches the header `Authorization: Bearer <token>`.
- The main flows the frontend calls are:
  - **Auth:** `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me`
  - **Search:** `GET /api/inventory/search`
  - **Reservations:** `POST /api/reservations`, `GET /api/reservations/me`, prescription upload
  - **Pharmacy dashboard:** inventory and reservation management endpoints
  - **Admin dashboard:** stats and pharmacy approval endpoints

## 11. Testing Flow

A simple end-to-end test of the system:

1. **Register a patient** - `POST /api/auth/register` with role `patient`.
2. **Login as the patient** - `POST /api/auth/login`, save the token.
3. **Search for a medicine** - `GET /api/inventory/search?medicine=...`.
4. **Reserve a medicine** - `POST /api/reservations`.
5. **Upload prescription** (if the medicine requires one) - `POST /api/reservations/:id/prescription` with `multipart/form-data`.
6. **View reservations** - `GET /api/reservations/me`.
7. **Register/login a pharmacy user and create a pharmacy profile** - `POST /api/pharmacies/me` (status: pending).
8. **Login as admin and approve the pharmacy** - `PATCH /api/admin/pharmacies/:id/approve`.
9. **Pharmacy adds inventory** - `POST /api/inventory/me`.
10. **Pharmacy reviews reservations and approves/rejects** - `GET /api/reservations/pharmacy/me`, then `PATCH /api/reservations/:id/approve` or `/reject`.

*EthioMeds Finder - Project API Documentation - author - Yabetse Tesfaye*
