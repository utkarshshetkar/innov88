const bcrypt = require('bcryptjs');
const db = require('./db');

async function seed() {
  console.log('--- Initializing Clean & Deterministic Database ---');

  // 1. Wipe existing tables in foreign-key safe order
  db.exec(`
    DELETE FROM notifications;
    DELETE FROM bookings;
    DELETE FROM timetable;
    DELETE FROM rooms;
    DELETE FROM users;
  `);

  // =========================================================================
  // 🔐 4 FIXED AUTHORITIES CREDENTIALS (AND DEMO STUDENT)
  // =========================================================================

  // 1. Student Coordinator (Level 1 Reviewer)
  const COORD_NAME = 'Yash Wadkar (Coordinator)';
  const COORD_EMAIL = 'yash.coordinator@college.edu';
  const COORD_PASS = 'yash@2026';

  // 2. Faculty Advisor (Level 2 Reviewer)
  const FACULTY_NAME = 'Utkarsh Shetkar (Faculty)';
  const FACULTY_EMAIL = 'utkarsh.faculty@college.edu';
  const FACULTY_PASS = 'utkarsh@2026';

  // 3. Hall In-Charge (Level 3 Reviewer)
  const INCHARGE_NAME = 'Vihaan Naik (In-Charge)';
  const INCHARGE_EMAIL = 'vihaan.incharge@college.edu';
  const INCHARGE_PASS = 'vihaan@2026';

  // 4. Head of Department - HOD (Level 4 Final Clearance)
  const HOD_NAME = 'Boss(HOD)';
  const HOD_EMAIL = 'boss.hod@college.edu';
  const HOD_PASS = 'boss@2026';

  // Demo Student Account (Requester)
  const STUDENT_NAME = 'Aarav Mehta';
  const STUDENT_EMAIL = 'student@college.edu';
  const STUDENT_PASS = 'student123';

  // =========================================================================

  // Encrypt passwords using bcrypt (10 salt rounds)
  const coordHash = await bcrypt.hash(COORD_PASS, 10);
  const facultyHash = await bcrypt.hash(FACULTY_PASS, 10);
  const inchargeHash = await bcrypt.hash(INCHARGE_PASS, 10);
  const hodHash = await bcrypt.hash(HOD_PASS, 10);
  const studentHash = await bcrypt.hash(STUDENT_PASS, 10);

  // 2. Insert Users
  const users = [
    ['usr-coord-001', COORD_NAME, COORD_EMAIL.toLowerCase(), coordHash, 'coordinator', 'Student Council Coordinator', 1],
    ['usr-faculty-001', FACULTY_NAME, FACULTY_EMAIL.toLowerCase(), facultyHash, 'faculty', 'Faculty Advisor', 1],
    ['usr-incharge-001', INCHARGE_NAME, INCHARGE_EMAIL.toLowerCase(), inchargeHash, 'incharge', 'Hall Infrastructure In-Charge', 1],
    ['usr-hod-001', HOD_NAME, HOD_EMAIL.toLowerCase(), hodHash, 'hod', 'Head of Department', 1],
    ['usr-student-001', STUDENT_NAME, STUDENT_EMAIL.toLowerCase(), studentHash, 'student', 'General Secretary (GS)', 0]
  ];

  const insertUser = db.prepare(`
    INSERT INTO users (id, name, email, password, role, designation, is_protected)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  users.forEach(u => insertUser.run(...u));
  console.log('✓ Successfully seeded 4 protected authority accounts + 1 student account.');

  // 3. Insert Campus Halls & Labs
  const rooms = [
    [
      'rm-auditorium-001',
      'Main Central Auditorium',
      'auditorium',
      600,
      JSON.stringify(['AC', 'Projector', 'Audio PA', 'Stage', 'Lighting']),
      1,
      'usr-incharge-001'
    ],
    [
      'rm-seminar-001',
      'APJ Abdul Kalam Seminar Hall',
      'seminar_hall',
      180,
      JSON.stringify(['AC', 'Projector', 'Wireless Mics', 'Podium']),
      1,
      'usr-incharge-001'
    ],
    [
      'rm-seminar-002',
      'Sir MV Convention Hall',
      'seminar_hall',
      120,
      JSON.stringify(['AC', 'Projector', 'Podium', 'Sound System']),
      1,
      'usr-incharge-001'
    ],
    [
      'rm-lab-001',
      'Turing Advanced Computing Lab',
      'lab',
      60,
      JSON.stringify(['60 High-end PCs', 'Gigabit LAN', 'Projector']),
      0,
      'usr-incharge-001'
    ],
    [
      'rm-lab-002',
      'IoT & Embedded Systems Lab',
      'lab',
      45,
      JSON.stringify(['Microcontroller Kits', 'Workstations', 'LAN']),
      0,
      'usr-incharge-001'
    ]
  ];

  const insertRoom = db.prepare(`
    INSERT INTO rooms (id, name, type, capacity, facilities, needs_approval, incharge_id)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  rooms.forEach(r => insertRoom.run(...r));
  console.log('✓ Seeded 5 campus venues (Auditorium, Seminar Halls, Labs).');

  // 4. Insert Regular Academic Timetable (Demonstrates automated collision engine)
  const timetableSlots = [
    ['tt-001', 'rm-seminar-001', 1, '09:00', '11:00', 'CS301 Data Structures', 'Prof. Verma'],
    ['tt-002', 'rm-seminar-001', 3, '14:00', '16:00', 'CS305 Operating Systems', 'Dr. Radhika Sharma'],
    ['tt-003', 'rm-lab-001', 2, '10:00', '13:00', 'CS311 Systems Lab', 'Prof. Patil'],
    ['tt-004', 'rm-seminar-002', 4, '11:00', '13:00', 'EC202 Digital Electronics', 'Dr. Sundaram']
  ];

  const insertTimetable = db.prepare(`
    INSERT INTO timetable (id, room_id, day_of_week, start_time, end_time, subject, faculty_name)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  timetableSlots.forEach(t => insertTimetable.run(...t));
  console.log('✓ Seeded recurring academic timetable slots for clash prevention.');

  console.log('==================================================');
  console.log('🎉 Database seeding completed successfully!');
  console.log('==================================================');
}

seed().catch(err => {
  console.error('Error during seeding:', err);
  process.exit(1);
});