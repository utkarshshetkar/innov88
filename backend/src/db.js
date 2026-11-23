const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const fs = require('fs');

const DB_PATH = path.join(__dirname, '..', 'data', 'booking.db');
const dataDir = path.dirname(DB_PATH);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = new DatabaseSync(DB_PATH);

db.exec(`
  PRAGMA journal_mode = WAL;
  PRAGMA foreign_keys = ON;

  -- 1. Users Table (Includes Student, Coordinator, Faculty, In-Charge, HOD, Admin)
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('student','coordinator','faculty','incharge','hod','admin')),
    designation TEXT DEFAULT 'Student',
    is_protected INTEGER NOT NULL DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
  );

  -- 2. Campus Rooms Table
  CREATE TABLE IF NOT EXISTS rooms (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK(type IN ('lab','seminar_hall','auditorium','classroom')),
    capacity INTEGER NOT NULL,
    facilities TEXT NOT NULL DEFAULT '[]',
    needs_approval INTEGER NOT NULL DEFAULT 0,
    incharge_id TEXT REFERENCES users(id),
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now'))
  );

  -- 3. Academic Timetable Table (For Automated Clash Detection)
  CREATE TABLE IF NOT EXISTS timetable (
    id TEXT PRIMARY KEY,
    room_id TEXT NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    day_of_week INTEGER NOT NULL,
    start_time TEXT NOT NULL,
    end_time TEXT NOT NULL,
    subject TEXT NOT NULL,
    faculty_name TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
  );

  -- 4. Bookings Table (Includes Sequential Pipeline Stages & Equipment Requirements)
  CREATE TABLE IF NOT EXISTS bookings (
    id TEXT PRIMARY KEY,
    room_id TEXT NOT NULL REFERENCES rooms(id),
    user_id TEXT NOT NULL REFERENCES users(id),
    title TEXT NOT NULL,
    description TEXT,
    date TEXT NOT NULL,
    start_time TEXT NOT NULL,
    end_time TEXT NOT NULL,
    attendees INTEGER NOT NULL DEFAULT 1,
    requirements TEXT DEFAULT '[]',
    status TEXT NOT NULL DEFAULT 'pending_coordinator'
      CHECK(status IN ('pending','pending_coordinator','pending_faculty','pending_incharge','pending_hod','approved','rejected','cancelled')),
    current_stage TEXT NOT NULL DEFAULT 'coordinator',
    approval_history TEXT NOT NULL DEFAULT '[]',
    reject_reason TEXT,
    rejected_by TEXT REFERENCES users(id),
    rejected_at TEXT,
    approved_by TEXT REFERENCES users(id),
    approved_at TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );

  -- 5. In-App Notifications Center Table
  CREATE TABLE IF NOT EXISTS notifications (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id),
    booking_id TEXT REFERENCES bookings(id),
    message TEXT NOT NULL,
    is_read INTEGER NOT NULL DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
  );
`);

// Safe migrations in case table was partially upgraded
try { db.exec(`ALTER TABLE users ADD COLUMN designation TEXT DEFAULT 'Student'`); } catch(e) {}
try { db.exec(`ALTER TABLE users ADD COLUMN is_protected INTEGER NOT NULL DEFAULT 0`); } catch(e) {}
try { db.exec(`ALTER TABLE bookings ADD COLUMN requirements TEXT DEFAULT '[]'`); } catch(e) {}
try { db.exec(`ALTER TABLE bookings ADD COLUMN current_stage TEXT NOT NULL DEFAULT 'coordinator'`); } catch(e) {}
try { db.exec(`ALTER TABLE bookings ADD COLUMN approval_history TEXT NOT NULL DEFAULT '[]'`); } catch(e) {}
try { db.exec(`ALTER TABLE bookings ADD COLUMN rejected_by TEXT REFERENCES users(id)`); } catch(e) {}
try { db.exec(`ALTER TABLE bookings ADD COLUMN rejected_at TEXT`); } catch(e) {}

module.exports = db;