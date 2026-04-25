require("dotenv").config();

const {chunkText}=require("./utils/chunker");

const {generateEmbedding}=require("./utils/embeddings");
const {addEmbedding,getAllEmbeddings,resetStore,hasDocument,setDocumentEmbeddings}=require("./utils/vectorStore");

const {cosineSimilarity}=require("./utils/similarity");
const {rephraseAnswer}=require("./utils/answerGenerator");
const {extractTextFromPdf}=require("./utils/pdfExtractor");
const {connectToDatabase,isDatabaseConfigured}=require("./db");
const DocumentModel=require("./models/Document");
const FileAssetModel=require("./models/FileAsset");
const cors=require("cors");
const express=require("express");
const multer=require("multer");
const path=require("path");
const jwt = require("jsonwebtoken");
const { auth } = require("./utils/auth");
const UserModel = require("./models/User");


const app=express();
app.use(cors()); // Allow all origins for simplicity in development
app.use(express.json());

// Request logger for debugging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

// Ensure database is connected for serverless environments
connectToDatabase().catch(err => console.error("Initial DB connection failed:", err));

async function upsertDocumentRecord(payload) {
  if (!isDatabaseConfigured()) {
    return null;
  }

  const isConnected = await connectToDatabase();
  if (!isConnected) {
    return null;
  }

  return DocumentModel.findOneAndUpdate(
    { documentId: payload.documentId, userId: payload.userId },
    payload,
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
}

async function appendChatMessages(documentId, userId, messages) {
  if (!isDatabaseConfigured()) {
    return;
  }

  const isConnected = await connectToDatabase();
  if (!isConnected) {
    return;
  }

  await DocumentModel.updateOne(
    { documentId, userId },
    { $push: { chatHistory: { $each: messages } } }
  );
}

async function getDocumentRecord(documentId, userId) {
  if (!isDatabaseConfigured()) {
    return null;
  }

  const isConnected = await connectToDatabase();
  if (!isConnected) {
    return null;
  }

  return DocumentModel.findOne({ documentId, userId });
}

async function upsertFileAsset(payload) {
  if (!isDatabaseConfigured()) {
    return null;
  }

  const isConnected = await connectToDatabase();
  if (!isConnected) {
    return null;
  }

  return FileAssetModel.findOneAndUpdate(
    { documentId: payload.documentId, userId: payload.userId },
    payload,
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
}

async function getFileAsset(documentId, userId) {
  if (!isDatabaseConfigured()) {
    return null;
  }

  const isConnected = await connectToDatabase();
  if (!isConnected) {
    return null;
  }

  return FileAssetModel.findOne({ documentId, userId });
}

function getRequestBaseUrl(req) {
  const protocol = req.headers["x-forwarded-proto"] || req.protocol || "https";
  const host = req.headers["x-forwarded-host"] || req.get("host");
  return `${protocol}://${host}`;
}

function buildDocumentFileUrl(req, documentId) {
  return `${getRequestBaseUrl(req)}/documents/${encodeURIComponent(documentId)}/file`;
}

async function hydrateDocumentEmbeddings(documentId, userId) {
  if (hasDocument(documentId)) {
    return getAllEmbeddings(documentId);
  }

  const documentRecord = await getDocumentRecord(documentId, userId);

  if (!documentRecord || !Array.isArray(documentRecord.chunks) || documentRecord.chunks.length === 0) {
    return [];
  }

  const entries = documentRecord.chunks.map((chunk) => ({
    text: chunk.text,
    embedding: chunk.embedding
  }));

  setDocumentEmbeddings(documentId, entries);
  return entries;
}

// Configure multer for serverless-friendly PDF uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 15 * 1024 * 1024
  }
});

app.get("/",(req,res)=>{
  res.send("API is running");
})

app.post("/register", async (req, res) => {
  const { username, password } = req.body;
  try {
    const user = new UserModel({ username, password });
    await user.save();
    res.json({ message: "User registered successfully" });
  } catch (error) {
    res.status(400).json({ error: "Registration failed: " + error.message });
  }
});

