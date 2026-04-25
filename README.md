# Ask Docks AI 🚀

Ask Docks AI is a professional, secure Retrieval-Augmented Generation (RAG) application that allows you to chat with your documents privately. Upload PDFs to gain instant insights using state-of-the-art AI, with data strictly isolated by user.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Next.js](https://img.shields.io/badge/Next.js-15-black)
![Node.js](https://img.shields.io/badge/Node.js-20-green)
![Express](https://img.shields.io/badge/Express-5-lightgrey)
![CI](https://github.com/bhavish-codes/Ask-Dock-AI/actions/workflows/ci.yml/badge.svg)

## ✨ Features

- 🔐 **User Authentication**: Secure sign-up and login system using JWT and encrypted passwords.
- 🛡️ **Access Control**: Strict data isolation. Users can only access and interact with their own documents.
- 📄 **PDF Analysis**: Seamlessly upload and extract text from PDFs.
- 🧠 **Semantic Search**: Uses local embeddings (**all-MiniLM-L6-v2**) to retrieve the most relevant context.
- 💬 **AI Assistant**: Powered by **Groq** for high-speed, accurate responses.
- 📂 **Persistence**: MongoDB integration for storing user-linked document metadata and chat history.
- 🎨 **Modern Dashboard**: A sleek, responsive UI built with Next.js and premium glassmorphism design.

## 🏗️ Architecture

```mermaid
graph TD
    A[User] -->|Auth/Login| B[Frontend - Next.js]
    B -->|Upload PDF + JWT| C[Backend - Express]
    C -->|Verify Token| D[Auth Middleware]
    D -->|Extract Text| E[PDF Parser]
    E -->|Generate Embeddings| F[Local Transformer Model]
    F -->|Store User-Linked Data| G[MongoDB]
    C -->|Ask Question| H[Semantic Search]
    H -->|Context + Query| I[Groq AI]
    I -->|Response| B
```

## 🛠️ Tech Stack

### Frontend
- **Framework**: [Next.js](https://nextjs.org/) (App Router)
- **Styling**: Vanilla CSS / Tailwind CSS (Optional)
- **Icons**: [Lucide React](https://lucide.dev/)
- **Auth Management**: JWT + LocalStorage

### Backend
- **Runtime**: [Node.js](https://nodejs.org/)
- **Framework**: [Express.js](https://expressjs.com/)
- **Authentication**: [JWT](https://jwt.io/) + [bcryptjs](https://www.npmjs.com/package/bcryptjs)
- **AI/ML**: 
  - [Groq Cloud](https://groq.com/) (Inference)
  - [Transformers.js](https://huggingface.co/docs/transformers.js/) (Local Embeddings)
- **Database**: [MongoDB](https://www.mongodb.com/) (Mongoose)

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ 
- MongoDB (Local or Atlas)
- Groq API Key

### Installation

1. **Clone the repo:**
   ```bash
   git clone https://github.com/bhavish-codes/Ask-Dock-AI.git
   cd Ask-Dock-AI
   ```

2. **Backend Setup:**
   ```bash
   cd backend
   npm install
   # Create .env with MONGODB_URI, GROQ_API_KEY, and JWT_SECRET
   npm run dev
   ```

3. **Frontend Setup:**
   ```bash
   cd ../frontend
   npm install
   npm run dev
   ```

## 🧪 Testing
We use GitHub Actions to ensure code quality. You can run linting and builds locally:
```bash
# Frontend
cd frontend && npm run build

# Backend
cd backend && node --check src/index.js
```

## 🚢 Deployment
- **Frontend**: Deploy to Vercel (automatic via GitHub integration).
- **Backend**: Deploy to Vercel or Render. The project includes a `vercel.json` for seamless serverless deployment.

## 📄 License
MIT License. Created by [Bhavish Dhar](https://github.com/bhavish-codes).
