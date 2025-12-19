'use client';

import { useState } from 'react';
import { Button } from '../../components/ui/Button';
import { Card, CardContent } from '../../components/ui/Card';
import { Mail, Lock } from 'lucide-react';
import { toast } from 'sonner';

const LOGIN_URL = "/api/login/";

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false); // New: For submit loading state

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true); // New: Prevent double-submit

    const formData = new FormData(e.target);
    console.log("formmmmm",formData)
    const objectFromForm = Object.fromEntries(formData);
    const jsonData = JSON.stringify(objectFromForm);

    const requestOptions = {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: jsonData
    };

    try {
      const response = await fetch(LOGIN_URL, requestOptions);
      const data = await response.json();
      console.log(data);

      if (response.ok && data.is_admin) { // New: Check for admin role
        // Redirect to admin dashboard
        window.location.href = '/dashboard'; // Updated: Admin-specific path
      } else if (response.ok) {
        // Fallback: Not admin, but valid user—redirect to user dashboard or error
        toast.error("Access Denied", {
          description: "Admin privileges required for this dashboard.",
          style: {
            background: '#dc2626',
            color: 'white',
            border: '1px solid #b91c1c',
          },
        });
      } else {
        // Login failed (invalid creds)
        toast.error("Login Failed", {
          description: (
            <span className="text-white">
              Please enter correct email or password
            </span>
          ),
          style: {
            background: '#dc2626',
            color: 'white',
            border: '1px solid #b91c1c',
          },
        });
      }
    } catch (error) {
      console.error('Login error:', error);
      toast.error("Network Error", {
        description: "Please check your connection and try again.",
        style: {
          background: '#dc2626',
          color: 'white',
          border: '1px solid #b91c1c',
        },
      });
    } finally {
      setIsLoading(false); // New: Reset loading
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-black p-4">
      <Card className="w-full max-w-md bg-[#1c1c1e] border-[#1c1c1e]">
        <CardContent className="p-8">
          <div className="flex justify-center mb-8">
            <img src="/logo.png" alt="LiftLens" className="h-25 w-40" />
          </div>
          <h1 className="text-2xl font-bold text-center mb-6">Welcome Back</h1>
          <p className="text-gray-400 text-center mb-8">Sign in to your Admin Dashboard</p>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Email Address</label> {/* Updated: Label for email */}
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="email" // Updated: type="email" for validation
                  name="email" // Critical: Changed from 'username' to 'email' to match backend
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoading} // New: Disable during loading
                  className="w-full pl-10 pr-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-orange-500 disabled:opacity-50"
                  placeholder="admin@liftlens.com" // Updated: Email placeholder
                  required // New: HTML validation
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="password"
                  name="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading} // New: Disable during loading
                  className="w-full pl-10 pr-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-orange-500 disabled:opacity-50"
                  placeholder="••••••••"
                  required // New: HTML validation
                />
              </div>
            </div>

            <Button 
              type="submit" 
              disabled={isLoading} // New: Disable button during loading
              className="w-full bg-[#dc2626] hover:bg-orange-600 py-3 rounded-lg disabled:opacity-50"
            >
              {isLoading ? 'Signing In...' : 'Sign In'} {/* New: Loading text */}
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