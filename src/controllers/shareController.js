// src/controllers/shareController.js
import ShareCode from '../models/ShareCode.js';
import Patient   from '../models/Patient.js';

async function generateUniqueCode() {
  let code, exists;
  do {
    code   = String(Math.floor(100000 + Math.random() * 900000));
    exists = await ShareCode.findOne({ code, expiresAt: { $gt: new Date() } });
  } while (exists);
  return code;
}

// ── POST /api/patient/share-code ──────────────────────────────────────────────
export const generateShareCode = async (req, res) => {
  try {
    console.log('[share] generateShareCode userId:', req.user.userId);
    const { includeNotes = true } = req.body;

    await ShareCode.deleteMany({ userId: req.user.userId });

    const code      = await generateUniqueCode();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    const shareCode = await ShareCode.create({
      code,
      userId: req.user.userId,
      expiresAt,
      includeNotes,
    });
    console.log('[share] code created:', shareCode._id);

    res.json({
      success: true,
      data: {
        code:         shareCode.code,
        expiresAt:    shareCode.expiresAt,
        includeNotes: shareCode.includeNotes,
      },
    });
  } catch (err) {
    console.error('[share] generateShareCode ERROR:', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── GET /api/share/:code — public, no auth ────────────────────────────────────
export const redeemShareCode = async (req, res) => {
  try {
    const { code } = req.params;
    console.log('[share] redeemShareCode code:', code);

    const shareCode = await ShareCode.findOne({
      code,
      expiresAt: { $gt: new Date() },
    });

    if (!shareCode) {
      return res.status(404).json({ success: false, message: 'Code not found or expired' });
    }

    const patient = await Patient.findOne({ userId: shareCode.userId }).lean();
    if (!patient) {
      return res.status(404).json({ success: false, message: 'Patient not found' });
    }

    // Strip notes if patient opted out
    const records = (patient.records ?? []).map(log => {
      if (!shareCode.includeNotes) {
        const { note, ...rest } = log;
        return rest;
      }
      return log;
    });

    res.json({
      success: true,
      data: {
        age:          patient.age,
        gender:       patient.gender,
        height:       patient.height,
        records,
        medicines:    patient.medicines    ?? [],
        vaccinations: patient.vaccinations ?? [],
        smoking:      patient.smoking,
        latestGad7:   patient.latestGad7,
        latestPhq9:   patient.latestPhq9,
        latestAudit:  patient.latestAudit,
        latestDast10: patient.latestDast10,
        latestCage:   patient.latestCage,
        latestReadiness: patient.latestReadiness,
        generatedAt:  new Date().toISOString(),
        expiresAt:    shareCode.expiresAt,
      },
    });
  } catch (err) {
    console.error('[share] redeemShareCode ERROR:', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
};
