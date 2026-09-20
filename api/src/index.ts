import "dotenv/config";
import express from "express";
import cors from "cors";
import mongoose from "mongoose";

interface TopicDocument extends mongoose.Document {
  id: string;
  name: string;
  subject?: string;
  tags?: string[];
  color?: number;
  rawNotes: string;
  questions: unknown[];
  createdAt: number;
  updatedAt: number;
  lastStudiedAt?: number;
}

interface SubjectDocument extends mongoose.Document {
  id: string;
  name: string;
  color?: number;
  createdAt: number;
  updatedAt: number;
}

interface MasteryDocument extends mongoose.Document {
  key: string;
  topicId: string;
  questionId: string;
  streak: number;
  mastered: boolean;
  correctCount: number;
  attempts: number;
  lastSeenAt: number;
  bookmarked?: boolean;
  srs?: unknown;
}

const topicSchema = new mongoose.Schema<TopicDocument>(
  {
    id: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true, trim: true },
    subject: { type: String, trim: true },
    tags: { type: [String], default: [] },
    color: { type: Number, min: 0, max: 5 },
    rawNotes: { type: String, default: "" },
    questions: { type: [mongoose.Schema.Types.Mixed], default: [] },
    createdAt: { type: Number, required: true },
    updatedAt: { type: Number, required: true },
    lastStudiedAt: { type: Number },
  },
  { versionKey: false },
);

const Topic = mongoose.model<TopicDocument>("Topic", topicSchema);

const subjectSchema = new mongoose.Schema<SubjectDocument>(
  {
    id: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true, trim: true },
    color: { type: Number, min: 0, max: 5 },
    createdAt: { type: Number, required: true },
    updatedAt: { type: Number, required: true },
  },
  { versionKey: false },
);

const Subject = mongoose.model<SubjectDocument>("Subject", subjectSchema);

const masterySchema = new mongoose.Schema<MasteryDocument>(
  {
    key: { type: String, required: true, unique: true, index: true },
    topicId: { type: String, required: true },
    questionId: { type: String, required: true },
    streak: { type: Number, required: true, min: 0 },
    mastered: { type: Boolean, required: true },
    correctCount: { type: Number, required: true, min: 0 },
    attempts: { type: Number, required: true, min: 0 },
    lastSeenAt: { type: Number, required: true },
    bookmarked: { type: Boolean },
    srs: { type: mongoose.Schema.Types.Mixed },
  },
  { versionKey: false },
);

const Mastery = mongoose.model<MasteryDocument>("Mastery", masterySchema);

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Connect to MongoDB
const mongoUri = process.env.MONGODB_URI;
if (mongoUri) {
  mongoose
    .connect(mongoUri)
    .then(() => console.log("✅ Successfully connected to MongoDB!"))
    .catch((err) => console.error("❌ Failed to connect to MongoDB:", err));
} else {
  console.warn("⚠️ MONGODB_URI environment variable is missing.");
}

app.get("/api/status", (_req, res) => {
  res.json({
    status: mongoose.connection.readyState === 1 ? "ok" : "degraded",
    database:
      mongoose.connection.readyState === 1 ? "connected" : "disconnected",
    message: "Backend is running successfully!",
    timestamp: new Date().toISOString(),
  });
});

app.get("/api/topics", async (_req, res) => {
  try {
    const topics = await Topic.find().sort({ updatedAt: -1 }).lean();
    res.json(topics);
  } catch (error) {
    console.error("Failed to load topics:", error);
    res.status(500).json({ error: "Failed to load topics" });
  }
});

app.post("/api/topics", async (req, res) => {
  try {
    const topic = await Topic.create(req.body);
    res.status(201).json(topic);
  } catch (error) {
    console.error("Failed to create topic:", error);
    res.status(400).json({ error: "Invalid topic data" });
  }
});

app.put("/api/topics/:id", async (req, res) => {
  try {
    const topic = await Topic.findOneAndUpdate(
      { id: req.params.id },
      { ...req.body, id: req.params.id, updatedAt: Date.now() },
      { new: true, runValidators: true },
    );
    if (!topic) {
      res.status(404).json({ error: "Topic not found" });
      return;
    }
    res.json(topic);
  } catch (error) {
    console.error("Failed to update topic:", error);
    res.status(400).json({ error: "Invalid topic data" });
  }
});

app.delete("/api/topics/:id", async (req, res) => {
  try {
    const result = await Topic.deleteOne({ id: req.params.id });
    if (result.deletedCount === 0) {
      res.status(404).json({ error: "Topic not found" });
      return;
    }
    res.status(204).send();
  } catch (error) {
    console.error("Failed to delete topic:", error);
    res.status(500).json({ error: "Failed to delete topic" });
  }
});

app.get("/api/subjects", async (_req, res) => {
  try {
    const subjects = await Subject.find().sort({ updatedAt: -1 }).lean();
    res.json(subjects);
  } catch (error) {
    console.error("Failed to load subjects:", error);
    res.status(500).json({ error: "Failed to load subjects" });
  }
});

app.post("/api/subjects", async (req, res) => {
  try {
    const subject = await Subject.create(req.body);
    res.status(201).json(subject);
  } catch (error) {
    console.error("Failed to create subject:", error);
    res.status(400).json({ error: "Invalid subject data" });
  }
});

app.get("/api/mastery", async (_req, res) => {
  try {
    const records = await Mastery.find().lean();
    res.json(Object.fromEntries(records.map((record) => [record.key, record])));
  } catch (error) {
    console.error("Failed to load mastery:", error);
    res.status(500).json({ error: "Failed to load mastery" });
  }
});

app.put("/api/mastery/:topicId/:questionId", async (req, res) => {
  try {
    const { topicId, questionId } = req.params;
    const key = `${topicId}:${questionId}`;
    const record = await Mastery.findOneAndUpdate(
      { key },
      { ...req.body, key, topicId, questionId },
      {
        new: true,
        upsert: true,
        runValidators: true,
        setDefaultsOnInsert: true,
      },
    );
    res.json(record);
  } catch (error) {
    console.error("Failed to save mastery:", error);
    res.status(400).json({ error: "Invalid mastery data" });
  }
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
