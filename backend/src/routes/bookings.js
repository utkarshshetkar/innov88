const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { auth } = require('../middleware');

const router = express.Router();

// ─── Clash detection ──────────────────────────────────────────────────────────
function detectClash(roomId, date, startTime, endTime, excludeBookingId = null) {
  const d = new Date(date);
  const dayOfWeek = d.getDay();

  // Check timetable clash
  const ttClash = db.prepare(`
    SELECT * FROM timetable
    WHERE room_id = ? AND day_of_week = ?
      AND start_time < ? AND end_time > ?
  `).get(roomId, dayOfWeek, endTime, startTime);

  if (ttClash) {
    return {
      clash: true,
      reason: `Clashes with regular lecture "${ttClash.subject}" by ${ttClash.faculty_name} (${ttClash.start_time}–${ttClash.end_time})`
    };
  }

  // Check booking clash
  let query = `
    SELECT b.*, u.name as requester_name FROM bookings b JOIN users u ON b.user_id = u.id
    WHERE b.room_id = ? AND b.date = ?
      AND b.status IN ('approved','pending')
      AND b.start_time < ? AND b.end_time > ?
  `;
  const params = [roomId, date, endTime, startTime];

  if (excludeBookingId) {
    query += ' AND b.id != ?';
    params.push(excludeBookingId);
  }

  const bClash = db.prepare(query).get(...params);
  if (bClash) {
    return {
      clash: true,
      reason: `Clashes with a ${bClash.status} booking "${bClash.title}" by ${bClash.requester_name} (${bClash.start_time}–${bClash.end_time})`
    };
  }

  return { clash: false };
}

// ─── Helper: create notification ─────────────────────────────────────────────
function notify(userId, message, bookingId = null) {
  db.prepare('INSERT INTO notifications (id, user_id, booking_id, message) VALUES (?, ?, ?, ?)')
    .run(uuidv4(), userId, bookingId, message);
}

// ─── Routes ───────────────────────────────────────────────────────────────────

// GET /api/bookings  — list bookings (filtered by role)
router.get('/', auth(), (req, res) => {
  const { room_id, date_from, date_to, status, my } = req.query;
  let query = `
    SELECT b.*, r.name as room_name, r.type as room_type,
           u.name as requester_name, u.email as requester_email
    FROM bookings b
    JOIN rooms r ON b.room_id = r.id
    JOIN users u ON b.user_id = u.id
    WHERE 1=1
  `;
  const params = [];

  // Faculty/coordinator see only their own bookings unless admin/incharge
  if (my === '1' || (req.user.role === 'faculty' || req.user.role === 'coordinator')) {
    query += ' AND b.user_id = ?';
    params.push(req.user.id);
  }

  // Incharge sees bookings for rooms they manage
  if (req.user.role === 'incharge') {
    query += ' AND r.incharge_id = ?';
    params.push(req.user.id);
  }

  if (room_id) { query += ' AND b.room_id = ?'; params.push(room_id); }
  if (date_from) { query += ' AND b.date >= ?'; params.push(date_from); }
  if (date_to) { query += ' AND b.date <= ?'; params.push(date_to); }
  if (status) { query += ' AND b.status = ?'; params.push(status); }

  query += ' ORDER BY b.date DESC, b.start_time ASC';

  const bookings = db.prepare(query).all(...params);
  res.json(bookings);
});

// GET /api/bookings/:id
router.get('/:id', auth(), (req, res) => {
  const booking = db.prepare(`
    SELECT b.*, r.name as room_name, r.type as room_type, r.capacity,
           r.facilities, r.needs_approval,
           u.name as requester_name, u.email as requester_email
    FROM bookings b
    JOIN rooms r ON b.room_id = r.id
    JOIN users u ON b.user_id = u.id
    WHERE b.id = ?
  `).get(req.params.id);

  if (!booking) return res.status(404).json({ error: 'Booking not found' });

  // Access control
  if (req.user.role === 'faculty' || req.user.role === 'coordinator') {
    if (booking.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }
  }
  res.json(booking);
});

