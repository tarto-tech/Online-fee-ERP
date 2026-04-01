# College ERP Fee Management System

## Architecture Overview

```
Online-fee-ERP/
├── backend/                    # Node.js + Express API
│   ├── src/
│   │   ├── config/             # DB, Razorpay config
│   │   ├── controllers/        # Business logic
│   │   ├── middleware/         # Auth, validation, error handling
│   │   ├── models/             # MongoDB schemas
│   │   ├── routes/             # API route definitions
│   │   ├── services/           # PDF, CSV generation
│   │   ├── utils/              # Logger, AppError, helpers
│   │   ├── app.js              # Express app setup
│   │   └── server.js           # Entry point
│   ├── .env.example
│   └── package.json
├── frontend/                   # React Admin Dashboard
│   └── src/
│       ├── api/                # Axios client + API calls
│       ├── components/         # Layout, ProtectedRoute
│       ├── pages/              # Dashboard, Students, Payments
│       ├── store/              # Zustand auth store
│       └── App.jsx
└── mobile/                     # Flutter Student App
    └── lib/
        ├── core/api/           # Dio client, repositories, providers
        ├── features/auth/      # OTP login screens
        ├── features/fees/      # Fee status + payment
        └── main.dart
```

## Quick Start

### Backend
```bash
cd backend
cp .env.example .env
# Fill in your credentials in .env
npm install
npm run dev
```

### Frontend (React Admin)
```bash
cd frontend
npm install
npm start
```

### Mobile (Flutter)
```bash
cd mobile
flutter pub get
flutter run
```

## API Endpoints

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/auth/admin/login | Admin login |
| GET | /api/auth/admin/me | Get admin profile |
| POST | /api/auth/student/send-otp | Send OTP to student |
| POST | /api/auth/student/verify-otp | Verify OTP + get token |
| GET | /api/auth/student/me | Get student profile |

### Students (Admin only)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/students | List students (paginated, filterable) |
| POST | /api/students | Create student |
| POST | /api/students/bulk-upload | CSV bulk upload |
| GET | /api/students/:id | Get student |
| PATCH | /api/students/:id | Update student |
| DELETE | /api/students/:id | Deactivate student |

### Courses (Admin only)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/courses | List courses |
| POST | /api/courses | Create course |
| PATCH | /api/courses/:id | Update course |
| DELETE | /api/courses/:id | Deactivate course |

### Fee Structures
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/fee-structures | List (Admin) |
| POST | /api/fee-structures | Create (Admin) |
| PATCH | /api/fee-structures/:id | Update (Admin) |
| GET | /api/fee-structures/my-fee-structure | Student's fee structure |

### Payments
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/payments/create-order | Create Razorpay order |
| POST | /api/payments/verify | Verify payment signature |
| POST | /api/payments/webhook | Razorpay webhook |
| GET | /api/payments/my-payments | Student payment history |
| GET | /api/payments/my-fee-status | Student fee status |
| GET | /api/payments/receipt/:id | Download PDF receipt |

### Admin Dashboard
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/admin/stats | Dashboard analytics |
| GET | /api/admin/payments | All payments (filterable) |
| GET | /api/admin/export/payments | Export CSV |

## MongoDB Schema Design

### Normalization Strategy
- `FeeStructure` is separate from `Student` — fees are defined per course+year+academicYear
- `Payment` stores a `feeSnapshot` to preserve fee details at time of payment
- `Student` only references `Course` via ObjectId

### Indexes
- `Student`: mobile, studentId, course+currentYear
- `Payment`: student+status, razorpayOrderId, paidAt
- `FeeStructure`: course+year+academicYear (unique)

## Security Features
- JWT authentication with role-based access (admin/student)
- OTP-based student login (no password stored)
- bcrypt password hashing for admin (cost factor 12)
- Razorpay signature verification (HMAC-SHA256)
- Rate limiting (100 req/15min global, 10 req/15min for auth)
- MongoDB query sanitization (express-mongo-sanitize)
- Helmet.js security headers
- Input validation on all endpoints

## Payment Flow
1. Student requests fee status → sees pending amount
2. Student clicks "Pay" → backend creates Razorpay order
3. Razorpay checkout opens in app/browser
4. On success → frontend calls `/payments/verify` with signature
5. Backend verifies HMAC signature → marks payment as `paid`
6. Webhook handles async failure events

## Partial Payment / Installments
- Set `isPartialPayment: true` and provide `amount` in create-order
- `installmentNumber` tracks 1st or 2nd installment
- `FeeStructure` has `dueDateFirstInstallment` and `dueDateSecondInstallment`
- Late fee auto-calculated based on `lateFeePerDay` × days overdue
