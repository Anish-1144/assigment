import mongoose from "mongoose";

const announcementSchema = new mongoose.Schema(
  {
    shop: { type: String, required: true, index: true },
    text: { type: String, default: "" },
  },
  { timestamps: true }
);

export default mongoose.models.Announcement ||
  mongoose.model("Announcement", announcementSchema);
