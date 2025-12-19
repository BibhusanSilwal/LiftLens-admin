"use client";

import { useState, useEffect } from "react";
import { Button } from "../../../components/ui/Button";
import { Card, CardContent, CardHeader } from "../../../components/ui/Card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "../../../components/ui/dialog";
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../../components/ui/select";
import { Dumbbell, Eye, Trash2 } from "lucide-react";

const difficultyOptions = ["beginner", "intermediate", "advanced"];
const groupOptions = ["chest", "back", "legs", "shoulders", "arms", "core", "full_body"];
const difficultyColors = { Beginner: "text-green-500", Intermediate: "text-yellow-500", Advanced: "text-orange-500" };

export default function ExercisesPage() {
  const [exercises, setExercises] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ 
    name: "", 
    description: "", 
    muscle_group: "", 
    difficulty: "", 
    met_value: "" 
  });

  // Helper: Capitalize first letter for display
  const capitalize = (str) => str.charAt(0).toUpperCase() + str.slice(1);

  // ------------------------------
  // Fetch exercises from API
  // ------------------------------
  const fetchExercises = async () => {
    try {
      const res = await fetch("/api/exercises");
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setExercises(data);
    } catch (err) {
      console.error(err);
      alert("Failed to fetch exercises");
    }
  };

  useEffect(() => {
    fetchExercises();
  }, []);

  // ------------------------------
  // Handle form changes
  // ------------------------------
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name, value) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // ------------------------------
  // Add new exercise
  // ------------------------------
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const transformedPayload = {
        ...formData,
        description: formData.description || "",
        difficulty: formData.difficulty.toLowerCase(),
        muscle_group: formData.muscle_group.toLowerCase(),
        status: "active",
        met_value: parseFloat(formData.met_value),
      };

      const res = await fetch("/api/exercises", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(transformedPayload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Failed to add");
      setExercises((prev) => [...prev, data]);
      setFormData({ name: "", description: "", muscle_group: "", difficulty: "", met_value: "" });
      setIsModalOpen(false);
    } catch (err) {
      console.error(err);
      alert(err.message || "Failed to add exercise");
    }
  };

  // ------------------------------
  // Delete exercise
  // ------------------------------
  const handleDelete = async (id) => {
    if (!confirm("Are you sure?")) return;
    try {
      const res = await fetch(`/api/exercises/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      setExercises((prev) => prev.filter((ex) => ex.id !== id));
    } catch (err) {
      console.error(err);
      alert("Failed to delete exercise");
    }
  };

  // ------------------------------
  // JSX
  // ------------------------------
  return (
    <div className="space-y-6 bg-black p-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-white">Exercise Catalog</h1>
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogTrigger asChild>
            <Button className="bg-red-600 hover:bg-red-700">+ Add Exercise</Button>
          </DialogTrigger>
          <DialogContent className="bg-black border-[#1c1c1e] text-white">
            <DialogHeader>
              <DialogTitle>Add New Exercise</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="name">Exercise Name</Label>
                <Input id="name" name="name" value={formData.name} onChange={handleInputChange} className="bg-[#1c1c1e] text-white border-[#1c1c1e]" required />
              </div>
              <div>
                <Label htmlFor="description">Description (Optional)</Label>
                <Input id="description" name="description" value={formData.description} onChange={handleInputChange} className="bg-[#1c1c1e] text-white border-[#1c1c1e]" />
              </div>
              <div>
                <Label htmlFor="muscle_group">Muscle Group</Label>
                <Select value={formData.muscle_group} onValueChange={(value) => handleSelectChange("muscle_group", value)}>
                  <SelectTrigger className="bg-[#1c1c1e] text-white border-[#1c1c1e]">
                    <SelectValue placeholder="Select a group" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1c1c1e] text-white border-[#1c1c1e]">
                    {groupOptions.map((g) => <SelectItem key={g} value={g}>{capitalize(g)}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="difficulty">Difficulty</Label>
                <Select value={formData.difficulty} onValueChange={(value) => handleSelectChange("difficulty", value)}>
                  <SelectTrigger className="bg-[#1c1c1e] text-white border-[#1c1c1e]">
                    <SelectValue placeholder="Select difficulty" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1c1c1e] text-white border-[#1c1c1e]">
                    {difficultyOptions.map((d) => <SelectItem key={d} value={d}>{capitalize(d)}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="met_value">MET Value</Label>
                <Input type="number" step="0.1" id="met_value" name="met_value" value={formData.met_value} onChange={handleInputChange} className="bg-[#1c1c1e] text-white border-[#1c1c1e]" required />
              </div>
              <div className="flex justify-end space-x-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                <Button type="submit" className="bg-red-600 hover:bg-red-700">Add Exercise</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="bg-black border-[#1c1c1e]">
        <CardHeader>
          <div className="flex items-center space-x-2">
            <Dumbbell className="h-5 w-5 text-red-600" />
            <span className="text-lg font-semibold text-white">Exercises</span>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-white">
              <thead>
                <tr>
                  <th>Exercise Name</th>
                  <th>Muscle Group</th>
                  <th>Difficulty</th>
                  <th>MET Value</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {exercises.map((ex) => {
                  const diffCap = capitalize(ex.difficulty);
                  const groupCap = capitalize(ex.muscle_group);
                  return (
                    <tr key={ex.id}>
                      <td>{ex.name}</td>
                      <td>{groupCap}</td>
                      <td className={difficultyColors[diffCap]}>{diffCap}</td>
                      <td>{ex.met_value}</td>
                      <td className="text-green-500">{ex.status}</td>
                      <td>
                        <div className="flex space-x-2">
                          <Button variant="ghost" size="sm"><Eye className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-500" onClick={() => handleDelete(ex.id)}>
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
    </div>
  );
}