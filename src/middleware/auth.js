import { verifyToken } from '../utils/jwt.js';

export function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ success: false, message: 'No token provided' });
    return;
  }
  try {
    const token = authHeader.split(' ')[1];
    req.user = verifyToken(token);
    next();
  } catch {
    res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }
}

export function patientOnly(req, res, next) {
  if (req.user?.role !== 'patient') {
    res.status(403).json({ success: false, message: 'Patients only' });
    return;
  }
  next();
}

export function doctorOnly(req, res, next) {
  if (req.user?.role !== 'doctor') {
    res.status(403).json({ success: false, message: 'Doctors only' });
    return;
  }
  next();
}
