const mongoose = require("mongoose");

const chatMessageSchema = new mongoose.Schema(
  {
    role: {
      type: String,
      enum: ["user", "assistant"],
      required: true
    },
    content: {
      type: String,
      required: true
    }
  },
  {
    _id: false,
    timestamps: true
  }
);

const documentChunkSchema = new mongoose.Schema(
  {
    text: {
      type: String,
      required: true
    },
    embedding: {
      type: [Number],
      required: true
    }
  },
  {
    _id: false
  }
);

const documentSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
      index: true
    },
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
    fileUrl: {
      type: String,
      required: true
    },
    mimeType: {
      type: String,
      default: "application/pdf"
    },
    fileSize: {
      type: Number,
      default: 0
    },
    sourceType: {
      type: String,
      enum: ["pdf"],
      default: "pdf"
    },
    status: {
      type: String,
      default: "READY"
    },
    chunks: {
      type: [documentChunkSchema],
      default: []
    },
    chatHistory: {
      type: [chatMessageSchema],
      default: []
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.models.Document || mongoose.model("Document", documentSchema);
