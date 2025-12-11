'use client';

import { useState } from 'react';
import { Button } from '../../components/ui/Button';
import { Card, CardContent } from '../../components/ui/Card';
import { Mail, Lock } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('admin@liftlens.com');
  const [password, setPassword] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    // Mock login logic; redirect to /dashboard
    window.location.href = '/dashboard';
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-black p-4">
      <Card className="w-full max-w-md bg-gray-900 border-gray-800">
        <CardContent className="p-8">
          <div className="flex justify-center mb-8">
            <img src="/logo.png" alt="LiftLens" className="h-12 w-12" />
          </div>
          <h1 className="text-2xl font-bold text-center mb-6">Welcome Back</h1>
          <p className="text-gray-400 text-center mb-8">Sign in to your Admin Dashboard</p>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-orange-500"
                  placeholder="admin@liftlens.com"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-orange-500"
                  placeholder="••••••••"
                />
              </div>
            </div>
            <div className="flex items-center justify-between">
              <label className="flex items-center space-x-2">
                <input type="checkbox" className="rounded" />
                <span className="text-sm text-gray-400">Remember me</span>
              </label>
              <a href="#" className="text-sm text-orange-500 hover:underline">Forgot Password?</a>
            </div>
            <Button type="submit" className="w-full bg-orange-500 hover:bg-orange-600 py-3 rounded-lg">
              Sign In
            </Button>
          </form>
          <p className="text-center text-sm text-gray-400 mt-4">
            Need help? Contact <a href="mailto:support@liftlens.com" className="text-orange-500">support@liftlens.com</a>
          </p>
          <p className="text-center text-xs text-gray-500 mt-8">© 2025 LiftLens. All rights reserved.</p>
        </CardContent>
      </Card>
    </div>
  );
}