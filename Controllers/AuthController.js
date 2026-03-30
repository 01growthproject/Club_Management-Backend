// Controllers/AuthController.js

import jwt from "jsonwebtoken";
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
      username: username.trim(),
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: "Account is disabled",
      });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    const accessToken = generateAccessToken(user._id, user.role);
    const refreshToken = generateRefreshToken(user._id, user.role);

    // ✅ Store tokens in cookies (secure way)
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
      path: "/",
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
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({
      success: false,
      message: "Something went wrong",
    });
  }
};

// ─── POST /api/auth/refresh-token ────────────────────────────
const refreshToken = async (req, res) => {
  try {
    const token = req.cookies?.jc_refresh;

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Please login again",
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);

    const user = await User.findById(decoded.id).select("-password");

    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        message: "Invalid session",
      });
    }

    const newAccessToken = generateAccessToken(user._id, user.role);

    res.cookie("jc_token", newAccessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 15 * 60 * 1000,
      path: "/",
    });

    res.status(200).json({
      success: true,
      message: "Token refreshed",
    });
  } catch (error) {
    console.error("Refresh error:", error);

    return res.status(401).json({
      success: false,
      message: "Session expired, login again",
    });
  }
};

// ─── POST /api/auth/logout ────────────────────────────────────
const logout = async (req, res) => {
  try {
    res.clearCookie("jc_token", { path: "/" });
    res.clearCookie("jc_refresh", { path: "/" });

    res.status(200).json({
      success: true,
      message: "Logged out successfully",
    });
  } catch (error) {
    console.error("Logout error:", error);

    res.status(500).json({
      success: false,
      message: "Something went wrong",
    });
  }
};

// ─── GET /api/auth/me ─────────────────────────────────────────
const getMe = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const user = await User.findById(req.user.id).select("-password");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error) {
    console.error("GetMe error:", error);

    res.status(500).json({
      success: false,
      message: "Something went wrong",
    });
  }
};

// ─── POST /api/auth/create-user ───────────────────────────────
const createUser = async (req, res) => {
  try {
    // Only owner can create users
    if (req.user?.role !== "owner") {
      return res.status(403).json({
        success: false,
        message: "Only owner can create users",
      });
    }

    const { username, password, name, role } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: "Username and password required",
      });
    }

    // ✅ Simple password rule (no complex regex)
    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters",
      });
    }

    const existingUser = await User.findOne({
      username: username.toLowerCase(),
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "Username already exists",
      });
    }

    const ALLOWED_ROLES = ["staff", "admin"];
    const finalRole = ALLOWED_ROLES.includes(role) ? role : "staff";

    const user = new User({
      username: username.toLowerCase().trim(),
      password,
      name: name || "",
      role: finalRole,
    });

    await user.save();

    res.status(201).json({
      success: true,
      message: "User created successfully",
      data: {
        id: user._id,
        username: user.username,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Create user error:", error);

    res.status(500).json({
      success: false,
      message: "Something went wrong",
    });
  }
};

// ─── POST /api/auth/change-password ───────────────────────────
const changePassword = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "Both fields required",
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters",
      });
    }

    const user = await User.findById(req.user.id);

    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: "Wrong current password",
      });
    }

    user.password = newPassword;
    await user.save();

    res.json({
      success: true,
      message: "Password changed successfully",
    });
  } catch (error) {
    console.error("Change password error:", error);

    res.status(500).json({
      success: false,
      message: "Something went wrong",
    });
  }
};

export { login, logout, getMe, createUser, refreshToken, changePassword };
