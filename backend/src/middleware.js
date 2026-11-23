const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'room-booking-secret-dev-key';

function auth(requiredRoles = []) {
  return (req, res, next) => {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing or invalid token' });
    }
    try {
      const token = header.slice(7);
      const payload = jwt.verify(token, JWT_SECRET);
      req.user = payload;
      if (requiredRoles.length && !requiredRoles.includes(payload.role)) {
        return res.status(403).json({ error: 'Insufficient permissions' });
      }
      next();
    } catch {
      res.status(401).json({ error: 'Token expired or invalid' });
    }
  };
}

module.exports = { auth, JWT_SECRET };
