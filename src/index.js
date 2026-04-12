import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';

import { connectDB }  from './config/db.js';
import authRoutes     from './routes/auth.js';
import patientRoutes  from './routes/patient.js';
import doctorRoutes   from './routes/doctor.js';

const app  = express();
const PORT = process.env.PORT ?? 5050;

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(helmet());
app.use(cors());
app.use(express.json());
if (process.env.NODE_ENV !== 'test') app.use(morgan('dev'));
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 200, standardHeaders: true }));

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/api/auth',    authRoutes);
app.use('/api/patient', patientRoutes);
app.use('/api/doctor',  doctorRoutes);
app.get('/health', (_req, res) => res.json({ ok: true }));

// ── Error handler ─────────────────────────────────────────────────────────────
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ success: false, message: err.message ?? 'Server error' });
});

// ── Start ─────────────────────────────────────────────────────────────────────
connectDB().then(() => {
  app.listen(PORT, () => console.log(`🚀 drugs-api running on port ${PORT}`));
}).catch(err => { console.error(err); process.exit(1); });
