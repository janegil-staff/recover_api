import mongoose from "mongoose";

const RecordSchema = new mongoose.Schema(
  {
    date: { type: String, required: true },
    substances: [{ type: String }],
    frequency: { type: String, default: "none" },
    amount: { type: Number, default: 0, min: 0, max: 10 },
    cravings: { type: Number, default: 0, min: 0, max: 5 },
    mood: { type: Number, default: 3, min: 1, max: 5 },
    wellbeing: { type: Number, default: 3, min: 1, max: 5 },
    sideEffects: [{ type: String }],
    note: { type: String, default: "" },
    medicationsTaken: [{ id: String, name: String, dosage: String }],
    weight: { type: Number },
  },
  { _id: false },
);

const PatientSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    age: { type: Number, default: 0 },
    height: { type: Number, default: 0 },
    gender: {
      type: String,
      enum: ["male", "female", "other", "undefined"],
      default: "other",
    },
    records: [RecordSchema],
    medicines: [{ id: String, name: String, atcCode: String }],
    shareNotes: { type: Boolean, default: true },
    hasActiveSubscription: { type: Boolean, default: false },
    latestGad7: { type: mongoose.Schema.Types.Mixed, default: null },
    latestPhq9: { type: mongoose.Schema.Types.Mixed, default: null },
    latestAudit: { type: mongoose.Schema.Types.Mixed, default: null },
    latestDast10: { type: mongoose.Schema.Types.Mixed, default: null },
    latestCage: { type: mongoose.Schema.Types.Mixed, default: null },
    latestReadiness: { type: mongoose.Schema.Types.Mixed, default: null },
    vaccinations: [{ type: mongoose.Schema.Types.Mixed }],
    relevantAdvice: [{ type: String }],
    viewedAdvice: [{ type: String }],
    relevantAdvice: [{ type: String }], // array of advice IDs marked relevant
  },
  { timestamps: true },
);

export default mongoose.model("Patient", PatientSchema);

// ── patientController.js additions ───────────────────────────────────────────
// Add this function to src/controllers/patientController.js:

// export async function updateRelevantAdvice(req, res, next) {
//   try {
//     const { relevantAdvice } = req.body;
//     if (!Array.isArray(relevantAdvice))
//       return res.status(400).json({ success: false, message: 'relevantAdvice must be an array' });
//     const patient = await Patient.findOneAndUpdate(
//       { userId: req.user.userId },
//       { $set: { relevantAdvice } },
//       { new: true }
//     );
//     res.json({ success: true, data: patient.relevantAdvice });
//   } catch (err) { next(err); }
// }

// ── patient.js route additions ────────────────────────────────────────────────
// Add to src/routes/patient.js (inside the authenticated section):
// router.patch('/advice', patient.updateRelevantAdvice);
