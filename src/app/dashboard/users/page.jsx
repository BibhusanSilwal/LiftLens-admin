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

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userType, setUserType] = useState(null);

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalUsers, setTotalUsers] = useState(0);
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

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
    status: "active",
    user_type: "normal",
    gym_name: "",
    phone: "",
    address: "",
    city: "",
    description: "",
    website: "",
  });

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
      if (userType === 'gym') {
        const res = await fetch('/api/users/gym/members');
        if (!res.ok) throw new Error();
        const data = await res.json();
        setUsers(data || []);
        setTotalUsers(data?.length || 0);
        setTotalPages(1);
      } else {
        const params = new URLSearchParams({ page: String(page), page_size: "100" });
        if (searchQuery) {
          params.set("search", searchQuery);
        }

        const res = await fetch(`/api/users?${params.toString()}`);
        if (!res.ok) throw new Error();

        const data = await res.json();
        setUsers(data.users || []);

        const apiTotal = Number(data.total) || 0;
        const apiPageSize = Number(data.page_size) || (data.users?.length || 1);
        const apiPage = Number(data.page) || page;

        setTotalUsers(apiTotal);
        setTotalPages(Math.max(1, Math.ceil(apiTotal / apiPageSize)));

        if (apiPage !== page) {
          setPage(apiPage);
        }
      }
    } catch {
      toast.error(userType === 'gym' ? "Failed to load members" : "Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (userType !== null) {
      fetchUsers();
    }
  }, [page, searchQuery, userType]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    setSearchQuery(searchInput.trim());
  };

  const displayedUsers = typeof window !== 'undefined' && userType === 'gym'
    ? users.filter(u => 
        u.full_name !== "Deleted User" &&
        ((u.email || "").toLowerCase().includes(searchQuery.toLowerCase()) || 
         (u.full_name || "").toLowerCase().includes(searchQuery.toLowerCase()))
      )
    : users.filter(u => 
        u.full_name !== "Deleted User" &&
        ((u.email || "").toLowerCase().includes(searchQuery.toLowerCase()) || 
         (u.full_name || "").toLowerCase().includes(searchQuery.toLowerCase()))
      );

  const normalUsers = displayedUsers.filter(u => u.user_type !== 'gym');
  const gymUsers = displayedUsers.filter(u => u.user_type === 'gym');

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
      status: "active",
      user_type: "normal",
      gym_name: "",
      phone: "",
      address: "",
      city: "",
      description: "",
      website: "",
    });
    setIsEdit(false);
    setIsFormOpen(true);
  };

  const openEdit = async (user) => {
    let fullUser = user;
    if (userType !== 'gym' && user.id) {
      try {
        const res = await fetch(`/api/users?id=${user.id}`);
        if (res.ok) {
          fullUser = await res.json();
        }
      } catch (err) {
        console.error("Failed to fetch details", err);
      }
    }

    setSelectedUser(fullUser);
    setFormData({
      email: fullUser.email,
      full_name: fullUser.full_name || "",
      is_admin: fullUser.is_admin || false,
      streak_days: fullUser.streak_days || 0,
      status: fullUser.status || "active",
      user_type: fullUser.user_type || "normal",
      gym_name: fullUser.gym_name || "",
      phone: fullUser.phone || "",
      address: fullUser.address || "",
      city: fullUser.city || "",
      description: fullUser.description || "",
      website: fullUser.website || "",
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
      let res;
      if (userType === 'gym') {
        res = await fetch("/api/users/gym/members", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: formData.email.trim(),
            status: formData.status,
          }),
        });
      } else {
        const payload = {
          email: formData.email.trim(),
          full_name: formData.full_name.trim(),
          is_admin: formData.is_admin,
          user_type: formData.user_type,
        };
        if (!isEdit) {
          payload.password = formData.password;
        } else {
          payload.id = selectedUser.id;
        }

        if (formData.user_type === 'gym') {
          payload.gym_name = formData.gym_name.trim();
          payload.phone = formData.phone.trim();
          payload.address = formData.address.trim();
          payload.city = formData.city.trim();
          payload.description = formData.description.trim();
          payload.website = formData.website.trim();
        }

        res = await fetch("/api/users", {
          method: isEdit ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }

      if (!res.ok) throw new Error();

      toast.success(isEdit ? "Details updated" : "User created");
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
      if (userType === 'gym') {
        const res = await fetch(`/api/users/gym/members?user_id=${selectedUser.user_id}`, {
          method: "DELETE",
        });
        if (!res.ok) throw new Error();
        toast.success("Member removed");
      } else {
        await fetch(`/api/users?id=${selectedUser.id}`, {
          method: "DELETE",
        });
        toast.success("User deleted");
      }
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
    <div className="space-y-6 bg-black">
      {/* HEADER */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <h1 className="text-2xl font-bold text-white">
          {userType === 'gym' ? 'Gym Member Management' : 'User Management'}
        </h1>
        <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center lg:w-auto">
          <form onSubmit={handleSearchSubmit} className="flex w-full items-center gap-2 sm:w-auto">
            <Input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder={userType === 'gym' ? "Search members..." : "Search users..."}
              className="w-full text-white sm:w-64"
            />
            <Button type="submit" variant="outline" className="border-gray-700 text-white">
              Search
            </Button>
          </form>

          <Button onClick={openCreate} className="bg-red-600 sm:w-auto">
            <Plus className="h-4 w-4 mr-2" />
            {userType === 'gym' ? 'Add Member' : 'Add User'}
          </Button>
        </div>
      </div>

      {/* DYNAMIC TABLES CONDITIONAL ON ROLE */}
      {userType === 'gym' ? (
        <Card className="bg-gray-900 border-gray-800">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Joined At</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {!loading && displayedUsers.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-gray-400">
                      No members found
                    </TableCell>
                  </TableRow>
                )}

                {displayedUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>{user.full_name || "-"}</TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                        user.status === 'active' ? 'bg-green-500/20 text-green-400' :
                        user.status === 'paused' ? 'bg-yellow-500/20 text-yellow-400' :
                        'bg-red-500/20 text-red-400'
                      }`}>
                        {user.status}
                      </span>
                    </TableCell>
                    <TableCell>
                      {user.joined_at ? new Date(user.joined_at).toLocaleDateString() : "-"}
                    </TableCell>
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
            <div className="border-t border-gray-800 px-4 py-3">
              <p className="text-sm text-gray-400">
                Total Gym Members: {totalUsers}
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Table 1: Normal Users */}
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader className="pb-3 border-b border-gray-850">
              <h2 className="text-lg font-bold text-white">Normal Users</h2>
            </CardHeader>
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
                  {!loading && normalUsers.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-gray-400 py-6">
                        No normal users found
                      </TableCell>
                    </TableRow>
                  )}

                  {normalUsers.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>{user.full_name || "-"}</TableCell>
                      <TableCell>{user.is_admin ? "Yes" : "No"}</TableCell>
                      <TableCell>{user.streak_days}</TableCell>
                      <TableCell>{formatLastActive(user.last_active)}</TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button size="icon" variant="ghost" onClick={() => openEdit(user)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => requestDeleteUser(user)}>
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Table 2: Gym Accounts */}
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader className="pb-3 border-b border-gray-850">
              <h2 className="text-lg font-bold text-white">Gym Accounts</h2>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Streak</TableHead>
                    <TableHead>Last Active</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {!loading && gymUsers.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-gray-400 py-6">
                        No gym accounts found
                      </TableCell>
                    </TableRow>
                  )}

                  {gymUsers.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>{user.full_name || "-"}</TableCell>
                      <TableCell>{user.streak_days}</TableCell>
                      <TableCell>{formatLastActive(user.last_active)}</TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button size="icon" variant="ghost" onClick={() => openEdit(user)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => requestDeleteUser(user)}>
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      )}

      {/* CREATE / EDIT FORM */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="bg-gray-900 border-gray-800 text-white max-h-[85vh] overflow-y-auto no-scrollbar">
          <DialogHeader>
            <DialogTitle className="text-white">
              {userType === 'gym' 
                ? (isEdit ? "Edit Gym Member" : "Add Gym Member")
                : (isEdit ? "Edit User" : "Create User")}
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
                disabled={isEdit && userType === 'gym'}
                className="bg-gray-800 border-gray-700 text-white"
                required
              />
            </div>

            {userType === 'gym' ? (
              <div>
                <Label>Membership Status</Label>
                <select
                  value={formData.status || "active"}
                  onChange={(e) =>
                    setFormData({ ...formData, status: e.target.value })
                  }
                  className="w-full bg-gray-800 border border-gray-700 rounded-md py-2 px-3 text-white focus:outline-none focus:border-red-500"
                >
                  <option value="active">Active</option>
                  <option value="paused">Paused</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
            ) : (
              <>
                {!isEdit && (
                  <div>
                    <Label>Password</Label>
                    <Input
                      type="password"
                      onChange={(e) =>
                        setFormData({ ...formData, password: e.target.value })
                      }
                      className="bg-gray-800 border-gray-700 text-white"
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
                    className="bg-gray-800 border-gray-700 text-white"
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

                {userType !== 'gym' && (
                  <div>
                    <Label>User Type</Label>
                    <select
                      value={formData.user_type || "normal"}
                      onChange={(e) =>
                        setFormData({ ...formData, user_type: e.target.value })
                      }
                      className="w-full bg-gray-800 border border-gray-700 rounded-md py-2 px-3 text-white focus:outline-none focus:border-red-500"
                    >
                      <option value="normal">Normal User</option>
                      <option value="gym">Gym Account</option>
                    </select>
                  </div>
                )}

                {/* Additional gym profile creation fields */}
                {formData.user_type === 'gym' && (
                  <div className="space-y-4 border-t border-gray-700 pt-4 mt-2">
                    <h3 className="text-sm font-semibold text-gray-400">Gym Information</h3>
                    <div>
                      <Label>Gym Name</Label>
                      <Input
                        value={formData.gym_name || ""}
                        onChange={(e) =>
                          setFormData({ ...formData, gym_name: e.target.value })
                        }
                        className="bg-gray-800 border-gray-700 text-white"
                        required
                      />
                    </div>
                    <div>
                      <Label>Phone</Label>
                      <Input
                        value={formData.phone || ""}
                        onChange={(e) =>
                          setFormData({ ...formData, phone: e.target.value })
                        }
                        className="bg-gray-800 border-gray-700 text-white"
                      />
                    </div>
                    <div>
                      <Label>Address</Label>
                      <Input
                        value={formData.address || ""}
                        onChange={(e) =>
                          setFormData({ ...formData, address: e.target.value })
                        }
                        className="bg-gray-800 border-gray-700 text-white"
                      />
                    </div>
                    <div>
                      <Label>City</Label>
                      <Input
                        value={formData.city || ""}
                        onChange={(e) =>
                          setFormData({ ...formData, city: e.target.value })
                        }
                        className="bg-gray-800 border-gray-700 text-white"
                      />
                    </div>
                    <div>
                      <Label>Description</Label>
                      <Input
                        value={formData.description || ""}
                        onChange={(e) =>
                          setFormData({ ...formData, description: e.target.value })
                        }
                        className="bg-gray-800 border-gray-700 text-white"
                      />
                    </div>
                    <div>
                      <Label>Website</Label>
                      <Input
                        value={formData.website || ""}
                        onChange={(e) =>
                          setFormData({ ...formData, website: e.target.value })
                        }
                        className="bg-gray-800 border-gray-700 text-white"
                      />
                    </div>
                  </div>
                )}
              </>
            )}

            <Button type="submit" className="bg-red-600 w-full text-white">
              {isEdit ? "Save Changes" : "Submit"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* UPDATE CONFIRM */}
      <Dialog open={isUpdateConfirmOpen} onOpenChange={setIsUpdateConfirmOpen}>
        <DialogContent className="bg-gray-900 border-gray-800">
          <DialogHeader>
            <DialogTitle className="text-white">Confirm Save</DialogTitle>
          </DialogHeader>

          <p className="text-gray-400">
            Are you sure you want to save these details?
          </p>

          <DialogFooter>
            <Button variant="ghost" className="text-white" onClick={() => setIsUpdateConfirmOpen(false)}>
              Cancel
            </Button>
            <Button className="bg-red-600 text-white" onClick={confirmSaveUser}>
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DELETE CONFIRM */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent className="bg-gray-900 border-gray-800">
          <DialogHeader>
            <DialogTitle className="text-white">
              {userType === 'gym' ? 'Remove Member' : 'Delete User'}
            </DialogTitle>
          </DialogHeader>

          <p className="text-gray-400">
            Are you sure you want to {userType === 'gym' ? 'remove' : 'delete'}{" "}
            <span className="text-white font-semibold">
              {selectedUser?.email}
            </span>
            ?
          </p>

          <DialogFooter>
            <Button variant="ghost" className="text-white" onClick={() => setIsDeleteOpen(false)}>
              Cancel
            </Button>
            <Button className="bg-red-600 text-white" onClick={confirmDeleteUser}>
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
