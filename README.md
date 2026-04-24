# Ask Docks AI 🚀

Ask Docks AI is a powerful Retrieval-Augmented Generation (RAG) application that allows you to chat with your documents and web content. Upload PDFs or provide URLs to gain instant insights using state-of-the-art AI.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Next.js](https://img.shields.io/badge/Next.js-15-black)
![Node.js](https://img.shields.io/badge/Node.js-20-green)
![Express](https://img.shields.io/badge/Express-5-lightgrey)

## ✨ Features

- 📄 **PDF Analysis**: Upload any PDF and start asking questions immediately.
- 🌐 **URL Ingestion**: Provide a website URL to scrape and analyze its content.
- 🧠 **Smart Retrieval**: Uses semantic search with local embeddings (all-MiniLM-L6-v2) for accurate context retrieval.
- 💬 **AI Assistant**: Powered by Groq for lightning-fast, intelligent responses.
- 📂 **Document Management**: Keep track of your uploaded documents and chat histories.
- 🎨 **Modern UI**: Clean, responsive dashboard built with Next.js and Tailwind CSS.

## 🛠️ Tech Stack

### Frontend
- **Framework**: [Next.js](https://nextjs.org/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **Icons**: [Lucide React](https://lucide.dev/)
- **PDF Handling**: [React PDF](https://github.com/wojtekmaj/react-pdf) & [React Dropzone](https://react-dropzone.js.org/)

### Backend
- **Runtime**: [Node.js](https://nodejs.org/)
- **Framework**: [Express.js](https://expressjs.com/)
- **Database**: [MongoDB](https://www.mongodb.com/) (via Mongoose)
- **AI/ML**: 
  - [Groq SDK](https://groq.com/) (LLM)
  - [Xenova Transformers](https://huggingface.co/docs/transformers.js/) (Local Embeddings)
- **File Processing**: [Multer](https://github.com/expressjs/multer) & [PDF-parse](https://www.npmjs.com/package/pdf-parse)

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ 
- MongoDB instance (Local or Atlas)
- Groq API Key

### Installation

1. **Clone the repository:**
   ```bash
   git clone <your-repo-url>
   cd rag
   ```

2. **Setup Backend:**
   ```bash
   cd backend
   cp .env.example .env
   # Add your GROQ_API_KEY and MONGODB_URI to .env
   npm install
   npm run dev
   ```

3. **Setup Frontend:**
   ```bash
   cd ../frontend
   npm install
   npm run dev
   ```

4. **Access the app:**
   Open [http://localhost:3000](http://localhost:3000) in your browser.

## 🚢 Deployment

### Vercel (Recommended)
This project is optimized for deployment on Vercel. 

1. Push your code to a GitHub repository.
2. Connect the `frontend` and `backend` as separate projects in Vercel.
3. Configure environment variables in the Vercel dashboard.

## 🛡️ Security
- Environment variables are managed via `.env` and excluded from source control.
- Root and sub-directory `.gitignore` files ensure no sensitive data (like `uploads/` or `.DS_Store`) is leaked.

## 📄 License
This project is licensed under the MIT License.
