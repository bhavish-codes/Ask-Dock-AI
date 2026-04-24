const mongoose = require("mongoose");

let isConnected = false;
let hasLoggedFallback = false;

async function connectToDatabase() {
  const mongoUri = process.env.MONGODB_URI;

  if (!mongoUri) {
    if (!hasLoggedFallback) {
      console.warn("MONGODB_URI is not set. Falling back to in-memory storage only.");
      hasLoggedFallback = true;
    }
    return false;
  }

  if (isConnected) {
    return true;
  }

  try {
    await mongoose.connect(mongoUri, {
      dbName: process.env.MONGODB_DB_NAME || undefined,
      serverSelectionTimeoutMS: 5000
    });

    isConnected = true;
    console.log("Connected to MongoDB");
    return true;
  } catch (error) {
    if (!hasLoggedFallback) {
      console.warn(`MongoDB unavailable (${error.message}). Falling back to in-memory storage only.`);
      hasLoggedFallback = true;
    }
    return false;
  }
}

function isDatabaseConfigured() {
  return Boolean(process.env.MONGODB_URI);
}

module.exports = {
  connectToDatabase,
  isDatabaseConfigured
};
