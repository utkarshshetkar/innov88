const express = require('express');
const db = require('../db');
const { auth } = require('../middleware');

const router = express.Router();

// GET /api/notifications  — my notifications
router.get('/', auth(), (req, res) => {
  const notifications = db.prepare(`
    SELECT n.*, b.title as booking_title, b.date as booking_date
    FROM notifications n
    LEFT JOIN bookings b ON n.booking_id = b.id
    WHERE n.user_id = ?
    ORDER BY n.created_at DESC
    LIMIT 50
  `).all(req.user.id);
  res.json(notifications);
});

// PATCH /api/notifications/mark-read
router.patch('/mark-read', auth(), (req, res) => {
  db.prepare('UPDATE notifications SET is_read = 1 WHERE user_id = ?').run(req.user.id);
  res.json({ success: true });
});

// GET /api/notifications/unread-count
router.get('/unread-count', auth(), (req, res) => {
  const row = db.prepare('SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = 0').get(req.user.id);
  res.json({ count: row.count });
});

module.exports = router;
