const chai = require("chai");
const chaiHttp = require("chai-http");
const sinon = require("sinon");
const jwt = require("jsonwebtoken");

chai.use(chaiHttp);
const { expect } = chai;

// Set env before requiring app
process.env.JWT_SECRET = "test_secret";
process.env.GROQ_API_KEY = "test_groq_key";
process.env.MONGODB_URI = "mongodb://localhost/test";

const JWT_SECRET = "test_secret";
const VALID_TOKEN = jwt.sign({ userId: "user123", username: "testuser" }, JWT_SECRET);
const authHeader = () => ({ Authorization: `Bearer ${VALID_TOKEN}` });

// Require modules BEFORE app so we can stub them
const dbModule = require("../src/db");
const UserModel = require("../src/models/User");
const DocumentModel = require("../src/models/Document");
const FileAssetModel = require("../src/models/FileAsset");
const vectorStore = require("../src/utils/vectorStore");

// Stub pdf-parse at the module level before app loads
// (index.js destructures pdfExtractor so we must stub the underlying lib)
const pdfParse = require("pdf-parse");
const pdfExtractorModule = require("../src/utils/pdfExtractor");

// Stub DB connection before app loads so mongoose never actually connects
sinon.stub(dbModule, "connectToDatabase").resolves(true);
sinon.stub(dbModule, "isDatabaseConfigured").returns(true);
sinon.stub(dbModule, "getLastConnectionError").returns(null);

const app = require("../src/index");

