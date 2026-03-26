// Controllers/AuthController.js

import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";

import User from "../Models/User.model.js";

// ─── Generate Access Token ────────────────────────────────────
const generateAccessToken = (userId, role) => {
  return jwt.sign({ id: userId, role }, process.env.JWT_SECRET, {
    expiresIn: "15m",
  });
};

// ─── Generate Refresh Token ───────────────────────────────────
const generateRefreshToken = (userId, role) => {
  return jwt.sign({ id: userId, role }, process.env.JWT_REFRESH_SECRET, {
    expiresIn: "7d",
  });
};

// ─── POST /api/auth/login ─────────────────────────────────────
const login = async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: "Username and password are required",
      });
    }

    const user = await User.findOne({
      username: username.toLowerCase().trim(),
    });
    if (!user) {
      return res
        .status(401)
        .json({ success: false, message: "Invalid credentials" });
    }

    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: "Account is disabled. Contact admin.",
      });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res
        .status(401)
        .json({ success: false, message: "Invalid credentials" });
    }

    const accessToken = generateAccessToken(user._id, user.role);
    const refreshToken = generateRefreshToken(user._id, user.role);

    res.cookie("jc_token", accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 15 * 60 * 1000,
      path: "/",
    });

    res.cookie("jc_refresh", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: "/api/auth/refresh-token",
    });

    res.status(200).json({
      success: true,
      message: `Welcome back, ${user.name || user.username}!`,
      data: {
        id: user._id,
        username: user.username,
        name: user.name,
        role: user.role,
      },
      accessToken,
    });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Server Error", error: error.message });
  }
};

// ─── POST /api/auth/refresh-token ────────────────────────────
const refreshToken = async (req, res) => {
  try {
    const token = req.cookies?.jc_refresh;

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "No refresh token. Please login again.",
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);

    const user = await User.findById(decoded.id).select("-password");
    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        message: "Invalid session. Please login again.",
      });
    }

    const newAccessToken = generateAccessToken(user._id, user.role);

    res.cookie("jc_token", newAccessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 15 * 60 * 1000,
    });

    res.status(200).json({
      success: true,
      message: "Token refreshed!",
      accessToken: newAccessToken,
    });
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        success: false,
        message: "Session expired. Please login again.",
      });
    }
    res
      .status(500)
      .json({ success: false, message: "Server Error", error: error.message });
  }
};

// ─── POST /api/auth/logout ────────────────────────────────────
const logout = async (req, res) => {
  try {
    res.clearCookie("jc_token", { path: "/" });
    res.clearCookie("jc_refresh", { path: "/api/auth/refresh-token" });
    res.status(200).json({ success: true, message: "Logged out successfully" });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Server Error", error: error.message });
  }
};

// ─── GET /api/auth/me ─────────────────────────────────────────
const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }
    res.status(200).json({ success: true, data: user });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Server Error", error: error.message });
  }
};

// ─── POST /api/auth/create-user (Owner only) ──────────────────
const createUser = async (req, res) => {
  try {
    const { username, password, name, role } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: "Username and password are required",
      });
    }

    const existingUser = await User.findOne({
      username: username.toLowerCase(),
    });
    if (existingUser) {
      return res
        .status(400)
        .json({ success: false, message: "Username already exists" });
    }

    const user = await User({
      username: username.toLowerCase().trim(),
      password,
      name: name || "",
      role: role || "staff",
    });
    await user.save();

    res.status(201).json({
      success: true,
      message: `User '${user.username}' created successfully!`,
      data: {
        id: user._id,
        username: user.username,
        name: user.name,
        role: user.role,
      },
    });
  } catch (error) {
    if (error.code === 11000) {
      return res
        .status(400)
        .json({ success: false, message: "Username already exists" });
    }
    res
      .status(500)
      .json({ success: false, message: "Server Error", error: error.message });
  }
};

// ─── POST /api/auth/change-password (Owner only) ─────────────
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword)
      return res
        .status(400)
        .json({ success: false, message: "Both fields are required." });

    if (newPassword.length < 6)
      return res
        .status(400)
        .json({
          success: false,
          message: "Password must be at least 6 characters.",
        });

    const user = await User.findById(req.user.id);
    if (!user)
      return res
        .status(404)
        .json({ success: false, message: "User not found." });

    const isMatch = await user.comparePassword(currentPassword); // ✅ model method
    if (!isMatch)
      return res
        .status(400)
        .json({ success: false, message: "Current password is incorrect." });

    user.password = newPassword; // ✅ plain text — pre-save hook hash karega
    await user.save();

    res.json({ success: true, message: "Password changed successfully." });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Server Error", error: error.message });
  }
};

export { login, logout, getMe, createUser, refreshToken, changePassword }; // ← changePassword add kiya
