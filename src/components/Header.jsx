'use client';

import { Bell, Search } from 'lucide-react';

export function Header() {
  return (
    <header className="bg-black border-b border-gray-800 p-4 flex justify-between items-center">
      <div className="flex items-center space-x-4">
        <Search className="h-4 w-4 text-gray-400" />
        <input
          type="text"
          placeholder="Search..."
          className="bg-transparent border-none outline-none text-white placeholder-gray-400"
        />
      </div>
      <div className="flex items-center space-x-4">
        <Bell className="h-5 w-5 text-gray-400" />
        <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center">
          A
        </div>
      </div>
    </header>
  );
}