import Entry from "../Models/Entry.model.js";
import cloudinary from "../Config/cloudinary.js";
import sendEntryConfirmation from "../utils/sendEmail.js";

// ─── GET All Entries ──────────────────────────────────────────
const getAllEntries = async (req, res) => {
  try {
    const { category, pax, tableNo, date } = req.query;
    const filter = {};

    if (category) filter.category = category;
    if (pax) filter.pax = pax;
    if (tableNo) filter.tableNo = Number(tableNo);

    if (date) {
      const start = new Date(date);
      start.setHours(0, 0, 0, 0);
      const end = new Date(date);
      end.setHours(23, 59, 59, 999);
      filter.createdAt = { $gte: start, $lte: end };
    }

    const entries = await Entry.find(filter).sort({ srNo: -1 });

    res.status(200).json({
      success: true,
      count: entries.length,
      data: entries,
    });
  } catch (error) {
    console.log("Get entries error:", error);
    res.status(500).json({
      success: false,
      message: "Server Error: Could not fetch entries",
      error: error.message,
    });
  }
};

// ─── GET Single Entry ─────────────────────────────────────────
const getEntryById = async (req, res) => {
  try {
    const entry = await Entry.findById(req.params.id);

    if (!entry) {
      return res.status(404).json({
        success: false,
        message: `Entry not found with ID: ${req.params.id}`,
      });
    }

    res.status(200).json({ success: true, data: entry });
  } catch (error) {
    if (error.name === "CastError") {
      return res
        .status(400)
        .json({ success: false, message: "Invalid Entry ID format" });
    }
    res
      .status(500)
      .json({ success: false, message: "Server Error", error: error.message });
  }
};

// ─── POST Create New Entry ────────────────────────────────────
const createEntry = async (req, res) => {
  try {
    // 🧹 Clean contact number
    if (req.body.contactNo) {
      req.body.contactNo = req.body.contactNo.replace(/\s+/g, "");
    }

    // ✅ Parse paxCounts if it's a JSON string
    if (req.body.paxCounts && typeof req.body.paxCounts === "string") {
      try {
        req.body.paxCounts = JSON.parse(req.body.paxCounts);
      } catch (e) {
        console.error("Failed to parse paxCounts:", e);
        req.body.paxCounts = {
          Pax: 0,
          "Stag Male": 0,
          "Stag Female": 0,
          Couple: 0,
        };
      }
    }

    // 💰 Parse payment amounts (totalAmount auto-calculated in pre-save hook)
    req.body.cashAmount = Number(req.body.cashAmount) || 0;
    req.body.upiAmount = Number(req.body.upiAmount) || 0;
    req.body.cardAmount = Number(req.body.cardAmount) || 0;

    // 🎟️ Cover amounts
    req.body.withCover = Number(req.body.withCover) || 0;
    req.body.withoutCover = Number(req.body.withoutCover) || 0;

    // 🪑 Table number
    if (
      !req.body.tableNo ||
      req.body.tableNo === "" ||
      isNaN(req.body.tableNo)
    ) {
      req.body.tableNo = null;
    } else {
      req.body.tableNo = Number(req.body.tableNo);
    }

    // ✅ Remove old pax fields to avoid validation errors
    // Let the model use paxCounts instead
    delete req.body.pax;
    delete req.body.paxCount;

    console.log("📤 Files received:", {
      livePhoto: req.files?.livePhoto?.[0]?.originalname,
      idFront: req.files?.idFront?.[0]?.originalname,
      idBack: req.files?.idBack?.[0]?.originalname,
    });

    console.log("👥 Pax Counts:", req.body.paxCounts);

    // ☁️ Cloudinary uploads
    const { uploadToCloudinary } = await import("../Middlewares/upload.js");

    if (req.files?.livePhoto?.[0]) {
      console.log("📸 Uploading livePhoto...");
      const result = await uploadToCloudinary(
        req.files.livePhoto[0],
        "live_photos",
        [{ width: 350, height: 450, crop: "fill" }],
      );
      req.body.livePhotoUrl = result.secure_url;
      req.body.livePhotoPublicId = result.public_id;
      console.log("✅ livePhoto:", result.secure_url);
    }

    if (req.files?.idFront?.[0]) {
      console.log("🪪 Uploading idFront...");
      const result = await uploadToCloudinary(
        req.files.idFront[0],
        "id_front",
        [{ width: 800, height: 500, crop: "fit" }],
      );
      req.body.idFrontUrl = result.secure_url;
      req.body.idFrontPublicId = result.public_id;
      console.log("✅ idFront:", result.secure_url);
    }

    if (req.files?.idBack?.[0]) {
      console.log("🪪 Uploading idBack...");
      const result = await uploadToCloudinary(req.files.idBack[0], "id_back", [
        { width: 800, height: 500, crop: "fit" },
      ]);
      req.body.idBackUrl = result.secure_url;
      req.body.idBackPublicId = result.public_id;
      console.log("✅ idBack:", result.secure_url);
    }

    const entry = new Entry(req.body);
    await entry.save();

    console.log(
      "🟡 Entry created — SR:",
      entry.srNo,
      "| Contact:",
      entry.contactNo,
    );

    // 📧 Email (non-blocking)
    if (entry.email) {
      sendEntryConfirmation({
        name: entry.name,
        surname: entry.surname,
        email: entry.email,
        srNo: entry.srNo,
        tableNo: entry.tableNo,
        entryTime: entry.entryTime,
      });
    }

    console.log("🟢 Entry saved successfully");

    res.status(201).json({
      success: true,
      message: `✅ Entry saved! SR No: ${entry.srNo}`,
      data: entry,
    });
  } catch (error) {
    console.error("❌ createEntry error:", error);

    if (error.name === "ValidationError") {
      const errors = Object.values(error.errors).map((e) => ({
        field: e.path,
        message: e.message,
      }));
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors,
      });
    }

    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "Duplicate entry. Try again.",
      });
    }

    res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message,
    });
  }
};

