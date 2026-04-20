"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "../../../components/ui/Button";
import { Card, CardContent, CardHeader } from "../../../components/ui/Card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "../../../components/ui/dialog";
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";
import { Checkbox } from "../../../components/ui/checkbox";
import { Apple, Download, Edit, Trash2, Search } from "lucide-react";
import { toast, Toaster } from "sonner";

const ITEMS_PER_PAGE = 50;
export default function FoodDatabasePage() {
  const csvInputRef = useRef(null);
  const [foods, setFoods] = useState([]);
  const [filteredFoods, setFilteredFoods] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [updateExisting, setUpdateExisting] = useState(true);
  const [isImporting, setIsImporting] = useState(false);

  // Add modal
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addFormData, setAddFormData] = useState({
    name: "",
    calories: "",
    protein: "",
    fats: "",
    carbs: "",
    serving_unit: "g",
  });

  // Edit modal
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editFormData, setEditFormData] = useState({
    name: "",
    calories: "",
    protein: "",
    fats: "",
    carbs: "",
    serving_unit: "g",
  });
  const [selectedFood, setSelectedFood] = useState(null);

  // Delete modal
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  // Fetch foods
  const fetchFoods = async () => {
    try {
      const res = await fetch("/api/foods");
      if (!res.ok) throw new Error();
      const data = await res.json();
      setFoods(data);
      setFilteredFoods(data);
    } catch {
      toast.error("Failed to load food database");
    }
  };

  useEffect(() => {
    fetchFoods();
  }, []);

  // Search filter
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredFoods(foods);
      setCurrentPage(1);
      return;
    }

    const term = searchTerm.toLowerCase().trim();
    const filtered = foods.filter((food) => food.name?.toLowerCase().includes(term));

    setFilteredFoods(filtered);
    setCurrentPage(1);
  }, [searchTerm, foods]);

  // Pagination
  const totalItems = filteredFoods.length;
  const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const currentItems = filteredFoods.slice(startIndex, endIndex);

  const goToPage = (page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  // Add food handlers
  const handleAddChange = (e) => {
    const { name, value } = e.target;
    setAddFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        name: addFormData.name.trim(),
        category: "other",
        calories: parseFloat(addFormData.calories) || 0,
        protein: parseFloat(addFormData.protein) || 0,
        fats: parseFloat(addFormData.fats) || 0,
        carbs: parseFloat(addFormData.carbs) || 0,
        serving_size: 100,
        serving_unit: addFormData.serving_unit || "g",
        status: "active",
      };

      const res = await fetch("/api/foods", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "Failed to add food");
      }

      const newFood = await res.json();
      setFoods((prev) => [...prev, newFood]);
      setFilteredFoods((prev) => [...prev, newFood]);
      setAddFormData({
        name: "",
        calories: "",
        protein: "",
        fats: "",
        carbs: "",
        serving_unit: "g",
      });
      setIsAddModalOpen(false);
      toast.success("Food added successfully");
    } catch (err) {
      toast.error(err.message || "Failed to add food");
    }
  };

  // Edit food handlers
  const handleEditOpen = (food) => {
    setSelectedFood(food);
    setEditFormData({
      name: food.name || "",
      calories: food.calories?.toString() || "",
      protein: food.protein?.toString() || "",
      fats: food.fats?.toString() || "",
      carbs: food.carbs?.toString() || "",
      serving_unit: food.serving_unit || "g",
    });
    setIsEditModalOpen(true);
  };

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!selectedFood?.id) return;

    try {
      const payload = {
        name: editFormData.name.trim(),
        calories: parseFloat(editFormData.calories) || 0,
        protein: parseFloat(editFormData.protein) || 0,
        fats: parseFloat(editFormData.fats) || 0,
        carbs: parseFloat(editFormData.carbs) || 0,
      };

      const res = await fetch(`/api/foods/${selectedFood.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "Update failed");
      }

      const updatedFood = await res.json();

      setFoods((prev) =>
        prev.map((f) => (f.id === selectedFood.id ? updatedFood : f))
      );
      setFilteredFoods((prev) =>
        prev.map((f) => (f.id === selectedFood.id ? updatedFood : f))
      );

      setIsEditModalOpen(false);
      setSelectedFood(null);
      toast.success("Food updated successfully");
    } catch (err) {
      toast.error(err.message || "Failed to update food");
    }
  };

  // Delete
  const requestDelete = (food) => {
    setSelectedFood(food);
    setIsDeleteOpen(true);
  };

  const confirmDelete = async () => {
    if (!selectedFood?.id) return;

    try {
      const res = await fetch(`/api/foods?id=${selectedFood?.id}`, {
        method: "DELETE",
      });

      if (!res.ok) throw new Error("Delete failed");

      setFoods((prev) => prev.filter((f) => f.id !== selectedFood.id));
      setFilteredFoods((prev) => prev.filter((f) => f.id !== selectedFood.id));
      setIsDeleteOpen(false);
      setSelectedFood(null);
      toast.success("Food deleted successfully");
    } catch {
      toast.error("Failed to delete food item");
    }
  };

  // Export CSV
  const exportToCSV = () => {
    if (filteredFoods.length === 0) return toast.error("No data to export");

    const headers = [
      "S.No.",
      "Name",
      "Category",
      "Calories",
      "Protein",
      "Fats",
      "Carbs",
      "Serving Size",
      "Unit",
      "Status",
    ];

    const rows = filteredFoods.map((f, index) => [
      index + 1,
      f.name || "",
      f.category || "",
      f.calories ?? 0,
      f.protein ?? 0,
      f.fats ?? 0,
      f.carbs ?? 0,
      f.serving_size ?? "",
      f.serving_unit ?? "",
      f.status ?? "active",
    ]);

    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `foods_database_${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success("CSV exported successfully");
  };

  const handleImportClick = () => {
    csvInputRef.current?.click();
  };

  const handleCSVImport = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith(".csv")) {
      toast.error("Only .csv files are allowed");
      e.target.value = "";
      return;
    }

    try {
      setIsImporting(true);
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch(
        `/api/foods/import-csv?update_existing=${updateExisting ? "true" : "false"}`,
        {
          method: "POST",
          body: formData,
        }
      );

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.detail || "CSV import failed");
      }

      const summary = `Rows: ${data.total_rows ?? 0} | Created: ${data.created ?? 0} | Updated: ${data.updated ?? 0} | Skipped: ${data.skipped ?? 0}`;
      if (Array.isArray(data.errors) && data.errors.length > 0) {
        toast.warning("CSV imported with row errors", {
          description: `${summary}. Errors: ${data.errors.length}`,
        });
      } else {
        toast.success("CSV imported successfully", {
          description: summary,
        });
      }

      await fetchFoods();
    } catch (err) {
      toast.error(err.message || "CSV import failed");
    } finally {
      setIsImporting(false);
      e.target.value = "";
    }
  };

  return (
    <div className="space-y-6 bg-black p-4 min-h-screen">
      {/* Header + Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl font-bold text-white">Food Database</h1>

        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search by name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-[#1a1a1a] border-[#333] text-white placeholder:text-gray-500"
            />
          </div>

          <Button onClick={exportToCSV} variant="outline" className="border-white/20 text-white hover:bg-white/10">
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>

          <input
            ref={csvInputRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={handleCSVImport}
          />

          <Button
            onClick={handleImportClick}
            variant="outline"
            className="border-white/20 text-white hover:bg-white/10"
            disabled={isImporting}
          >
            {isImporting ? "Importing..." : "Import CSV"}
          </Button>

          <div className="flex items-center gap-2 rounded-md border border-[#333] px-3 py-2">
            <Checkbox
              checked={updateExisting}
              onCheckedChange={(value) => setUpdateExisting(value === true)}
            />
            <Label className="text-sm text-gray-300">Update Existing</Label>
          </div>

          <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
            <DialogTrigger asChild>
              <Button className="bg-red-600 hover:bg-red-700">+ Add Food</Button>
            </DialogTrigger>

            <DialogContent className="bg-black border-[#1c1c1e] text-white max-w-md">
              <DialogHeader>
                <DialogTitle>Add New Food Item</DialogTitle>
              </DialogHeader>

              <form onSubmit={handleAddSubmit} className="space-y-4">
                <div>
                  <Label>Food Name</Label>
                  <Input name="name" value={addFormData.name} onChange={handleAddChange} required />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Calories (kcal)</Label>
                    <Input
                      type="number"
                      step="0.1"
                      name="calories"
                      value={addFormData.calories}
                      onChange={handleAddChange}
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Protein (g)</Label>
                    <Input
                      type="number"
                      step="0.1"
                      name="protein"
                      value={addFormData.protein}
                      onChange={handleAddChange}
                      required
                    />
                  </div>
                  <div>
                    <Label>Fats (g)</Label>
                    <Input
                      type="number"
                      step="0.1"
                      name="fats"
                      value={addFormData.fats}
                      onChange={handleAddChange}
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Carbs (g)</Label>
                    <Input
                      type="number"
                      step="0.1"
                      name="carbs"
                      value={addFormData.carbs}
                      onChange={handleAddChange}
                      required
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <Button type="button" variant="ghost" onClick={() => setIsAddModalOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" className="bg-red-600">
                    Add Food
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Table */}
      <Card className="bg-black border-[#1c1c1e]">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Apple className="h-5 w-5 text-red-600" />
            <span className="text-lg font-semibold text-white">Food Items</span>
            <span className="text-sm text-gray-400">({filteredFoods.length})</span>
          </div>
        </CardHeader>

        <CardContent>
          {currentItems.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              {searchTerm ? "No matching items found" : "No food items yet"}
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-white min-w-[1000px]">
                  <thead>
                    <tr className="border-b border-[#333]">
                      <th className="text-left py-3 px-4">S.No.</th>
                      <th className="text-left py-3 px-4">Name</th>
                      <th className="text-left py-3 px-4">Calories</th>
                      <th className="text-left py-3 px-4">Protein</th>
                      <th className="text-left py-3 px-4">Fats</th>
                      <th className="text-left py-3 px-4">Carbs</th>
                      <th className="text-left py-3 px-4">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentItems.map((food, idx) => (
                      <tr key={food.id} className="border-b border-[#222] hover:bg-[#111]">
                        <td className="py-3 px-4">{(currentPage - 1) * ITEMS_PER_PAGE + idx + 1}</td>
                        <td className="py-3 px-4 font-medium">{food.name || "—"}</td>
                        <td className="py-3 px-4">{food.calories ?? 0} kcal</td>
                        <td className="py-3 px-4">{food.protein ?? 0}g</td>
                        <td className="py-3 px-4">{food.fats ?? 0}g</td>
                        <td className="py-3 px-4">{food.carbs ?? 0}g</td>
                        <td className="py-3 px-4">
                          <div className="flex gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditOpen(food)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-red-600 hover:text-red-400"
                              onClick={() => requestDelete(food)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-6 px-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => goToPage(currentPage - 1)}
                    disabled={currentPage === 1}
                  >
                    Previous
                  </Button>

                  <div className="flex gap-2 flex-wrap">
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                      <Button
                        key={page}
                        variant={page === currentPage ? "default" : "outline"}
                        size="sm"
                        className={page === currentPage ? "bg-red-600 hover:bg-red-700" : "border-white/20"}
                        onClick={() => goToPage(page)}
                      >
                        {page}
                      </Button>
                    ))}
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => goToPage(currentPage + 1)}
                    disabled={currentPage === totalPages}
                  >
                    Next
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="bg-black border-[#1c1c1e] text-white max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Food Item</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEditSubmit} className="space-y-4">
            <div>
              <Label>Food Name</Label>
              <Input name="name" value={editFormData.name} onChange={handleEditChange} required />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Calories (kcal)</Label>
                <Input type="number" step="0.1" name="calories" value={editFormData.calories} onChange={handleEditChange} required />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Protein (g)</Label>
                <Input type="number" step="0.1" name="protein" value={editFormData.protein} onChange={handleEditChange} required />
              </div>
              <div>
                <Label>Fats (g)</Label>
                <Input type="number" step="0.1" name="fats" value={editFormData.fats} onChange={handleEditChange} required />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Carbs (g)</Label>
                <Input type="number" step="0.1" name="carbs" value={editFormData.carbs} onChange={handleEditChange} required />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="ghost" onClick={() => setIsEditModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
                Save Changes
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent className="bg-black border-[#1c1c1e]">
          <DialogHeader>
            <DialogTitle className="text-white">Delete Food Item</DialogTitle>
          </DialogHeader>
          <p className="text-gray-400">
            Are you sure you want to delete{" "}
            <span className="text-white font-semibold">{selectedFood?.name || "this item"}</span>?
          </p>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsDeleteOpen(false)}>
              Cancel
            </Button>
            <Button className="bg-red-600 hover:bg-red-700" onClick={confirmDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Toaster richColors position="top-right" />
    </div>
  );
}