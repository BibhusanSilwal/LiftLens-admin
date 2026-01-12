"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader } from "../../components/ui/Card";
import { Users, Flame, UserCheck, UserX } from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

/* ---------------- MOCK DATA (UNCHANGED) ---------------- */

const mockData = [
  { day: "Mon", users: 220 },
  { day: "Tue", users: 165 },
  { day: "Wed", users: 180 },
  { day: "Thu", users: 200 },
  { day: "Fri", users: 150 },
  { day: "Sat", users: 220 },
  { day: "Sun", users: 180 },
];

const liveFeed = [
  { user: "Bibhusan Silwal", exercise: "Bench Press" },
  { user: "Bibhusan Silwal", exercise: "Squats" },
  { user: "Bibhusan Silwal", exercise: "Pull-ups" },
  { user: "Bibhusan Silwal", exercise: "Plank" },
];

export default function DashboardOverview() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  /* ---------------- FETCH USER STATS ---------------- */

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch("/api/users?stats=true");
        if (!res.ok) throw new Error("Failed to fetch stats");
        const data = await res.json();
        setStats(data);
      } catch (err) {
        console.error("Dashboard stats error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  return (
    <div className="space-y-6">
      {/* ===================== TOP STATS ===================== */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Active Users */}
        <Card className="bg-gray-900 border-gray-800">
          <CardHeader className="pb-3">
            <div className="flex items-center space-x-2 text-gray-400">
              <UserCheck className="h-4 w-4 text-green-500" />
              <span className="text-sm">Active Users</span>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {loading ? "—" : stats?.active_users ?? 0}
            </div>
          </CardContent>
        </Card>

        {/* Inactive Users */}
        <Card className="bg-gray-900 border-gray-800">
          <CardHeader className="pb-3">
            <div className="flex items-center space-x-2 text-gray-400">
              <UserX className="h-4 w-4 text-red-500" />
              <span className="text-sm">Inactive Users</span>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {loading ? "—" : stats?.inactive_users ?? 0}
            </div>
          </CardContent>
        </Card>

        {/* Total Users */}
        <Card className="bg-gray-900 border-gray-800">
          <CardHeader className="pb-3">
            <div className="flex items-center space-x-2 text-gray-400">
              <Users className="h-4 w-4" />
              <span className="text-sm">Total Users</span>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {loading ? "—" : stats?.total_users ?? 0}
            </div>
          </CardContent>
        </Card>

        {/* Avg Streak */}
        <Card className="bg-gray-900 border-gray-800">
          <CardHeader className="pb-3">
            <div className="flex items-center space-x-2 text-gray-400">
              <Flame className="h-4 w-4 text-orange-500" />
              <span className="text-sm">Avg Streak</span>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {loading ? "—" : stats?.avg_streak ?? 0}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ===================== GRAPH (UNCHANGED) ===================== */}
      <div className="grid grid-cols-2 gap-6">
        <Card className="bg-gray-900 border-gray-800 col-span-1">
          <CardHeader className="pb-3">
            <h3 className="text-lg font-semibold">User Growth & Activity</h3>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={mockData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                <XAxis dataKey="day" stroke="#666" />
                <YAxis stroke="#666" />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="users"
                  stroke="#FF4500"
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* ===================== LIVE FEED (UNCHANGED) ===================== */}
        <Card className="bg-gray-900 border-gray-800 col-span-1">
          <CardHeader className="pb-3">
            <h3 className="text-lg font-semibold">Live Feed</h3>
          </CardHeader>
          <CardContent className="space-y-2">
            {liveFeed.map((item, idx) => (
              <div key={idx} className="flex justify-between text-sm py-1">
                <span className="text-gray-400">{item.user}</span>
                <span className="text-orange-500">{item.exercise}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <p className="text-xs text-gray-500">Last updated: Just now</p>
    </div>
  );
}
