# 🏫 RoomBook — College Seminar Hall & Lab Booking System

> Built for ACM Hackathon: SE Track (2nd Year) | Problem Statement 9

A full-stack web application that lets faculty, club coordinators, room in-charges and admins book college spaces — without double bookings, phone calls, or WhatsApp chains.

---

## ✨ Features

| Feature | Detail |
|---|---|
| 🔐 **Role-based auth** | Faculty, Coordinator, In-charge, Admin |
| 🏢 **Room catalogue** | Filter by type, capacity, facilities |
| 📅 **FullCalendar view** | Per-room interactive calendar showing lectures + bookings |
| 🚫 **Clash detection** | Blocks bookings that overlap with lectures or other bookings |
| ✅ **Smart approval** | Labs auto-confirm; Seminar Hall / Auditorium go to in-charge |
| 💡 **Suggestions** | On clash, suggests free time slots or alternative rooms |
| 🔔 **Notifications** | In-app bell notifies on approval, rejection, cancellation |
| 📊 **Analytics** | Busiest days, room utilization, monthly trends, pie charts |
| 👤 **Admin panel** | Add rooms, set facilities/capacity, manage timetable |
| ❌ **Cancellation** | Cancel any active booking; slot freed instantly |

---

## 🚀 Quick Start

### Prerequisites

- **Node.js 18+** — [Download from nodejs.org](https://nodejs.org) (LTS version)
- Git (optional)

### Windows

```bat
start.bat
```

### Linux / macOS

```bash
chmod +x start.sh && ./start.sh
```

### Manual start

```bash
# Terminal 1 — Backend
cd backend
cp .env.example .env
npm install
node src/seed.js        # populate demo data
npm run dev             # starts on http://localhost:3001

# Terminal 2 — Frontend
cd frontend
npm install
npm run dev             # starts on http://localhost:5173
```

Open **http://localhost:5173** in your browser.

---

## 🔑 Demo Accounts

| Email | Password | Role |
|---|---|---|
| admin@college.edu | admin123 | Admin |
| priya@college.edu | priya123 | In-charge (Seminar Hall & Auditorium) |
| rahul@college.edu | rahul123 | Faculty |
| meera@college.edu | meera123 | Faculty |
| arjun@college.edu | arjun123 | Club Coordinator |

---

## 🗂️ Project Structure

```
room-booking/
├── backend/
│   ├── src/
│   │   ├── index.js           ← Express entry point
│   │   ├── db.js              ← SQLite schema & connection
│   │   ├── middleware.js      ← JWT auth middleware
│   │   ├── seed.js            ← Demo data seed
│   │   └── routes/
│   │       ├── auth.js        ← Login, register, /me
│   │       ├── rooms.js       ← Rooms CRUD + timetable + availability
│   │       ├── bookings.js    ← Bookings CRUD + approve/reject/cancel
│   │       ├── notifications.js
│   │       └── analytics.js   ← Overview, utilization, slot suggestions
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── App.jsx            ← Routes & protected routes
│   │   ├── api.js             ← Axios instance with JWT interceptor
│   │   ├── context/
│   │   │   └── AuthContext.jsx
│   │   ├── components/
│   │   │   ├── Layout.jsx     ← Sidebar + top bar
│   │   │   ├── StatusBadge.jsx
│   │   │   └── RoomTypeBadge.jsx
│   │   └── pages/
│   │       ├── LoginPage.jsx
│   │       ├── RegisterPage.jsx
│   │       ├── DashboardPage.jsx
│   │       ├── RoomsPage.jsx       ← Filter rooms by type/capacity/facility
│   │       ├── RoomDetailPage.jsx  ← FullCalendar per room
│   │       ├── NewBookingPage.jsx  ← Book + clash error + suggestions
│   │       ├── BookingsPage.jsx    ← My bookings + cancel
│   │       ├── ApprovalsPage.jsx   ← Approve / reject with reason
│   │       ├── AnalyticsPage.jsx   ← Charts (Recharts)
│   │       ├── AdminPage.jsx       ← Rooms + timetable management
│   │       └── NotificationsPage.jsx
│   └── package.json
│
├── start.bat      ← Windows one-click launcher
├── start.sh       ← Linux/macOS launcher
└── README.md
```

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite, Tailwind CSS |
| Calendar | FullCalendar v6 (TimeGrid + DayGrid) |
| Charts | Recharts |
| Backend | Node.js, Express |
| Database | SQLite (via better-sqlite3 — zero config, file-based) |
| Auth | JWT (jsonwebtoken + bcrypt) |
| Icons | Lucide React |

---

## 📡 API Reference

```
POST   /api/auth/register
POST   /api/auth/login
GET    /api/auth/me

GET    /api/rooms
POST   /api/rooms                        [admin]
GET    /api/rooms/:id
PUT    /api/rooms/:id                    [admin]
DELETE /api/rooms/:id                   [admin]
GET    /api/rooms/:id/timetable
POST   /api/rooms/:id/timetable         [admin]
DELETE /api/rooms/:id/timetable/:slotId [admin]
GET    /api/rooms/:id/availability?date=YYYY-MM-DD

GET    /api/bookings
POST   /api/bookings
GET    /api/bookings/:id
PATCH  /api/bookings/:id/approve        [incharge, admin]
PATCH  /api/bookings/:id/reject         [incharge, admin]
PATCH  /api/bookings/:id/cancel
GET    /api/bookings/room/:id/calendar?month=YYYY-MM

GET    /api/notifications
PATCH  /api/notifications/mark-read

GET    /api/analytics/overview          [admin, incharge]
GET    /api/analytics/room-utilization  [admin, incharge]
GET    /api/analytics/suggest?room_id=X&date=YYYY-MM-DD&duration=2
```

---

## 🌟 Original Ideas / Judges' Extras

1. **Smart Slot Suggestions** — When a booking clashes, the system automatically suggests free time slots for the same room AND shows alternative rooms that are available. Click to auto-fill the form.

2. **Auto-approval by room type** — Labs and classrooms approve instantly; only Seminar Hall and Auditorium require in-charge approval. This mirrors real college workflows.

3. **Conflict-aware calendar** — FullCalendar colour-codes regular lectures (purple), approved bookings (green) and pending bookings (amber), giving the in-charge full context at a glance.

4. **Recurring timetable engine** — Admin enters slots once per weekday; the system expands them infinitely across the calendar, so a lecture every Monday 9–11am never lets a booking slip through.

---

## 🔒 Environment Variables

Copy `backend/.env.example` to `backend/.env`:

```env
PORT=3001
FRONTEND_URL=http://localhost:5173
JWT_SECRET=change-me-in-production-use-a-long-random-string
```

> **Important**: Change `JWT_SECRET` before deploying to production.

---

## 🚢 Deployment

**Render (backend):**
1. Create a Node.js web service, set root to `backend/`
2. Build command: `npm install && node src/seed.js`
3. Start command: `node src/index.js`

**Vercel / Netlify (frontend):**
1. Set root to `frontend/`
2. Build command: `npm run build`
3. Set `VITE_API_URL` env var to your Render backend URL
4. Update `vite.config.js` proxy to point to production URL

---

*Made with ❤️ for the ACM Hackathon*