// ─── PUT Update Entry ─────────────────────────────────────────
const updateEntry = async (req, res) => {
  try {
    // ✅ Parse paxCounts if it's a JSON string
    if (req.body.paxCounts && typeof req.body.paxCounts === "string") {
      try {
        req.body.paxCounts = JSON.parse(req.body.paxCounts);
      } catch (e) {
        console.error("Failed to parse paxCounts:", e);
      }
    }

    // 💰 Recalculate totalAmount if any payment field is being updated
    if (
      req.body.cashAmount !== undefined ||
      req.body.upiAmount !== undefined ||
      req.body.cardAmount !== undefined
    ) {
      const existing = await Entry.findById(req.params.id);
      if (existing) {
        const cash =
          req.body.cashAmount !== undefined
            ? Number(req.body.cashAmount)
            : existing.cashAmount;
        const upi =
          req.body.upiAmount !== undefined
            ? Number(req.body.upiAmount)
            : existing.upiAmount;
        const card =
          req.body.cardAmount !== undefined
            ? Number(req.body.cardAmount)
            : existing.cardAmount;
        req.body.totalAmount = cash + upi + card;
      }
    }

    // 📸 Handle photo updates
    if (req.files) {
      const existing = await Entry.findById(req.params.id);

      if (req.files.livePhoto?.[0]) {
        if (existing?.livePhotoPublicId) {
          await cloudinary.uploader.destroy(existing.livePhotoPublicId);
        }
        req.body.livePhotoUrl = req.files.livePhoto[0].path;
        req.body.livePhotoPublicId = req.files.livePhoto[0].filename;
      }

      if (req.files.idFront?.[0]) {
        if (existing?.idFrontPublicId) {
          await cloudinary.uploader.destroy(existing.idFrontPublicId);
        }
        req.body.idFrontUrl = req.files.idFront[0].path;
        req.body.idFrontPublicId = req.files.idFront[0].filename;
      }

      if (req.files.idBack?.[0]) {
        if (existing?.idBackPublicId) {
          await cloudinary.uploader.destroy(existing.idBackPublicId);
        }
        req.body.idBackUrl = req.files.idBack[0].path;
        req.body.idBackPublicId = req.files.idBack[0].filename;
      }
    }

    const entry = await Entry.findByIdAndUpdate(req.params.id, req.body, {
      returnDocument: "after",
      runValidators: true,
    });

    if (!entry) {
      return res
        .status(404)
        .json({ success: false, message: "Entry not found" });
    }

    res
      .status(200)
      .json({ success: true, message: "Entry updated!", data: entry });
  } catch (error) {
    if (error.name === "CastError") {
      return res
        .status(400)
        .json({ success: false, message: "Invalid Entry ID" });
    }
    res
      .status(500)
      .json({ success: false, message: "Server Error", error: error.message });
  }
};

// ─── DELETE Entry ─────────────────────────────────────────────
const deleteEntry = async (req, res) => {
  try {
    const entry = await Entry.findByIdAndDelete(req.params.id);

    if (!entry) {
      return res
        .status(404)
        .json({ success: false, message: "Entry not found" });
    }

    // 🗑️ Delete all photos from Cloudinary
    const deletePromises = [];
    if (entry.livePhotoPublicId)
      deletePromises.push(cloudinary.uploader.destroy(entry.livePhotoPublicId));
    if (entry.idFrontPublicId)
      deletePromises.push(cloudinary.uploader.destroy(entry.idFrontPublicId));
    if (entry.idBackPublicId)
      deletePromises.push(cloudinary.uploader.destroy(entry.idBackPublicId));

    if (deletePromises.length > 0) {
      await Promise.all(deletePromises);
      console.log(`🗑️ Photos deleted for SR No. ${entry.srNo}`);
    }

    res.status(200).json({
      success: true,
      message: `Entry SR No. ${entry.srNo} deleted!`,
    });
  } catch (error) {
    if (error.name === "CastError") {
      return res
        .status(400)
        .json({ success: false, message: "Invalid Entry ID" });
    }
    res
      .status(500)
      .json({ success: false, message: "Server Error", error: error.message });
  }
};

export { getAllEntries, getEntryById, createEntry, updateEntry, deleteEntry };