// POST /api/bookings  — create a booking request
router.post('/', auth(['faculty', 'coordinator', 'admin']), (req, res) => {
  const { room_id, title, description, date, start_time, end_time, attendees = 1 } = req.body;

  if (!room_id || !title || !date || !start_time || !end_time) {
    return res.status(400).json({ error: 'room_id, title, date, start_time, end_time required' });
  }
  if (start_time >= end_time) {
    return res.status(400).json({ error: 'start_time must be before end_time' });
  }

  // Validate date is not in the past
  const bookingDate = new Date(date);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  if (bookingDate < today) {
    return res.status(400).json({ error: 'Cannot book a past date' });
  }

  // Check room exists
  const room = db.prepare('SELECT * FROM rooms WHERE id = ? AND is_active = 1').get(room_id);
  if (!room) return res.status(404).json({ error: 'Room not found' });

  // Capacity check
  if (attendees > room.capacity) {
    return res.status(400).json({
      error: `Room capacity is ${room.capacity}, but you requested for ${attendees} attendees`
    });
  }

  // Clash detection
  const clashResult = detectClash(room_id, date, start_time, end_time);
  if (clashResult.clash) {
    return res.status(409).json({ error: clashResult.reason });
  }

  const id = uuidv4();
  // Auto-approve rooms that don't need approval
  const status = room.needs_approval ? 'pending' : 'approved';

  db.prepare(`
    INSERT INTO bookings (id, room_id, user_id, title, description, date, start_time, end_time, attendees, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, room_id, req.user.id, title, description || null, date, start_time, end_time, attendees, status);

  // Notify incharge if approval needed
  if (room.needs_approval && room.incharge_id) {
    notify(
      room.incharge_id,
      `New booking request for ${room.name}: "${title}" on ${date} (${start_time}–${end_time}) by ${req.user.name}`,
      id
    );
  }

  // Notify requester
  if (status === 'approved') {
    notify(req.user.id, `Your booking "${title}" for ${room.name} on ${date} has been auto-approved.`, id);
  } else {
    notify(req.user.id, `Your booking request "${title}" for ${room.name} on ${date} has been submitted and is pending approval.`, id);
  }

  res.status(201).json({ id, status, room_name: room.name });
});

// PATCH /api/bookings/:id/approve  (incharge/admin)
router.patch('/:id/approve', auth(['incharge', 'admin']), (req, res) => {
  const booking = db.prepare(`
    SELECT b.*, r.incharge_id, r.name as room_name
    FROM bookings b JOIN rooms r ON b.room_id = r.id
    WHERE b.id = ?
  `).get(req.params.id);

  if (!booking) return res.status(404).json({ error: 'Booking not found' });
  if (booking.status !== 'pending') return res.status(400).json({ error: 'Booking is not pending' });

  // Incharge can only approve their own rooms
  if (req.user.role === 'incharge' && booking.incharge_id !== req.user.id) {
    return res.status(403).json({ error: 'You can only approve bookings for your rooms' });
  }

  db.prepare(`
    UPDATE bookings SET status = 'approved', approved_by = ?, approved_at = datetime('now'), updated_at = datetime('now')
    WHERE id = ?
  `).run(req.user.id, req.params.id);

  notify(booking.user_id, `Your booking "${booking.title}" for ${booking.room_name} on ${booking.date} has been approved! ✅`, booking.id);
  res.json({ success: true });
});

// PATCH /api/bookings/:id/reject  (incharge/admin)
router.patch('/:id/reject', auth(['incharge', 'admin']), (req, res) => {
  const { reason } = req.body;
  const booking = db.prepare(`
    SELECT b.*, r.incharge_id, r.name as room_name
    FROM bookings b JOIN rooms r ON b.room_id = r.id
    WHERE b.id = ?
  `).get(req.params.id);

  if (!booking) return res.status(404).json({ error: 'Booking not found' });
  if (booking.status !== 'pending') return res.status(400).json({ error: 'Booking is not pending' });

  if (req.user.role === 'incharge' && booking.incharge_id !== req.user.id) {
    return res.status(403).json({ error: 'You can only reject bookings for your rooms' });
  }

  db.prepare(`
    UPDATE bookings SET status = 'rejected', reject_reason = ?, updated_at = datetime('now')
    WHERE id = ?
  `).run(reason || 'No reason provided', req.params.id);

  notify(booking.user_id, `Your booking "${booking.title}" for ${booking.room_name} on ${booking.date} was rejected. Reason: ${reason || 'No reason provided'}`, booking.id);
  res.json({ success: true });
});

// PATCH /api/bookings/:id/cancel
router.patch('/:id/cancel', auth(), (req, res) => {
  const booking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(req.params.id);
  if (!booking) return res.status(404).json({ error: 'Booking not found' });

  // Only the requester or admin can cancel
  if (req.user.role !== 'admin' && booking.user_id !== req.user.id) {
    return res.status(403).json({ error: 'You can only cancel your own bookings' });
  }
  if (booking.status === 'cancelled') return res.status(400).json({ error: 'Already cancelled' });

  db.prepare(`UPDATE bookings SET status = 'cancelled', updated_at = datetime('now') WHERE id = ?`).run(req.params.id);

  const room = db.prepare('SELECT name FROM rooms WHERE id = ?').get(booking.room_id);
  notify(booking.user_id, `Your booking "${booking.title}" for ${room?.name} on ${booking.date} has been cancelled.`, booking.id);

  res.json({ success: true });
});

// GET /api/bookings/room/:roomId/calendar?month=YYYY-MM
router.get('/room/:roomId/calendar', auth(), (req, res) => {
  const { month } = req.query;
  if (!month) return res.status(400).json({ error: 'month query param required (YYYY-MM)' });

  const [year, mon] = month.split('-');
  const dateFrom = `${year}-${mon}-01`;
  const dateTo = `${year}-${mon}-31`;

  const bookings = db.prepare(`
    SELECT b.id, b.title, b.date, b.start_time, b.end_time, b.status,
           u.name as requester_name
    FROM bookings b JOIN users u ON b.user_id = u.id
    WHERE b.room_id = ? AND b.date BETWEEN ? AND ?
      AND b.status IN ('approved','pending')
    ORDER BY b.date, b.start_time
  `).all(req.params.roomId, dateFrom, dateTo);

  // Also get timetable
  const timetable = db.prepare('SELECT * FROM timetable WHERE room_id = ?').all(req.params.roomId);

  res.json({ bookings, timetable });
});

module.exports = router;
module.exports.detectClash = detectClash;
