import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import User from '../models/User.js';
import Patient from '../models/Patient.js';

const router = Router();
router.use(authMiddleware);

// ── GET /api/doctor/patient/:accessCode ───────────────────────────────────────
router.get('/patient/:accessCode', async (req, res) => {
  const user = await User.findOne({ accessCode: req.params.accessCode.toUpperCase() });
  if (!user) return res.status(404).json({ success: false, message: 'Invalid access code' });

  const patient = await Patient.findOne({ userId: user._id });
  if (!patient) return res.status(404).json({ success: false, message: 'Patient data not found' });

  const data = patient.toObject();
  if (!patient.shareNotes) {
    data.records = data.records.map(r => ({ ...r, note: '' }));
  }

  res.json({
    success: true,
    data: {
      patient: data,
      user: { name: user.name, age: patient.age, gender: patient.gender, language: user.language },
    },
  });
});

export default router;
