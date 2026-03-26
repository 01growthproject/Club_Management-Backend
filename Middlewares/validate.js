import { body, validationResult } from "express-validator";

// ─── Validation Rules ─────────────────────────────────────────────────────────
const entryValidationRules = [
  body("name")
    .trim()
    .notEmpty().withMessage("Name is required")
    .isLength({ min: 2 }).withMessage("Name must be at least 2 characters"),

  body("surname")
    .trim()
    .notEmpty().withMessage("Surname is required")
    .isLength({ min: 2 }).withMessage("Surname must be at least 2 characters"),

  body("contactNo")
    .trim()
    .notEmpty().withMessage("Contact number is required")
    .isLength({ min: 10, max: 15 }).withMessage("Contact must be 10-15 digits"),

  body("email")
    .optional({ checkFalsy: true })
    .isEmail().withMessage("Valid email address required")
    .normalizeEmail(),

  body("entryTime")
    .notEmpty().withMessage("Entry time is required"),

  // ── Pax ──────────────────────────────────────────────────
  body("pax")
    .optional()
    .isIn(["Pax", "Stag Male", "Stag Female", "Couple"])
    .withMessage("Pax must be: Pax, Stag Male, Stag Female, or Couple"),

  body("paxCount")
    .optional({ checkFalsy: true })
    .isInt({ min: 1, max: 50 }).withMessage("Pax count must be between 1 and 50"),

  // ── Payment ───────────────────────────────────────────────
  body("cashAmount")
    .optional({ checkFalsy: true })
    .isFloat({ min: 0 }).withMessage("Cash amount must be positive"),

  body("upiAmount")
    .optional({ checkFalsy: true })
    .isFloat({ min: 0 }).withMessage("UPI amount must be positive"),

  body("cardAmount")
    .optional({ checkFalsy: true })
    .isFloat({ min: 0 }).withMessage("Card amount must be positive"),

  body("withCover")
    .optional({ checkFalsy: true })
    .isFloat({ min: 0 }).withMessage("With Cover amount must be positive"),

  body("withoutCover")
    .optional({ checkFalsy: true })
    .isFloat({ min: 0 }).withMessage("Without Cover amount must be positive"),

  // ── Category & Table ──────────────────────────────────────
  body("category")
    .optional()
    .isIn(["Normal", "VIP", "VVIP"]).withMessage("Category must be Normal, VIP, or VVIP"),

  body("tableNo")
    .optional({ checkFalsy: true })
    .isInt({ min: 1 }).withMessage("Table number must be a positive integer"),
];

// ─── Validation Error Handler ─────────────────────────────────────────────────
const validate = (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    const formattedErrors = errors.array().map((err) => ({
      field:   err.path,
      message: err.msg,
    }));

    return res.status(400).json({
      success: false,
      message: "Validation failed",
      errors:  formattedErrors,
    });
  }

  next();
};

export { entryValidationRules, validate };