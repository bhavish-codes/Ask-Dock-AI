require("dotenv").config();
const {readDocument}=require("./utils/readDoc");
const {chunkText}=require("./utils/chunker");
const {keywordSearch}=require("./utils/search");
const {generateEmbedding}=require("./utils/embeddings");
const {addEmbedding,getAllEmbeddings,resetStore,hasDocument,setDocumentEmbeddings}=require("./utils/vectorStore");
const {scrapeUrl}=require("./utils/scraper");
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


const app=express();
app.use(express.json());
app.use(cors({
  origin: true
}));

async function upsertDocumentRecord(payload) {
  if (!isDatabaseConfigured()) {
    return null;
  }

  const isConnected = await connectToDatabase();
  if (!isConnected) {
    return null;
  }

  return DocumentModel.findOneAndUpdate(
    { documentId: payload.documentId },
    payload,
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
}

async function appendChatMessages(documentId, messages) {
  if (!isDatabaseConfigured()) {
    return;
  }

  const isConnected = await connectToDatabase();
  if (!isConnected) {
    return;
  }

  await DocumentModel.updateOne(
    { documentId },
    { $push: { chatHistory: { $each: messages } } }
  );
}

async function getDocumentRecord(documentId) {
  if (!isDatabaseConfigured()) {
    return null;
  }

  const isConnected = await connectToDatabase();
  if (!isConnected) {
    return null;
  }

  return DocumentModel.findOne({ documentId });
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
    { documentId: payload.documentId },
    payload,
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
}

async function getFileAsset(documentId) {
  if (!isDatabaseConfigured()) {
    return null;
  }

  const isConnected = await connectToDatabase();
  if (!isConnected) {
    return null;
  }

  return FileAssetModel.findOne({ documentId });
}

function getRequestBaseUrl(req) {
  const protocol = req.headers["x-forwarded-proto"] || req.protocol || "https";
  const host = req.headers["x-forwarded-host"] || req.get("host");
  return `${protocol}://${host}`;
}

function buildDocumentFileUrl(req, documentId) {
  return `${getRequestBaseUrl(req)}/documents/${encodeURIComponent(documentId)}/file`;
}

async function hydrateDocumentEmbeddings(documentId) {
  if (hasDocument(documentId)) {
    return getAllEmbeddings(documentId);
  }

  const documentRecord = await getDocumentRecord(documentId);

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

app.get("/doc",(req,res)=>{
  const text=readDocument();
  res.send(text);
});

app.get("/chunks",(req,res)=>{
  const text=readDocument();
  const chunks=chunkText(text);
  res.json(chunks);
});

app.get("/search",(req,res)=>{
  const {q}=req.query;
  const text=readDocument();
  const chunks=chunkText(text);
  const results=keywordSearch(chunks,q);
  res.json(results);
});

app.get("/embed-test",async(req,res)=>{
  const vec=await generateEmbedding("authentication and login");
  res.json({
    length:vec.length,
    sample:vec.slice(0,5)
  });
});

app.get("/index-doc",async(req,res)=>{
  const text=readDocument();
  const chunks=chunkText(text);
  const documentId = "local-doc";

  for(const chunk of chunks){
    const embedding=await generateEmbedding(chunk);
    addEmbedding(documentId,chunk,embedding);
  }

  res.json({
    message:"Document indexed",
    chunks:chunks.length
  });
});

app.post("/ingest", async (req, res) => {
  const { url } = req.body;

  if (!url) {
    return res.status(400).json({ error: "URL is required" });
  }

  try {
    resetStore(url);

    const text = await scrapeUrl(url);

    if (!text) {
      return res.status(400).json({ error: "No content found at URL" });
    }

    const chunks = chunkText(text);

    for (const chunk of chunks) {
      const embedding = await generateEmbedding(chunk);
      addEmbedding(url, chunk, embedding);
    }

    await upsertDocumentRecord({
      documentId: url,
      fileName: url,
      fileUrl: url,
      fileSize: 0,
      sourceType: "url",
      status: "READY",
      chunks: getAllEmbeddings(url),
      chatHistory: []
    });

    res.json({
      message: "Ingestion and indexing complete",
      chunks: chunks.length,
      documentId: url
    });

  } catch (error) {
    console.error("Ingestion failed:", error);
    res.status(500).json({ error: "Ingestion failed: " + error.message });
  }
});

app.post("/upload", upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No file uploaded" });
  }

  try {
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
      documentId,
      fileName: req.file.originalname,
      mimeType: req.file.mimetype || "application/pdf",
      data: fileBuffer,
      size: req.file.size
    });

    const fileUrl = buildDocumentFileUrl(req, documentId);

    await upsertDocumentRecord({
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

app.get("/documents/:documentId/file", async (req, res) => {
  try {
    const fileAsset = await getFileAsset(req.params.documentId);

    if (!fileAsset) {
      return res.status(404).send("File not found");
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

app.get("/documents", async (req, res) => {
  try {
    if (!isDatabaseConfigured()) {
      return res.json([]);
    }

    const isConnected = await connectToDatabase();
    if (!isConnected) {
      return res.json([]);
    }

    const documents = await DocumentModel.find(
      {},
      {
        documentId: 1,
        fileName: 1,
        fileUrl: 1,
        mimeType: 1,
        fileSize: 1,
        status: 1,
        sourceType: 1,
        createdAt: 1,
        updatedAt: 1
      }
    ).sort({ updatedAt: -1, createdAt: -1 });

    res.json(
      documents.map((doc) => ({
        documentId: doc.documentId,
        fileName: doc.fileName,
        fileUrl: doc.sourceType === "pdf" ? buildDocumentFileUrl(req, doc.documentId) : doc.fileUrl,
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

app.get("/documents/:documentId/chat", async (req, res) => {
  try {
    const documentRecord = await getDocumentRecord(req.params.documentId);

    if (!documentRecord) {
      return res.json([]);
    }

    res.json(documentRecord.chatHistory || []);
  } catch (error) {
    console.error("Failed to load chat history:", error);
    res.status(500).json({ error: "Failed to load chat history" });
  }
});


app.get("/semantic-search",async(req,res)=>{
  const {q, documentId}=req.query;
  if(!q){
    return res.json([]);
  }

  if(!documentId){
    return res.status(400).json({ error: "documentId is required" });
  }

  const stored=await hydrateDocumentEmbeddings(documentId);
  if(stored.length===0){
    return res.status(404).json({ error: "Document not found or not indexed yet" });
  }

  const queryEmbedding=await generateEmbedding(q);
  const scored=stored.map(item=>({
    text:item.text,
    score:cosineSimilarity(queryEmbedding,item.embedding)
  }));

  scored.sort((a,b)=>b.score-a.score);

  res.json(scored.slice(0,3));
});



app.get("/ask",async(req,res)=>{
  const {q, documentId}=req.query;

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
    const hydratedDocument=await hydrateDocumentEmbeddings(documentId);
    if(hydratedDocument.length===0){
      return res.status(404).json({
        answer:"This document could not be found. Please upload it again.",
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

  const SIMILARITY_THRESHOLD=0.25;
  const TOP_K=5;

  let topResults=scored.filter(
    item=>item.score>=SIMILARITY_THRESHOLD
  );

  if(topResults.length===0){
    topResults=scored.slice(0,TOP_K);
  }else{
    topResults=topResults.slice(0,TOP_K);
  }

  const introChunk = stored.length > 0 ? stored[0] : null;
  let finalChunks = topResults;
  
  if (introChunk && !topResults.find(r => r.text === introChunk.text)) {
      finalChunks = [introChunk, ...topResults];
  }

  const uniqueChunks = [...new Set(finalChunks.map(r => r.text))];

  const response=await rephraseAnswer(uniqueChunks,q);

  await appendChatMessages(documentId, [
    { role: "user", content: q },
    { role: "assistant", content: response.answer }
  ]);

  res.json(response);
});





const PORT = process.env.PORT || 5001;

if (require.main === module) {
  connectToDatabase()
    .catch((error) => {
      console.error("MongoDB connection failed:", error.message);
      console.warn("Continuing with in-memory storage only.");
    })
    .finally(() => {
      app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
      });
    });
}

module.exports = app;
