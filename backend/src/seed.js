/**
 * Seed script – populates the database with demo data.
 * Run: node src/seed.js
 */
require('dotenv').config();
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const db = require('./db');

console.log('🌱 Seeding database...');

// ─── Users ───────────────────────────────────────────────────────────────────
const adminId = uuidv4();
const inchargeId = uuidv4();
const faculty1Id = uuidv4();
const faculty2Id = uuidv4();
const coordId = uuidv4();

const hash = (pw) => bcrypt.hashSync(pw, 10);

const users = [
  [adminId,    'Admin User',         'admin@college.edu',    hash('admin123'),  'admin'],
  [inchargeId, 'Dr. Priya Sharma',   'priya@college.edu',   hash('priya123'),  'incharge'],
  [faculty1Id, 'Prof. Rahul Verma',  'rahul@college.edu',   hash('rahul123'),  'faculty'],
  [faculty2Id, 'Prof. Meera Singh',  'meera@college.edu',   hash('meera123'),  'faculty'],
  [coordId,    'Arjun (ACM Club)',    'arjun@college.edu',   hash('arjun123'),  'coordinator'],
];

const insertUser = db.prepare('INSERT OR IGNORE INTO users (id, name, email, password, role) VALUES (?, ?, ?, ?, ?)');
users.forEach(u => insertUser.run(...u));
console.log(`  ✓ ${users.length} users`);

// ─── Rooms ───────────────────────────────────────────────────────────────────
const lab1Id = uuidv4();
const lab2Id = uuidv4();
const lab3Id = uuidv4();
const seminarId = uuidv4();
const auditoriumId = uuidv4();
const classroomId = uuidv4();

const rooms = [
  [lab1Id,      'Computer Lab 1',   'lab',          40,  JSON.stringify(['computers','projector','AC']),           0, null],
  [lab2Id,      'Computer Lab 2',   'lab',          40,  JSON.stringify(['computers','projector','AC']),           0, null],
  [lab3Id,      'Electronics Lab',  'lab',          30,  JSON.stringify(['oscilloscopes','multimeters','projector']),0, null],
  [seminarId,   'Seminar Hall',      'seminar_hall', 120, JSON.stringify(['projector','mic','AC','whiteboard']),    1, inchargeId],
  [auditoriumId,'Main Auditorium',  'auditorium',   500, JSON.stringify(['stage','mic','projector','AC','chairs']), 1, inchargeId],
  [classroomId, 'Classroom 101',    'classroom',    60,  JSON.stringify(['whiteboard','projector']),               0, null],
];

const insertRoom = db.prepare('INSERT OR IGNORE INTO rooms (id, name, type, capacity, facilities, needs_approval, incharge_id) VALUES (?, ?, ?, ?, ?, ?, ?)');
rooms.forEach(r => insertRoom.run(...r));
console.log(`  ✓ ${rooms.length} rooms`);

// ─── Timetable ───────────────────────────────────────────────────────────────
// day_of_week: 0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat
const timetableSlots = [
  // Lab 1 — Mon/Wed/Fri 9–11am: DBMS Lab
  [uuidv4(), lab1Id, 1, '09:00', '11:00', 'DBMS Lab',          'Prof. Rahul Verma'],
  [uuidv4(), lab1Id, 3, '09:00', '11:00', 'DBMS Lab',          'Prof. Rahul Verma'],
  [uuidv4(), lab1Id, 5, '09:00', '11:00', 'DBMS Lab',          'Prof. Rahul Verma'],
  // Lab 1 — Tue/Thu 2–4pm: Web Dev Lab
  [uuidv4(), lab1Id, 2, '14:00', '16:00', 'Web Dev Lab',       'Prof. Meera Singh'],
  [uuidv4(), lab1Id, 4, '14:00', '16:00', 'Web Dev Lab',       'Prof. Meera Singh'],
  // Lab 2 — Mon/Wed 11am–1pm: DSP Lab
  [uuidv4(), lab2Id, 1, '11:00', '13:00', 'DSP Lab',           'Prof. Rahul Verma'],
  [uuidv4(), lab2Id, 3, '11:00', '13:00', 'DSP Lab',           'Prof. Rahul Verma'],
  // Lab 3 — Tue/Thu 9–11am: Electronics
  [uuidv4(), lab3Id, 2, '09:00', '11:00', 'Electronics Lab',   'Prof. Meera Singh'],
  [uuidv4(), lab3Id, 4, '09:00', '11:00', 'Electronics Lab',   'Prof. Meera Singh'],
  // Seminar Hall — Fri 10am–12pm: Weekly Seminar Series
  [uuidv4(), seminarId, 5, '10:00', '12:00', 'Weekly Seminar', 'Dr. Priya Sharma'],
  // Classroom 101 — All weekdays 8–9am: Morning Assembly
  [uuidv4(), classroomId, 1, '08:00', '09:00', 'Morning Assembly', 'Admin'],
  [uuidv4(), classroomId, 2, '08:00', '09:00', 'Morning Assembly', 'Admin'],
  [uuidv4(), classroomId, 3, '08:00', '09:00', 'Morning Assembly', 'Admin'],
  [uuidv4(), classroomId, 4, '08:00', '09:00', 'Morning Assembly', 'Admin'],
  [uuidv4(), classroomId, 5, '08:00', '09:00', 'Morning Assembly', 'Admin'],
];

const insertSlot = db.prepare('INSERT OR IGNORE INTO timetable (id, room_id, day_of_week, start_time, end_time, subject, faculty_name) VALUES (?, ?, ?, ?, ?, ?, ?)');
timetableSlots.forEach(s => insertSlot.run(...s));
console.log(`  ✓ ${timetableSlots.length} timetable slots`);

// ─── Sample Bookings ─────────────────────────────────────────────────────────
// Use dates relative to today
function futureDate(daysAhead) {
  const d = new Date();
  d.setDate(d.getDate() + daysAhead);
  return d.toISOString().split('T')[0];
}

const bookings = [
  [uuidv4(), seminarId, coordId, 'ACM Tech Talk: AI in 2025',
   'Monthly tech talk open to all students', futureDate(3), '14:00', '16:00', 80, 'pending', null],
  [uuidv4(), lab2Id, faculty1Id, 'Extra Class – OS',
   'Supplementary class for OS unit 4', futureDate(2), '15:00', '17:00', 35, 'approved', null],
  [uuidv4(), classroomId, faculty2Id, 'Project Review – Group B',
   null, futureDate(1), '11:00', '13:00', 20, 'approved', null],
  [uuidv4(), auditoriumId, coordId, 'Annual Cultural Fest – Day 1',
   'Cultural programme, need stage + PA system', futureDate(10), '09:00', '18:00', 400, 'pending', null],
];

const insertBooking = db.prepare(`
  INSERT OR IGNORE INTO bookings (id, room_id, user_id, title, description, date, start_time, end_time, attendees, status, approved_by)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);
bookings.forEach(b => insertBooking.run(...b));
console.log(`  ✓ ${bookings.length} sample bookings`);

console.log('\n✅ Seed complete!\n');
console.log('Demo accounts:');
console.log('  admin@college.edu    / admin123  (Admin)');
console.log('  priya@college.edu    / priya123  (In-charge)');
console.log('  rahul@college.edu    / rahul123  (Faculty)');
console.log('  meera@college.edu    / meera123  (Faculty)');
console.log('  arjun@college.edu    / arjun123  (Club Coordinator)\n');
