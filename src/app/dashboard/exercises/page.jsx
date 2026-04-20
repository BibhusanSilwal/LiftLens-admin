"use client";

import { useState, useEffect } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../components/ui/select";
import { Dumbbell, Pen, Trash2 } from "lucide-react";
import { toast, Toaster } from "sonner";

const difficultyOptions = ["beginner", "intermediate", "advanced"];
const exerciseTypeOptions = [
  "strength",
  "cardio",
  "flexibility",
  "balance",
  "mobility",
  "sports",
];
const groupOptions = [
  "chest",
  "back",
  "legs",
  "shoulders",
  "arms",
  "core",
  "full_body",
];

const difficultyColors = {
  Beginner: "text-green-500",
  Intermediate: "text-yellow-500",
  Advanced: "text-orange-500",
};

export default function ExercisesPage() {
  const [exercises, setExercises] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isUpdateConfirmOpen, setIsUpdateConfirmOpen] = useState(false);

  /* Delete dialog state */
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedExercise, setSelectedExercise] = useState(null);

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    exercise_type: "",
    muscle_group: "",
    difficulty: "",
    met_value: "",
  });

  const [editFormData, setEditFormData] = useState({
    name: "",
    description: "",
    exercise_type: "",
    muscle_group: "",
    difficulty: "",
    status: "active",
    met_value: "",
  });

  const capitalize = (str) => str.charAt(0).toUpperCase() + str.slice(1);

  /* =======================
     FETCH EXERCISES
  ======================= */

  const fetchExercises = async () => {
    try {
      const res = await fetch("/api/exercises");
      if (!res.ok) throw new Error();
      const data = await res.json();
      setExercises(data);
    } catch {
      alert("Failed to fetch exercises");
    }
  };

  useEffect(() => {
    fetchExercises();
  }, []);

  /* =======================
     FORM HANDLERS
  ======================= */

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name, value) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleEditInputChange = (e) => {
    const { name, value } = e.target;
    setEditFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleEditSelectChange = (name, value) => {
    setEditFormData((prev) => ({ ...prev, [name]: value }));
  };

  /* =======================
     ADD EXERCISE
  ======================= */

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const payload = {
        ...formData,
        description: formData.description || "",
        exercise_type: formData.exercise_type.toLowerCase(),
        difficulty: formData.difficulty.toLowerCase(),
        muscle_group: formData.muscle_group.toLowerCase(),
        status: "active",
        met_value: parseFloat(formData.met_value),
      };

      const res = await fetch("/api/exercises", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.detail);

      setExercises((prev) => [...prev, data]);
      setFormData({
        name: "",
        description: "",
        exercise_type: "",
        muscle_group: "",
        difficulty: "",
        met_value: "",
      });
      setIsModalOpen(false);
      toast.success("Exercise added successfully");
    } catch (err) {
      toast.error(err?.message || "Failed to add exercise");
    }
  };

  const openEditDialog = async (exerciseId) => {
    try {
      const res = await fetch(`/api/exercises/${exerciseId}`);
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.detail || "Failed to load exercise");
      }

      setSelectedExercise(data);
      setEditFormData({
        name: data.name || "",
        description: data.description || "",
        exercise_type: data.exercise_type || "",
        muscle_group: data.muscle_group || "",
        difficulty: data.difficulty || "",
        status: data.status || "active",
        met_value:
          data.met_value === null || data.met_value === undefined
            ? ""
            : String(data.met_value),
      });
      setIsEditModalOpen(true);
    } catch (err) {
      toast.error(err?.message || "Failed to load exercise details");
    }
  };

  const handleEditSubmit = (e) => {
    e.preventDefault();
    setIsUpdateConfirmOpen(true);
  };

  const confirmUpdateExercise = async () => {
    if (!selectedExercise?.id) return;

    const payload = {};

    if (editFormData.name !== selectedExercise.name) {
      payload.name = editFormData.name;
    }

    if ((editFormData.description || "") !== (selectedExercise.description || "")) {
      payload.description = editFormData.description || "";
    }

    if (
      editFormData.exercise_type.toLowerCase() !==
      (selectedExercise.exercise_type || "").toLowerCase()
    ) {
      payload.exercise_type = editFormData.exercise_type.toLowerCase();
    }

    if (
      editFormData.muscle_group.toLowerCase() !==
      (selectedExercise.muscle_group || "").toLowerCase()
    ) {
      payload.muscle_group = editFormData.muscle_group.toLowerCase();
    }

    if (
      editFormData.difficulty.toLowerCase() !==
      (selectedExercise.difficulty || "").toLowerCase()
    ) {
      payload.difficulty = editFormData.difficulty.toLowerCase();
    }

    if (
      editFormData.status.toLowerCase() !==
      (selectedExercise.status || "").toLowerCase()
    ) {
      payload.status = editFormData.status.toLowerCase();
    }

    const nextMet = editFormData.met_value === "" ? null : parseFloat(editFormData.met_value);
    const currentMet =
      selectedExercise.met_value === null || selectedExercise.met_value === undefined
        ? null
        : Number(selectedExercise.met_value);

    if (nextMet !== currentMet) {
      payload.met_value = nextMet;
    }

    if (Object.keys(payload).length === 0) {
      toast.error("No fields were changed");
      setIsUpdateConfirmOpen(false);
      return;
    }

    try {
      const res = await fetch(`/api/exercises/${selectedExercise.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.detail || "Failed to update exercise");
      }

      setExercises((prev) => prev.map((ex) => (ex.id === selectedExercise.id ? data : ex)));
      setSelectedExercise(data);
      setIsUpdateConfirmOpen(false);
      setIsEditModalOpen(false);
      toast.success("Exercise updated successfully");
    } catch (err) {
      toast.error(err?.message || "Failed to update exercise");
    }
  };

  /* =======================
     DELETE FLOW
  ======================= */

  const requestDelete = (exercise) => {
    setSelectedExercise(exercise);
    setIsDeleteOpen(true);
  };

  const confirmDelete = async () => {
    try {
      await fetch(`/api/exercises/${selectedExercise.id}`, {
        method: "DELETE",
      });

      setExercises((prev) =>
        prev.filter((ex) => ex.id !== selectedExercise.id)
      );
      setIsDeleteOpen(false);
      setSelectedExercise(null);
      toast.success("Exercise deleted successfully");
    } catch {
      alert("Failed to delete exercise");
    }
  };

  /* =======================
     UI
  ======================= */

  return (
    <div className="space-y-6 bg-black">
      {/* HEADER */}
      <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
        <h1 className="text-2xl font-bold text-white">Exercise Catalog</h1>

        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogTrigger asChild>
            <Button className="bg-red-600 hover:bg-red-700">
              + Add Exercise
            </Button>
          </DialogTrigger>

          <DialogContent className="bg-black border-[#1c1c1e] text-white">
            <DialogHeader>
              <DialogTitle>Add New Exercise</DialogTitle>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label>Exercise Name</Label>
                <Input
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                />
              </div>

              <div>
                <Label>Description (Optional)</Label>
                <Input
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                />
              </div>

              <div>
                <Label>Exercise Type</Label>
                <Select
                  value={formData.exercise_type}
                  onValueChange={(v) => handleSelectChange("exercise_type", v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent className="z-1000 bg-black text-white border-[#1c1c1e]">
                    {exerciseTypeOptions.map((type) => (
                      <SelectItem key={type} value={type}>
                        {capitalize(type)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Muscle Group</Label>
                <Select
                  value={formData.muscle_group}
                  onValueChange={(v) =>
                    handleSelectChange("muscle_group", v)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select group" />
                  </SelectTrigger>
                  <SelectContent className="z-1000 bg-black text-white border-[#1c1c1e]">
                    {groupOptions.map((g) => (
                      <SelectItem key={g} value={g}>
                        {capitalize(g)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Difficulty</Label>
                <Select
                  value={formData.difficulty}
                  onValueChange={(v) =>
                    handleSelectChange("difficulty", v)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select difficulty" />
                  </SelectTrigger>
                  <SelectContent className="z-1000 bg-black text-white border-[#1c1c1e]">
                    {difficultyOptions.map((d) => (
                      <SelectItem key={d} value={d}>
                        {capitalize(d)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>MET Value</Label>
                <Input
                  type="number"
                  step="0.1"
                  name="met_value"
                  value={formData.met_value}
                  onChange={handleInputChange}
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setIsModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" className="bg-red-600">
                  Add Exercise
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* TABLE */}
      <Card className="bg-black border-[#1c1c1e]">
        <CardHeader className="flex flex-row items-center gap-2">
          <Dumbbell className="h-5 w-5 text-red-600" />
          <span className="text-lg font-semibold text-white">
            Exercises
          </span>
        </CardHeader>

        <CardContent>
          <div className="overflow-x-auto">
          <table className="w-full min-w-[700px] text-white">
            <thead>
              <tr>
                <th>Name</th>
                <th>Group</th>
                <th>Difficulty</th>
                <th>MET</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>
              {exercises.map((ex) => {
                const diffCap = capitalize(ex.difficulty);
                return (
                  <tr key={ex.id}>
                    <td>{ex.name}</td>
                    <td>{capitalize(ex.muscle_group)}</td>
                    <td className={difficultyColors[diffCap]}>
                      {diffCap}
                    </td>
                    <td>{ex.met_value}</td>
                    <td className="text-green-500">{ex.status}</td>
                    <td>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditDialog(ex.id)}
                        >
                          <Pen className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-600"
                          onClick={() => requestDelete(ex)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          </div>
        </CardContent>
      </Card>

      {/* DELETE CONFIRM DIALOG */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent className="bg-black border-[#1c1c1e]">
          <DialogHeader>
            <DialogTitle className="text-white">
              Delete Exercise
            </DialogTitle>
          </DialogHeader>

          <p className="text-gray-400">
            Are you sure you want to delete{" "}
            <span className="text-white font-semibold">
              {selectedExercise?.name}
            </span>
            ?
          </p>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsDeleteOpen(false)}>
              Cancel
            </Button>
            <Button className="bg-red-600" onClick={confirmDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* EDIT EXERCISE DIALOG */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="bg-black border-[#1c1c1e] text-white">
          <DialogHeader>
            <DialogTitle>Update Exercise</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleEditSubmit} className="space-y-4">
            <div>
              <Label>Exercise Name</Label>
              <Input
                name="name"
                value={editFormData.name}
                onChange={handleEditInputChange}
              />
            </div>

            <div>
              <Label>Description (Optional)</Label>
              <Input
                name="description"
                value={editFormData.description}
                onChange={handleEditInputChange}
              />
            </div>

            <div>
              <Label>Exercise Type</Label>
              <Select
                value={editFormData.exercise_type}
                onValueChange={(v) => handleEditSelectChange("exercise_type", v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent className="z-1000 bg-black text-white border-[#1c1c1e]">
                  {exerciseTypeOptions.map((type) => (
                    <SelectItem key={type} value={type}>
                      {capitalize(type)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Muscle Group</Label>
              <Select
                value={editFormData.muscle_group}
                onValueChange={(v) => handleEditSelectChange("muscle_group", v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select group" />
                </SelectTrigger>
                <SelectContent className="z-1000 bg-black text-white border-[#1c1c1e]">
                  {groupOptions.map((g) => (
                    <SelectItem key={g} value={g}>
                      {capitalize(g)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Difficulty</Label>
              <Select
                value={editFormData.difficulty}
                onValueChange={(v) => handleEditSelectChange("difficulty", v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select difficulty" />
                </SelectTrigger>
                <SelectContent className="z-1000 bg-black text-white border-[#1c1c1e]">
                  {difficultyOptions.map((d) => (
                    <SelectItem key={d} value={d}>
                      {capitalize(d)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Status</Label>
              <Select
                value={editFormData.status}
                onValueChange={(v) => handleEditSelectChange("status", v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent className="z-1000 bg-black text-white border-[#1c1c1e]">
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>MET Value</Label>
              <Input
                type="number"
                step="0.1"
                name="met_value"
                value={editFormData.met_value}
                onChange={handleEditInputChange}
              />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsEditModalOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" className="bg-red-600">
                Update Exercise
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* UPDATE CONFIRM DIALOG */}
      <Dialog open={isUpdateConfirmOpen} onOpenChange={setIsUpdateConfirmOpen}>
        <DialogContent className="bg-black border-[#1c1c1e]">
          <DialogHeader>
            <DialogTitle className="text-white">Confirm Update</DialogTitle>
          </DialogHeader>

          <p className="text-gray-400">Are you sure you want to update this exercise?</p>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsUpdateConfirmOpen(false)}>
              Cancel
            </Button>
            <Button className="bg-red-600" onClick={confirmUpdateExercise}>
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Toaster />
    </div>
  );
}