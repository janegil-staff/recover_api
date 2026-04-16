// src/controllers/patientController.js
import mongoose from "mongoose";
import Patient from "../models/Patient.js";
import User from "../models/User.js";

// ── Inline Medication model ───────────────────────────────────────────────────
const MedicationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    name: { type: String, required: true },
    dosage: { type: String, default: "" },
    frequency: { type: String, default: "daily" },
    startDate: { type: String, default: "" },
    prescribedBy: { type: String, default: "" },
    notes: { type: String, default: "" },
    active: { type: Boolean, default: true },
  },
  { timestamps: true },
);

const Medication =
  mongoose.models.Medication || mongoose.model("Medication", MedicationSchema);

// ── Profile ───────────────────────────────────────────────────────────────────
export async function getProfile(req, res, next) {
  try {
    const patient = await Patient.findOne({ userId: req.user.userId });
    if (!patient)
      return res
        .status(404)
        .json({ success: false, message: "Patient not found" });
    res.json({ success: true, data: patient });
  } catch (err) {
    next(err);
  }
}

export async function updateProfile(req, res, next) {
  try {
    const allowed = ["age", "gender", "height", "shareNotes", "weight"];
    const update = {};
    for (const k of allowed)
      if (req.body[k] !== undefined) update[k] = req.body[k];
    const patient = await Patient.findOneAndUpdate(
      { userId: req.user.userId },
      { $set: update },
      { new: true },
    );
    if (req.body.language) {
      await User.findByIdAndUpdate(req.user.userId, {
        language: req.body.language,
      });
    }
    res.json({
      success: true,
      data: { ...patient.toObject(), language: req.body.language ?? undefined },
    });
  } catch (err) {
    next(err);
  }
}

// ── Records ───────────────────────────────────────────────────────────────────
export async function upsertRecord(req, res, next) {
  try {
    const record = req.body;
    if (!record?.date)
      return res.status(400).json({ success: false, message: "date required" });
    const patient = await Patient.findOne({ userId: req.user.userId });
    if (!patient)
      return res
        .status(404)
        .json({ success: false, message: "Patient not found" });
    const idx = patient.records.findIndex((r) => r.date === record.date);
    if (idx >= 0)
      patient.records[idx] = { ...patient.records[idx].toObject(), ...record };
    else patient.records.push(record);
    patient.records.sort((a, b) => a.date.localeCompare(b.date));
    await patient.save();
    res.json({ success: true, data: patient.records });
  } catch (err) {
    next(err);
  }
}

export async function bulkUpsertRecords(req, res, next) {
  try {
    const { records } = req.body;
    if (!Array.isArray(records))
      return res
        .status(400)
        .json({ success: false, message: "records array required" });
    const patient = await Patient.findOne({ userId: req.user.userId });
    if (!patient)
      return res
        .status(404)
        .json({ success: false, message: "Patient not found" });
    for (const rec of records) {
      const idx = patient.records.findIndex((r) => r.date === rec.date);
      if (idx >= 0)
        patient.records[idx] = { ...patient.records[idx].toObject(), ...rec };
      else patient.records.push(rec);
    }
    patient.records.sort((a, b) => a.date.localeCompare(b.date));
    await patient.save();
    res.json({ success: true, data: patient.records });
  } catch (err) {
    next(err);
  }
}

// ── Questionnaire ─────────────────────────────────────────────────────────────
export async function updateQuestionnaire(req, res, next) {
  try {
    const allowed = [
      "latestGad7",
      "latestPhq9",
      "latestAudit",
      "latestDast10",
      "latestCage",
      "latestReadiness",
    ];
    const { key, data } = req.body;
    if (!allowed.includes(key))
      return res.status(400).json({
        success: false,
        message: `key must be one of ${allowed.join(", ")}`,
      });
    const patient = await Patient.findOneAndUpdate(
      { userId: req.user.userId },
      {
        $set: {
          [key]: { ...data, date: new Date().toISOString().slice(0, 10) },
        },
      },
      { new: true },
    );
    res.json({ success: true, data: patient });
  } catch (err) {
    next(err);
  }
}

