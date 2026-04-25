'use client';

import React, { useState } from 'react';
import dynamic from 'next/dynamic';
import Header from '../components/Header';
import DocumentSidebar from '../components/DocumentSidebar';
import ChatAssistant from '../components/ChatAssistant';
import Login from '../components/Login';

// Dynamically import DocumentViewer to disable SSR since react-pdf relies on browser APIs like DOMMatrix
const DocumentViewer = dynamic(() => import('../components/DocumentViewer'), { ssr: false });

interface StoredDocument {
  documentId: string;
  fileName: string;
  fileUrl: string;
  size: string;
  status: string;
  statusColor: string;
}

function formatFileSize(fileSize: number): string {
  if (!Number.isFinite(fileSize) || fileSize <= 0) {
    return '';
  }

  if (fileSize < 1024 * 1024) {
    return `${(fileSize / 1024).toFixed(1)} KB`;
  }

  return `${(fileSize / (1024 * 1024)).toFixed(2)} MB`;
}

function normalizeDocument(rawDocument: Partial<StoredDocument> & { fileSize?: number | string } | null): StoredDocument | null {
  if (!rawDocument) {
    return null;
  }

  const fileUrl = rawDocument.fileUrl;
  const fileName = rawDocument.fileName;
  const documentId = rawDocument.documentId;

  if (!fileUrl || !fileName || !documentId || fileUrl === 'undefined') {
    return null;
  }

  const numericSize = typeof rawDocument.fileSize === 'number'
    ? rawDocument.fileSize
    : Number(rawDocument.fileSize || 0);

  return {
    documentId,
    fileName,
    fileUrl,
    size: numericSize > 0 ? formatFileSize(numericSize) : rawDocument.size || '',
    status: rawDocument.status || 'READY',
    statusColor: rawDocument.statusColor || 'text-emerald-600'
  };
}

export default function Home() {
  const [documents, setDocuments] = useState<StoredDocument[]>([]);
  const [currentDocument, setCurrentDocument] = useState<StoredDocument | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  React.useEffect(() => {
    const savedToken = localStorage.getItem('token');
    // Defer state updates to the next microtask to avoid synchronous cascading render warnings
    Promise.resolve().then(() => {
      if (savedToken) {
        setToken(savedToken);
      }
      setIsLoaded(true);
    });
  }, []);

  const handleLogin = (newToken: string, userId: string, username: string) => {
    localStorage.setItem('token', newToken);
    localStorage.setItem('userId', userId);
    localStorage.setItem('username', username);
    setToken(newToken);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userId');
    localStorage.removeItem('username');
    localStorage.removeItem('currentDocumentId');
    setToken(null);
    setDocuments([]);
    setCurrentDocument(null);
  };

  React.useEffect(() => {
    if (!token) return;
    let isActive = true;

    async function loadDocuments() {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001';
        const response = await fetch(`${apiUrl}/documents`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (!response.ok) {
          if (isActive) {
            setDocuments([]);
            setCurrentDocument(null);
          }
          return;
        }

        const data = await response.json();
        const normalizedDocuments = Array.isArray(data)
          ? data.map((document) => normalizeDocument(document)).filter(Boolean) as StoredDocument[]
          : [];

        if (!isActive) {
          return;
        }

        setDocuments(normalizedDocuments);

        const savedDocumentId = localStorage.getItem('currentDocumentId');
        const savedDocument = normalizedDocuments.find((document) => document.documentId === savedDocumentId);

        setCurrentDocument(savedDocument || null);
      } catch (error) {
        console.warn('Documents endpoint is unavailable right now.', error);
        if (isActive) {
          setDocuments([]);
          setCurrentDocument(null);
        }
      }
    }

    void loadDocuments();

    return () => {
      isActive = false;
    };
  }, [token]);

  const handleDocumentChange = (document: StoredDocument) => {
    const normalizedDocument = normalizeDocument(document);
    if (!normalizedDocument) {
      return;
    }

    setCurrentDocument(normalizedDocument);
    setDocuments((previousDocuments) => {
      const nextDocuments = [
        normalizedDocument,
        ...previousDocuments.filter((item) => item.documentId !== normalizedDocument.documentId)
      ];

      return nextDocuments;
    });
    localStorage.setItem('currentDocumentId', normalizedDocument.documentId);
  };

  if (!isLoaded) return null;
  if (!token) return <Login onLogin={handleLogin} />;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
      <Header 
        onLogout={handleLogout} 
        username={typeof window !== 'undefined' ? localStorage.getItem('username') : null} 
      />
      
      {/* Main Content Area */}
       <main className="flex-1 flex flex-col lg:flex-row gap-6 p-4 lg:p-6 lg:h-[calc(100vh-73px)] overflow-hidden max-w-[1600px] mx-auto w-full">
        <div className="flex-shrink-0 lg:w-80 w-full lg:h-full lg:overflow-y-auto hidden md:block">
          <DocumentSidebar
            documents={documents}
            currentDocumentId={currentDocument?.documentId ?? null}
            onDocumentChange={handleDocumentChange}
            token={token}
          />
        </div>
        <div className="flex-1 min-h-[500px] lg:min-h-0 lg:h-full flex flex-col">
          <DocumentViewer
            key={currentDocument?.documentId ?? 'no-document'}
            pdfUrl={
              currentDocument?.fileUrl 
                ? (currentDocument.fileUrl.startsWith('http') && !currentDocument.fileUrl.includes('localhost') && !currentDocument.fileUrl.includes('5001')
                    ? currentDocument.fileUrl 
                    : `${currentDocument.fileUrl}${currentDocument.fileUrl.includes('?') ? '&' : '?'}token=${token}`)
                : null
            }
          />
        </div>
        <div className="flex-shrink-0 lg:w-96 w-full lg:h-full lg:overflow-hidden h-[600px]">
          <ChatAssistant
            key={currentDocument?.documentId ?? 'no-document'}
            currentDocumentId={currentDocument?.documentId ?? null}
            currentFileName={currentDocument?.fileName ?? null}
            token={token}
          />
        </div>
      </main>
    </div>
  );
}
