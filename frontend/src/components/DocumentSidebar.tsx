'use client';

import React, { useState, useCallback } from 'react';
import { Upload, File as FileIcon, Loader2 } from 'lucide-react';
import { useDropzone } from 'react-dropzone';

interface StoredDocument {
  documentId: string;
  fileName: string;
  fileUrl: string;
  size: string;
  status: string;
  statusColor: string;
}

interface DocumentSidebarProps {
  documents: StoredDocument[];
  currentDocumentId?: string | null;
  onDocumentChange?: (document: StoredDocument) => void;
  token?: string | null;
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

export default function DocumentSidebar({ documents, currentDocumentId, onDocumentChange, token }: DocumentSidebarProps) {
  const [isUploading, setIsUploading] = useState(false);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001';
      const res = await fetch(`${apiUrl}/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData,
      });

      if (!res.ok) throw new Error('Upload failed');
      const data = await res.json();
      
      const uploadedDocument: StoredDocument = {
        documentId: data.documentId || data.fileUrl,
        fileName: data.fileName || file.name,
        fileUrl: data.fileUrl,
        size: typeof data.fileSize === 'number' ? formatFileSize(data.fileSize) : formatFileSize(file.size),
        status: 'READY',
        statusColor: 'text-emerald-600'
      };

      if (onDocumentChange) {
        onDocumentChange(uploadedDocument);
      }
    } catch (error) {
      console.error("Upload error:", error);
      alert("Failed to upload document");
    } finally {
      setIsUploading(false);
    }
  }, [onDocumentChange, token]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'] },
    maxFiles: 1
  });

  return (
    <div className="flex flex-col gap-4 h-full">
      {/* Upload Area */}
      <div 
        {...getRootProps()} 
        className={`bg-gray-50 border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-colors ${
          isDragActive ? 'border-black bg-gray-100' : 'border-gray-200 hover:bg-gray-100'
        } ${isUploading ? 'opacity-50 pointer-events-none' : ''}`}
      >
        <input {...getInputProps()} />
        {isUploading ? (
          <Loader2 className="w-6 h-6 text-gray-500 mb-3 animate-spin" />

        ) : (
          <Upload className="w-6 h-6 text-gray-500 mb-3" />

        )}
        <h3 className="text-sm font-semibold text-gray-900">
          {isUploading ? 'Uploading & Processing...' : 'Upload Document'}
        </h3>
        <p className="mt-1 text-xs text-gray-500">
          {isDragActive ? 'Drop PDF here' : 'Drop PDF or click to browse'}
        </p>
      </div>

      {/* Document List */}
      <div className="flex flex-col gap-3 overflow-y-auto pb-4">
        {documents.map((doc) => (
          <button
            key={doc.documentId}
            type="button"
            onClick={() => onDocumentChange?.(doc)}
            className={`bg-white border rounded-xl p-4 flex items-center gap-4 transition-colors cursor-pointer shrink-0 text-left ${
              currentDocumentId === doc.documentId
                ? 'border-black ring-1 ring-black'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center text-gray-500 shrink-0">
              <FileIcon className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-medium text-gray-900 truncate">{doc.fileName}</h4>
              <div className="flex items-center gap-3 mt-1 text-xs">
                <span className="text-gray-500">{doc.size}</span>
                <span className={`font-medium ${doc.statusColor}`}>{doc.status}</span>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
