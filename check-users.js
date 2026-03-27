import "dotenv/config";
import mongoose from "mongoose";
import User from "./Models/User.model.js";

async function checkUsers() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to DB");

    const users = await User.find({}, "-password");
    console.log("Users in database:");
    users.forEach((u) => {
      console.log(`  ${u.username} (${u.role}) - Active: ${u.isActive}`);
    });

    await mongoose.disconnect();
  } catch (err) {
    console.error("Error:", err.message);
  }
}

checkUsers();
