// Backend/scripts/migratePaxCounts.js
// Run this ONCE to migrate old entries to new format

const mongoose = require("mongoose");
const Entry = require("../models/Entry");

async function migratePaxCounts() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✅ Connected to database");

    // Find all entries without paxCounts
    const entries = await Entry.find({
      $or: [
        { paxCounts: { $exists: false } },
        { paxCounts: null }
      ]
    });

    console.log(`📊 Found ${entries.length} entries to migrate`);

    let updated = 0;
    for (const entry of entries) {
      // Create default paxCounts
      const paxCounts = {
        "Pax": 0,
        "Stag Male": 0,
        "Stag Female": 0,
        "Couple": 0
      };

      // If old pax field exists, convert it
      if (entry.pax) {
        paxCounts[entry.pax] = entry.paxCount || 1;
      } else {
        // Default to 1 Pax if nothing set
        paxCounts["Pax"] = 1;
      }

      // Update entry
      entry.paxCounts = paxCounts;
      await entry.save();
      updated++;

      console.log(`✓ Migrated SR#${entry.srNo}: ${entry.pax || "Pax"} × ${entry.paxCount || 1}`);
    }

    console.log(`\n✅ Migration complete! Updated ${updated} entries`);
    process.exit(0);
  } catch (error) {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  }
}

// Run migration
migratePaxCounts();


// ════════════════════════════════════════════════════════
// HOW TO RUN:
//
// 1. Save this file as: Backend/scripts/migratePaxCounts.js
// 2. Run: node Backend/scripts/migratePaxCounts.js
// 3. Check output for success
// ════════════════════════════════════════════════════════