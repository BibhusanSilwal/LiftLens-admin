"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Trash2, Edit } from "lucide-react";
import { toast } from "sonner";

/* =======================
   PAGE
======================= */

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  /* Dialog state */
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isUpdateConfirmOpen, setIsUpdateConfirmOpen] = useState(false);

  const [isEdit, setIsEdit] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);

  const [formData, setFormData] = useState({
    email: "",
    password: "",
    full_name: "",
    is_admin: false,
    streak_days: 0,
  });

  /* =======================
     HELPERS
  ======================= */

  const formatLastActive = (date) => {
    if (!date) return "-";
    const diff = Math.floor((new Date() - new Date(date)) / 1000);
    if (diff < 60) return "Just now";
    if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} hrs ago`;
    return `${Math.floor(diff / 86400)} days ago`;
  };

  /* =======================
     API
  ======================= */

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/users?page=${page}&page_size=10`);
      if (!res.ok) throw new Error();

      const data = await res.json();
      setUsers(data.users || []);
      setTotalPages(Math.ceil((data.total || 0) / 10));
    } catch {
      toast.error("Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [page]);

  /* =======================
     CREATE / EDIT
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
    setIsFormOpen(true);
  };

  const openEdit = (user) => {
    setSelectedUser(user);
    setFormData({
      email: user.email,
      full_name: user.full_name,
      is_admin: user.is_admin,
      streak_days: user.streak_days,
    });
    setIsEdit(true);
    setIsFormOpen(true);
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    setIsUpdateConfirmOpen(true);
  };

  const confirmSaveUser = async () => {
    try {
      const res = await fetch("/api/users", {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          isEdit
            ? { ...formData, id: selectedUser.id }
            : formData
        ),
      });

      if (!res.ok) throw new Error();

      toast.success(isEdit ? "User updated" : "User created");
      setIsFormOpen(false);
      setIsUpdateConfirmOpen(false);
      fetchUsers();
    } catch {
      toast.error("Operation failed");
    }
  };

  /* =======================
     DELETE
  ======================= */

  const requestDeleteUser = (user) => {
    setSelectedUser(user);
    setIsDeleteOpen(true);
  };

  const confirmDeleteUser = async () => {
    try {
      await fetch(`/api/users?id=${selectedUser.id}`, {
        method: "DELETE",
      });

      toast.success("User deleted");
      setIsDeleteOpen(false);
      setSelectedUser(null);
      fetchUsers();
    } catch {
      toast.error("Delete failed");
    }
  };

  /* =======================
     UI
  ======================= */

  return (
    <div className="space-y-6 bg-black p-4">
      {/* HEADER */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-white">User Management</h1>
        <Button onClick={openCreate} className="bg-red-600">
          <Plus className="h-4 w-4 mr-2" />
          Add User
        </Button>
      </div>

      {/* TABLE */}
      <Card className="bg-gray-900 border-gray-800">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Admin</TableHead>
                <TableHead>Streak</TableHead>
                <TableHead>Last Active</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {!loading && users.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-gray-400">
                    No users found
                  </TableCell>
                </TableRow>
              )}

              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>{user.full_name || "-"}</TableCell>
                  <TableCell>
                    {user.is_admin ? "Yes" : "No"}
                  </TableCell>
                  <TableCell>{user.streak_days}</TableCell>
                  <TableCell>{formatLastActive(user.last_active)}</TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => openEdit(user)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => requestDeleteUser(user)}
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* CREATE / EDIT FORM */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="bg-gray-900 border-gray-800">
          <DialogHeader>
            <DialogTitle className="text-white">
              {isEdit ? "Edit User" : "Create User"}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleFormSubmit} className="space-y-4">
            <div>
              <Label>Email</Label>
              <Input
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                required
              />
            </div>

            {!isEdit && (
              <div>
                <Label>Password</Label>
                <Input
                  type="password"
                  onChange={(e) =>
                    setFormData({ ...formData, password: e.target.value })
                  }
                  required
                />
              </div>
            )}

            <div>
              <Label>Full Name</Label>
              <Input
                value={formData.full_name}
                onChange={(e) =>
                  setFormData({ ...formData, full_name: e.target.value })
                }
              />
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                checked={formData.is_admin}
                onCheckedChange={(v) =>
                  setFormData({ ...formData, is_admin: v })
                }
              />
              <Label>Admin</Label>
            </div>

            <Button type="submit" className="bg-red-600 w-full">
              {isEdit ? "Update User" : "Create User"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* UPDATE CONFIRM */}
      <Dialog open={isUpdateConfirmOpen} onOpenChange={setIsUpdateConfirmOpen}>
        <DialogContent className="bg-gray-900 border-gray-800">
          <DialogHeader>
            <DialogTitle className="text-white">
              Confirm {isEdit ? "Update" : "Create"}
            </DialogTitle>
          </DialogHeader>

          <p className="text-gray-400">
            Are you sure you want to {isEdit ? "update" : "create"} this user?
          </p>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsUpdateConfirmOpen(false)}>
              Cancel
            </Button>
            <Button className="bg-red-600" onClick={confirmSaveUser}>
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DELETE CONFIRM */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent className="bg-gray-900 border-gray-800">
          <DialogHeader>
            <DialogTitle className="text-white">Delete User</DialogTitle>
          </DialogHeader>

          <p className="text-gray-400">
            Are you sure you want to delete{" "}
            <span className="text-white font-semibold">
              {selectedUser?.full_name || selectedUser?.email}
            </span>
            ?
          </p>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsDeleteOpen(false)}>
              Cancel
            </Button>
            <Button className="bg-red-600" onClick={confirmDeleteUser}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
