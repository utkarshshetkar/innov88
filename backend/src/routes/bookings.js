const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { auth } = require('../middleware');

const router = express.Router();

// Strict 1-to-1 mapping: Each stage strictly requires its designated authority
const STAGE_RULES = {
  coordinator: {
    requiredRole: 'coordinator',
    currentStatus: 'pending_coordinator',
    nextStage: 'faculty',
    nextStatus: 'pending_faculty',
    stageName: 'Step 1: Student Coordinator Review'
  },
  faculty: {
    requiredRole: 'faculty',
    currentStatus: 'pending_faculty',
    nextStage: 'incharge',
    nextStatus: 'pending_incharge',
    stageName: 'Step 2: Faculty Advisor Review'
  },
  incharge: {
    requiredRole: 'incharge',
    currentStatus: 'pending_incharge',
    nextStage: 'hod',
    nextStatus: 'pending_hod',
    stageName: 'Step 3: Hall In-Charge Verification'
  },
  hod: {
    requiredRole: 'hod',
    currentStatus: 'pending_hod',
    nextStage: 'completed',
    nextStatus: 'approved',
    stageName: 'Step 4: HOD Final Clearance'
  }
};

function detectClash(roomId, date, startTime, endTime, excludeBookingId = null) {
  const d = new Date(date);
  const dayOfWeek = d.getDay();

  // 1. Check academic timetable
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

  // 2. Check existing bookings
  let query = `
    SELECT b.*, u.name as requester_name FROM bookings b 
    JOIN users u ON b.user_id = u.id
    WHERE b.room_id = ? AND b.date = ?
      AND b.status NOT IN ('rejected', 'cancelled')
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
      reason: `Clashes with booking "${bClash.title}" (${bClash.status}) by ${bClash.requester_name} (${bClash.start_time}–${bClash.end_time})`
    };
  }

  return { clash: false };
}

function notify(userId, message, bookingId = null) {
  db.prepare(`
    INSERT INTO notifications (id, user_id, booking_id, message) 
    VALUES (?, ?, ?, ?)
  `).run(uuidv4(), userId, bookingId, message);
}

function parseJSON(str, fallback = []) {
  if (!str) return fallback;
  if (typeof str !== 'string') return str;
  try { return JSON.parse(str); } catch { return fallback; }
}

// GET /api/bookings - Filtered strictly by viewer identity and authority queue
router.get('/', auth(), (req, res) => {
  const { status, room_id, date, my } = req.query;
  const user = req.user;

  let query = `
    SELECT b.*, r.name as room_name, r.type as room_type, r.capacity as room_capacity,
           u.name as requester_name, u.email as requester_email, u.role as requester_role, u.designation as requester_designation
    FROM bookings b
    JOIN rooms r ON b.room_id = r.id
    JOIN users u ON b.user_id = u.id
    WHERE 1=1
  `;
  const params = [];

  // Students always only see their own requests
  if (user.role === 'student' || my === 'true') {
    query += ' AND b.user_id = ?';
    params.push(user.id);
  } else if (status === 'pending') {
    // Each authority ONLY sees the requests currently waiting at THEIR turn
    if (user.role === 'coordinator') {
      query += " AND b.status = 'pending_coordinator'";
    } else if (user.role === 'faculty') {
      query += " AND b.status = 'pending_faculty'";
    } else if (user.role === 'incharge') {
      query += " AND b.status = 'pending_incharge'";
    } else if (user.role === 'hod') {
      query += " AND b.status = 'pending_hod'";
    }
  } else if (status) {
    query += ' AND b.status = ?';
    params.push(status);
  }

  if (room_id) {
    query += ' AND b.room_id = ?';
    params.push(room_id);
  }
  if (date) {
    query += ' AND b.date = ?';
    params.push(date);
  }

  query += ' ORDER BY b.date DESC, b.start_time DESC';
  const rows = db.prepare(query).all(...params);

  const bookings = rows.map(r => ({
    ...r,
    requirements: parseJSON(r.requirements, []),
    approval_history: parseJSON(r.approval_history, [])
  }));

  res.json(bookings);
});

// POST /api/bookings - Initiates Step 1 (Coordinator queue)
router.post('/', auth(), (req, res) => {
  const {
    room_id,
    title,
    description,
    date,
    start_time,
    end_time,
    attendees = 1,
    requirements = []
  } = req.body;

  if (!room_id || !title || !date || !start_time || !end_time) {
    return res.status(400).json({ error: 'Missing required reservation fields' });
  }

  if (start_time >= end_time) {
    return res.status(400).json({ error: 'Start time must precede end time' });
  }

  const room = db.prepare('SELECT * FROM rooms WHERE id = ?').get(room_id);
  if (!room) return res.status(404).json({ error: 'Hall not found' });

  if (attendees > room.capacity) {
    return res.status(400).json({
      error: `Room capacity is ${room.capacity}, but ${attendees} attendees requested.`
    });
  }

  // Clash detection
  const clash = detectClash(room_id, date, start_time, end_time);
  if (clash.clash) {
    return res.status(409).json({ error: clash.reason });
  }

  const bookingId = uuidv4();
  const initialStatus = 'pending_coordinator';
  const initialStage = 'coordinator';

  const history = [
    {
      stage: 'submission',
      actor_name: req.user.name,
      actor_role: req.user.role,
      designation: req.user.designation || 'Student',
      action: 'submitted',
      timestamp: new Date().toISOString(),
      remarks: 'Reservation submitted to Student Coordinator'
    }
  ];

  db.prepare(`
    INSERT INTO bookings (
      id, room_id, user_id, title, description, date, start_time, end_time,
      attendees, requirements, status, current_stage, approval_history
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    bookingId,
    room_id,
    req.user.id,
    title,
    description || '',
    date,
    start_time,
    end_time,
    attendees,
    JSON.stringify(requirements),
    initialStatus,
    initialStage,
    JSON.stringify(history)
  );

  // Notify Coordinator immediately
  const coordinator = db.prepare("SELECT id FROM users WHERE role = 'coordinator' LIMIT 1").get();
  if (coordinator) {
    notify(
      coordinator.id,
      `New request "${title}" from ${req.user.name} is waiting in your Step 1 Coordinator queue.`,
      bookingId
    );
  }

  res.status(201).json({
    message: 'Reservation submitted. Now queued at Step 1: Student Coordinator.',
    bookingId,
    status: initialStatus
  });
});

