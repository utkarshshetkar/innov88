const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { auth } = require('../middleware');

const router = express.Router();

// GET /api/rooms  — list all active rooms
router.get('/', auth(), (req, res) => {
  const rooms = db.prepare('SELECT * FROM rooms WHERE is_active = 1 ORDER BY name').all();
  res.json(rooms.map(r => ({ ...r, facilities: JSON.parse(r.facilities) })));
});

// GET /api/rooms/:id
router.get('/:id', auth(), (req, res) => {
  const room = db.prepare('SELECT * FROM rooms WHERE id = ?').get(req.params.id);
  if (!room) return res.status(404).json({ error: 'Room not found' });
  res.json({ ...room, facilities: JSON.parse(room.facilities) });
});

// POST /api/rooms  (admin only)
router.post('/', auth(['admin']), (req, res) => {
  const { name, type, capacity, facilities = [], needs_approval = 0, incharge_id } = req.body;
  if (!name || !type || !capacity) return res.status(400).json({ error: 'name, type, capacity required' });

  const id = uuidv4();
  db.prepare(`
    INSERT INTO rooms (id, name, type, capacity, facilities, needs_approval, incharge_id)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(id, name, type, capacity, JSON.stringify(facilities), needs_approval ? 1 : 0, incharge_id || null);

  res.status(201).json({ id, name, type, capacity, facilities, needs_approval, incharge_id });
});

// PUT /api/rooms/:id  (admin only)
router.put('/:id', auth(['admin']), (req, res) => {
  const { name, type, capacity, facilities, needs_approval, incharge_id, is_active } = req.body;
  const room = db.prepare('SELECT * FROM rooms WHERE id = ?').get(req.params.id);
  if (!room) return res.status(404).json({ error: 'Room not found' });

  db.prepare(`
    UPDATE rooms SET
      name = ?, type = ?, capacity = ?, facilities = ?,
      needs_approval = ?, incharge_id = ?, is_active = ?
    WHERE id = ?
  `).run(
    name ?? room.name,
    type ?? room.type,
    capacity ?? room.capacity,
    facilities ? JSON.stringify(facilities) : room.facilities,
    needs_approval !== undefined ? (needs_approval ? 1 : 0) : room.needs_approval,
    incharge_id !== undefined ? incharge_id : room.incharge_id,
    is_active !== undefined ? (is_active ? 1 : 0) : room.is_active,
    req.params.id
  );

  res.json({ success: true });
});

// DELETE /api/rooms/:id  (admin only — soft delete)
router.delete('/:id', auth(['admin']), (req, res) => {
  db.prepare('UPDATE rooms SET is_active = 0 WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// ─── Timetable ────────────────────────────────────────────────────────────────

// GET /api/rooms/:id/timetable
router.get('/:id/timetable', auth(), (req, res) => {
  const slots = db.prepare('SELECT * FROM timetable WHERE room_id = ? ORDER BY day_of_week, start_time').all(req.params.id);
  res.json(slots);
});

// POST /api/rooms/:id/timetable  (admin only)
router.post('/:id/timetable', auth(['admin']), (req, res) => {
  const { day_of_week, start_time, end_time, subject, faculty_name } = req.body;
  if (day_of_week === undefined || !start_time || !end_time || !subject || !faculty_name) {
    return res.status(400).json({ error: 'All fields required' });
  }
  const id = uuidv4();
  db.prepare(`
    INSERT INTO timetable (id, room_id, day_of_week, start_time, end_time, subject, faculty_name)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(id, req.params.id, day_of_week, start_time, end_time, subject, faculty_name);
  res.status(201).json({ id, room_id: req.params.id, day_of_week, start_time, end_time, subject, faculty_name });
});

// DELETE /api/rooms/:id/timetable/:slotId  (admin only)
router.delete('/:id/timetable/:slotId', auth(['admin']), (req, res) => {
  db.prepare('DELETE FROM timetable WHERE id = ? AND room_id = ?').run(req.params.slotId, req.params.id);
  res.json({ success: true });
});

// GET /api/rooms/:id/availability?date=YYYY-MM-DD
router.get('/:id/availability', auth(), (req, res) => {
  const { date } = req.query;
  if (!date) return res.status(400).json({ error: 'date query param required' });

  const d = new Date(date);
  const dayOfWeek = d.getDay();

  // Regular timetable slots for that day
  const timetableSlots = db.prepare(
    'SELECT start_time, end_time, subject as title, faculty_name, \'timetable\' as type FROM timetable WHERE room_id = ? AND day_of_week = ?'
  ).all(req.params.id, dayOfWeek);

  // Existing bookings for that date (approved or pending)
  const bookingSlots = db.prepare(`
    SELECT b.start_time, b.end_time, b.title, b.status, b.id,
           u.name as requester_name
    FROM bookings b JOIN users u ON b.user_id = u.id
    WHERE b.room_id = ? AND b.date = ? AND b.status IN ('approved','pending')
  `).all(req.params.id, date);

  res.json({ timetable: timetableSlots, bookings: bookingSlots });
});

module.exports = router;