app.post("/login", async (req, res) => {
  try {
    const user = await UserModel.findOne({ username: req.body.username });
    if (!user || !(await user.comparePassword(req.body.password))) {
      return res.status(401).json({ error: "Invalid credentials" });
    }
    const token = jwt.sign({ userId: user._id, username: user.username }, process.env.JWT_SECRET || "fallback_secret", { expiresIn: "24h" });
    res.json({ token, userId: user._id, username: user.username });
  } catch (error) {
    res.status(500).json({ error: "Login failed" });
  }
});

app.get("/login", (req, res) => {
  res.send("Login endpoint is active. Please use POST to authenticate.");
});





app.post("/upload", auth, upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No file uploaded" });
  }

  try {
    const userId = req.user.userId;
    const documentId = `${Date.now()}-${Math.round(Math.random() * 1E9)}${path.extname(req.file.originalname)}`;
    resetStore(documentId);

    const fileBuffer = req.file.buffer;
    const text = await extractTextFromPdf(fileBuffer);

    if (!text) {
      return res.status(400).json({ error: "Could not extract text from PDF" });
    }

    const chunks = chunkText(text);

    for (const chunk of chunks) {
      const embedding = await generateEmbedding(chunk);
      addEmbedding(documentId, chunk, embedding);
    }

    await upsertFileAsset({
      userId,
      documentId,
      fileName: req.file.originalname,
      mimeType: req.file.mimetype || "application/pdf",
      data: fileBuffer,
      size: req.file.size
    });

    const fileUrl = buildDocumentFileUrl(req, documentId);

    await upsertDocumentRecord({
      userId,
      documentId,
      fileName: req.file.originalname,
      fileUrl,
      mimeType: req.file.mimetype || "application/pdf",
      fileSize: req.file.size,
      sourceType: "pdf",
      status: "READY",
      chunks: getAllEmbeddings(documentId),
      chatHistory: []
    });

    res.json({
      message: "PDF uploaded, ingested, and indexed successfully",
      chunks: chunks.length,
      documentId,
      fileUrl: fileUrl,
      fileName: req.file.originalname,
      fileSize: req.file.size
    });

  } catch (error) {
    console.error("Upload failed:", error);
    res.status(500).json({ error: "Upload failed: " + error.message });
  }
});

app.get("/documents/:documentId/file", auth, async (req, res) => {
  try {
    const fileAsset = await getFileAsset(req.params.documentId, req.user.userId);

    if (!fileAsset) {
      return res.status(404).send("File not found or access denied");
    }

    res.setHeader("Content-Type", fileAsset.mimeType || "application/pdf");
    res.setHeader("Content-Length", fileAsset.size);
    res.setHeader("Content-Disposition", `inline; filename="${encodeURIComponent(fileAsset.fileName)}"`);
    return res.send(fileAsset.data);
  } catch (error) {
    console.error("Failed to stream file:", error);
    return res.status(500).send("Failed to stream file");
  }
});

app.get("/documents", auth, async (req, res) => {
  try {
    const userId = req.user.userId;
    if (!isDatabaseConfigured()) {
      return res.json([]);
    }

    const isConnected = await connectToDatabase();
    if (!isConnected) {
      return res.json([]);
    }

    const documents = await DocumentModel.find(
      { userId, sourceType: { $ne: "url" } },
      {
        documentId: 1,
        fileName: 1,
        fileUrl: 1,
        mimeType: 1,
        fileSize: 1,
        status: 1,
        createdAt: 1,
        updatedAt: 1
      }
    ).sort({ updatedAt: -1, createdAt: -1 });

    res.json(
      documents.map((doc) => ({
        documentId: doc.documentId,
        fileName: doc.fileName,
        fileUrl: buildDocumentFileUrl(req, doc.documentId),
        mimeType: doc.mimeType,
        fileSize: doc.fileSize,
        status: doc.status,
        createdAt: doc.createdAt,
        updatedAt: doc.updatedAt
      }))
    );
  } catch (error) {
    console.error("Failed to load documents:", error);
    res.status(500).json({ error: "Failed to load documents" });
  }
});

