// seeders/seed.js

import mongoose from "mongoose";
import dotenv from "dotenv";
import User from "../Models/User.model.js";

dotenv.config();

// ─── Jo users banana chahte ho ───────────────────────────────
const users = [
  {
    username: "owner",
    password: "Owner@123",      // ← apna password daalo
    role: "owner",
    name: "Club Owner",
    isActive: true,
  },
  {
    username: "mohit",
    password: "Mohit@1234",      // ← apna password daalo
    role: "staff",
    name: "Mohit Kumar",
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
      await user.save();                          // ← save() se hook chalega
      console.log(`👤 Created: ${user.username} (${user.role})`);
    }

    console.log("\n🎉 Seeding complete! Users created:");
    console.log("─────────────────────────────────");
    users.forEach(u => {
      console.log(`   ${u.role.toUpperCase()} → ${u.username} / ${u.password}`);
    });
    console.log("─────────────────────────────────");

  } catch (err) {
    console.error("❌ Seed failed:", err.message);
  } finally {
    await mongoose.disconnect();
    console.log("🔌 DB Disconnected");
    process.exit(0);
  }
};

seedDB();