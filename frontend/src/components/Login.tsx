'use client';

import React, { useState } from 'react';

interface LoginProps {
  onLogin: (token: string, userId: string, username: string) => void;
}

export default function Login({ onLogin }: LoginProps) {
  const [isRegister, setIsRegister] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001';
    const endpoint = isRegister ? '/register' : '/login';

    try {
      const response = await fetch(`${apiUrl}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Authentication failed');
      }

      if (isRegister) {
        setIsRegister(false);
        setError('Registration successful! Please login.');
      } else {
        onLogin(data.token, data.userId, data.username);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An unexpected error occurred';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-gray-900">{isRegister ? 'Create Account' : 'Welcome Back'}</h2>
          <p className="text-gray-500 mt-2">{isRegister ? 'Join Ask Docks to start analyzing' : 'Sign in to access your documents'}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Username</label>
            <input
              type="text"
              required
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-black focus:border-transparent outline-none transition-all"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter your username"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
            <input
              type="password"
              required
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-black focus:border-transparent outline-none transition-all"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>

          {error && (
            <div className={`p-4 rounded-xl text-sm ${error.includes('successful') ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-black text-white py-3 rounded-xl font-semibold hover:bg-gray-800 transition-colors disabled:opacity-50"
          >
            {isLoading ? 'Processing...' : (isRegister ? 'Sign Up' : 'Sign In')}
          </button>
        </form>

        <div className="mt-8 text-center">
          <button
            onClick={() => { setIsRegister(!isRegister); setError(''); }}
            className="text-sm font-medium text-gray-600 hover:text-black transition-colors"
          >
            {isRegister ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
          </button>
        </div>
      </div>
    </div>
  );
}
