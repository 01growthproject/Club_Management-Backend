// app.js - ✅ COMPLETE UPDATED VERSION

import "dotenv/config";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import helmet from "helmet"; // ✅ ADD: Security headers
import connectDB from "./Config/db.js";
import entryRoutes from "./Routes/Entry.Route.js";
import authRoutes from "./Routes/Auth.Route.js";
import reportRoutes from "./Routes/Report.Route.js";

const app = express();

connectDB();

// ✅ FIX #7: CORS configuration - remove trailing slash from origin
app.use(
  cors({
    origin: [
      "https://clubentry.netlify.app", // ✅ CHANGED: Remove trailing /
      process.env.CLIENT_URL || "http://localhost:5173",
    ],
    credentials: true,
  })
);

// ✅ NEW: Security headers with helmet
app.use(helmet());

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// ─── Routes ───────────────────────────────────────────────────
app.use("/api/entries", entryRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/reports", reportRoutes);

// ✅ FIX #1: DELETE /api/seed-owner endpoint completely
// ❌ REMOVED: app.post("/api/seed-owner", async (req, res) => { ... });
// Use seeders/seed.js instead - run: npm run seed

// ─── Health Check ─────────────────────────────────────────────
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "🎯 Jaguar Club API is running!",
    version: "2.0.0",
    endpoints: {
      entries: "/api/entries",
      auth: "/api/auth",
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
  console.error("💥 Error:", err.stack); // ✅ Log server-side

  // ✅ FIX #8: Don't expose error messages in response
  res.status(err.status || 500).json({
    success: false,
    message:
      process.env.NODE_ENV === "production"
        ? "An error occurred. Please try again."
        : err.message || "Internal Server Error",
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