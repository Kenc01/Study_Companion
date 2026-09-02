import express from "express";
import cors from "cors";

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.get("/api/status", (req, res) => {
  res.json({
    status: "ok",
    message: "Backend is running successfully!",
    timestamp: new Date().toISOString()
  });
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