// PATCH /api/bookings/:id/approve - Strict Sequential Role Approval
router.patch('/:id/approve', auth(['coordinator', 'faculty', 'incharge', 'hod']), (req, res) => {
  const { remarks = 'Approved' } = req.body;
  const user = req.user;

  const booking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(req.params.id);
  if (!booking) return res.status(404).json({ error: 'Booking not found' });

  // Security Rule 1: No self-approvals
  if (booking.user_id === user.id) {
    return res.status(403).json({ error: 'Security Violation: Cannot approve your own request.' });
  }

  // Security Rule 2: Strict current-stage check
  const currentStage = booking.current_stage;
  const rule = STAGE_RULES[currentStage];

  if (!rule) {
    return res.status(400).json({
      error: `Booking is in status "${booking.status}" and cannot accept further approvals.`
    });
  }

  // Security Rule 3: Only the EXACT authority for this stage can approve (NO bypasses)
  if (user.role !== rule.requiredRole) {
    return res.status(403).json({
      error: `Access Denied: This request is awaiting ${rule.requiredRole.toUpperCase()} approval. You are logged in as ${user.role.toUpperCase()}.`
    });
  }

  const nextStatus = rule.nextStatus;
  const nextStage = rule.nextStage;
  const isFinalHOD = (nextStatus === 'approved');

  const history = parseJSON(booking.approval_history, []);
  history.push({
    stage: currentStage,
    actor_name: user.name,
    actor_role: user.role,
    designation: user.designation,
    action: 'approved',
    remarks: remarks.trim(),
    timestamp: new Date().toISOString()
  });

  db.prepare(`
    UPDATE bookings 
    SET status = ?,
        current_stage = ?,
        approval_history = ?,
        approved_by = CASE WHEN ? THEN ? ELSE approved_by END,
        approved_at = CASE WHEN ? THEN datetime('now') ELSE approved_at END,
        updated_at = datetime('now')
    WHERE id = ?
  `).run(
    nextStatus,
    nextStage,
    JSON.stringify(history),
    isFinalHOD ? 1 : 0,
    user.id,
    isFinalHOD ? 1 : 0,
    req.params.id
  );

  // Notify requester
  notify(
    booking.user_id,
    isFinalHOD
      ? `🎉 SUCCESS: Your booking "${booking.title}" has received FINAL HOD approval and is officially CONFIRMED!`
      : `Request "${booking.title}" approved by ${user.role.toUpperCase()}. Now forwarded to ${nextStage.toUpperCase()}.`,
    booking.id
  );

  // Notify next authority immediately
  if (!isFinalHOD) {
    const nextAuth = db.prepare('SELECT id FROM users WHERE role = ? LIMIT 1').get(nextStage);
    if (nextAuth) {
      notify(
        nextAuth.id,
        `New request "${booking.title}" is ready for your ${nextStage.toUpperCase()} approval.`,
        booking.id
      );
    }
  }

  res.json({
    message: isFinalHOD ? 'Final HOD Clearance granted. Hall officially booked!' : `Approved and forwarded to ${nextStage}.`,
    current_stage: nextStage,
    status: nextStatus
  });
});

