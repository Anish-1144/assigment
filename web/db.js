import mongoose from "mongoose";

export async function connectToDatabase() {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    console.warn("[db] MONGODB_URI is not set. Announcements will not be persisted.");
    return;
  }

  if (mongoose.connection.readyState === 1) {
    return;
  }

  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 10000 });
    console.log("[db] Connected to MongoDB");
  } catch (err) {
    console.error("[db] Could not connect to MongoDB:", err.message);
  }

  mongoose.connection.on("error", (e) =>
    console.error("[db] MongoDB connection error:", e.message)
  );
  mongoose.connection.on("connected", () =>
    console.log("[db] MongoDB connected")
  );
}
