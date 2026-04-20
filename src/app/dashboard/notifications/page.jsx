"use client";

import { useEffect, useMemo, useState } from "react";
import { Bell, Plus, Send, Trash2 } from "lucide-react";
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
  return date.toLocaleString();
}

export default function NotificationsPage() {
  const [userId, setUserId] = useState("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [sendPush, setSendPush] = useState(false);
  const [dataRows, setDataRows] = useState([emptyMetadataRow()]);
  const [sending, setSending] = useState(false);
  const [recentNotifications, setRecentNotifications] = useState([]);
  const [recentLoading, setRecentLoading] = useState(true);
  const [recentError, setRecentError] = useState("");

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
        toast.error("Please enter a valid target user ID");
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
    <div className="space-y-6 bg-black">
      <div className="flex items-center gap-3">
        <Bell className="h-6 w-6 text-red-500" />
        <div>
          <h1 className="text-2xl font-bold text-white">Post Notification</h1>
          <p className="text-sm text-gray-400">
            Send a targeted notification by user ID, or leave it blank to notify all users.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <Card className="border-gray-800 bg-gray-900 xl:col-span-2">
          <CardHeader>
            <h2 className="text-lg font-semibold text-white">Compose</h2>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="userId">Target User ID (optional)</Label>
                <Input
                  id="userId"
                  type="number"
                  min="1"
                  value={userId}
                  onChange={(e) => setUserId(e.target.value)}
                  placeholder="e.g. 123 (leave blank for all users)"
                  className="text-white"
                />
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
                  className="text-white"
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
                  className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm text-white ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  required
                />
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-white">Metadata (data)</Label>
                  <Button type="button" variant="outline" size="sm" onClick={addDataRow}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add field
                  </Button>
                </div>

                <div className="space-y-2">
                  {dataRows.map((row, index) => (
                    <div key={index} className="grid grid-cols-1 gap-2 md:grid-cols-12">
                      <Input
                        value={row.key}
                        onChange={(e) => updateDataRow(index, "key", e.target.value)}
                        placeholder="key (e.g. deep_link)"
                        className="text-white md:col-span-5"
                      />
                      <Input
                        value={row.value}
                        onChange={(e) => updateDataRow(index, "value", e.target.value)}
                        placeholder="value"
                        className="text-white md:col-span-6"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => removeDataRow(index)}
                        className="md:col-span-1"
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between rounded-md border border-gray-800 p-3">
                <div>
                  <p className="text-sm font-medium text-white">Send Push</p>
                  <p className="text-xs text-gray-400">
                    Attempt push delivery to active devices
                  </p>
                </div>
                <label className="inline-flex items-center gap-2 text-sm text-white">
                  <input
                    type="checkbox"
                    checked={sendPush}
                    onChange={(e) => setSendPush(e.target.checked)}
                    className="h-4 w-4"
                  />
                  Enabled
                </label>
              </div>

              <div className="flex gap-3">
                <Button type="submit" disabled={sending}>
                  <Send className="mr-2 h-4 w-4" />
                  {sending ? "Sending..." : "Post Notification"}
                </Button>
                <Button type="button" variant="outline" onClick={resetForm} disabled={sending}>
                  Reset
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card className="border-gray-800 bg-gray-900">
          <CardHeader>
            <h2 className="text-lg font-semibold text-white">Preview</h2>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg border border-gray-800 bg-black p-4">
              <p className="text-xs uppercase tracking-wide text-gray-500">Title</p>
              <p className="mt-1 text-base font-semibold text-white">
                {title.trim() || "Notification title"}
              </p>

              <p className="mt-4 text-xs uppercase tracking-wide text-gray-500">Body</p>
              <p className="mt-1 whitespace-pre-wrap text-sm text-gray-300">
                {body.trim() || "Notification message body"}
              </p>
            </div>

            <div>
              <p className="mb-2 text-xs uppercase tracking-wide text-gray-500">Metadata</p>
              <pre className="overflow-x-auto rounded-md border border-gray-800 bg-black p-3 text-xs text-gray-300">
                {JSON.stringify(hasData ? dataPayload : {}, null, 2)}
              </pre>
            </div>

            <div className="rounded-md border border-gray-800 bg-black p-3 text-sm text-gray-300">
              <p>
                Target user: <span className="text-white">{userId.trim() || "All users"}</span>
              </p>
              <p>
                mode: <span className="text-white">{userId.trim() ? "single" : "all"}</span>
              </p>
              <p>
                send_push: <span className="text-white">{sendPush ? "true" : "false"}</span>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-gray-800 bg-gray-900">
        <CardHeader className="flex flex-row items-center justify-between">
          <h2 className="text-lg font-semibold text-white">Recent Notifications</h2>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fetchRecentNotifications()}
            disabled={recentLoading}
          >
            {recentLoading ? "Refreshing..." : "Refresh"}
          </Button>
        </CardHeader>
        <CardContent>
          {recentLoading && (
            <p className="text-sm text-gray-400">Loading recent notifications...</p>
          )}

          {!recentLoading && recentError && (
            <div className="rounded-md border border-red-900 bg-red-950/30 p-3 text-sm text-red-300">
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
                    className="rounded-md border border-gray-800 bg-black p-4"
                  >
                    <div className="mb-1 flex items-center justify-between gap-3">
                      <h3 className="text-sm font-semibold text-white">{itemTitle}</h3>
                      <span className="text-xs text-gray-500">
                        {formatDate(item?.created_at || item?.createdAt || item?.timestamp)}
                      </span>
                    </div>

                    <p className="text-sm text-gray-300 whitespace-pre-wrap">{itemBody}</p>

                    <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-400">
                      <span>user_id: {item?.user_id ?? item?.userId ?? "-"}</span>
                      <span>send_push: {String(Boolean(item?.send_push ?? item?.sendPush))}</span>
                    </div>

                    {hasItemData && (
                      <pre className="mt-3 overflow-x-auto rounded-md border border-gray-800 bg-gray-950 p-2 text-xs text-gray-300">
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
