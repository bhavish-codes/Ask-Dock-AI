import React from "react";

export default function Header() {
  return (
    <header className="flex items-center justify-between px-8 py-4 bg-white border-b border-gray-200">
      <div className="flex items-center space-x-2">
        <h1 className="text-xl font-bold">Ask Docks</h1>
      </div>

      <button className="bg-black text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors">
        Toggle Theme
      </button>
    </header>
  );
}
