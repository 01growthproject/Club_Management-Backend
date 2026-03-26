import mongoose from "mongoose";

const counterSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  seq: { type: Number, default: 0 },
});
const Counter = mongoose.model("Counter", counterSchema);

const entrySchema = new mongoose.Schema(
  {
    srNo: { type: Number, unique: true },

    // ══════════════════════════════════════════════════════
    // PERSONAL INFORMATION
    // ══════════════════════════════════════════════════════

    name: {
      type: String,
      required: [true, "Name required"],
      trim: true,
      minlength: [2, "Name too short (min 2 chars)"],
      maxlength: [50, "Name too long (max 50 chars)"],
      match: [/^[a-zA-Z\s]+$/, "Name: letters only"],
    },

    surname: {
      type: String,
      required: [true, "Surname required"],
      trim: true,
      minlength: [2, "Surname too short (min 2 chars)"],
      maxlength: [50, "Surname too long (max 50 chars)"],
      match: [/^[a-zA-Z\s]+$/, "Surname: letters only"],
    },

    contactNo: {
      type: String,
      required: [true, "Contact number required"],
      trim: true,
      validate: {
        validator: function (v) {
          const cleaned = v.replace(/\s+/g, "").replace(/^\+91/, "");
          return /^[6-9]\d{9}$/.test(cleaned);
        },
        message: "Invalid mobile (10 digits, start with 6-9)",
      },
      set: (v) => v.replace(/\s+/g, ""),
    },

    email: {
      type: String,
      trim: true,
      lowercase: true,
      default: "",
      validate: {
        validator: function (v) {
          if (!v || v === "") return true;
          return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
        },
        message: "Invalid email format",
      },
    },

    dob: {
      type: String,
      default: "",
    },

    // ══════════════════════════════════════════════════════
    // ENTRY DETAILS
    // ══════════════════════════════════════════════════════

    entryTime: {
      type: String,
      required: [true, "Entry time required"],
      validate: {
        validator: function (v) {
          return /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(v);
        },
        message: "Invalid time format",
      },
    },

    // ══════════════════════════════════════════════════════
    // REFERENCE
    // ══════════════════════════════════════════════════════

    reffBy: {
      type: String,
      trim: true,
      default: "",
    },

    paxCounts: {
      type: Object,
      default: () => ({
        Pax: 0,
        "Stag Male": 0,
        "Stag Female": 0,
        Couple: 0,
      }),
    },

    // ══════════════════════════════════════════════════════
    // PAX
    // ══════════════════════════════════════════════════════

    pax: {
      type: String,
      enum: {
        values: ["Pax", "Stag Male", "Stag Female", "Couple"],
        message: "Pax: Pax, Stag Male, Stag Female, or Couple only",
      },
      
    },

    paxCount: {
      type: Number,
      default: 1,
      min: [1, "Pax count must be at least 1"],
      max: [50, "Pax count too high"],
    },

    // ══════════════════════════════════════════════════════
    // PAYMENT — Cash / UPI / Card (split amounts)
    // ══════════════════════════════════════════════════════

    cashAmount: {
      type: Number,
      default: 0,
      min: [0, "Amount cannot be negative"],
    },

    upiAmount: {
      type: Number,
      default: 0,
      min: [0, "Amount cannot be negative"],
    },

    cardAmount: {
      type: Number,
      default: 0,
      min: [0, "Amount cannot be negative"],
    },

    totalAmount: {
      type: Number,
      default: 0,
      min: [0, "Total cannot be negative"],
    },

    withCover: {
      type: Number,
      default: 0,
      min: [0, "Count cannot be negative"],
    },

    withoutCover: {
      type: Number,
      default: 0,
      min: [0, "Count cannot be negative"],
    },

    // ══════════════════════════════════════════════════════
    // CATEGORY
    // ══════════════════════════════════════════════════════

    category: {
      type: String,
      enum: {
        values: ["Normal", "VIP", "VVIP"],
        message: "Category: Normal, VIP, or VVIP only",
      },
      default: "Normal",
    },

    // ══════════════════════════════════════════════════════
    // PHOTOS
    // ══════════════════════════════════════════════════════

    livePhotoUrl: { type: String, default: "" },
    livePhotoPublicId: { type: String, default: "" },

    idFrontUrl: { type: String, default: "" },
    idFrontPublicId: { type: String, default: "" },

    idBackUrl: { type: String, default: "" },
    idBackPublicId: { type: String, default: "" },

    // ══════════════════════════════════════════════════════
    // ADDITIONAL
    // ══════════════════════════════════════════════════════

    remarks: {
      type: String,
      trim: true,
      default: "",
      maxlength: [500, "Remarks too long (max 500)"],
    },

    tableNo: {
      type: Number,
      default: null,
    },
  },
  { timestamps: true }, // createdAt + updatedAt auto add
);

// ══════════════════════════════════════════════════════
// PRE-SAVE HOOKS
// ══════════════════════════════════════════════════════

// Auto-increment SR Number
entrySchema.pre("save", async function () {
  if (this.isNew) {
    const counter = await Counter.findOneAndUpdate(
      { _id: "entryCounter" },
      { $inc: { seq: 1 } },
      { returnDocument: "after", upsert: true },
    );
    if (!counter) throw new Error("Counter not found");
    this.srNo = counter.seq;
  }
});

// Auto-calculate totalAmount before save
entrySchema.pre("save", function () {
  this.totalAmount =
    (this.cashAmount || 0) + (this.upiAmount || 0) + (this.cardAmount || 0);
});

// ✅ Convert old pax format to new paxCounts if needed
entrySchema.pre("save", function () {
  // If paxCounts is not set but old format exists
  if (this.pax && (!this.paxCounts || Object.keys(this.paxCounts).length === 0)) {
    this.paxCounts = {
      Pax: 0,
      "Stag Male": 0,
      "Stag Female": 0,
      Couple: 0,
    };
    this.paxCounts[this.pax] = this.paxCount || 1;
  }
  
  // Ensure paxCounts has default structure if still empty
  if (!this.paxCounts || Object.keys(this.paxCounts).length === 0) {
    this.paxCounts = {
      Pax: 0,
      "Stag Male": 0,
      "Stag Female": 0,
      Couple: 0,
    };
  }
});

// Virtual: full name
entrySchema.virtual("fullName").get(function () {
  return `${this.name} ${this.surname}`;
});

const Entry = mongoose.model("Entry", entrySchema);

export default Entry;
