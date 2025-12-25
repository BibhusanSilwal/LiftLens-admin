"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Users, Flame, Clock, Search, Trash2, Edit, Plus, Check, Pause } from "lucide-react";
import { toast } from "sonner";

const statusOptions = ["Active", "Inactive"];
const statusColors = {
  Active: "text-green-500 bg-green-900/20",
  Inactive: "text-red-500 bg-red-900/20",
};

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedUsers, setSelectedUsers] = useState([]);

  const [formData, setFormData] = useState({
    email: "",
    password: "",
    full_name: "",
    is_admin: false,
    streak_days: 0,
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const formatLastActive = (dateString) => {
    if (!dateString) return "-";
    const diff = Math.floor((new Date() - new Date(dateString)) / 1000);
    if (diff < 60) return "Just now";
    if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} hrs ago`;
    return `${Math.floor(diff / 86400)} days ago`;
  };

  /* =======================
     API CALLS (via /api/users)
     ======================= */

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page,
        page_size: 10,
        ...(searchTerm && { search: searchTerm }),
        ...(statusFilter !== "all" && { status: statusFilter }),
      });

      const res = await fetch(`/api/users?${params}`);
      if (!res.ok) throw new Error("Failed to fetch users");

      const data = await res.json();
      setUsers(data.users || []);
      setTotalPages(Math.ceil((data.total || 0) / 10));
    } catch (err) {
      toast.error("Failed to fetch users");
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const res = await fetch("/api/users?stats=true");
      if (res.ok) setStats(await res.json());
    } catch {
      console.error("Stats fetch failed");
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchStats();
  }, [page, searchTerm, statusFilter]);

  /* =======================
     CRUD
     ======================= */

  const openCreate = () => {
    setFormData({
      email: "",
      password: "",
      full_name: "",
      is_admin: false,
      streak_days: 0,
    });
    setIsEdit(false);
    setIsModalOpen(true);
  };

  const openEdit = (user) => {
    setSelectedUser(user);
    setFormData({
      email: user.email,
      full_name: user.full_name,
      is_admin: !!user.is_admin,
      streak_days: user.streak_days || 0,
    });
    setIsEdit(true);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const res = await fetch("/api/users", {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(isEdit ? { ...formData, id: selectedUser.id } : formData),
      });

      if (!res.ok) throw new Error();

      toast.success(isEdit ? "User updated" : "User created");
      setIsModalOpen(false);
      fetchUsers();
      fetchStats();
    } catch {
      toast.error("Operation failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteUser = async (id) => {
    if (!confirm("Delete this user?")) return;
    await fetch(`/api/users?id=${id}`, { method: "DELETE" });
    fetchUsers();
    fetchStats();
  };

  const handleBulkDelete = async () => {
    if (!confirm(`Delete ${selectedUsers.length} users?`)) return;
    await fetch("/api/users", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: selectedUsers }),
    });
    setSelectedUsers([]);
    fetchUsers();
    fetchStats();
  };

  /* =======================
     UI (UNCHANGED)
     ======================= */

  return (
    <div className="space-y-6 bg-black p-4">
      {/* HEADER */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-white">User Management</h1>
        <Button onClick={openCreate} className="bg-red-600">
          <Plus className="h-4 w-4 mr-2" /> Add User
        </Button>
      </div>

      {/* STATS */}
      {stats && (
        <div className="grid md:grid-cols-4 gap-4">
          <StatCard title="Total Users" value={stats.total_users} icon={<Users />} />
          <StatCard title="Active" value={stats.active_users} icon={<Check />} />
          <StatCard title="Inactive" value={stats.inactive_users} icon={<Pause />} />
          <StatCard title="Avg Streak" value={`${stats.avg_streak} days`} icon={<Flame />} />
        </div>
      )}

      {/* TABLE + MODAL (unchanged, omitted for brevity) */}
      {/* Your existing JSX table & modal works without change */}
    </div>
  );
}

function StatCard({ title, value, icon }) {
  return (
    <Card className="bg-gray-900 border-gray-800">
      <CardHeader className="pb-2 flex items-center gap-2 text-gray-400">
        {icon}
        <span>{title}</span>
      </CardHeader>
      <CardContent className="text-3xl font-bold text-white">
        {value}
      </CardContent>
    </Card>
  );
}
