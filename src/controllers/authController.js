// src/controllers/authController.js
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import User       from '../models/User.js';
import Patient    from '../models/Patient.js';
import { signToken, signRefreshToken, verifyRefreshToken } from '../utils/jwt.js';
import { sendResetCode } from '../utils/mailer.js';

export async function register(req, res, next) {
  try {
    const { email, password, name, language, age, gender, height } = req.body;
    if (!email || !password)
      return res.status(400).json({ success: false, message: 'Email and password required' });

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing)
      return res.status(409).json({ success: false, message: 'Email already registered' });

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await User.create({
      email: email.toLowerCase(), passwordHash,
      name: name ?? '', language: language ?? 'en',
    });
    await Patient.create({
      userId: user._id,
      ...(age    ? { age:    parseInt(age,    10) } : {}),
      ...(gender ? { gender }                       : {}),
      ...(height ? { height: parseInt(height, 10) } : {}),
    });

    const token        = signToken({ userId: user._id.toString(), role: user.role });
    const refreshToken = signRefreshToken({ userId: user._id.toString(), role: user.role });

    res.status(201).json({
      success: true,
      data: {
        token, refreshToken,
        user: { id: user._id, email: user.email, name: user.name, role: user.role, language: user.language },
      },
    });
  } catch (err) { next(err); }
}

export async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email: email?.toLowerCase() });
    if (!user || !(await user.comparePassword(password)))
      return res.status(401).json({ success: false, message: 'Invalid credentials' });

    const token        = signToken({ userId: user._id.toString(), role: user.role });
    const refreshToken = signRefreshToken({ userId: user._id.toString(), role: user.role });

    res.json({
      success: true,
      data: {
        token, refreshToken,
        user: { id: user._id, email: user.email, name: user.name, role: user.role, language: user.language },
      },
    });
  } catch (err) { next(err); }
}

export async function refresh(req, res, next) {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken)
      return res.status(400).json({ success: false, message: 'Refresh token required' });
    try {
      const payload    = verifyRefreshToken(refreshToken);
      const token      = signToken({ userId: payload.userId, role: payload.role });
      const newRefresh = signRefreshToken({ userId: payload.userId, role: payload.role });
      res.json({ success: true, data: { token, refreshToken: newRefresh } });
    } catch {
      res.status(401).json({ success: false, message: 'Invalid refresh token' });
    }
  } catch (err) { next(err); }
}

export async function setPin(req, res, next) {
  try {
    const { pin } = req.body;
    if (!pin || pin.length < 4)
      return res.status(400).json({ success: false, message: 'PIN must be at least 4 digits' });
    const pinHash = await bcrypt.hash(pin, 10);
    await User.findByIdAndUpdate(req.user.userId, { pinHash });
    res.json({ success: true });
  } catch (err) { next(err); }
}

export async function verifyPin(req, res, next) {
  try {
    const { pin } = req.body;
    const user = await User.findById(req.user.userId);
    if (!user?.pinHash)
      return res.status(400).json({ success: false, message: 'No PIN set' });
    const ok = await bcrypt.compare(pin, user.pinHash);
    res.json({ success: ok, data: { valid: ok } });
  } catch (err) { next(err); }
}

export async function me(req, res, next) {
  try {
    const user = await User.findById(req.user.userId).select('-passwordHash -pinHash');
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    res.json({ success: true, data: user });
  } catch (err) { next(err); }
}

export async function changeEmail(req, res, next) {
  try {
    const { newEmail, password } = req.body;
    if (!newEmail || !password)
      return res.status(400).json({ success: false, message: 'New email and password required' });

    const user = await User.findById(req.user.userId);
    if (!user)
      return res.status(404).json({ success: false, message: 'User not found' });

    const valid = await user.comparePassword(password);
    if (!valid)
      return res.status(401).json({ success: false, message: 'Invalid PIN' });

    const existing = await User.findOne({ email: newEmail.toLowerCase() });
    if (existing)
      return res.status(409).json({ success: false, message: 'Email already in use' });

    user.email = newEmail.toLowerCase();
    await user.save();
    res.json({ success: true, data: { email: user.email } });
  } catch (err) { next(err); }
}

export async function deleteAccount(req, res, next) {
  try {
    const { password } = req.body;
    if (!password)
      return res.status(400).json({ success: false, message: 'Password required' });

    const user = await User.findById(req.user.userId);
    if (!user)
      return res.status(404).json({ success: false, message: 'User not found' });

    const valid = await user.comparePassword(password);
    if (!valid)
      return res.status(401).json({ success: false, message: 'Invalid password' });

    // Delete patient data first, then the user
    await Patient.deleteOne({ userId: user._id });
    await User.deleteOne({ _id: user._id });

    res.json({ success: true, message: 'Account deleted' });
  } catch (err) { next(err); }
}

export async function forgotPassword(req, res, next) {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email: email?.toLowerCase() });
    if (user) {
      const code    = crypto.randomInt(100000, 999999).toString();
      const expires = new Date(Date.now() + 15 * 60 * 1000);
      user.resetCode        = code;
      user.resetCodeExpires = expires;
      await user.save();
      await sendResetCode(user.email, code);
    }
    // Always respond OK — don't leak whether email exists
    res.json({ success: true });
  } catch (err) { next(err); }
}

export async function verifyResetCode(req, res, next) {
  try {
    const { email, code } = req.body;
    const user = await User.findOne({ email: email?.toLowerCase() });
    if (!user || user.resetCode !== code || user.resetCodeExpires < new Date())
      return res.status(400).json({ success: false, message: 'Invalid or expired code' });
    res.json({ success: true });
  } catch (err) { next(err); }
}

export async function resetPassword(req, res, next) {
  try {
    const { email, code, newPassword } = req.body;
    const user = await User.findOne({ email: email?.toLowerCase() });
    if (!user || user.resetCode !== code || user.resetCodeExpires < new Date())
      return res.status(400).json({ success: false, message: 'Invalid or expired code' });
    user.passwordHash     = await bcrypt.hash(newPassword, 12);
    user.resetCode        = undefined;
    user.resetCodeExpires = undefined;
    await user.save();
    res.json({ success: true });
  } catch (err) { next(err); }
}

export async function checkEmail(req, res, next) {
  try {
    const { email } = req.body;
    if (!email)
      return res.status(400).json({ success: false, message: "Email required" });
    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing)
      return res.status(409).json({ success: false, message: "Email already registered" });
    res.json({ success: true });
  } catch (err) { next(err); }
}