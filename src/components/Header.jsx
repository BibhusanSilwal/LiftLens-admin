'use client';

import { Bell, Menu } from 'lucide-react';

export function Header({ onMenuClick }) {
  return (
    <header className="bg-black border-b border-gray-800 px-4 py-3 md:p-4 flex justify-between items-center">
      <div className="flex items-center space-x-2">
        <button
          type="button"
          onClick={onMenuClick}
          className="md:hidden inline-flex items-center justify-center rounded-md p-2 text-gray-300 hover:bg-gray-800 hover:text-white"
          aria-label="Open sidebar menu"
        >
          <Menu className="h-5 w-5" />
        </button>
      </div>
      <div className="flex items-center space-x-3 md:space-x-4">
        <Bell className="h-5 w-5 text-gray-400" />
        <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center">
          A
        </div>
      </div>
    </header>
  );
}