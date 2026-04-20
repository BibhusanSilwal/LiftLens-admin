"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader } from "../../components/ui/Card";
import { Users, Flame, UserCheck, UserX } from "lucide-react";
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

const GRANULARITY_OPTIONS = [
  { label: "Day", value: "day" },
  { label: "Week", value: "week" },
  { label: "Month", value: "month" },
];

const RANGE_OPTIONS = [
  { label: "30D", value: "30" },
  { label: "90D", value: "90" },
  { label: "365D", value: "365" },
];

export default function DashboardOverview() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [growthData, setGrowthData] = useState([]);
  const [growthLoading, setGrowthLoading] = useState(true);
  const [growthGranularity, setGrowthGranularity] = useState("day");
  const [growthDays, setGrowthDays] = useState("30");
  const [growthMeta, setGrowthMeta] = useState({
    rangeStart: "",
    rangeEnd: "",
    totalNewUsers: 0,
    currentTotalUsers: 0,
  });

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

  useEffect(() => {
    const fetchGrowthChart = async () => {
      setGrowthLoading(true);
      try {
        const params = new URLSearchParams({
          days: growthDays,
          granularity: growthGranularity,
        });

        const res = await fetch(`/api/users/growth-chart?${params.toString()}`, {
          cache: "no-store",
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data?.detail || "Failed to fetch growth chart");
        }

        const data = await res.json();
        const points = Array.isArray(data?.points) ? data.points : [];

        setGrowthData(
          points.map((point) => ({
            period:
              growthGranularity === "day"
                ? point.period_start?.slice(5) || "-"
                : point.period_start || "-",
            newUsers: Number(point.new_users || 0),
            cumulativeUsers: Number(point.cumulative_users || 0),
          }))
        );

        setGrowthMeta({
          rangeStart: data?.range_start || "",
          rangeEnd: data?.range_end || "",
          totalNewUsers: Number(data?.total_new_users || 0),
          currentTotalUsers: Number(data?.current_total_users || 0),
        });
      } catch (err) {
        console.error("Dashboard growth chart error:", err);
        setGrowthData([]);
        setGrowthMeta({
          rangeStart: "",
          rangeEnd: "",
          totalNewUsers: 0,
          currentTotalUsers: 0,
        });
      } finally {
        setGrowthLoading(false);
      }
    };

    fetchGrowthChart();
  }, [growthDays, growthGranularity]);

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

      {/* ===================== USER GROWTH ===================== */}
      <div className="grid grid-cols-1 gap-6">
        <Card className="bg-gray-900 border-gray-800 col-span-1">
          <CardHeader className="pb-3">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <h3 className="text-lg font-semibold">User Growth Chart</h3>
              <div className="flex items-center gap-2">
                <select
                  value={growthGranularity}
                  onChange={(e) => setGrowthGranularity(e.target.value)}
                  className="rounded-md border border-gray-700 bg-black px-2 py-1 text-sm text-white"
                >
                  {GRANULARITY_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <select
                  value={growthDays}
                  onChange={(e) => setGrowthDays(e.target.value)}
                  className="rounded-md border border-gray-700 bg-black px-2 py-1 text-sm text-white"
                >
                  {RANGE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="mb-3 grid grid-cols-2 gap-3">
              <div className="rounded-lg border border-gray-800 bg-black p-3">
                <p className="text-xs text-gray-400">New Users In Range</p>
                <p className="text-lg font-bold text-white">{growthMeta.totalNewUsers}</p>
              </div>
              <div className="rounded-lg border border-gray-800 bg-black p-3">
                <p className="text-xs text-gray-400">Current Total Users</p>
                <p className="text-lg font-bold text-white">{growthMeta.currentTotalUsers}</p>
              </div>
            </div>

            <p className="mb-2 text-xs text-gray-500">
              {growthMeta.rangeStart && growthMeta.rangeEnd
                ? `Range: ${growthMeta.rangeStart} to ${growthMeta.rangeEnd}`
                : "Range: -"}
            </p>

            <div className="h-64">
              {growthLoading ? (
                <p className="pt-10 text-center text-gray-400">Loading growth chart...</p>
              ) : growthData.length === 0 ? (
                <p className="pt-10 text-center text-gray-400">No growth data available.</p>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={growthData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                    <XAxis dataKey="period" stroke="#666" minTickGap={20} />
                    <YAxis yAxisId="left" stroke="#666" />
                    <YAxis yAxisId="right" orientation="right" stroke="#888" />
                    <Tooltip />
                    <Legend />
                    <Bar yAxisId="left" dataKey="newUsers" name="New Users" fill="#f97316" radius={[4, 4, 0, 0]} />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="cumulativeUsers"
                      name="Cumulative Users"
                      stroke="#22c55e"
                      strokeWidth={2}
                      dot={false}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>

      </div>

      <p className="text-xs text-gray-500">Last updated: Just now</p>
    </div>
  );
}