// PATCH /api/bookings/:id/reject - Rejection at current stage stops the entire workflow
router.patch('/:id/reject', auth(['coordinator', 'faculty', 'incharge', 'hod']), (req, res) => {
  const { reason = 'Rejected by authority' } = req.body;
  const user = req.user;

  const booking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(req.params.id);
  if (!booking) return res.status(404).json({ error: 'Booking not found' });

  const currentStage = booking.current_stage;
  const rule = STAGE_RULES[currentStage];

  if (!rule) {
    return res.status(400).json({ error: `Cannot reject: Request is not active (status: ${booking.status})` });
  }

  // Only the current authority can reject
  if (user.role !== rule.requiredRole) {
    return res.status(403).json({
      error: `Access Denied: Only the current stage authority (${rule.requiredRole.toUpperCase()}) can review this request.`
    });
  }

  const history = parseJSON(booking.approval_history, []);
  history.push({
    stage: currentStage,
    actor_name: user.name,
    actor_role: user.role,
    designation: user.designation,
    action: 'rejected',
    remarks: reason.trim(),
    timestamp: new Date().toISOString()
  });

  db.prepare(`
    UPDATE bookings 
    SET status = 'rejected',
        current_stage = 'rejected',
        reject_reason = ?,
        rejected_by = ?,
        rejected_at = datetime('now'),
        approval_history = ?,
        updated_at = datetime('now')
    WHERE id = ?
  `).run(
    reason.trim(),
    user.id,
    JSON.stringify(history),
    req.params.id
  );

  notify(
    booking.user_id,
    `Your request "${booking.title}" was rejected by ${user.role.toUpperCase()}. Reason: ${reason}`,
    booking.id
  );

  res.json({ message: 'Request rejected. Workflow terminated.', status: 'rejected' });
});

// PATCH /api/bookings/:id/cancel
router.patch('/:id/cancel', auth(), (req, res) => {
  const booking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(req.params.id);
  if (!booking) return res.status(404).json({ error: 'Booking not found' });

  if (booking.user_id !== req.user.id) {
    return res.status(403).json({ error: 'Cannot cancel another user request' });
  }

  db.prepare(`
    UPDATE bookings 
    SET status = 'cancelled', current_stage = 'cancelled', updated_at = datetime('now')
    WHERE id = ?
  `).run(req.params.id);

  res.json({ message: 'Request cancelled' });
});

module.exports = router;
module.exports.detectClash = detectClash;