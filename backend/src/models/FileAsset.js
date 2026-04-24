const mongoose = require("mongoose");

const fileAssetSchema = new mongoose.Schema(
  {
    documentId: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    fileName: {
      type: String,
      required: true
    },
    mimeType: {
      type: String,
      default: "application/pdf"
    },
    data: {
      type: Buffer,
      required: true
    },
    size: {
      type: Number,
      default: 0
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.models.FileAsset || mongoose.model("FileAsset", fileAssetSchema);
