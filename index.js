import "dotenv/config";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import connectDB from "./Config/db.js";
import entryRoutes from "./Routes/Entry.Route.js";
import authRoutes  from "./Routes/Auth.Route.js";
import reportRoutes from "./Routes/Report.Route.js";

const app = express();

connectDB();

app.use(cors({
  origin: [
    "https://clubentry.netlify.app/",
    process.env.CLIENT_URL || "http://localhost:5173"
  ],
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// ─── Routes ───────────────────────────────────────────────────
app.use("/api/entries", entryRoutes);
app.use("/api/auth",    authRoutes);
app.use("/api/reports", reportRoutes);

// ─── Seed Owner (TEMPORARY — login ke baad hata dena!) ────────
app.post("/api/seed-owner", async (req, res) => {
  try {
    const { default: User } = await import("./Models/User.model.js");
    const bcrypt = await import("bcryptjs");

    const exists = await User.findOne({ username: "admin" });
    if (exists) {
      return res.json({
        success: true,
        message: "Owner already exists!",
        username: "admin",
      });
    }

    const hashed = await bcrypt.default.hash("jaguar@admin123", 10);
    await User.create({
      username: "admin",
      password: hashed,
      role:     "owner",
      isActive: true,
    });

    res.json({
      success:  true,
      message:  "✅ Owner created!",
      username: "admin",
      password: "jaguar@admin123",
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── Health Check ─────────────────────────────────────────────
app.get("/", (req, res) => {
  res.json({
    success:  true,
    message:  "🎯 Jaguar Club API is running!",
    version:  "2.0.0",
    endpoints: {
      entries: "/api/entries",
      auth:    "/api/auth",
      reports: "/api/reports",
    },
    onlineLink: "https://clubentry.netlify.app/",
  });
});

// ─── 404 Handler ──────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
});

// ─── Global Error Handler ─────────────────────────────────────
app.use((err, req, res, next) => {
  console.error("💥 Error:", err.stack);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || "Internal Server Error",
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(`🚀 Server   : http://localhost:${PORT}`);
  console.log(`🔐 Auth     : http://localhost:${PORT}/api/auth`);
  console.log(`📋 Entries  : http://localhost:${PORT}/api/entries`);
  console.log(`📊 Reports  : http://localhost:${PORT}/api/reports`);
  console.log(`🌐 Frontend : ${process.env.CLIENT_URL}`);
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
});