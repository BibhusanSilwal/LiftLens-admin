"use client";

import { useEffect, useMemo, useState } from "react";
import { Bell, Plus, Send, Trash2, Search, Users, UserCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function emptyMetadataRow() {
  return { key: "", value: "" };
}

function normalizeNotifications(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.results)) return payload.results;
  if (Array.isArray(payload?.notifications)) return payload.notifications;
  return [];
}

function formatDate(dateValue) {
  if (!dateValue) return "Unknown time";
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return "Unknown time";
  return date.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function NotificationsPage() {
  const [userId, setUserId] = useState("");
  const [selectedUserName, setSelectedUserName] = useState("All Users (Broadcast)");
  
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [sendPush, setSendPush] = useState(false);
  const [dataRows, setDataRows] = useState([emptyMetadataRow()]);
  const [sending, setSending] = useState(false);
  const [recentNotifications, setRecentNotifications] = useState([]);
  const [recentLoading, setRecentLoading] = useState(true);
  const [recentError, setRecentError] = useState("");

  const [userType, setUserType] = useState(null);
  const [users, setUsers] = useState([]);
  const [usersSearch, setUsersSearch] = useState("");
  const [usersLoading, setUsersLoading] = useState(false);

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
        if (!res.ok) throw new Error();
        const data = await res.json();
        const list = (data || []).map(m => ({
          id: m.user_id,
          email: m.email,
          full_name: m.full_name,
        }));
        setUsers(list);
      } else {
        const res = await fetch(`/api/users?page=1&page_size=100`, {
          cache: "no-store",
        });
        if (!res.ok) throw new Error();
        const data = await res.json();
        setUsers(data.users || []);
      }
    } catch (err) {
      console.error(err);
      setUsers([]);
    } finally {
      setUsersLoading(false);
    }
  };

  useEffect(() => {
    if (userType !== null) {
      fetchUsers();
    }
  }, [userType]);

  const filteredUsers = users.filter((u) => {
    if (u.full_name === "Deleted User") return false;
    const q = usersSearch.toLowerCase();
    return (
      (u.email || "").toLowerCase().includes(q) ||
      (u.full_name || "").toLowerCase().includes(q)
    );
  });

  const dataPayload = useMemo(() => {
    const output = {};
    dataRows.forEach((row) => {
      const key = row.key.trim();
      if (!key) return;
      output[key] = row.value;
    });
    return output;
  }, [dataRows]);

  const hasData = Object.keys(dataPayload).length > 0;

  const fetchRecentNotifications = async (silent = false) => {
    if (!silent) {
      setRecentLoading(true);
    }
    setRecentError("");

    try {
      const res = await fetch("/api/notifications?limit=10");
      const payload = await res.json().catch(() => ({}));

      if (!res.ok) {
        const detail = payload?.detail || payload?.message || "Failed to load recent notifications";
        throw new Error(detail);
      }

      setRecentNotifications(normalizeNotifications(payload));
    } catch (error) {
      setRecentError(error.message || "Failed to load recent notifications");
    } finally {
      if (!silent) {
        setRecentLoading(false);
      }
    }
  };

  useEffect(() => {
    fetchRecentNotifications();
  }, []);

  const addDataRow = () => {
    setDataRows((prev) => [...prev, emptyMetadataRow()]);
  };

  const removeDataRow = (index) => {
    setDataRows((prev) => {
      if (prev.length === 1) return [emptyMetadataRow()];
      return prev.filter((_, idx) => idx !== index);
    });
  };

  const updateDataRow = (index, field, value) => {
    setDataRows((prev) =>
      prev.map((row, idx) => (idx === index ? { ...row, [field]: value } : row))
    );
  };

  const resetForm = () => {
    setUserId("");
    setSelectedUserName("All Users (Broadcast)");
    setTitle("");
    setBody("");
    setSendPush(false);
    setDataRows([emptyMetadataRow()]);
  };

  const validate = () => {
    const trimmedTitle = title.trim();
    const trimmedBody = body.trim();
    const trimmedUserId = userId.trim();

    if (trimmedUserId) {
      const parsedUserId = Number(trimmedUserId);
      if (!Number.isInteger(parsedUserId) || parsedUserId <= 0) {
        toast.error("Please select a valid user");
        return false;
      }
    }

    if (!trimmedTitle) {
      toast.error("Title is required");
      return false;
    }

    if (trimmedTitle.length > 80) {
      toast.error("Title should be at most 80 characters for push UX");
      return false;
    }

    if (!trimmedBody) {
      toast.error("Body is required");
      return false;
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validate()) return;

    const trimmedUserId = userId.trim();
    const mode = trimmedUserId ? "single" : "all";
    const queryString = trimmedUserId ? `?user_id=${encodeURIComponent(trimmedUserId)}` : "";
    const payload = {
      title: title.trim(),
      body: body.trim(),
      data: dataPayload,
      send_push: sendPush,
      mode,
    };

    setSending(true);

    try {
      const res = await fetch(`/api/notifications/send${queryString}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const responseBody = await res.json().catch(() => ({}));
      if (!res.ok) {
        const detail =
          responseBody?.detail ||
          responseBody?.message ||
          "Failed to send notification";
        throw new Error(detail);
      }

      toast.success(responseBody?.message || "Notification created");
      resetForm();
      fetchRecentNotifications(true);
    } catch (error) {
      toast.error(error.message || "Failed to send notification");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-6 bg-black min-h-screen text-white p-2 md:p-4">
      {/* Title */}
      <div className="flex items-center gap-3">
        <Bell className="h-6 w-6 text-red-500" />
        <div>
          <h1 className="text-2xl font-bold text-white">Post Notification</h1>
          <p className="text-sm text-gray-400">
            Select a target user from the directory to notify them, or choose 'All Users' to broadcast.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: User Directory Selector */}
        <div className="lg:col-span-1 space-y-4">
          <Card className="bg-[#0f0f11] border-white/5 rounded-2xl overflow-hidden shadow-xl">
            <CardHeader className="border-b border-white/5 pb-4 px-4">
              <div className="flex items-center justify-between">
                <span className="text-md font-bold text-white flex items-center gap-2">
                  <Users className="h-4 w-4 text-orange-500" />
                  Target Directory
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

            <CardContent className="p-2 max-h-[500px] overflow-y-auto no-scrollbar space-y-1">
              <button
                onClick={() => {
                  setUserId("");
                  setSelectedUserName("All Users (Broadcast)");
                }}
                className={`w-full text-left p-3 rounded-xl flex items-center justify-between transition-all duration-200 group ${
                  userId === ""
                    ? "bg-gradient-to-r from-orange-500/20 to-red-500/10 border border-orange-500/30 text-white"
                    : "border border-transparent hover:bg-white/5 text-gray-400 hover:text-white"
                }`}
              >
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-sm">All Users</p>
                  <p className="text-xs text-gray-500 mt-0.5">Broadcast notification to all active devices</p>
                </div>
                {userId === "" && <UserCheck className="h-4 w-4 text-orange-400" />}
              </button>

              {filteredUsers.map((u) => {
                const isSelected = String(userId) === String(u.id);
                return (
                  <button
                    key={u.id}
                    onClick={() => {
                      setUserId(String(u.id));
                      setSelectedUserName(`${u.full_name || "Anonymous"} (${u.email})`);
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
                      <p className="text-xs text-gray-500 truncate mt-0.5">{u.email} (ID: {u.id})</p>
                    </div>
                    {isSelected && <UserCheck className="h-4 w-4 text-orange-400" />}
                  </button>
                );
              })}
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Compose Notification & Preview */}
        <div className="lg:col-span-2 space-y-6">
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            
            <Card className="border-white/5 bg-[#0f0f11] rounded-2xl shadow-xl">
              <CardHeader>
                <h2 className="text-lg font-semibold text-white">Compose</h2>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  
                  {/* Selected target user view */}
                  <div className="space-y-2">
                    <Label className="text-gray-400 text-xs">Selected Recipient</Label>
                    <div className="bg-[#18181b] border border-white/5 p-3 rounded-xl text-sm font-semibold text-white">
                      {selectedUserName}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="title">Title</Label>
                      <span className="text-xs text-gray-500">{title.length}/80</span>
                    </div>
                    <Input
                      id="title"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="Workout plan updated"
                      maxLength={80}
                      className="text-white bg-[#18181b] border-white/5"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="body">Message Body</Label>
                    <textarea
                      id="body"
                      rows={4}
                      value={body}
                      onChange={(e) => setBody(e.target.value)}
                      placeholder="Your lower-body plan for today is ready."
                      className="flex w-full rounded-xl border border-white/5 bg-[#18181b] px-3 py-2 text-sm text-white focus:outline-none focus:border-orange-500/50"
                      required
                    />
                  </div>

                  {userType !== 'gym' && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label className="text-white">Metadata (data)</Label>
                        <Button type="button" variant="outline" size="sm" onClick={addDataRow} className="border-white/5 text-xs">
                          <Plus className="mr-1 h-3.5 w-3.5" />
                          Add field
                        </Button>
                      </div>

                      <div className="space-y-2 max-h-[160px] overflow-y-auto no-scrollbar">
                        {dataRows.map((row, index) => (
                          <div key={index} className="grid grid-cols-1 gap-2 md:grid-cols-12">
                            <Input
                              value={row.key}
                              onChange={(e) => updateDataRow(index, "key", e.target.value)}
                              placeholder="key"
                              className="text-white bg-[#18181b] border-white/5 md:col-span-5 text-xs"
                            />
                            <Input
                              value={row.value}
                              onChange={(e) => updateDataRow(index, "value", e.target.value)}
                              placeholder="value"
                              className="text-white bg-[#18181b] border-white/5 md:col-span-6 text-xs"
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              onClick={() => removeDataRow(index)}
                              className="md:col-span-1 p-0 flex items-center justify-center"
                            >
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between rounded-xl border border-white/5 bg-black/40 p-3">
                    <div>
                      <p className="text-xs font-semibold text-white">Send Push Notification</p>
                      <p className="text-[10px] text-gray-500">
                        Deliver instant notification to active phones/wearables
                      </p>
                    </div>
                    <label className="inline-flex items-center gap-2 text-xs text-white">
                      <input
                        type="checkbox"
                        checked={sendPush}
                        onChange={(e) => setSendPush(e.target.checked)}
                        className="h-4 w-4 accent-orange-500"
                      />
                      Enabled
                    </label>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <Button type="submit" disabled={sending} className="bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white font-bold px-4">
                      <Send className="mr-1.5 h-4 w-4" />
                      {sending ? "Sending..." : "Post"}
                    </Button>
                    <Button type="button" variant="outline" onClick={resetForm} disabled={sending} className="border-white/5 text-gray-400">
                      Reset
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>

            <Card className="border-white/5 bg-[#0f0f11] rounded-2xl shadow-xl flex flex-col justify-between">
              <CardHeader>
                <h2 className="text-lg font-semibold text-white">Preview</h2>
              </CardHeader>
              <CardContent className="space-y-4 flex-1 flex flex-col justify-start">
                <div className="rounded-xl border border-white/5 bg-black p-4">
                  <p className="text-[9px] uppercase tracking-wide text-gray-500 font-semibold">Title</p>
                  <p className="mt-1 text-sm font-bold text-white">
                    {title.trim() || "Notification title"}
                  </p>

                  <p className="mt-4 text-[9px] uppercase tracking-wide text-gray-500 font-semibold">Body</p>
                  <p className="mt-1 whitespace-pre-wrap text-xs text-gray-300">
                    {body.trim() || "Notification message body"}
                  </p>
                </div>

                {userType !== 'gym' && (
                  <div>
                    <p className="mb-2 text-[9px] uppercase tracking-wide text-gray-500 font-semibold">Metadata payload</p>
                    <pre className="overflow-x-auto rounded-xl border border-white/5 bg-black p-3 text-xs text-gray-300 no-scrollbar">
                      {JSON.stringify(hasData ? dataPayload : {}, null, 2)}
                    </pre>
                  </div>
                )}

                <div className="rounded-xl border border-white/5 bg-black p-3 text-xs text-gray-400 space-y-1">
                  <p>
                    Target: <span className="text-white font-semibold">{userId.trim() ? `User ID ${userId}` : "All users"}</span>
                  </p>
                  <p>
                    Mode: <span className="text-white font-semibold">{userId.trim() ? "Single User" : "All Users (Broadcast)"}</span>
                  </p>
                  <p>
                    Push Delivery: <span className="text-white font-semibold">{sendPush ? "Enabled" : "Disabled"}</span>
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <Card className="border-white/5 bg-[#0f0f11] rounded-2xl shadow-xl mt-6">
        <CardHeader className="flex flex-row items-center justify-between border-b border-white/5 pb-3">
          <h2 className="text-lg font-semibold text-white">Recent Notifications</h2>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fetchRecentNotifications()}
            disabled={recentLoading}
            className="border-white/5 text-xs text-gray-300"
          >
            {recentLoading ? "Refreshing..." : "Refresh"}
          </Button>
        </CardHeader>
        <CardContent className="pt-4">
          {recentLoading && (
            <p className="text-sm text-gray-400 animate-pulse">Loading recent notifications...</p>
          )}

          {!recentLoading && recentError && (
            <div className="rounded-xl border border-red-500/30 bg-red-950/20 p-3 text-sm text-red-300">
              {recentError}
            </div>
          )}

          {!recentLoading && !recentError && recentNotifications.length === 0 && (
            <p className="text-sm text-gray-400">No notifications found.</p>
          )}

          {!recentLoading && !recentError && recentNotifications.length > 0 && (
            <div className="space-y-3">
              {recentNotifications.map((item, index) => {
                const itemData = item?.data && typeof item.data === "object" ? item.data : {};
                const hasItemData = Object.keys(itemData).length > 0;
                const itemTitle = item?.title || "(No title)";
                const itemBody = item?.body || "";

                return (
                  <div
                    key={item?.id || `${itemTitle}-${index}`}
                    className="rounded-xl border border-white/5 bg-black p-4 hover:border-orange-500/20 transition-all duration-350"
                  >
                    <div className="mb-1.5 flex items-center justify-between gap-3">
                      <h3 className="text-sm font-semibold text-white">{itemTitle}</h3>
                      <span className="text-xs text-gray-500 font-semibold">
                        {formatDate(item?.created_at || item?.createdAt || item?.timestamp)}
                      </span>
                    </div>

                    <p className="text-xs text-gray-300 whitespace-pre-wrap">{itemBody}</p>

                    <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
                      <span>User ID: {item?.user_id ?? item?.userId ?? "All"}</span>
                      <span>Push: {String(Boolean(item?.send_push ?? item?.sendPush))}</span>
                    </div>

                    {hasItemData && (
                      <pre className="mt-3 overflow-x-auto rounded-xl border border-white/5 bg-gray-950 p-2 text-xs text-gray-400 no-scrollbar">
                        {JSON.stringify(itemData, null, 2)}
                      </pre>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
