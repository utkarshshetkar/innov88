const bcrypt = require('bcryptjs');
const db = require('./db');

async function seed() {
  console.log('--- Seeding Custom Authority Accounts ---');

  // Wipes existing data clean so new credentials take effect
  db.exec(`
    DELETE FROM notifications;
    DELETE FROM bookings;
    DELETE FROM timetable;
    DELETE FROM rooms;
    DELETE FROM users;
  `);

  // =========================================================================
  // 👇 PUT YOUR CUSTOM CREDENTIALS HERE:
  // =========================================================================

  // 1. Student Coordinator (Level 1 Authority)
  const COORD_NAME = 'Yash Wadkar';
  const COORD_EMAIL = 'yash.coordinator@college.edu';
  const COORD_PASS = 'yash@2026';

  // 2. Faculty Advisor (Level 2 Authority)
  const FACULTY_NAME = 'Utkarsh Shetkar';
  const FACULTY_EMAIL = 'utkarsh.faculty@college.edu';
  const FACULTY_PASS = 'utkarsh@2026';

  // 3. Hall In-Charge (Level 3 Authority)
  const INCHARGE_NAME = 'Vihaan Naik';
  const INCHARGE_EMAIL = 'vihaan.incharge@college.edu';
  const INCHARGE_PASS = 'vihaan@2026';

  // 4. Head of Department - HOD (Level 4 Final Authority)
  const HOD_NAME = 'Boss';
  const HOD_EMAIL = 'boss.hod@college.edu';
  const HOD_PASS = 'boss@2026';

  // =========================================================================

  // Encrypt the passwords
  const coordHash = await bcrypt.hash(COORD_PASS, 10);
  const facultyHash = await bcrypt.hash(FACULTY_PASS, 10);
  const inchargeHash = await bcrypt.hash(INCHARGE_PASS, 10);
  const hodHash = await bcrypt.hash(HOD_PASS, 10);
  const studentDemoHash = await bcrypt.hash('student123', 10);

  const users = [
    ['usr-coord-001', COORD_NAME, COORD_EMAIL.toLowerCase(), coordHash, 'coordinator', 'Student Council Coordinator', 1],
    ['usr-faculty-001', FACULTY_NAME, FACULTY_EMAIL.toLowerCase(), facultyHash, 'faculty', 'Faculty Advisor', 1],
    ['usr-incharge-001', INCHARGE_NAME, INCHARGE_EMAIL.toLowerCase(), inchargeHash, 'incharge', 'Hall Infrastructure In-Charge', 1],
    ['usr-hod-001', HOD_NAME, HOD_EMAIL.toLowerCase(), hodHash, 'hod', 'Head of Department', 1],
    // Demo student for testing requests
    ['usr-student-001', 'Aarav Mehta', 'student@college.edu', studentDemoHash, 'student', 'General Secretary (GS)', 0]
  ];

  const insertUser = db.prepare(`
    INSERT INTO users (id, name, email, password, role, designation, is_protected)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  users.forEach(u => insertUser.run(...u));
  console.log('✓ Successfully created your 4 custom authority accounts.');

  // Pre-seed campus halls
  const rooms = [
    ['rm-auditorium-001', 'Main Central Auditorium', 'auditorium', 600, JSON.stringify(['AC', 'Projector', 'Audio PA', 'Stage']), 1, 'usr-incharge-001'],
    ['rm-seminar-001', 'APJ Abdul Kalam Seminar Hall', 'seminar_hall', 180, JSON.stringify(['AC', 'Projector', 'Mics', 'Podium']), 1, 'usr-incharge-001'],
    ['rm-seminar-002', 'Sir MV Convention Hall', 'seminar_hall', 120, JSON.stringify(['AC', 'Projector', 'Podium']), 1, 'usr-incharge-001'],
    ['rm-lab-001', 'Turing Advanced Computing Lab', 'lab', 60, JSON.stringify(['PCs', 'LAN', 'Projector']), 0, 'usr-incharge-001']
  ];

  const insertRoom = db.prepare(`
    INSERT INTO rooms (id, name, type, capacity, facilities, needs_approval, incharge_id)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  rooms.forEach(r => insertRoom.run(...r));
  console.log('✓ Seeded campus halls and labs.');

  console.log('--- Setup Complete ---');
}

seed().catch(console.error);