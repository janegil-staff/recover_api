import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

function generateCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

const UserSchema = new mongoose.Schema({
  email:        { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true },
  role:         { type: String, enum: ['patient', 'doctor'], default: 'patient' },
  accessCode:   { type: String, default: generateCode, unique: true },
  name:         { type: String, default: '' },
  language:     { type: String, default: 'en' },
  pinHash:      { type: String, default: null },
}, { timestamps: true });

UserSchema.methods.comparePassword = async function (plain) {
  return bcrypt.compare(plain, this.passwordHash);
};

UserSchema.pre('save', async function () {
  if (this.isModified('passwordHash') && !this.passwordHash.startsWith('$2')) {
    this.passwordHash = await bcrypt.hash(this.passwordHash, 12);
  }
});

export default mongoose.model('User', UserSchema);
