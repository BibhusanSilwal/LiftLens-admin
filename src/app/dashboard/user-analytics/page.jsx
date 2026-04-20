"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

function formatDate(date = new Date()) {
  return date.toISOString().split("T")[0];
}

function StatCard({ title, value }) {
  return (
    <div className="bg-[#111] border border-[#1f1f1f] rounded-xl p-4">
      <p className="text-sm text-gray-400">{title}</p>
      <p className="text-xl font-bold text-white">{value ?? 0}</p>
    </div>
  );
}

export default function UserAnalyticsPage() {
  const today = useMemo(() => formatDate(), []);

  const [users, setUsers] = useState([]);
  const [usersPage, setUsersPage] = useState(1);
  const [usersTotal, setUsersTotal] = useState(0);
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

  const totalUserPages = Math.max(1, Math.ceil((usersTotal || 0) / 10));

  const fetchUsers = async () => {
    setUsersLoading(true);
    try {
      const res = await fetch(`/api/users?page=${usersPage}&page_size=10`, {
        cache: "no-store",
      });
      if (!res.ok) throw new Error("Failed users fetch");

      const data = await res.json();
      const list = data.users || [];
      setUsers(list);
      setUsersTotal(data.total || 0);

      if (!selectedUser && list.length > 0) {
        setSelectedUser(list[0]);
      }
    } catch {
      setUsers([]);
      setUsersTotal(0);
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
    fetchUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [usersPage]);

  useEffect(() => {
    fetchAnalytics();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedUser?.id, analyticsType]);

  const applyFilters = (e) => {
    e.preventDefault();
    fetchAnalytics();
  };

  return (
    <div className="space-y-6 bg-black min-h-screen p-4">
      <h1 className="text-2xl font-bold text-white">User Analytics</h1>

      <Card className="bg-black border-[#1c1c1e]">
        <CardHeader className="text-lg font-semibold text-white">Users</CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-white">
              <thead>
                <tr className="text-left border-b border-[#1f1f1f]">
                  <th className="py-2 pr-4">Email</th>
                  <th className="py-2 pr-4">Name</th>
                  <th className="py-2 pr-4">Admin</th>
                  <th className="py-2 pr-4">Action</th>
                </tr>
              </thead>
              <tbody>
                {!usersLoading && users.length === 0 && (
                  <tr>
                    <td className="py-3 text-gray-400" colSpan={4}>
                      No users found
                    </td>
                  </tr>
                )}

                {users.map((user) => {
                  const isSelected = selectedUser?.id === user.id;
                  return (
                    <tr key={user.id} className="border-b border-[#121212]">
                      <td className="py-3 pr-4">{user.email}</td>
                      <td className="py-3 pr-4">{user.full_name || "-"}</td>
                      <td className="py-3 pr-4">{user.is_admin ? "Yes" : "No"}</td>
                      <td className="py-3 pr-4">
                        <Button
                          type="button"
                          className={isSelected ? "bg-red-700 hover:bg-red-700" : "bg-red-600 hover:bg-red-700"}
                          onClick={() => setSelectedUser(user)}
                        >
                          {isSelected ? "Selected" : "View Analytics"}
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex items-center justify-between">
            <p className="text-sm text-gray-400">
              Page {usersPage} of {totalUserPages}
            </p>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="ghost"
                disabled={usersPage <= 1}
                onClick={() => setUsersPage((prev) => Math.max(1, prev - 1))}
              >
                Previous
              </Button>
              <Button
                type="button"
                variant="ghost"
                disabled={usersPage >= totalUserPages}
                onClick={() => setUsersPage((prev) => Math.min(totalUserPages, prev + 1))}
              >
                Next
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-black border-[#1c1c1e]">
        <CardHeader className="text-white">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-lg font-semibold">Analytics Details</p>
              <p className="text-sm text-gray-400">
                {selectedUser ? `Selected: ${selectedUser.email}` : "Select a user to view analytics"}
              </p>
            </div>
            <select
              value={analyticsType}
              onChange={(e) => setAnalyticsType(e.target.value)}
              className="bg-black border border-[#333] px-3 py-2 rounded text-white"
            >
              <option value="overview">overview</option>
              <option value="workout-history">workout-history</option>
              <option value="food-history">food-history</option>
            </select>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          <form
            onSubmit={applyFilters}
            className="grid grid-cols-1 md:grid-cols-6 gap-3 bg-[#111] border border-[#1f1f1f] rounded-xl p-4"
          >
            <input
              type="date"
              value={filters.from_date}
              onChange={(e) => setFilters((prev) => ({ ...prev, from_date: e.target.value }))}
              className="bg-black border border-[#333] px-3 py-2 rounded text-white"
            />
            <input
              type="date"
              value={filters.to_date}
              onChange={(e) => setFilters((prev) => ({ ...prev, to_date: e.target.value }))}
              className="bg-black border border-[#333] px-3 py-2 rounded text-white"
            />

            {analyticsType === "workout-history" && (
              <input
                placeholder="Exercise name"
                value={filters.exercise_name}
                onChange={(e) => setFilters((prev) => ({ ...prev, exercise_name: e.target.value }))}
                className="bg-black border border-[#333] px-3 py-2 rounded text-white"
              />
            )}

            {analyticsType === "food-history" && (
              <input
                placeholder="Food name"
                value={filters.food_name}
                onChange={(e) => setFilters((prev) => ({ ...prev, food_name: e.target.value }))}
                className="bg-black border border-[#333] px-3 py-2 rounded text-white"
              />
            )}

            {analyticsType === "overview" && (
              <select
                value={filters.event_type}
                onChange={(e) => setFilters((prev) => ({ ...prev, event_type: e.target.value }))}
                className="bg-black border border-[#333] px-3 py-2 rounded text-white"
              >
                <option value="workout">workout</option>
                <option value="food">food</option>
              </select>
            )}

            <button
              type="submit"
              className="md:col-span-2 bg-red-600 hover:bg-red-700 rounded px-4 py-2 font-medium text-white"
              disabled={!selectedUser || analyticsLoading}
            >
              {analyticsLoading ? "Loading..." : "Apply Filters"}
            </button>
          </form>

          {analyticsError && (
            <div className="bg-[#1a0000] border border-red-700 rounded p-4 text-red-200">
              Failed to load analytics: {analyticsError}
            </div>
          )}

          {!selectedUser && (
            <div className="text-gray-400">Select a user from the table above to see analytics.</div>
          )}

          {selectedUser && !analyticsError && analyticsType === "overview" && analytics && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <StatCard title="Workouts" value={analytics.workouts_count} />
                <StatCard title="Sets" value={analytics.sets_count} />
                <StatCard title="Food Logs" value={analytics.food_logs_count} />
                <StatCard title="Timeline Total" value={analytics.timeline_total} />
              </div>

              <div className="bg-[#111] border border-[#1f1f1f] rounded-xl p-4 text-white">
                <p>Favorite Exercise: {analytics.favorite_exercise || "-"}</p>
                <p>Favorite Food: {analytics.favorite_food || "-"}</p>
                <p>Last Workout: {analytics.last_workout_at || "-"}</p>
                <p>Last Food Log Date: {analytics.last_food_log_date || "-"}</p>
              </div>

              <div className="bg-[#111] border border-[#1f1f1f] rounded-xl p-4">
                <h2 className="font-semibold text-white mb-2">Timeline</h2>
                <ul className="space-y-2">
                  {(analytics.timeline || []).map((item, index) => (
                    <li key={index} className="border border-[#2a2a2a] rounded p-3 text-white">
                      <p className="font-medium">{item.title}</p>
                      <p className="text-sm text-gray-300">{item.details}</p>
                      <p className="text-xs text-gray-400">
                        {item.date}   {item.event_type}
                      </p>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {selectedUser && !analyticsError && analyticsType === "workout-history" && analytics && (
            <div className="space-y-3">
              <div className="bg-[#111] border border-[#1f1f1f] rounded-xl p-4 text-white">
                <p>Total Sessions: {analytics.total_sessions}</p>
                <p>Returned Sessions: {analytics.returned_sessions}</p>
                <p>Current Exercises: {(analytics.current_exercises || []).join(", ") || "-"}</p>
              </div>

              {(analytics.sessions || []).map((session) => (
                <div key={session.session_id} className="bg-[#111] border border-[#1f1f1f] rounded-xl p-4 text-white">
                  <p className="font-semibold">Session #{session.session_id}</p>
                  <p className="text-sm text-gray-300">{session.date}</p>
                  <p className="text-sm">Notes: {session.notes || "-"}</p>
                  <p className="text-sm">
                    Sets: {session.total_sets}  Volume: {session.session_volume_kg} kg   Duration: {session.session_duration_min} min
                  </p>

                  <ul className="mt-2 space-y-1">
                    {(session.sets || []).map((setItem) => (
                      <li key={setItem.set_id} className="text-sm text-gray-300">
                        {setItem.exercise_name} - {setItem.reps} reps @ {setItem.weight}kg (1RM: {setItem.estimated_1rm_kg}kg)
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}

          {selectedUser && !analyticsError && analyticsType === "food-history" && analytics && (
            <div className="space-y-3">
              <div className="bg-[#111] border border-[#1f1f1f] rounded-xl p-4 text-white">
                <p>Total Logs: {analytics.total_logs}</p>
                <p>Returned Logs: {analytics.returned_logs}</p>
              </div>

              {(analytics.logs || []).map((log, index) => (
                <div key={index} className="bg-[#111] border border-[#1f1f1f] rounded-xl p-4 text-white">
                  <p className="font-semibold">{log.date}</p>
                  <p className="text-sm">
                    Water: {log.water_intake}L  Calories: {log.total_calories}
                  </p>
                  <p className="text-sm">
                    P: {log.total_protein}  C: {log.total_carbs}   F: {log.total_fats}
                  </p>

                  {(log.meals || []).map((meal, mealIndex) => (
                    <div key={mealIndex} className="mt-2 border border-[#2a2a2a] rounded p-2">
                      <p className="text-sm font-medium">{meal.meal_name}</p>
                      <ul className="text-sm text-gray-300">
                        {(meal.entries || []).map((entry, entryIndex) => (
                          <li key={entryIndex}>
                            {entry.food_name} ({entry.quantity_g}g) - {entry.calories} kcal
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
