<<<<<<< Updated upstream
=======
require('dotenv').config();
>>>>>>> Stashed changes
const bcrypt = require('bcryptjs');
const db = require('./db');

async function seed() {
  console.log('--- Seeding Custom Authority Accounts ---');

<<<<<<< Updated upstream
  // Wipes existing data clean so new credentials take effect
  db.exec(`
    DELETE FROM notifications;
    DELETE FROM bookings;
    DELETE FROM timetable;
    DELETE FROM rooms;
    DELETE FROM users;
  `);
=======
// Clean existing data so re-seeding always works smoothly
db.exec(`
  DELETE FROM notifications;
  DELETE FROM bookings;
  DELETE FROM timetable;
  DELETE FROM rooms;
  DELETE FROM users;
`);

// Fixed deterministic IDs so foreign keys never fail
const adminId    = 'usr-admin-001';
const inchargeId = 'usr-incharge-001';
const faculty1Id = 'usr-faculty-001';
const faculty2Id = 'usr-faculty-002';
const coordId    = 'usr-coord-001';
>>>>>>> Stashed changes

  // =========================================================================
  // 👇 PUT YOUR CUSTOM CREDENTIALS HERE:
  // =========================================================================

  // 1. Student Coordinator (Level 1 Authority)
  const COORD_NAME = 'Yash Wadkar';
  const COORD_EMAIL = 'yash.coordinator@college.edu';
  const COORD_PASS = 'yash@2026';

<<<<<<< Updated upstream
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
=======
const insertUser = db.prepare('INSERT INTO users (id, name, email, password, role) VALUES (?, ?, ?, ?, ?)');
users.forEach(u => insertUser.run(...u));
console.log(`  ✓ ${users.length} users`);

const lab1Id        = 'rm-lab-001';
const lab2Id        = 'rm-lab-002';
const lab3Id        = 'rm-lab-003';
const seminarId     = 'rm-seminar-001';
const auditoriumId  = 'rm-auditorium-001';
const classroomId   = 'rm-classroom-001';

const rooms = [
  [lab1Id,       'Computer Lab 1',   'lab',          40,  JSON.stringify(['computers','projector','AC']),            0, null],
  [lab2Id,       'Computer Lab 2',   'lab',          40,  JSON.stringify(['computers','projector','AC']),            0, null],
  [lab3Id,       'Electronics Lab',  'lab',          30,  JSON.stringify(['oscilloscopes','multimeters','projector']), 0, null],
  [seminarId,    'Seminar Hall',     'seminar_hall', 120, JSON.stringify(['projector','mic','AC','whiteboard']),     1, inchargeId],
  [auditoriumId, 'Main Auditorium',  'auditorium',   500, JSON.stringify(['stage','mic','projector','AC','chairs']),  1, inchargeId],
  [classroomId,  'Classroom 101',    'classroom',    60,  JSON.stringify(['whiteboard','projector']),                0, null],
];

const insertRoom = db.prepare('INSERT INTO rooms (id, name, type, capacity, facilities, needs_approval, incharge_id) VALUES (?, ?, ?, ?, ?, ?, ?)');
rooms.forEach(r => insertRoom.run(...r));
console.log(`  ✓ ${rooms.length} rooms`);

const timetableSlots = [
  ['tt-001', lab1Id, 1, '09:00', '11:00', 'DBMS Lab',          'Prof. Rahul Verma'],
  ['tt-002', lab1Id, 3, '09:00', '11:00', 'DBMS Lab',          'Prof. Rahul Verma'],
  ['tt-003', lab1Id, 5, '09:00', '11:00', 'DBMS Lab',          'Prof. Rahul Verma'],
  ['tt-004', lab1Id, 2, '14:00', '16:00', 'Web Dev Lab',       'Prof. Meera Singh'],
  ['tt-005', lab1Id, 4, '14:00', '16:00', 'Web Dev Lab',       'Prof. Meera Singh'],
  ['tt-006', lab2Id, 1, '11:00', '13:00', 'DSP Lab',           'Prof. Rahul Verma'],
  ['tt-007', lab2Id, 3, '11:00', '13:00', 'DSP Lab',           'Prof. Rahul Verma'],
  ['tt-008', lab3Id, 2, '09:00', '11:00', 'Electronics Lab',   'Prof. Meera Singh'],
  ['tt-009', lab3Id, 4, '09:00', '11:00', 'Electronics Lab',   'Prof. Meera Singh'],
  ['tt-010', seminarId, 5, '10:00', '12:00', 'Weekly Seminar', 'Dr. Priya Sharma'],
  ['tt-011', classroomId, 1, '08:00', '09:00', 'Morning Assembly', 'Admin'],
  ['tt-012', classroomId, 2, '08:00', '09:00', 'Morning Assembly', 'Admin'],
  ['tt-013', classroomId, 3, '08:00', '09:00', 'Morning Assembly', 'Admin'],
  ['tt-014', classroomId, 4, '08:00', '09:00', 'Morning Assembly', 'Admin'],
  ['tt-015', classroomId, 5, '08:00', '09:00', 'Morning Assembly', 'Admin'],
];

const insertSlot = db.prepare('INSERT INTO timetable (id, room_id, day_of_week, start_time, end_time, subject, faculty_name) VALUES (?, ?, ?, ?, ?, ?, ?)');
timetableSlots.forEach(s => insertSlot.run(...s));
console.log(`  ✓ ${timetableSlots.length} timetable slots`);

function futureDate(daysAhead) {
  const d = new Date();
  d.setDate(d.getDate() + daysAhead);
  return d.toISOString().split('T')[0];
}

const bookings = [
  ['bk-001', seminarId, coordId, 'ACM Tech Talk: AI in 2025',
   'Monthly tech talk open to all students', futureDate(3), '14:00', '16:00', 80, 'pending', null],
  ['bk-002', lab2Id, faculty1Id, 'Extra Class – OS',
   'Supplementary class for OS unit 4', futureDate(2), '15:00', '17:00', 35, 'approved', null],
  ['bk-003', classroomId, faculty2Id, 'Project Review – Group B',
   null, futureDate(1), '11:00', '13:00', 20, 'approved', null],
  ['bk-004', auditoriumId, coordId, 'Annual Cultural Fest – Day 1',
   'Cultural programme, need stage + PA system', futureDate(10), '09:00', '18:00', 400, 'pending', null],
];

const insertBooking = db.prepare(`
  INSERT INTO bookings (id, room_id, user_id, title, description, date, start_time, end_time, attendees, status, approved_by)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);
bookings.forEach(b => insertBooking.run(...b));
console.log(`  ✓ ${bookings.length} sample bookings`);

console.log('\n✅ Seed complete!\n');
>>>>>>> Stashed changes
