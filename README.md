# 🅿 ParkMaster — Parking Slot Management System

A complete, production-level Parking Management System built with **Node.js + Express + MySQL**.

---

## 📁 Folder Structure

```
parkmaster/
├── public/
│   └── index.html        ← Full frontend (single-file SPA)
├── server.js             ← Express backend + all REST APIs
├── schema.sql            ← Database schema + sample data
├── package.json          ← Dependencies
└── README.md             ← This file
```

---

## ⚙️ Setup Instructions

### Prerequisites
- **Node.js** v16+ → https://nodejs.org
- **MySQL** v8.0+ → https://dev.mysql.com/downloads/

---

### Step 1 — Create Database

Open MySQL CLI or MySQL Workbench and run:

```sql
SOURCE /path/to/parkmaster/schema.sql;
```

Or via CLI:
```bash
mysql -u root -p < schema.sql
```

This will:
- Create `parkmaster` database
- Create all 8 tables
- Insert 25–30 sample records

---

### Step 2 — Configure DB Password

Open `server.js` and find this section (around line 20):

```js
const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: '',   // ← PUT YOUR MYSQL PASSWORD HERE
  database: 'parkmaster',
};
```

---

### Step 3 — Install Dependencies

```bash
cd parkmaster
npm install
```

---

### Step 4 — Start the Server

```bash
npm start
```

Or for auto-reload during development:
```bash
npm run dev
```

---

### Step 5 — Open in Browser

Navigate to: **http://localhost:3000**

---

## 🌐 API Endpoints

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/dashboard` | Stats overview |
| GET | `/api/slots` | All parking slots |
| POST | `/api/entry` | Register vehicle entry |
| POST | `/api/exit` | Register vehicle exit |
| GET | `/api/payments` | All payments |
| POST | `/api/approve-payment` | Admin: approve payment |
| GET | `/api/records` | Parking records |
| GET | `/api/users` | All users |
| POST | `/api/users` | Add user |
| GET | `/api/vehicles` | All vehicles |
| POST | `/api/vehicles` | Register vehicle |
| GET | `/api/logs` | Audit logs |

---

## 🎯 How to Use

### Full Flow:
1. **Register a user** → Users page → + Add User
2. **Register a vehicle** → Vehicles page → + Register Vehicle (link to user)
3. **Vehicle Entry** → Entry/Exit page → enter plate → Register Entry
4. **Vehicle Exit** → Entry/Exit page → enter plate → Checkout
5. **Admin Approval** → Payments page → click ✓ Approve
6. Slot automatically becomes **available** after approval

### Manual Slot Booking:
- Go to **Slot Map** → click any **green slot** → enter vehicle plate

---

## 🗄️ Database Tables

| # | Table | Description |
|---|-------|-------------|
| 1 | `parking_lots` | Parking facility info |
| 2 | `slot_types` | Car / Bike types + rates |
| 3 | `parking_slots` | 50 individual slots |
| 4 | `users` | Registered users |
| 5 | `vehicles` | Registered vehicles |
| 6 | `parking_sessions` | Parking session records |
| 7 | `payments` | Payment tracking |
| 8 | `audit_logs` | System action log |

---

## 💡 Business Rules

- A vehicle **cannot** have multiple active sessions simultaneously
- A slot **cannot** be assigned if already occupied
- A slot becomes **available only** after admin approves payment
- Payment flow: `entry → exit → pending → admin approval → paid → slot freed`
- Minimum billing = **1 hour**

---

## 🛠️ Tech Stack

| Layer | Tech |
|-------|------|
| Frontend | HTML5, CSS3, Vanilla JS |
| Backend | Node.js, Express 4.x |
| Database | MySQL 8.x |
| DB Driver | mysql2/promise |

---

*Built for college project submission — ParkMaster v1.0*
