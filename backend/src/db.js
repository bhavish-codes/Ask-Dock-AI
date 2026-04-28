const mongoose = require("mongoose");

let isConnected = false;
let hasLoggedFallback = false;
let lastConnectionError = null;

async function connectToDatabase() {
  const mongoUri = process.env.MONGODB_URI;

  if (!mongoUri) {
    if (!hasLoggedFallback) {
      console.warn("MONGODB_URI is not set. Falling back to in-memory storage only.");
      hasLoggedFallback = true;
    }
    lastConnectionError = "MONGODB_URI environment variable is not set";
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
    lastConnectionError = null;
    console.log("Connected to MongoDB");
    return true;
  } catch (error) {
    lastConnectionError = error.message;
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

function getLastConnectionError() {
  return lastConnectionError;
}

module.exports = {
  connectToDatabase,
  isDatabaseConfigured,
  getLastConnectionError
};
