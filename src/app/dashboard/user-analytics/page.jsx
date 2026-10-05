"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { 
  Users, 
  Calendar, 
  Flame, 
  Dumbbell, 
  Apple, 
  Activity, 
  FileText, 
  TrendingUp, 
  Droplet, 
  Layers, 
  Search, 
  UserCheck 
} from "lucide-react";

function formatDate(date = new Date()) {
  return date.toISOString().split("T")[0];
}

function formatReadableDateTime(dateStr) {
  if (!dateStr) return "-";
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) {
      if (dateStr.includes("T")) {
        return dateStr.split("T")[0];
      }
      return dateStr;
    }
    return date.toLocaleString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateStr;
  }
}

function formatReadableDate(dateStr) {
  if (!dateStr) return "-";
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) {
      if (dateStr.includes("T")) {
        return dateStr.split("T")[0];
      }
      return dateStr;
    }
    return date.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

function StatCard({ title, value, icon: Icon, color = "from-orange-500 to-red-600" }) {
  return (
    <div className="bg-[#111] border border-white/5 rounded-2xl p-5 relative overflow-hidden transition-all duration-300 hover:border-orange-500/30 group">
      <div className={`absolute top-0 right-0 w-24 h-24 bg-gradient-to-br ${color} opacity-[0.03] rounded-bl-full transition-all duration-300 group-hover:opacity-10`} />
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">{title}</p>
          <p className="text-2xl font-bold text-white mt-1 group-hover:scale-105 transition-transform duration-300 origin-left">
            {value ?? 0}
          </p>
        </div>
        <div className={`p-3 rounded-xl bg-gradient-to-br ${color} bg-opacity-10 text-orange-500 group-hover:rotate-12 transition-transform duration-300`}>
          {Icon && <Icon className="h-5 w-5 text-white" />}
        </div>
      </div>
    </div>
  );
}

