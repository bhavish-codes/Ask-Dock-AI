'use client';

import React, { useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// Set worker URL for react-pdf
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface DocumentViewerProps {
  pdfUrl: string | null;
}

export default function DocumentViewer({ pdfUrl }: DocumentViewerProps) {
  const [numPages, setNumPages] = useState<number>();
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [scale, setScale] = useState<number>(1.0);
  const [rotation, setRotation] = useState<number>(0);

  function onDocumentLoadSuccess({ numPages }: { numPages: number }): void {
    setNumPages(numPages);
    setPageNumber(1);
  }

  function onDocumentLoadError(): void {
    setNumPages(undefined);
    setPageNumber(1);
  }

  const handleZoomIn = () => setScale(prev => Math.min(prev + 0.25, 3));
  const handleZoomOut = () => setScale(prev => Math.max(prev - 0.25, 0.5));
  const handleRotate = () => setRotation(prev => (prev + 90) % 360);

  const handlePrevPage = () => setPageNumber(prev => Math.max(prev - 1, 1));
  const handleNextPage = () => setPageNumber(prev => Math.min(prev + 1, numPages || 1));

  return (
    <div className="flex-1 bg-gray-50 border border-gray-200 rounded-xl flex flex-col overflow-hidden h-full">
    
      {/* Controls Bar */}
       <div className="h-14 border-b border-gray-200 bg-gray-50/80 flex items-center justify-between px-6 shrink-0">
        <span className="text-sm text-gray-500 font-medium">
          {pdfUrl ? (numPages ? `Page ${pageNumber} of ${numPages}` : 'Loading...') : 'No document selected'}
        </span>
        <div className="flex gap-2">
          {pdfUrl && (
            <>
            <button type="button" onClick={handlePrevPage} disabled={!numPages || pageNumber <= 1} className="px-3 py-1.5 text-xs font-medium bg-white border border-gray-200 rounded-md hover:bg-gray-50 disabled:opacity-50">Prev</button>
              <button type="button" onClick={handleNextPage} disabled={!numPages || pageNumber >= (numPages || 1)} className="px-3 py-1.5 text-xs font-medium bg-white border border-gray-200 rounded-md hover:bg-gray-50 disabled:opacity-50">Next</button>
              <div className="w-px h-6 bg-gray-300 mx-1 self-center"></div>
              </>
          )}
           <button type="button" onClick={handleZoomOut} className="px-3 py-1.5 text-xs font-medium bg-white border border-gray-200 rounded-md hover:bg-gray-50 disabled:opacity-50" disabled={!pdfUrl}>Zoom Out</button>
          <button type="button" onClick={handleZoomIn} className="px-3 py-1.5 text-xs font-medium bg-white border border-gray-200 rounded-md hover:bg-gray-50 disabled:opacity-50" disabled={!pdfUrl}>Zoom In</button>
          <button type="button" onClick={handleRotate} className="px-3 py-1.5 text-xs font-medium bg-white border border-gray-200 rounded-md hover:bg-gray-50 disabled:opacity-50" disabled={!pdfUrl}>Rotate</button>
        </div>
      </div>

      {/* Document Area */}
      <div className="flex-1 overflow-auto p-4 lg:p-8 flex justify-center items-start bg-gray-100">
        {pdfUrl ? (
          <div className="shadow-lg">
            <Document
              key={pdfUrl}
              file={pdfUrl}
              onLoadSuccess={onDocumentLoadSuccess}
              onLoadError={onDocumentLoadError}
               loading={<div className="p-12 text-gray-500">Loading PDF...</div>}
              error={<div className="p-12 text-red-500">Failed to load PDF.</div>}
            >
              <Page 
                key={`${pdfUrl ?? 'no-pdf'}-${pageNumber}-${rotation}-${scale}`}
                pageNumber={pageNumber} 
                scale={scale} 
                rotate={rotation}
                className="max-w-full"
                renderTextLayer={false}
                renderAnnotationLayer={false}
              />
            </Document>
          </div>
        ) : (
           <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-4 mt-20">
            <div className="w-24 h-24 bg-gray-200 rounded-full flex items-center justify-center opacity-50 mb-2">
               <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
            </div>
             <h2 className="text-xl font-medium text-gray-600">No Document Uploaded</h2>
            <p className="text-sm text-gray-500 max-w-sm text-center">Upload a PDF document from the sidebar to view it here, analyze its contents, and chat with the AI Assistant.</p>
          </div>
        )}
      </div>
    </div>
  );
}
