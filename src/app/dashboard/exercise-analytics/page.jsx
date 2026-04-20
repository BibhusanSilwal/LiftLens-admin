"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import {
  ResponsiveContainer,
  ComposedChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  Bar,
  Line,
} from "recharts";

const METRIC_OPTIONS = [
  { label: "Sets", value: "sets" },
  { label: "Volume", value: "volume" },
  { label: "Users", value: "users" },
];

function formatInt(value) {
  const n = Number(value || 0);
  return Number.isFinite(n) ? n.toLocaleString() : "0";
}

function formatDecimal(value, digits = 2) {
  const n = Number(value || 0);
  return Number.isFinite(n) ? n.toFixed(digits) : `0.${"0".repeat(digits)}`;
}

function formatDateTime(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString();
}

function StatusPill({ status }) {
  const isActive = `${status || ""}`.toLowerCase() === "active";
  return (
    <span
      className={`rounded-full px-2 py-1 text-xs font-semibold ${
        isActive
          ? "bg-green-500/20 text-green-400"
          : "bg-yellow-500/20 text-yellow-300"
      }`}
    >
      {status || "unknown"}
    </span>
  );
}

function StatCard({ title, value, sub }) {
  return (
    <div className="rounded-xl border border-[#1f1f1f] bg-[#111] p-4">
      <p className="text-sm text-gray-400">{title}</p>
      <p className="mt-1 text-xl font-bold text-white">{value}</p>
      {sub ? <p className="mt-1 text-xs text-gray-500">{sub}</p> : null}
    </div>
  );
}

