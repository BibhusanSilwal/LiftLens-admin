'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Users, LayoutDashboard, Dumbbell } from 'lucide-react';
import { cn } from '../lib/utils';

const navItems = [
  { href: '/dashboard', label: 'Overview', icon: LayoutDashboard },
  { href: '/dashboard/users', label: 'Users', icon: Users },
  { href: '/dashboard/exercises', label: 'Content', icon: Dumbbell },
];
const LOGOUT_URL  = "/api/logout/"

export function Sidebar() {
  const router = useRouter()
  const pathname = usePathname();
  console.log(pathname)

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
      router.replace("/");
  }
  else{
    toast.error("Login Failed", {
      description: (
        <span className="text-white">
          Please enter correct username or password
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
    <div className="w-64 bg-black border-r border-gray-800 h-screen fixed left-0 top-0 p-4">
      <div className="flex items-center space-x-2 mb-8">
        <img src="/logo.png" alt="LiftLens" className="h-22 w-40" />

      </div>
      <nav className="space-y-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isOverview = item.href === '/dashboard';
          const isActive = isOverview ? pathname === item.href : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
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
      <div>
        <button onClick={logOut}>Logout</button>
      </div>
    </div>
  );
}