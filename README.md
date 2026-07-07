# EthioMeds Finder

EthioMeds Finder is a web application that helps users find medicine availability in pharmacies and reserve available medicines online.

This project is being developed as a web development capstone project using Node.js, Express.js, PostgreSQL, and a separate frontend.

## Problem

In Ethiopia, people often need to visit or call many pharmacies to check if a medicine is available. This can waste time, especially when the medicine is urgent.

EthioMeds Finder aims to make this process easier by allowing users to search for medicines and see where they are available.

## Main Users

The system will have three types of users:

* Patient/User
* Pharmacy Staff
* Admin

## Planned Features

* User registration and login
* Password hashing
* JWT authentication
* Role-based authorization
* Medicine search
* Pharmacy inventory management
* Medicine reservation
* Admin approval for pharmacies

## Technology Stack

* Node.js
* Express.js
* PostgreSQL
* HTML
* CSS
* JavaScript

## Current API Endpoints

### Authentication

- POST /api/auth/register
- POST /api/auth/login
- GET /api/auth/me

### Medicines

- GET /api/medicines
- GET /api/medicines/:id
- POST /api/medicines

### Pharmacies

- GET /api/pharmacies
- POST /api/pharmacies/me
- GET /api/pharmacies/me

