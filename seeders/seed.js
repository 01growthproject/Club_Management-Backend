// seeders/seed.js - ✅ COMPLETE UPDATED VERSION

import mongoose from "mongoose";
import dotenv from "dotenv";
import User from "../Models/User.model.js";

dotenv.config();

// ✅ FIX #1: Production check - seeders ko production mein nahi chalana
if (process.env.NODE_ENV === "production") {
  console.error(
    "❌ Cannot seed database in production! Set NODE_ENV=development"
  );
  process.exit(1);
}

// ─── Jo users banana chahte ho ───────────────────────────────
const users = [
  {
    username: "owner",
    password: "Owner@123", // ✅ CHANGED: Strong password (8+ chars, uppercase, number, special)
    role: "owner",
    name: "Club Owner",
    isActive: true,
  },
  {
    username: "mohit",
    password: "Mohit@1234", // ✅ CHANGED: Strong password
    role: "staff",
    name: "Mohit Sharma",
    isActive: true,
  },
];

// ─── Main Seed Function ───────────────────────────────────────
const seedDB = async () => {
  try {
    // DB connect karo
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ MongoDB Connected");

    // Pehle se existing users delete karo (fresh start)
    await User.deleteMany({});
    console.log("🗑️  Old users deleted");

    // Users insert karo
    // NOTE: pre("save") hook chalega — password automatically hash hoga
    for (const userData of users) {
      const user = new User(userData);
      await user.save(); // ← save() se hook chalega, password auto-hash
      console.log(`👤 Created: ${user.username} (${user.role})`);
    }

    console.log("\n🎉 Seeding complete! Users created:");
    console.log("─────────────────────────────────");
    users.forEach((u) => {
      console.log(`   ${u.role.toUpperCase()} → ${u.username} / ${u.password}`);
    });
    console.log("─────────────────────────────────");
    console.log("✅ Now run: npm run dev\n");
  } catch (err) {
    console.error("❌ Seed failed:", err.message);
    process.exit(1); // ✅ ADD: Exit with error code
  } finally {
    await mongoose.disconnect();
    console.log("🔌 DB Disconnected");
    process.exit(0);
  }
};

seedDB();