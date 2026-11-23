const express = require('express');
const db = require('../db');
const { auth } = require('../middleware');

const router = express.Router();

// GET /api/analytics/overview
router.get('/overview', auth(['admin', 'incharge']), (req, res) => {
  const totalRooms = db.prepare('SELECT COUNT(*) as c FROM rooms WHERE is_active = 1').get().c;
  const totalBookings = db.prepare("SELECT COUNT(*) as c FROM bookings WHERE status != 'cancelled'").get().c;
  const pendingApprovals = db.prepare("SELECT COUNT(*) as c FROM bookings WHERE status = 'pending'").get().c;

  // Most used rooms
  const topRooms = db.prepare(`
    SELECT r.name, r.type, COUNT(b.id) as booking_count
    FROM rooms r
    LEFT JOIN bookings b ON b.room_id = r.id AND b.status = 'approved'
    WHERE r.is_active = 1
    GROUP BY r.id
    ORDER BY booking_count DESC
    LIMIT 5
  `).all();

  // Busiest days (day of week)
  const busiestDays = db.prepare(`
    SELECT strftime('%w', date) as day_num, COUNT(*) as count
    FROM bookings WHERE status = 'approved'
    GROUP BY day_num ORDER BY count DESC
  `).all();

  // Busiest hours
  const busiestHours = db.prepare(`
    SELECT substr(start_time, 1, 2) as hour, COUNT(*) as count
    FROM bookings WHERE status = 'approved'
    GROUP BY hour ORDER BY count DESC LIMIT 5
  `).all();

  // Monthly trend (last 6 months)
  const monthlyTrend = db.prepare(`
    SELECT strftime('%Y-%m', date) as month, COUNT(*) as count
    FROM bookings WHERE status IN ('approved','pending')
      AND date >= date('now', '-6 months')
    GROUP BY month ORDER BY month
  `).all();

  // Approval rate
  const stats = db.prepare(`
    SELECT
      COUNT(CASE WHEN status = 'approved' THEN 1 END) as approved,
      COUNT(CASE WHEN status = 'rejected' THEN 1 END) as rejected,
      COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
      COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled
    FROM bookings
  `).get();

  res.json({ totalRooms, totalBookings, pendingApprovals, topRooms, busiestDays, busiestHours, monthlyTrend, stats });
});

// GET /api/analytics/room-utilization
router.get('/room-utilization', auth(['admin', 'incharge']), (req, res) => {
  const utilization = db.prepare(`
    SELECT r.id, r.name, r.type, r.capacity,
      COUNT(b.id) as total_bookings,
      ROUND(AVG(CAST((strftime('%H', b.end_time) - strftime('%H', b.start_time)) AS REAL)), 2) as avg_duration_hours
    FROM rooms r
    LEFT JOIN bookings b ON b.room_id = r.id AND b.status = 'approved'
    WHERE r.is_active = 1
    GROUP BY r.id
    ORDER BY total_bookings DESC
  `).all();
  res.json(utilization);
});

// GET /api/analytics/suggest?room_id=X&date=YYYY-MM-DD&duration=2
// Suggests alternative slots when a requested slot is busy
router.get('/suggest', auth(), (req, res) => {
  const { room_id, date, duration = 1 } = req.query;
  if (!room_id || !date) return res.status(400).json({ error: 'room_id and date required' });

  const durationHours = parseInt(duration);
  const slots = [];
  const hours = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17]; // 8am–5pm

  for (const h of hours) {
    const startTime = `${String(h).padStart(2, '0')}:00`;
    const endHour = h + durationHours;
    if (endHour > 18) continue;
    const endTime = `${String(endHour).padStart(2, '0')}:00`;

    const { detectClash } = require('./bookings');
    const result = detectClash(room_id, date, startTime, endTime);
    if (!result.clash) {
      slots.push({ start_time: startTime, end_time: endTime });
    }
  }

  // Also suggest alternative rooms with no clash
  const { detectClash } = require('./bookings');
  const allRooms = db.prepare('SELECT * FROM rooms WHERE is_active = 1 AND id != ?').all(room_id);
  const altRooms = [];
  for (const room of allRooms) {
    // Try the first requested slot on alt room
    // We don't know the requested slot here, so just list rooms with any free slot
    if (slots.length === 0) {
      // the original room is fully booked — find alternatives
      const noon = detectClash(room.id, date, '10:00', `${10 + durationHours}:00`);
      if (!noon.clash) {
        altRooms.push({ room_id: room.id, room_name: room.name, type: room.type, capacity: room.capacity });
      }
    }
  }

  res.json({ available_slots: slots, alternative_rooms: altRooms });
});

module.exports = router;