app.get("/documents/:documentId/chat", auth, async (req, res) => {
  try {
    const documentRecord = await getDocumentRecord(req.params.documentId, req.user.userId);

    if (!documentRecord) {
      return res.status(404).json({ error: "Document not found or access denied" });
    }

    res.json(documentRecord.chatHistory || []);
  } catch (error) {
    console.error("Failed to load chat history:", error);
    res.status(500).json({ error: "Failed to load chat history" });
  }
});


app.get("/semantic-search", auth, async(req,res)=>{
  const {q, documentId}=req.query;
  if(!q){
    return res.json([]);
  }

  if(!documentId){
    return res.status(400).json({ error: "documentId is required" });
  }

  const stored=await hydrateDocumentEmbeddings(documentId, req.user.userId);
  if(stored.length===0){
    return res.status(404).json({ error: "Document not found, not indexed yet, or access denied" });
  }

  const queryEmbedding=await generateEmbedding(q);
  const scored=stored.map(item=>({
    text:item.text,
    score:cosineSimilarity(queryEmbedding,item.embedding)
  }));

  scored.sort((a,b)=>b.score-a.score);

  res.json(scored.slice(0,3));
});



app.get("/ask", auth, async(req,res)=>{
  const {q, documentId}=req.query;
  const userId = req.user.userId;

  if(!q){
    return res.json({
      answer:"Please provide a question.",
      sources:[]
    });
  }

  if(!documentId){
    return res.status(400).json({
      answer:"Please select a document before asking a question.",
      sources:[]
    });
  }

  if(!hasDocument(documentId)){
    const hydratedDocument=await hydrateDocumentEmbeddings(documentId, userId);
    if(hydratedDocument.length===0){
      return res.status(404).json({
        answer:"This document could not be found or access is denied. Please upload it again.",
        sources:[]
      });
    }
  }

  const queryEmbedding=await generateEmbedding(q);
  const stored=getAllEmbeddings(documentId);

  const scored=stored.map(item=>({
    text:item.text,
    score:cosineSimilarity(queryEmbedding,item.embedding)
  }));

  scored.sort((a,b)=>b.score-a.score);

  // Check if this is a conversational message — skip strict threshold filtering
  const conversationalPattern = /^(hi|hello|hey|thanks|thank you|ok|okay|bye|good|great|cool|nice|sure|yes|no|yep|nope|what's up|howdy|greetings)[!?.]*$/i;
  const isConversational = conversationalPattern.test(q.trim());

  const SIMILARITY_THRESHOLD=0.15;
  const TOP_K=5;

  let topResults;
  if (isConversational) {
    // For greetings/casual chat, just pass the top 2 chunks as light context
    topResults = scored.slice(0, 2);
  } else {
    topResults = scored.filter(item => item.score >= SIMILARITY_THRESHOLD);
    if (topResults.length === 0) {
      topResults = scored.slice(0, TOP_K);
    } else {
      topResults = topResults.slice(0, TOP_K);
    }
  }

  const introChunk = stored.length > 0 ? stored[0] : null;
  let finalChunks = topResults;
  
  if (introChunk && !topResults.find(r => r.text === introChunk.text)) {
      finalChunks = [introChunk, ...topResults];
  }

  const uniqueChunks = [...new Set(finalChunks.map(r => r.text))];

  const response=await rephraseAnswer(uniqueChunks,q);

  await appendChatMessages(documentId, userId, [
    { role: "user", content: q },
    { role: "assistant", content: response.answer }
  ]);

  res.json(response);
});





const PORT = process.env.PORT || 5001;

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

module.exports = app;
