// src/routes/patient.js
import { Router }                      from 'express';
import { authMiddleware, patientOnly } from '../middleware/auth.js';
import * as patient                    from '../controllers/patientController.js';
import * as share                      from '../controllers/shareController.js';

const router = Router();

// ── Public — no auth ──────────────────────────────────────────────────────────
router.get('/share/:code',         share.redeemShareCode);

// ── Authenticated ─────────────────────────────────────────────────────────────
router.use(authMiddleware, patientOnly);

router.get('/',                    patient.getProfile);
router.patch('/profile',           patient.updateProfile);

router.post('/records',            patient.upsertRecord);
router.patch('/records/bulk',      patient.bulkUpsertRecords);

router.patch('/questionnaire',     patient.updateQuestionnaire);
router.patch('/medicines',         patient.updateMedicines);

router.get('/medications',         patient.getMedications);
router.post('/medications',        patient.createMedication);
router.delete('/medications/:id',  patient.deleteMedication);
router.patch('/medications/bulk',  patient.bulkSaveMedications);

router.post('/share-code',         share.generateShareCode);

router.patch('/advice/relevant', patient.updateRelevantAdvice);
router.patch('/advice/viewed',   patient.updateViewedAdvice);

export default router;