// These must be required AFTER app to get the same cached module instances
const embeddingsModule = require("../src/utils/embeddings");
const answerModule = require("../src/utils/answerGenerator");describe("Ask Docks AI — Backend Routes", function () {
  this.timeout(10000);

  let sandbox;

  beforeEach(function () {
    sandbox = sinon.createSandbox();
  });

  afterEach(function () {
    sandbox.restore();
  });

  // ─── GET / ──────────────────────────────────────────────────────────────────
  describe("GET /", function () {
    it("returns API running message", async function () {
      const res = await chai.request(app).get("/");
      expect(res.status).to.equal(200);
      expect(res.text).to.include("running");
    });
  });

  // ─── GET /health ────────────────────────────────────────────────────────────
  describe("GET /health", function () {
    it("returns 200 when DB is connected", async function () {
      const res = await chai.request(app).get("/health");
      expect(res.status).to.equal(200);
      expect(res.body.api).to.equal("ok");
      expect(res.body.database.connected).to.equal(true);
    });

    it("returns 503 when DB is not connected", async function () {
      // Override the already-stubbed connectToDatabase for this test
      dbModule.connectToDatabase.resolves(false);
      dbModule.getLastConnectionError.returns("Authentication failed");

      const res = await chai.request(app).get("/health");
      expect(res.status).to.equal(503);
      expect(res.body.database.connected).to.equal(false);
      expect(res.body.database.error).to.equal("Authentication failed");

      // Restore for subsequent tests
      dbModule.connectToDatabase.resolves(true);
      dbModule.getLastConnectionError.returns(null);
    });

    it("shows all required env keys", async function () {
      const res = await chai.request(app).get("/health");
      expect(res.body.env).to.have.keys([
        "MONGODB_URI", "MONGODB_DB_NAME", "JWT_SECRET", "GROQ_API_KEY", "PORT"
      ]);
    });
  });

  // ─── POST /register ─────────────────────────────────────────────────────────
  describe("POST /register", function () {
    it("returns 400 when username or password missing", async function () {
      const res = await chai.request(app).post("/register").send({ username: "bob" });
      expect(res.status).to.equal(400);
      expect(res.body.error).to.include("required");
    });

    it("returns 409 when username already taken", async function () {
      sandbox.stub(UserModel, "findOne").resolves({ username: "bob" });

      const res = await chai.request(app).post("/register").send({ username: "bob", password: "pass" });
      expect(res.status).to.equal(409);
      expect(res.body.error).to.include("taken");
    });

    it("registers a new user successfully", async function () {
      sandbox.stub(UserModel, "findOne").resolves(null);
      sandbox.stub(UserModel.prototype, "save").resolves();

      const res = await chai.request(app).post("/register").send({ username: "newuser", password: "pass123" });
      expect(res.status).to.equal(200);
      expect(res.body.message).to.include("successfully");
    });

    it("returns 503 when DB is unavailable", async function () {
      dbModule.connectToDatabase.resolves(false);

      const res = await chai.request(app).post("/register").send({ username: "a", password: "b" });
      expect(res.status).to.equal(503);

      dbModule.connectToDatabase.resolves(true);
    });
  });

  // ─── POST /login ────────────────────────────────────────────────────────────
  describe("POST /login", function () {
    it("returns 400 when fields are missing", async function () {
      const res = await chai.request(app).post("/login").send({ username: "bob" });
      expect(res.status).to.equal(400);
    });

    it("returns 401 for invalid credentials", async function () {
      sandbox.stub(UserModel, "findOne").resolves(null);

      const res = await chai.request(app).post("/login").send({ username: "bob", password: "wrong" });
      expect(res.status).to.equal(401);
      expect(res.body.error).to.equal("Invalid credentials");
    });

    it("returns token on successful login", async function () {
      const fakeUser = {
        _id: "user123",
        username: "bob",
        comparePassword: sinon.stub().resolves(true)
      };
      sandbox.stub(UserModel, "findOne").resolves(fakeUser);

      const res = await chai.request(app).post("/login").send({ username: "bob", password: "correct" });
      expect(res.status).to.equal(200);
      expect(res.body).to.have.property("token");
      expect(res.body.username).to.equal("bob");
    });

    it("returns 503 when DB is unavailable", async function () {
      dbModule.connectToDatabase.resolves(false);

      const res = await chai.request(app).post("/login").send({ username: "a", password: "b" });
      expect(res.status).to.equal(503);

      dbModule.connectToDatabase.resolves(true);
    });
  });

  // ─── Auth middleware ─────────────────────────────────────────────────────────
  describe("Auth middleware", function () {
    it("returns 401 with no token", async function () {
      const res = await chai.request(app).get("/documents");
      expect(res.status).to.equal(401);
    });

    it("returns 401 with invalid token", async function () {
      const res = await chai.request(app)
        .get("/documents")
        .set("Authorization", "Bearer bad.token.here");
      expect(res.status).to.equal(401);
    });
  });

  // ─── GET /documents ──────────────────────────────────────────────────────────
  describe("GET /documents", function () {
    it("returns empty array when no documents", async function () {
      sandbox.stub(DocumentModel, "find").returns({ sort: sinon.stub().resolves([]) });

      const res = await chai.request(app).get("/documents").set(authHeader());
      expect(res.status).to.equal(200);
      expect(res.body).to.be.an("array").that.is.empty;
    });

    it("returns list of documents", async function () {
      const fakeDocs = [{
        documentId: "doc1",
        fileName: "test.pdf",
        fileUrl: "http://x/documents/doc1/file",
        mimeType: "application/pdf",
        fileSize: 1024,
        status: "READY",
        createdAt: new Date(),
        updatedAt: new Date()
      }];
      sandbox.stub(DocumentModel, "find").returns({ sort: sinon.stub().resolves(fakeDocs) });

      const res = await chai.request(app).get("/documents").set(authHeader());
      expect(res.status).to.equal(200);
      expect(res.body).to.have.lengthOf(1);
      expect(res.body[0].documentId).to.equal("doc1");
    });
  });

  // ─── GET /documents/:id/chat ─────────────────────────────────────────────────
  describe("GET /documents/:documentId/chat", function () {
    it("returns 404 when document not found", async function () {
      sandbox.stub(DocumentModel, "findOne").resolves(null);

      const res = await chai.request(app)
        .get("/documents/nonexistent/chat")
        .set(authHeader());
      expect(res.status).to.equal(404);
    });

    it("returns chat history", async function () {
      sandbox.stub(DocumentModel, "findOne").resolves({
        chatHistory: [
          { role: "user", content: "hello" },
          { role: "assistant", content: "hi there" }
        ]
      });

      const res = await chai.request(app).get("/documents/doc1/chat").set(authHeader());
      expect(res.status).to.equal(200);
      expect(res.body).to.have.lengthOf(2);
    });

    it("returns empty array when no chat history", async function () {
      sandbox.stub(DocumentModel, "findOne").resolves({ chatHistory: [] });

      const res = await chai.request(app).get("/documents/doc1/chat").set(authHeader());
      expect(res.status).to.equal(200);
      expect(res.body).to.deep.equal([]);
    });
  });

  // ─── POST /upload ────────────────────────────────────────────────────────────
  describe("POST /upload", function () {
    it("returns 400 when no file uploaded", async function () {
      const res = await chai.request(app).post("/upload").set(authHeader());
      expect(res.status).to.equal(400);
      expect(res.body.error).to.include("No file");
    });

    it("returns 422 when PDF has no extractable text", async function () {
      sandbox.stub(pdfExtractorModule, "extractTextFromPdf").resolves("");

      const res = await chai.request(app)
        .post("/upload")
        .set(authHeader())
        .attach("file", Buffer.from("fake pdf"), { filename: "test.pdf", contentType: "application/pdf" });

      expect(res.status).to.equal(422);
      expect(res.body.error).to.include("extract text");
    });

    it("uploads and indexes a PDF successfully", async function () {
      sandbox.stub(pdfExtractorModule, "extractTextFromPdf").resolves("This is test content from the PDF document with enough words.");
      sandbox.stub(embeddingsModule, "generateEmbedding").resolves(new Array(384).fill(0.1));
      sandbox.stub(FileAssetModel, "findOneAndUpdate").resolves({});
      sandbox.stub(DocumentModel, "findOneAndUpdate").resolves({});

      const res = await chai.request(app)
        .post("/upload")
        .set(authHeader())
        .attach("file", Buffer.from("fake pdf content"), { filename: "test.pdf", contentType: "application/pdf" });

      expect(res.status).to.equal(200);
      expect(res.body).to.have.property("documentId");
      expect(res.body.chunks).to.be.greaterThan(0);
    });
  });

  // ─── GET /ask ────────────────────────────────────────────────────────────────
  describe("GET /ask", function () {
    it("returns 400 when no question provided", async function () {
      const res = await chai.request(app).get("/ask?documentId=doc1").set(authHeader());
      expect(res.status).to.equal(400);
    });

    it("returns 400 when no documentId provided", async function () {
      const res = await chai.request(app).get("/ask?q=hello").set(authHeader());
      expect(res.status).to.equal(400);
    });

    it("returns 404 when document not found in store or DB", async function () {
      sandbox.stub(DocumentModel, "findOne").resolves(null);

      const res = await chai.request(app)
        .get("/ask?q=what+is+this&documentId=missing_doc")
        .set(authHeader());
      expect(res.status).to.equal(404);
    });

    it("returns an answer for a valid question", async function () {
      vectorStore.resetStore("test_doc");
      vectorStore.addEmbedding("test_doc", "The sky is blue.", new Array(384).fill(0.1));

      sandbox.stub(embeddingsModule, "generateEmbedding").resolves(new Array(384).fill(0.1));
      sandbox.stub(answerModule, "rephraseAnswer").resolves({
        answer: "The sky is blue.",
        sources: ["The sky is blue."]
      });
      sandbox.stub(DocumentModel, "updateOne").resolves({});

      const res = await chai.request(app)
        .get("/ask?q=what+color+is+the+sky&documentId=test_doc")
        .set(authHeader());

      expect(res.status).to.equal(200);
      expect(res.body.answer).to.equal("The sky is blue.");
    });

    it("handles conversational messages", async function () {
      vectorStore.resetStore("conv_doc");
      vectorStore.addEmbedding("conv_doc", "Some document content here.", new Array(384).fill(0.1));

      sandbox.stub(embeddingsModule, "generateEmbedding").resolves(new Array(384).fill(0.1));
      sandbox.stub(answerModule, "rephraseAnswer").resolves({
        answer: "Hello! How can I help you?",
        sources: []
      });
      sandbox.stub(DocumentModel, "updateOne").resolves({});

      const res = await chai.request(app)
        .get("/ask?q=hi&documentId=conv_doc")
        .set(authHeader());

      expect(res.status).to.equal(200);
      expect(res.body.answer).to.include("Hello");
    });
  });

  // ─── DELETE /documents ───────────────────────────────────────────────────────
  describe("DELETE /documents", function () {
    it("returns 400 when documentId is missing", async function () {
      const res = await chai.request(app).delete("/documents").set(authHeader());
      expect(res.status).to.equal(400);
    });

    it("returns 404 when document does not exist", async function () {
      sandbox.stub(DocumentModel, "deleteOne").resolves({ deletedCount: 0 });
      sandbox.stub(FileAssetModel, "deleteOne").resolves({ deletedCount: 0 });

      const res = await chai.request(app)
        .delete("/documents?documentId=ghost_doc")
        .set(authHeader());
      expect(res.status).to.equal(404);
    });

    it("deletes document and clears vector store", async function () {
      sandbox.stub(DocumentModel, "deleteOne").resolves({ deletedCount: 1 });
      sandbox.stub(FileAssetModel, "deleteOne").resolves({ deletedCount: 1 });

      vectorStore.addEmbedding("del_doc", "some text", new Array(384).fill(0.1));

      const res = await chai.request(app)
        .delete("/documents?documentId=del_doc")
        .set(authHeader());

      expect(res.status).to.equal(200);
      expect(res.body.message).to.include("deleted");
      expect(vectorStore.hasDocument("del_doc")).to.be.false;
    });
  });

  // ─── 404 handler ─────────────────────────────────────────────────────────────
  describe("404 handler", function () {
    it("returns JSON 404 for unknown routes", async function () {
      const res = await chai.request(app).get("/this-route-does-not-exist");
      expect(res.status).to.equal(404);
      expect(res.body).to.have.property("error", "Route not found");
      expect(res.body).to.have.property("path");
    });
  });
});