// ── Medicines (legacy field on Patient) ──────────────────────────────────────
export async function updateMedicines(req, res, next) {
  try {
    const { medicines } = req.body;
    const patient = await Patient.findOneAndUpdate(
      { userId: req.user.userId },
      { $set: { medicines } },
      { new: true },
    );
    res.json({ success: true, data: patient });
  } catch (err) {
    next(err);
  }
}

// ── Medications (full Medication model) ───────────────────────────────────────
export async function getMedications(req, res, next) {
  try {
    const filter = { userId: req.user.userId };
    if (req.query.active === "true") filter.active = true;
    const meds = await Medication.find(filter).sort({ createdAt: -1 });
    res.json({ success: true, data: meds });
  } catch (err) {
    next(err);
  }
}

export async function createMedication(req, res, next) {
  try {
    const { name, dosage, frequency, startDate, prescribedBy, notes } =
      req.body;
    if (!name)
      return res.status(400).json({ success: false, message: "Name required" });
    const med = await Medication.create({
      userId: req.user.userId,
      name,
      dosage,
      frequency,
      startDate,
      prescribedBy,
      notes,
    });
    res.status(201).json({ success: true, data: med });
  } catch (err) {
    next(err);
  }
}

export async function deleteMedication(req, res, next) {
  try {
    await Medication.findOneAndDelete({
      _id: req.params.id,
      userId: req.user.userId,
    });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}

export async function bulkSaveMedications(req, res, next) {
  try {
    const { medications } = req.body;
    if (!Array.isArray(medications))
      return res
        .status(400)
        .json({ success: false, message: "medications must be an array" });
    const patient = await Patient.findOneAndUpdate(
      { userId: req.user.userId },
      {
        $set: {
          medicines: medications.map((id) => ({
            id: String(id),
            name: String(id),
          })),
        },
      },
      { new: true, runValidators: false },
    );
    res.json({ success: true, data: patient });
  } catch (err) {
    next(err);
  }
}

export async function deleteRecord(req, res, next) {
  try {
    const { date } = req.params;
    const patient = await Patient.findOne({ userId: req.user.userId });
    if (!patient)
      return res
        .status(404)
        .json({ success: false, message: "Patient not found" });
    const before = patient.records.length;
    patient.records = patient.records.filter((r) => r.date !== date);
    if (patient.records.length === before)
      return res
        .status(404)
        .json({ success: false, message: "Record not found" });
    await patient.save();
    res.json({ success: true, data: patient.records });
  } catch (err) {
    next(err);
  }
}

export async function updateRelevantAdvice(req, res, next) {
  try {
    const { relevantAdvice } = req.body;
    if (!Array.isArray(relevantAdvice))
      return res
        .status(400)
        .json({ success: false, message: "relevantAdvice must be an array" });
    const patient = await Patient.findOneAndUpdate(
      { userId: req.user.userId },
      { $set: { relevantAdvice } },
      { new: true },
    );
    res.json({ success: true, data: patient.relevantAdvice });
  } catch (err) {
    next(err);
  }
}

export async function updateViewedAdvice(req, res, next) {
  try {
    const { viewedAdvice } = req.body;
    if (!Array.isArray(viewedAdvice))
      return res
        .status(400)
        .json({ success: false, message: "viewedAdvice must be an array" });
    const patient = await Patient.findOneAndUpdate(
      { userId: req.user.userId },
      { $set: { viewedAdvice } },
      { new: true },
    );
    res.json({ success: true, data: patient.viewedAdvice });
  } catch (err) {
    next(err);
  }
}

export async function upsertRecord(req, res, next) {
  try {
    const record = req.body;
    if (!record?.date)
      return res.status(400).json({ success: false, message: "date required" });
    const patient = await Patient.findOne({ userId: req.user.userId });
    if (!patient)
      return res
        .status(404)
        .json({ success: false, message: "Patient not found" });

    const idx = patient.records.findIndex((r) => r.date === record.date);
    if (idx >= 0)
      patient.records[idx] = { ...patient.records[idx].toObject(), ...record };
    else patient.records.push(record);

    patient.records.sort((a, b) => a.date.localeCompare(b.date));

    // Sync weight to patient profile if record includes it
    if (record.weight != null && record.weight > 0) {
      patient.weight = record.weight;
    }

    await patient.save();
    res.json({ success: true, data: patient.records });
  } catch (err) {
    next(err);
  }
}
