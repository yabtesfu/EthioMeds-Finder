# EthioMeds Finder

EthioMeds Finder is a web application that helps users find medicine availability in pharmacies and reserve available medicines online.

This project is being developed as a web development capstone project using Node.js, Express.js, PostgreSQL, and a separate frontend.

## Problem

In Ethiopia, people often need to visit or call many pharmacies to check if a medicine is available. This can waste time, especially when the medicine is urgent.

EthioMeds Finder aims to make this process easier by allowing users to search for medicines, check pharmacy availability, and reserve available medicines online.

## Main Users

The system has three types of users:

* Patient/User
* Pharmacy Staff
* Admin

## Current Features

* User registration and login
* Password hashing using bcrypt
* JWT authentication
* Role-based authorization
* Medicine search
* Pharmacy profile creation
* Admin pharmacy approval
* Pharmacy inventory management
* Medicine availability search
* Medicine reservation
* Pharmacy reservation approval/rejection
* Prescription document upload for medicines that require prescriptions
* Separate frontend that consumes the backend API

## Prescription Feature

Some medicines may require a valid prescription before reservation approval.

For prescription-required medicines, the patient can upload:

* Face photo
* Government ID card
* Prescription document
* Prescription expiry date

The system stores the uploaded files locally for review. Uploaded files are ignored by Git and are not pushed to GitHub.

For a real production system, this feature would need stronger security such as encrypted storage, identity verification, OCR, doctor verification, and secure cloud file storage.

## Technology Stack

### Backend

* Node.js
* Express.js
* PostgreSQL
* bcryptjs
* JSON Web Token
* multer
* dotenv
* cors

### Frontend

* HTML
* CSS
* JavaScript

### Architecture

* REST API
* MVC structure
* JWT authentication
* Role-based authorization
* Relational database design

## Current API Endpoints

### Authentication

* POST /api/auth/register
* POST /api/auth/login
* GET /api/auth/me

### Medicines

* GET /api/medicines
* GET /api/medicines/:id
* POST /api/medicines

### Pharmacies

* GET /api/pharmacies
* POST /api/pharmacies/me
* GET /api/pharmacies/me

### Admin

* GET /api/admin/stats
* GET /api/admin/pharmacies
* PATCH /api/admin/pharmacies/:id/approve
* PATCH /api/admin/pharmacies/:id/reject

### Inventory

* GET /api/inventory/search
* GET /api/inventory/me
* POST /api/inventory/me
* PATCH /api/inventory/:id

### Reservations

* POST /api/reservations
* GET /api/reservations/me
* PATCH /api/reservations/:id/cancel
* GET /api/reservations/pharmacy/me
* PATCH /api/reservations/:id/approve
* PATCH /api/reservations/:id/reject
* POST /api/reservations/:id/prescription

## Running the Backend

Go to the backend folder:

```bash
cd backend
```

Install dependencies:

```bash
npm install
```

Create a `.env` file inside the backend folder using `.env.example` as a guide.

Run the backend:

```bash
npm run dev
```

The backend will run on:

```txt
http://localhost:5050
```

## Running the Frontend

Go to the frontend folder:

```bash
cd frontend
```

Run a simple local server:

```bash
python3 -m http.server 5500
```

Open the frontend in the browser:

```txt
http://localhost:5500
```

## Database Setup

Create the PostgreSQL database:

```bash
createdb ethiomeds_finder
```

Run the schema file:

```bash
cd backend
psql -d ethiomeds_finder -f database/schema.sql
```

Run the seed file:

```bash
psql -d ethiomeds_finder -f database/seed.sql
```

If prescription fields are added separately, run:

```bash
psql -d ethiomeds_finder -f database/prescription_update.sql
```

## Environment Variables

The backend requires the following environment variables:

```env
PORT=5050
NODE_ENV=development

DB_HOST=localhost
DB_PORT=5432
DB_NAME=ethiomeds_finder
DB_USER=your_postgres_username
DB_PASSWORD=your_postgres_password

JWT_SECRET=your_jwt_secret_here
JWT_EXPIRES_IN=1d
```

## Author

Yabetse Tesfaye