export default function ExerciseAnalyticsPage() {
  const [overview, setOverview] = useState(null);
  const [topData, setTopData] = useState(null);
  const [detail, setDetail] = useState(null);
  const [live, setLive] = useState(null);
  const [recommendations, setRecommendations] = useState(null);

  const [topMetric, setTopMetric] = useState("sets");
  const [topLimit] = useState(5);
  const [topOffset, setTopOffset] = useState(0);
  const [selectedExerciseId, setSelectedExerciseId] = useState(null);

  const [loadingOverview, setLoadingOverview] = useState(false);
  const [loadingTop, setLoadingTop] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [loadingLive, setLoadingLive] = useState(false);
  const [loadingRecommendations, setLoadingRecommendations] = useState(false);
  const [error, setError] = useState("");

  const fetchOverview = useCallback(async () => {
    setLoadingOverview(true);
    try {
      const res = await fetch("/api/exercise-analytics?scope=overview", {
        cache: "no-store",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.detail || "Failed to load overview");
      setOverview(data);
    } catch (err) {
      setError(err?.message || "Failed to load overview");
      setOverview(null);
    } finally {
      setLoadingOverview(false);
    }
  }, []);

  const fetchTop = useCallback(async () => {
    setLoadingTop(true);
    try {
      const params = new URLSearchParams({
        scope: "top",
        metric: topMetric,
        limit: String(topLimit),
        offset: String(topOffset),
      });
      const res = await fetch(`/api/exercise-analytics?${params.toString()}`, {
        cache: "no-store",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.detail || "Failed to load top exercises");

      setTopData(data);
      if (!selectedExerciseId && data?.items?.length > 0) {
        setSelectedExerciseId(data.items[0].exercise_id);
      }
    } catch (err) {
      setError(err?.message || "Failed to load top exercises");
      setTopData(null);
    } finally {
      setLoadingTop(false);
    }
  }, [topMetric, topLimit, topOffset, selectedExerciseId]);

  const fetchDetail = useCallback(async () => {
    if (!selectedExerciseId) {
      setDetail(null);
      return;
    }

    setLoadingDetail(true);
    try {
      const params = new URLSearchParams({
        scope: "detail",
        exercise_id: String(selectedExerciseId),
      });
      const res = await fetch(`/api/exercise-analytics?${params.toString()}`, {
        cache: "no-store",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.detail || "Failed to load exercise detail");
      setDetail(data);
    } catch (err) {
      setError(err?.message || "Failed to load exercise detail");
      setDetail(null);
    } finally {
      setLoadingDetail(false);
    }
  }, [selectedExerciseId]);

  const fetchLive = useCallback(async () => {
    setLoadingLive(true);
    try {
      const params = new URLSearchParams({
        scope: "live",
        active_window_minutes: "10",
        limit: "10",
      });
      const res = await fetch(`/api/exercise-analytics?${params.toString()}`, {
        cache: "no-store",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.detail || "Failed to load live activity");
      setLive(data);
    } catch (err) {
      setError(err?.message || "Failed to load live activity");
      setLive(null);
    } finally {
      setLoadingLive(false);
    }
  }, []);

  const fetchRecommendations = useCallback(async () => {
    setLoadingRecommendations(true);
    try {
      const res = await fetch("/api/exercise-analytics?scope=recommendations&limit=8", {
        cache: "no-store",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.detail || "Failed to load recommendations");
      setRecommendations(data);
    } catch (err) {
      setError(err?.message || "Failed to load recommendations");
      setRecommendations(null);
    } finally {
      setLoadingRecommendations(false);
    }
  }, []);

  const refreshAll = useCallback(async () => {
    setError("");
    await Promise.all([
      fetchOverview(),
      fetchTop(),
      fetchDetail(),
      fetchLive(),
      fetchRecommendations(),
    ]);
  }, [fetchOverview, fetchTop, fetchDetail, fetchLive, fetchRecommendations]);

  useEffect(() => {
    setError("");
    fetchOverview();
    fetchLive();
    fetchRecommendations();
  }, [fetchOverview, fetchLive, fetchRecommendations]);

  useEffect(() => {
    fetchTop();
  }, [topMetric, topOffset, fetchTop]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  const trendData = useMemo(() => {
    if (!detail?.trend_30d) return [];
    return detail.trend_30d.map((item) => ({
      day: item.day?.slice(5) || "-",
      set_count: item.set_count || 0,
      volume_kg: item.volume_kg || 0,
    }));
  }, [detail]);

  const hasNext = Boolean(topData?.pagination?.has_next);
  const canGoPrev = topOffset > 0;

  return (
    <div className="min-h-screen space-y-6 bg-black">
      <div className="flex flex-col items-start justify-between gap-3 md:flex-row md:items-center">
        <div>
          <h1 className="text-2xl font-bold text-white">Exercise Analytics</h1>
          <p className="text-sm text-gray-400">Overview, top movements, detail trends, and live activity.</p>
        </div>
        <Button onClick={refreshAll} className="bg-red-600 hover:bg-red-700">
          Refresh
        </Button>
      </div>

      {error ? (
        // <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">
        //   {error}
        // </div>
        <div></div>
      ) : null}

      <Card className="border-[#1c1c1e] bg-black">
        <CardHeader className="text-lg font-semibold text-white">Overview</CardHeader>
        <CardContent>
          {loadingOverview ? (
            <p className="text-gray-400">Loading overview...</p>
          ) : (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
              <StatCard title="Total Sets" value={formatInt(overview?.total_sets)} />
              <StatCard title="Total Sessions" value={formatInt(overview?.total_sessions)} />
              <StatCard
                title="Users With Workouts"
                value={formatInt(overview?.total_users_with_workouts)}
              />
              <StatCard
                title="Most Performed Exercise"
                value={overview?.most_performed_exercise || "-"}
                sub={`${formatInt(overview?.most_performed_count)} sets`}
              />
              <StatCard
                title="Highest Volume Exercise"
                value={overview?.highest_volume_exercise || "-"}
                sub={`${formatDecimal(overview?.highest_volume_kg)} kg`}
              />
              <StatCard
                title="Avg Reps / Set"
                value={formatDecimal(overview?.avg_reps_per_set)}
              />
              <StatCard
                title="Avg Weight / Set"
                value={`${formatDecimal(overview?.avg_weight_per_set)} kg`}
              />
              <StatCard
                title="Avg Duration / Set"
                value={`${formatDecimal(overview?.avg_duration_sec_per_set)} sec`}
              />
              <StatCard title="Last 7d Sets" value={formatInt(overview?.last_7d_sets)} />
              <StatCard title="Prev 7d Sets" value={formatInt(overview?.prev_7d_sets)} />
              <StatCard
                title="7d Growth"
                value={`${formatDecimal(overview?.growth_pct_7d)}%`}
              />
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-[#1c1c1e] bg-black">
        <CardHeader className="text-white">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <p className="text-lg font-semibold">Top Exercises</p>
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-400" htmlFor="metric-select">
                Metric
              </label>
              <select
                id="metric-select"
                value={topMetric}
                onChange={(e) => {
                  setTopOffset(0);
                  setTopMetric(e.target.value);
                }}
                className="rounded border border-[#333] bg-black px-3 py-2 text-sm text-white"
              >
                {METRIC_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loadingTop ? (
            <p className="text-gray-400">Loading top exercises...</p>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-white">
                  <thead>
                    <tr className="border-b border-[#1f1f1f] text-left text-sm text-gray-300">
                      <th className="px-2 py-2">Exercise</th>
                      <th className="px-2 py-2">Type</th>
                      <th className="px-2 py-2">Muscle Group</th>
                      <th className="px-2 py-2">Sets</th>
                      <th className="px-2 py-2">Users</th>
                      <th className="px-2 py-2">Volume (kg)</th>
                      <th className="px-2 py-2">Last Performed</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(topData?.items || []).map((item) => {
                      const isSelected = selectedExerciseId === item.exercise_id;
                      return (
                        <tr
                          key={item.exercise_id}
                          onClick={() => setSelectedExerciseId(item.exercise_id)}
                          className={`cursor-pointer border-b border-[#121212] text-sm transition-colors ${
                            isSelected ? "bg-red-500/10" : "hover:bg-white/5"
                          }`}
                        >
                          <td className="px-2 py-3 font-medium">{item.exercise_name}</td>
                          <td className="px-2 py-3">{item.exercise_type}</td>
                          <td className="px-2 py-3">{item.muscle_group}</td>
                          <td className="px-2 py-3">{formatInt(item.total_sets)}</td>
                          <td className="px-2 py-3">{formatInt(item.unique_users)}</td>
                          <td className="px-2 py-3">{formatDecimal(item.total_volume_kg)}</td>
                          <td className="px-2 py-3">{formatDateTime(item.last_performed_at)}</td>
                        </tr>
                      );
                    })}
                    {!topData?.items?.length ? (
                      <tr>
                        <td colSpan={7} className="px-2 py-4 text-sm text-gray-400">
                          No exercises found.
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>

              <div className="mt-4 flex items-center justify-between">
                <p className="text-sm text-gray-400">
                  Offset {topOffset} / Total {formatInt(topData?.pagination?.total || 0)}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    disabled={!canGoPrev}
                    onClick={() => setTopOffset((prev) => Math.max(0, prev - topLimit))}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="ghost"
                    disabled={!hasNext}
                    onClick={() => setTopOffset((prev) => prev + topLimit)}
                  >
                    Next
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Card className="border-[#1c1c1e] bg-black">
        <CardHeader className="text-lg font-semibold text-white">Selected Exercise Detail</CardHeader>
        <CardContent className="space-y-5">
          {loadingDetail ? <p className="text-gray-400">Loading detail...</p> : null}

          {!loadingDetail && !detail ? (
            <p className="text-gray-400">Choose an exercise from Top Exercises to view details.</p>
          ) : null}

          {detail ? (
            <>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
                <StatCard title="Exercise" value={detail.exercise_name || "-"} sub={detail.exercise_type || "-"} />
                <StatCard title="Total Sets" value={formatInt(detail.total_sets)} />
                <StatCard title="Total Sessions" value={formatInt(detail.total_sessions)} />
                <StatCard title="Unique Users" value={formatInt(detail.unique_users)} />
                <StatCard title="Best Est. 1RM" value={`${formatDecimal(detail.best_estimated_1rm_kg)} kg`} />
              </div>

              <div className="rounded-xl border border-[#1f1f1f] bg-[#111] p-3">
                <p className="mb-3 text-sm font-semibold text-white">30 Day Trend</p>
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={trendData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                      <CartesianGrid stroke="#1f1f1f" />
                      <XAxis dataKey="day" stroke="#9ca3af" />
                      <YAxis yAxisId="left" stroke="#9ca3af" />
                      <YAxis yAxisId="right" orientation="right" stroke="#9ca3af" />
                      <Tooltip />
                      <Legend />
                      <Bar yAxisId="left" dataKey="set_count" fill="#dc2626" name="Set Count" radius={[4, 4, 0, 0]} />
                      <Line yAxisId="right" type="monotone" dataKey="volume_kg" stroke="#f59e0b" strokeWidth={2} name="Volume (kg)" />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="rounded-xl border border-[#1f1f1f] bg-[#111] p-3">
                <p className="mb-3 text-sm font-semibold text-white">Top Users</p>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-white">
                    <thead>
                      <tr className="border-b border-[#1f1f1f] text-left text-gray-300">
                        <th className="px-2 py-2">User</th>
                        <th className="px-2 py-2">Sets</th>
                        <th className="px-2 py-2">Volume (kg)</th>
                        <th className="px-2 py-2">Last Performed</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(detail.top_users || []).map((user) => (
                        <tr key={user.user_id} className="border-b border-[#121212]">
                          <td className="px-2 py-2">{user.user_email}</td>
                          <td className="px-2 py-2">{formatInt(user.total_sets)}</td>
                          <td className="px-2 py-2">{formatDecimal(user.total_volume_kg)}</td>
                          <td className="px-2 py-2">{formatDateTime(user.last_performed_at)}</td>
                        </tr>
                      ))}
                      {!detail.top_users?.length ? (
                        <tr>
                          <td colSpan={4} className="px-2 py-3 text-gray-400">
                            No user data for this exercise.
                          </td>
                        </tr>
                      ) : null}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          ) : null}
        </CardContent>
      </Card>

      <Card className="border-[#1c1c1e] bg-black">
        <CardHeader className="text-lg font-semibold text-white">Live Exercise Activity (10 min window)</CardHeader>
        <CardContent>
          {loadingLive ? (
            <p className="text-gray-400">Loading live activity...</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-white">
                <thead>
                  <tr className="border-b border-[#1f1f1f] text-left text-gray-300">
                    <th className="px-2 py-2">User</th>
                    <th className="px-2 py-2">Exercise</th>
                    <th className="px-2 py-2">Reps</th>
                    <th className="px-2 py-2">Weight</th>
                    <th className="px-2 py-2">Duration (sec)</th>
                    <th className="px-2 py-2">Calories</th>
                    <th className="px-2 py-2">Since Last Set</th>
                    <th className="px-2 py-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {(live?.events || []).map((event, idx) => (
                    <tr key={`${event.session_id}-${idx}`} className="border-b border-[#121212]">
                      <td className="px-2 py-2">{event.user_email}</td>
                      <td className="px-2 py-2">{event.current_exercise_name}</td>
                      <td className="px-2 py-2">{formatInt(event.reps)}</td>
                      <td className="px-2 py-2">
                        {event.weight === null || event.weight === undefined ? "-" : formatDecimal(event.weight)}
                      </td>
                      <td className="px-2 py-2">{formatInt(event.duration_sec)}</td>
                      <td className="px-2 py-2">{formatDecimal(event.calories_burned)}</td>
                      <td className="px-2 py-2">{formatInt(event.seconds_since_last_set)} sec</td>
                      <td className="px-2 py-2">
                        <StatusPill status={event.status} />
                      </td>
                    </tr>
                  ))}
                  {!live?.events?.length ? (
                    <tr>
                      <td colSpan={8} className="px-2 py-3 text-gray-400">
                        No live events currently.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-[#1c1c1e] bg-black">
        <CardHeader className="text-lg font-semibold text-white">Recommended Exercises</CardHeader>
        <CardContent>
          {loadingRecommendations ? (
            <p className="text-gray-400">Loading recommendations...</p>
          ) : (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
              {(recommendations?.exercises || []).map((exercise) => (
                <div key={exercise.id} className="rounded-xl border border-[#1f1f1f] bg-[#111] p-4">
                  <p className="text-base font-semibold text-white">{exercise.name}</p>
                  <p className="mt-1 text-xs text-gray-400">{exercise.description || "No description"}</p>
                  <p className="mt-2 text-xs text-gray-500">
                    {exercise.muscle_group} | {exercise.exercise_type} | {exercise.difficulty}
                  </p>
                </div>
              ))}
              {!recommendations?.exercises?.length ? (
                <p className="text-sm text-gray-400">No recommendations available.</p>
              ) : null}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
