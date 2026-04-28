'use client';

import React, { useState } from 'react';
import { Send } from 'lucide-react';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

interface ChatAssistantProps {
  currentDocumentId: string | null;
  currentFileName: string | null;
  token?: string | null;
  onUnauthorized?: () => void;
}

const defaultWelcomeMessage: Message = {
  id: '1',
  role: 'assistant',
  content: "Hello! I'm ready to help you analyze your documents. Please upload a PDF to get started."
};

function getGreetingMessage(fileName: string): Message {
  return {
    id: `intro-${fileName}`,
    role: 'assistant',
    content: `Hello! I've finished analyzing **${fileName}**. How can I help you understand it today?`
  };
}

export default function ChatAssistant({ currentDocumentId, currentFileName, token, onUnauthorized }: ChatAssistantProps) {
  const [messages, setMessages] = useState<Message[]>([defaultWelcomeMessage]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  React.useEffect(() => {
    let isActive = true;

    async function loadChatHistory() {
      if (!currentDocumentId || !currentFileName) {
        if (isActive) {
          setMessages([defaultWelcomeMessage]);
        }
        return;
      }

      try {
        const baseApiUrl = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001').replace(/\/$/, '');
        const response = await fetch(`${baseApiUrl}/documents/${encodeURIComponent(currentDocumentId)}/chat`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (!response.ok) {
          if (response.status === 401) {
            onUnauthorized?.();
            return;
          }
          if (isActive) {
            setMessages([getGreetingMessage(currentFileName)]);
          }
          return;
        }

        const data = await response.json();
        const normalizedMessages = Array.isArray(data)
          ? data
              .filter((message) => message?.role && message?.content)
              .map((message, index) => ({
                id: message._id || `${currentDocumentId}-${index}`,
                role: message.role,
                content: message.content
              }))
          : [];

        if (!isActive) {
          return;
        }

        setMessages(normalizedMessages.length > 0 ? normalizedMessages : [getGreetingMessage(currentFileName)]);
      } catch (error) {
        console.warn('Chat history endpoint is unavailable right now.', error);
        if (isActive) {
          setMessages([getGreetingMessage(currentFileName)]);
        }
      }
    }

    void loadChatHistory();

    return () => {
      isActive = false;
    };
  }, [currentDocumentId, currentFileName, token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading || !currentDocumentId) return;

    const userMessage: Message = { id: Date.now().toString(), role: 'user', content: input.trim() };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const baseApiUrl = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001').replace(/\/$/, '');
      const response = await fetch(
        `${baseApiUrl}/ask?q=${encodeURIComponent(userMessage.content)}&documentId=${encodeURIComponent(currentDocumentId)}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );
      if (!response.ok) throw new Error('API request failed');
      if (response.status === 401) {
        onUnauthorized?.();
        return;
      }
      const data = await response.json();
      
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.answer || "I'm sorry, I couldn't generate an answer."
      };
      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Error fetching answer:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: "Sorry, I'm having trouble connecting to the backend. Please check your internet connection and ensure the server is running."
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-96 flex-shrink-0 flex flex-col bg-white border border-gray-200 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="h-14 border-b border-gray-200 flex items-center px-6 gap-2 shrink-0">
        <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
        <span className="font-semibold text-sm">AI Assistant</span>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
             <span className="text-[10px] font-bold text-gray-400 mb-2 uppercase tracking-wider">
              {msg.role === 'user' ? 'You' : 'Ask Docks AI'}
            </span>
            <div 
              className={`text-sm p-4 rounded-xl max-w-[90%] ${
                msg.role === 'user' 
                  ? 'bg-gray-50 text-gray-900 border border-gray-100' 
                  : 'bg-white text-gray-900 border border-gray-200 shadow-sm'
              }`}
            >
              <p className="leading-relaxed" dangerouslySetInnerHTML={{ __html: msg.content.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }} />
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex flex-col items-start">
            <span className="text-[10px] font-bold text-gray-400 mb-2 uppercase tracking-wider">Ask Docks AI</span>
            <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-gray-300 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                <div className="w-2 h-2 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="shrink-0 border-t p-4" style={{ background: 'var(--panel-soft)', borderColor: 'var(--line)' }}>
        <form onSubmit={handleSubmit} className="relative flex items-center">
          <input
            type="text"
            value={input}
            disabled={!currentDocumentId}
            onChange={(e) => setInput(e.target.value)}
            placeholder={currentFileName ? `Ask about ${currentFileName}...` : "Upload a document first..."}
            className="w-full rounded-xl border py-3 pl-4 pr-12 text-sm transition-all focus:outline-none disabled:opacity-70"
            style={{
              background: 'var(--panel)',
              borderColor: 'var(--line)',
              color: 'var(--text-strong)',
              boxShadow: '0 8px 20px var(--shadow-soft)'
            }}
          />
          <button 
            type="submit" 
            disabled={!input.trim() || isLoading || !currentDocumentId}
            className="absolute right-2 rounded-lg p-2 transition-colors disabled:opacity-50"
            style={{
              background: 'var(--accent)',
              color: 'var(--accent-contrast)'
            }}
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
