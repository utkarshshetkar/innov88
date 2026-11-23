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
  PRAGMA foreign_keys = OFF;

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

<<<<<<< Updated upstream
// Safe migrations in case table was partially upgraded
=======
// -------------------------------------------------------------
// Check and migrate existing tables with outdated CHECK constraints
// -------------------------------------------------------------
try {
  const userTable = db.prepare("SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'users'").get();
  if (userTable && typeof userTable.sql === 'string' && !userTable.sql.includes("'student'")) {
    console.log('Migrating users table schema to support student & hod roles...');
    db.exec(`
      CREATE TABLE users_migrated (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        role TEXT NOT NULL CHECK(role IN ('student','coordinator','faculty','incharge','hod','admin')),
        designation TEXT DEFAULT 'Student',
        is_protected INTEGER NOT NULL DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now'))
      );
      INSERT INTO users_migrated (id, name, email, password, role, designation, is_protected, created_at)
      SELECT id, name, email, password, role, 'Student', 0, created_at FROM users;
      DROP TABLE users;
      ALTER TABLE users_migrated RENAME TO users;
    `);
    console.log('✓ Users table migration successful.');
  }
} catch (err) {
  console.warn('Warning during users table migration check:', err.message);
}

try {
  const bookingsTable = db.prepare("SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'bookings'").get();
  if (bookingsTable && typeof bookingsTable.sql === 'string' && !bookingsTable.sql.includes("'pending_coordinator'")) {
    console.log('Migrating bookings table schema to support multi-stage approval workflow...');
    db.exec(`
      CREATE TABLE bookings_migrated (
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
      INSERT INTO bookings_migrated (
        id, room_id, user_id, title, description, date, start_time, end_time, attendees,
        requirements, status, current_stage, approval_history, reject_reason,
        rejected_by, rejected_at, approved_by, approved_at, created_at, updated_at
      )
      SELECT 
        id, room_id, user_id, title, description, date, start_time, end_time, attendees,
        '[]', status, 'coordinator', '[]', reject_reason,
        NULL, NULL, approved_by, approved_at, created_at, updated_at
      FROM bookings;
      DROP TABLE bookings;
      ALTER TABLE bookings_migrated RENAME TO bookings;
    `);
    console.log('✓ Bookings table migration successful.');
  }
} catch (err) {
  console.warn('Warning during bookings table migration check:', err.message);
}

// Ensure foreign keys are turned ON
db.exec(`PRAGMA foreign_keys = ON;`);

// Safe column migrations if columns don't exist yet
>>>>>>> Stashed changes
try { db.exec(`ALTER TABLE users ADD COLUMN designation TEXT DEFAULT 'Student'`); } catch(e) {}
try { db.exec(`ALTER TABLE users ADD COLUMN is_protected INTEGER NOT NULL DEFAULT 0`); } catch(e) {}
try { db.exec(`ALTER TABLE bookings ADD COLUMN requirements TEXT DEFAULT '[]'`); } catch(e) {}
try { db.exec(`ALTER TABLE bookings ADD COLUMN current_stage TEXT NOT NULL DEFAULT 'coordinator'`); } catch(e) {}
try { db.exec(`ALTER TABLE bookings ADD COLUMN approval_history TEXT NOT NULL DEFAULT '[]'`); } catch(e) {}
try { db.exec(`ALTER TABLE bookings ADD COLUMN rejected_by TEXT REFERENCES users(id)`); } catch(e) {}
try { db.exec(`ALTER TABLE bookings ADD COLUMN rejected_at TEXT`); } catch(e) {}

module.exports = db;
