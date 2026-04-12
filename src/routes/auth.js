// src/routes/auth.js
import { Router }         from 'express';
import { authMiddleware } from '../middleware/auth.js';
import * as auth          from '../controllers/authController.js';

const router = Router();

router.post('/register',   auth.register);
router.post('/login',      auth.login);
router.post('/refresh',    auth.refresh);
router.post('/pin',        authMiddleware, auth.setPin);
router.post('/pin/verify', authMiddleware, auth.verifyPin);
router.get('/me',          authMiddleware, auth.me);

export default router;