export default function UserAnalyticsPage() {
  const today = useMemo(() => formatDate(), []);

  const [userType, setUserType] = useState(null);
  const [users, setUsers] = useState([]);
  const [usersSearch, setUsersSearch] = useState("");
  const [usersLoading, setUsersLoading] = useState(false);

  const [selectedUser, setSelectedUser] = useState(null);
  const [analyticsType, setAnalyticsType] = useState("overview");
  const [filters, setFilters] = useState({
    from_date: "2026-01-01",
    to_date: today,
    exercise_name: "",
    food_name: "",
    event_type: "workout",
    limit: "20",
    offset: "0",
    timeline_limit: "25",
    timeline_offset: "0",
  });

  const [analytics, setAnalytics] = useState(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [analyticsError, setAnalyticsError] = useState("");

  // Retrieve user role from cookies
  useEffect(() => {
    const getCookieClient = (name) => {
      if (typeof window === 'undefined') return null;
      const value = `; ${document.cookie}`;
      const parts = value.split(`; ${name}=`);
      if (parts.length === 2) return parts.pop().split(';').shift();
      return null;
    };
    setUserType(getCookieClient("user-type"));
  }, []);

  const fetchUsers = async () => {
    setUsersLoading(true);
    try {
      if (userType === 'gym') {
        const res = await fetch('/api/users/gym/members', {
          cache: "no-store",
        });
        if (!res.ok) throw new Error("Failed members fetch");
        const data = await res.json();
        const list = (data || []).map(m => ({
          id: m.user_id,
          email: m.email,
          full_name: m.full_name,
          is_admin: false,
          streak_days: m.streak_days || 0,
        }));
        setUsers(list);
        if (list.length > 0) {
          setSelectedUser(list[0]);
        }
      } else {
        const res = await fetch(`/api/users?page=1&page_size=100`, {
          cache: "no-store",
        });
        if (!res.ok) throw new Error("Failed users fetch");

        const data = await res.json();
        const list = data.users || [];
        setUsers(list);
        if (list.length > 0) {
          setSelectedUser(list[0]);
        }
      }
    } catch (err) {
      console.error(err);
      setUsers([]);
    } finally {
      setUsersLoading(false);
    }
  };

  const fetchAnalytics = async () => {
    if (!selectedUser?.id) {
      setAnalytics(null);
      return;
    }

    setAnalyticsLoading(true);
    setAnalyticsError("");

    try {
      const params = new URLSearchParams({
        user_id: `${selectedUser.id}`,
        type: analyticsType,
        from_date: filters.from_date,
        to_date: filters.to_date,
      });

      if (analyticsType === "overview") {
        params.set("timeline_limit", filters.timeline_limit);
        params.set("timeline_offset", filters.timeline_offset);
        if (filters.event_type) params.set("event_type", filters.event_type);
      }

      if (analyticsType === "workout-history") {
        params.set("limit", filters.limit);
        params.set("offset", filters.offset);
        if (filters.exercise_name) params.set("exercise_name", filters.exercise_name);
      }

      if (analyticsType === "food-history") {
        params.set("limit", "15");
        params.set("offset", filters.offset);
        if (filters.food_name) params.set("food_name", filters.food_name);
      }

      const res = await fetch(`/api/user-analytics?${params.toString()}`, {
        cache: "no-store",
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.detail || "Failed analytics fetch");

      setAnalytics(data);
    } catch (error) {
      setAnalytics(null);
      setAnalyticsError(error?.message || "Failed to fetch analytics");
    } finally {
      setAnalyticsLoading(false);
    }
  };

  useEffect(() => {
    if (userType !== null) {
      fetchUsers();
    }
  }, [userType]);

  useEffect(() => {
    fetchAnalytics();
  }, [selectedUser?.id, analyticsType]);

  const applyFilters = (e) => {
    e.preventDefault();
    fetchAnalytics();
  };

  const filteredUsers = users.filter((u) => {
    const q = usersSearch.toLowerCase();
    if (u.full_name === "Deleted User") return false;
    return (
      (u.email || "").toLowerCase().includes(q) ||
      (u.full_name || "").toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6 bg-black min-h-screen text-white p-2 md:p-4">
      {/* Title */}
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-orange-400 via-red-500 to-pink-500 bg-clip-text text-transparent">
          User Analytics
        </h1>
        <p className="text-gray-400 text-sm mt-1">
          Detailed metrics, workout histories, and nutritional trends for gym members.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: User Directory Selector */}
        <div className="lg:col-span-1 space-y-4">
          <Card className="bg-[#0f0f11] border-white/5 rounded-2xl overflow-hidden shadow-xl">
            <CardHeader className="border-b border-white/5 pb-4 px-4">
              <div className="flex items-center justify-between">
                <span className="text-md font-bold flex items-center gap-2">
                  <Users className="h-4 w-4 text-orange-500" />
                  Directory ({filteredUsers.length})
                </span>
                {usersLoading && <span className="text-xs text-orange-500 animate-pulse">Loading...</span>}
              </div>
              <div className="relative mt-3">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                <input
                  type="text"
                  placeholder="Search by name or email..."
                  value={usersSearch}
                  onChange={(e) => setUsersSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 text-sm bg-[#18181b] border border-white/5 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-orange-500/50 transition-colors"
                />
              </div>
            </CardHeader>

            <CardContent className="p-2 max-h-[600px] overflow-y-auto no-scrollbar space-y-1">
              {filteredUsers.length === 0 && !usersLoading && (
                <div className="text-center py-8 text-gray-500 text-sm">
                  No members found
                </div>
              )}
              {filteredUsers.map((u) => {
                const isSelected = selectedUser?.id === u.id;
                return (
                  <button
                    key={u.id}
                    onClick={() => {
                      setSelectedUser(u);
                      setAnalytics(null);
                    }}
                    className={`w-full text-left p-3 rounded-xl flex items-center justify-between transition-all duration-200 group ${
                      isSelected
                        ? "bg-gradient-to-r from-orange-500/20 to-red-500/10 border border-orange-500/30 text-white"
                        : "border border-transparent hover:bg-white/5 text-gray-400 hover:text-white"
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <p className={`font-semibold text-sm truncate ${isSelected ? "text-orange-400" : "text-white"}`}>
                        {u.full_name || "Anonymous Member"}
                      </p>
                      <p className="text-xs text-gray-500 truncate mt-0.5">{u.email}</p>
                    </div>
                    <div className="flex items-center gap-2 pl-2">
                      {u.streak_days > 0 && (
                        <span className="flex items-center gap-0.5 text-xs text-orange-500 font-semibold bg-orange-500/10 px-1.5 py-0.5 rounded-full">
                          <Flame className="h-3 w-3 fill-orange-500" />
                          {u.streak_days}
                        </span>
                      )}
                      <UserCheck className={`h-4 w-4 transition-transform duration-300 ${isSelected ? "scale-110 text-orange-400" : "opacity-0 group-hover:opacity-100 text-gray-500"}`} />
                    </div>
                  </button>
                );
              })}
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Analytics Display */}
        <div className="lg:col-span-2 space-y-6">
          {selectedUser ? (
            <>
              {/* Selected User Header Banner */}
              <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#1c1917] to-[#0f0f11] border border-white/5 p-6 shadow-xl">
                <div className="absolute top-0 right-0 w-64 h-64 bg-orange-600/10 rounded-full blur-3xl -z-10" />
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-gradient-to-br from-orange-500 to-red-600 rounded-2xl flex items-center justify-center font-bold text-xl text-white shadow-lg shadow-orange-500/20">
                      {(selectedUser.full_name || selectedUser.email || "U").charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-white">
                        {selectedUser.full_name || "Gym Member"}
                      </h2>
                      <p className="text-sm text-gray-400">{selectedUser.email}</p>
                    </div>
                  </div>

                  {/* Dynamic Tab Bar Selector */}
                  <div className="bg-[#18181b] p-1 rounded-xl flex border border-white/5 self-start sm:self-auto">
                    {[
                      { id: "overview", label: "Overview", icon: Activity },
                      { id: "workout-history", label: "Workouts", icon: Dumbbell },
                      { id: "food-history", label: "Nutrition", icon: Apple },
                    ].map((tab) => {
                      const Icon = tab.icon;
                      const isSelected = analyticsType === tab.id;
                      return (
                        <button
                          key={tab.id}
                          onClick={() => setAnalyticsType(tab.id)}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 ${
                            isSelected
                              ? "bg-gradient-to-r from-orange-500 to-red-600 text-white shadow-md"
                              : "text-gray-400 hover:text-white"
                          }`}
                        >
                          <Icon className="h-3.5 w-3.5" />
                          {tab.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Filters Row */}
                <form
                  onSubmit={applyFilters}
                  className="mt-6 pt-5 border-t border-white/5 grid grid-cols-1 sm:grid-cols-3 gap-3"
                >
                  <div className="flex flex-col gap-1">
                    <label className="text-xs text-gray-400">From Date</label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-500" />
                      <input
                        type="date"
                        value={filters.from_date}
                        onChange={(e) => setFilters((p) => ({ ...p, from_date: e.target.value }))}
                        className="w-full bg-[#18181b] border border-white/5 rounded-xl pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:border-orange-500/50"
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-xs text-gray-400">To Date</label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-500" />
                      <input
                        type="date"
                        value={filters.to_date}
                        onChange={(e) => setFilters((p) => ({ ...p, to_date: e.target.value }))}
                        className="w-full bg-[#18181b] border border-white/5 rounded-xl pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:border-orange-500/50"
                      />
                    </div>
                  </div>

                  <div className="flex items-end">
                    <Button
                      type="submit"
                      disabled={analyticsLoading}
                      className="w-full bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white font-bold py-2 rounded-xl text-xs transition-all shadow-lg shadow-orange-500/10"
                    >
                      {analyticsLoading ? "Applying..." : "Filter Results"}
                    </Button>
                  </div>
                </form>
              </div>

              {/* Error messages */}
              {analyticsError && (
                <div className="bg-red-950/30 border border-red-500/30 text-red-200 p-4 rounded-2xl text-sm">
                  {analyticsError}
                </div>
              )}

              {/* LOADING STATE */}
              {analyticsLoading && (
                <div className="text-center py-20">
                  <div className="inline-block w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
                  <p className="text-gray-400 text-sm mt-3 animate-pulse">Gathering analytics details...</p>
                </div>
              )}

              {/* OVERVIEW CONTENT */}
              {!analyticsLoading && analyticsType === "overview" && analytics && (
                <div className="space-y-6">
                  {/* Stats Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <StatCard title="Total Workouts" value={analytics.workouts_count} icon={Dumbbell} color="from-orange-500 to-red-600" />
                    <StatCard title="Total Sets" value={analytics.sets_count} icon={Layers} color="from-yellow-500 to-orange-600" />
                    <StatCard title="Nutrition Logs" value={analytics.food_logs_count} icon={Apple} color="from-green-500 to-emerald-600" />
                    <StatCard title="Active Days" value={analytics.timeline_total} icon={TrendingUp} color="from-blue-500 to-indigo-600" />
                  </div>

                  {/* Favorites Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-[#0f0f11] border border-white/5 rounded-2xl p-5">
                      <h3 className="text-sm font-bold text-gray-400 mb-3 uppercase tracking-wider flex items-center gap-1.5">
                        <Flame className="h-4 w-4 text-orange-500" />
                        Workout Insights
                      </h3>
                      <div className="space-y-3">
                        <div>
                          <p className="text-xs text-gray-500">Favorite Movement</p>
                          <p className="text-md font-semibold text-white mt-0.5">
                            {analytics.favorite_exercise || "No workouts logged"}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Last Session Registered</p>
                          <p className="text-md font-semibold text-white mt-0.5">
                            {formatReadableDateTime(analytics.last_workout_at)}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-[#0f0f11] border border-white/5 rounded-2xl p-5">
                      <h3 className="text-sm font-bold text-gray-400 mb-3 uppercase tracking-wider flex items-center gap-1.5">
                        <Apple className="h-4 w-4 text-green-500" />
                        Nutrition Insights
                      </h3>
                      <div className="space-y-3">
                        <div>
                          <p className="text-xs text-gray-500">Favorite Ingredient</p>
                          <p className="text-md font-semibold text-white mt-0.5">
                            {analytics.favorite_food || "No food logged"}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Last Meal Log Date</p>
                          <p className="text-md font-semibold text-white mt-0.5">
                            {formatReadableDate(analytics.last_food_log_date)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Timeline */}
                  <div className="bg-[#0f0f11] border border-white/5 rounded-2xl p-5">
                    <h3 className="text-md font-bold text-white mb-4 flex items-center gap-2">
                      <Activity className="h-4 w-4 text-orange-500" />
                      Activity Timeline
                    </h3>
                    {(!analytics.timeline || analytics.timeline.length === 0) ? (
                      <p className="text-sm text-gray-500 text-center py-6">No recent events logged</p>
                    ) : (
                      <div className="relative pl-6 border-l border-white/10 space-y-6">
                        {analytics.timeline.map((item, index) => (
                          <div key={index} className="relative">
                            <span className="absolute -left-[31px] top-1 w-4 h-4 bg-orange-600 border-4 border-black rounded-full" />
                            <div>
                              <p className="text-sm font-semibold text-white">{item.title}</p>
                              <p className="text-xs text-gray-400 mt-0.5">{item.details}</p>
                              <div className="flex items-center gap-2 mt-2">
                                <span className="text-[10px] text-gray-500 bg-white/5 px-2 py-0.5 rounded">
                                  {formatReadableDateTime(item.date)}
                                </span>
                                <span className={`text-[10px] px-2 py-0.5 rounded font-medium ${
                                  item.event_type === 'workout' ? 'bg-orange-500/10 text-orange-400' : 'bg-green-500/10 text-green-400'
                                }`}>
                                  {item.event_type}
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* WORKOUT HISTORY CONTENT */}
              {!analyticsLoading && analyticsType === "workout-history" && analytics && (
                <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
                  {/* Workout Graphics Sidebar */}
                  <div className="md:col-span-2 space-y-4">
                    <div className="bg-[#0f0f11] border border-white/5 rounded-2xl overflow-hidden p-4 relative group">
                      <img 
                        src="/workout_illustration.png" 
                        alt="Workout Illustration" 
                        className="w-full h-auto rounded-xl object-cover border border-white/5 shadow-lg group-hover:scale-[1.02] transition-transform duration-500"
                      />
                      <div className="mt-4">
                        <h4 className="text-md font-bold text-white">Workout Tracking</h4>
                        <p className="text-xs text-gray-400 mt-1">
                          Log routines, sets, and rep weights to calculate dynamic 1RM stats.
                        </p>
                      </div>
                    </div>

                    <div className="bg-[#0f0f11] border border-white/5 rounded-2xl p-5 space-y-4">
                      <div>
                        <span className="text-xs text-gray-500">Total Logged Sessions</span>
                        <h4 className="text-2xl font-bold text-orange-500 mt-1">
                          {analytics.total_sessions}
                        </h4>
                      </div>
                      <div>
                        <span className="text-xs text-gray-500 font-medium">Logged Movements</span>
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {(analytics.current_exercises || []).length === 0 ? (
                            <span className="text-xs text-gray-500">—</span>
                          ) : (
                            analytics.current_exercises.map((ex, i) => (
                              <span key={i} className="text-[10px] font-semibold bg-white/5 text-gray-300 px-2.5 py-1 rounded-full border border-white/5">
                                {ex}
                              </span>
                            ))
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Workout Logs List */}
                  <div className="md:col-span-3 space-y-4 max-h-[800px] overflow-y-auto no-scrollbar">
                    {(!analytics.sessions || analytics.sessions.length === 0) ? (
                      <div className="bg-[#0f0f11] border border-white/5 rounded-2xl p-8 text-center text-gray-500 text-sm">
                        No sessions logged in this timeframe.
                      </div>
                    ) : (
                      analytics.sessions.map((session) => (
                        <div 
                          key={session.session_id} 
                          className="bg-[#0f0f11] border border-white/5 hover:border-orange-500/20 rounded-2xl p-5 transition-all duration-300"
                        >
                          <div className="flex items-center justify-between border-b border-white/5 pb-3 mb-3">
                            <div>
                              <p className="text-sm font-extrabold text-white">Session #{session.session_id}</p>
                              <p className="text-xs text-gray-400 mt-0.5">{formatReadableDate(session.date)}</p>
                            </div>
                            <span className="text-xs font-semibold bg-orange-500/10 text-orange-400 px-2.5 py-1 rounded-full border border-orange-500/20">
                              {session.total_sets} Sets
                            </span>
                          </div>

                          <div className="grid grid-cols-2 gap-3 text-xs text-gray-400 mb-4 bg-white/5 p-3 rounded-xl">
                            <div>
                              <span className="block text-[10px] text-gray-500 uppercase">Volume</span>
                              <span className="font-semibold text-white">{session.session_volume_kg} kg</span>
                            </div>
                            <div>
                              <span className="block text-[10px] text-gray-500 uppercase">Duration</span>
                              <span className="font-semibold text-white">{session.session_duration_min} mins</span>
                            </div>
                          </div>

                          {session.notes && (
                            <p className="text-xs text-gray-300 italic mb-4 bg-[#18181b] border-l-2 border-orange-500 p-2 rounded-r-lg">
                              Note: {session.notes}
                            </p>
                          )}

                          <div className="space-y-2">
                            <span className="block text-[10px] text-gray-500 uppercase tracking-wider font-semibold">Repetition Detail</span>
                            {(session.sets || []).map((setItem) => (
                              <div key={setItem.set_id} className="flex items-center justify-between text-xs py-1.5 border-b border-white/5 last:border-b-0 text-gray-300">
                                <span className="font-medium text-white">{setItem.exercise_name}</span>
                                <span>
                                  {setItem.reps} reps @ <strong className="text-white">{setItem.weight}kg</strong> (1RM: {setItem.estimated_1rm_kg}kg)
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* NUTRITION logs CONTENT */}
              {!analyticsLoading && analyticsType === "food-history" && analytics && (
                <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
                  {/* Nutrition Graphics Sidebar */}
                  <div className="md:col-span-2 space-y-4">
                    <div className="bg-[#0f0f11] border border-white/5 rounded-2xl overflow-hidden p-4 relative group">
                      <img 
                        src="/nutrition_illustration.png" 
                        alt="Nutrition Illustration" 
                        className="w-full h-auto rounded-xl object-cover border border-white/5 shadow-lg group-hover:scale-[1.02] transition-transform duration-500"
                      />
                      <div className="mt-4">
                        <h4 className="text-md font-bold text-white">Macro Monitoring</h4>
                        <p className="text-xs text-gray-400 mt-1">
                          Keep calories, protein, carbs, fats, and water intake within custom goals.
                        </p>
                      </div>
                    </div>

                    <div className="bg-[#0f0f11] border border-white/5 rounded-2xl p-5">
                      <span className="text-xs text-gray-500">Nutrition Records</span>
                      <h4 className="text-2xl font-bold text-green-500 mt-1">
                        {analytics.total_logs} logged days
                      </h4>
                    </div>
                  </div>

                  {/* Nutrition Logs List */}
                  <div className="md:col-span-3 space-y-4 max-h-[800px] overflow-y-auto no-scrollbar">
                    {(!analytics.logs || analytics.logs.length === 0) ? (
                      <div className="bg-[#0f0f11] border border-white/5 rounded-2xl p-8 text-center text-gray-500 text-sm">
                        No food logged in this timeframe.
                      </div>
                    ) : (
                      analytics.logs.map((log, index) => (
                        <div 
                          key={index} 
                          className="bg-[#0f0f11] border border-white/5 hover:border-green-500/20 rounded-2xl p-5 transition-all duration-300"
                        >
                          <div className="flex items-center justify-between border-b border-white/5 pb-3 mb-4">
                            <span className="text-sm font-extrabold text-white">{formatReadableDate(log.date)}</span>
                            {log.water_intake > 0 && (
                              <span className="flex items-center gap-1 text-xs text-blue-400 font-semibold bg-blue-500/10 px-2.5 py-1 rounded-full border border-blue-500/20">
                                <Droplet className="h-3.5 w-3.5 fill-blue-500" />
                                {log.water_intake}L Water
                              </span>
                            )}
                          </div>

                          {/* Nutrition Circular Stats */}
                          <div className="grid grid-cols-4 gap-2 text-center mb-4">
                            <div className="bg-white/5 p-2 rounded-xl">
                              <span className="block text-[9px] text-gray-500">Calories</span>
                              <span className="text-sm font-bold text-white">{log.total_calories} kcal</span>
                            </div>
                            <div className="bg-white/5 p-2 rounded-xl">
                              <span className="block text-[9px] text-gray-500">Protein</span>
                              <span className="text-sm font-bold text-green-400">{log.total_protein}g</span>
                            </div>
                            <div className="bg-white/5 p-2 rounded-xl">
                              <span className="block text-[9px] text-gray-500">Carbs</span>
                              <span className="text-sm font-bold text-yellow-400">{log.total_carbs}g</span>
                            </div>
                            <div className="bg-white/5 p-2 rounded-xl">
                              <span className="block text-[9px] text-gray-500">Fats</span>
                              <span className="text-sm font-bold text-red-400">{log.total_fats}g</span>
                            </div>
                          </div>

                          {/* Meals detail */}
                          <div className="space-y-3 mt-3">
                            {(log.meals || []).map((meal, mealIndex) => (
                              <div key={mealIndex} className="bg-black/40 border border-white/5 rounded-xl p-3">
                                <span className="block text-xs font-bold text-green-400 mb-2 uppercase tracking-wide">
                                  {meal.meal_name}
                                </span>
                                <ul className="space-y-1.5">
                                  {(meal.entries || []).map((entry, entryIndex) => (
                                    <li key={entryIndex} className="flex justify-between text-xs text-gray-300">
                                      <span>{entry.food_name} <span className="text-gray-500">({entry.quantity_g}g)</span></span>
                                      <span className="font-semibold text-white">{entry.calories} kcal</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="bg-[#0f0f11] border border-white/5 rounded-2xl p-16 text-center shadow-xl">
              <Users className="h-10 w-10 text-gray-600 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-white">No Member Selected</h3>
              <p className="text-gray-500 text-sm mt-1">
                Please select a gym member from the directory list on the left to review their logs and analytics.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
