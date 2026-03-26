// Routes/Auth.Route.js

import { Router } from "express";
import {
  login,
  logout,
  getMe,
  createUser,
  refreshToken,
  changePassword, // ← add karo
} from "../Controllers/AuthController.js";

import { protect, ownerOnly } from "../Middlewares/auth.js";

const router = Router();

// ─── Public Routes ────────────────────────────────────────────
router.post("/login", login);
router.post("/logout", logout);

// Refresh access token
router.post("/refresh-token", refreshToken);

// ─── Protected Routes ─────────────────────────────────────────
router.get("/me", protect, getMe);

// ─── Owner Only Routes ────────────────────────────────────────
router.post("/create-user", protect, ownerOnly, createUser);
router.post("/change-password", protect, ownerOnly, changePassword); // ← add karo

export default router;
