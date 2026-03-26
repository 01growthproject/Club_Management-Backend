  // Middlewares/auth.js

  import jwt from "jsonwebtoken";
  import User from "../Models/User.model.js";

  // ─── Protect Route — JWT Verify ───────────────────────────────
  const protect = async (req, res, next) => {
    try {
      let token;

      // Token cookie se lo ya Authorization header se
      if (req.cookies?.jc_token) {
        token = req.cookies.jc_token;
      } else if (req.headers.authorization?.startsWith("Bearer ")) {
        token = req.headers.authorization.split(" ")[1];
      }

      if (!token) {
        return res.status(401).json({
          success: false,
          message: "Access denied. Please login first.",
        });
      }

      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // User find karo
      const user = await User.findById(decoded.id).select("-password");
      if (!user) {
        return res.status(401).json({
          success: false,
          message: "User no longer exists.",
        });
      }

      // Check active
      if (!user.isActive) {
        return res.status(403).json({
          success: false,
          message: "Account is disabled. Contact admin.",
        });
      }

      // User request mein attach karo
      req.user = user;
      next();

    } catch (error) {
      if (error.name === "JsonWebTokenError") {
        return res.status(401).json({
          success: false,
          message: "Invalid token. Please login again.",
        });
      }
      if (error.name === "TokenExpiredError") {
        return res.status(401).json({
          success: false,
          message: "Token expired. Please login again.",
        });
      }
      res.status(500).json({
        success: false,
        message: "Server Error",
        error: error.message,
      });
    }
  };

  // ─── Role Check — admin Only ──────────────────────────────────
  const ownerOnly  = (req, res, next) => {
    if (req.user?.role !== "owner") {
      return res.status(403).json({
        success: false,
        message: "Access denied. owner only.",
      });
    }
    next();
  };

  // ─── Role Check — Staff Only ──────────────────────────────────
  const staffOnly = (req, res, next) => {
    if (req.user?.role !== "staff" && req.user?.role !== "owner") {
      return res.status(403).json({
        success: false,
        message: "Access denied.",
      });
    }
    next();
  };

  export { protect, ownerOnly, staffOnly };