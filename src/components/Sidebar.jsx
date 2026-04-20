'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Users, LayoutDashboard, Dumbbell, LogOut, ChartColumn, Utensils, Bell, X } from 'lucide-react';
import { cn } from '../lib/utils';
import { toast } from 'sonner';

const navItems = [
  { href: '/dashboard', label: 'Overview', icon: LayoutDashboard },
  { href: '/dashboard/users', label: 'Users', icon: Users },
  { href: '/dashboard/exercises', label: 'Content', icon: Dumbbell },
  { href: '/dashboard/food', label: 'Food', icon: Utensils },
  { href: '/dashboard/notifications', label: 'Notifications', icon: Bell },
  { href: '/dashboard/exercise-analytics', label: 'Exercise Analytics', icon: ChartColumn },
  { href: '/dashboard/user-analytics', label: 'User Analytics', icon: ChartColumn },
];
const LOGOUT_URL  = "/api/logout/"

export function Sidebar({ isOpen = false, onClose = () => {} }) {
  const router = useRouter()
  const pathname = usePathname();

const logOut = async(e) => {
  e.preventDefault();

  const requestOptions = {
      method: "POST",
      headers:{
          "Content-Type": "application/json"
      },
      body:""
  }
  
  
  const response = await fetch(LOGOUT_URL, requestOptions)
  const data = await response.json()
  if(response.ok){
      router.replace("/login");
      onClose();
  }
  else{
    toast.error("Logout Failed", {
      description: (
        <span className="text-white">
          An error occurred during logout. Please try again.
        </span>
      ),
      style: {
        background: '#dc2626',  // Red background for whole toast
        color: 'white',         // White text (affects title primarily)
        border: '1px solid #b91c1c',  // Darker red border
      },

    });
  }
};
  return (
    <>
      <div
        onClick={onClose}
        className={cn(
          'fixed inset-0 z-30 bg-black/60 md:hidden',
          isOpen ? 'block' : 'hidden'
        )}
      />

      <aside
        className={cn(
          'fixed left-0 top-0 z-40 flex h-screen w-64 flex-col border-r border-gray-800 bg-black p-4 transition-transform duration-200 md:translate-x-0',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
      <div className="mb-8 flex items-center justify-between space-x-2">
        <img src="/logo.png" alt="LiftLens" className="h-22 w-40" />
        <button
          type="button"
          onClick={onClose}
          className="rounded-md p-2 text-gray-400 hover:bg-gray-800 hover:text-white md:hidden"
          aria-label="Close sidebar menu"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <nav className="flex-1 space-y-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isOverview = item.href === '/dashboard';
          const isActive = isOverview ? pathname === item.href : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              className={cn(
                'flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                isActive
                  ? 'bg-orange-500/20 text-[#dc2626]'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800'
              )}
            >
              <Icon className="h-4 w-4" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
      <div className="mt-auto">
        <button 
          onClick={logOut}
          className={cn(
            'flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors w-full text-gray-400 hover:text-red-400 hover:bg-gray-800'
          )}
        >
          <LogOut className="h-4 w-4" />
          <span>Logout</span>
        </button>
      </div>
      </aside>
    </>
  );
}