"use client"
import { useState } from 'react';
import { Button } from '../../../components/ui/Button';
import { Card, CardContent, CardHeader } from '../../../components/ui/Card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../../../components/ui/dialog';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../components/ui/select';
import { Dumbbell, Eye, Trash2 } from 'lucide-react';

const initialExercises = [
  { name: 'Incline Dumbell Press', group: 'Chest', difficulty: 'Intermediate', met: 3.8, status: 'Published' },
  { name: 'Lats Pull Down', group: 'Back', difficulty: 'Advanced', met: 8, status: 'Published' },
  { name: 'Squats', group: 'Legs', difficulty: 'Beginner', met: 5, status: 'Published' },
  { name: 'Shoulder Press', group: 'Shoulders', difficulty: 'Intermediate', met: 4.5, status: 'Published' },
  { name: 'Bicep Curls', group: 'Arms', difficulty: 'Beginner', met: 3.5, status: 'Published' },
];

const difficultyOptions = ['Beginner', 'Intermediate', 'Advanced'];
const groupOptions = ['Chest', 'Back', 'Legs', 'Shoulders', 'Arms'];

const difficultyColors = {
  Beginner: 'text-green-500',
  Intermediate: 'text-yellow-500',
  Advanced: 'text-orange-500',
};

export default function ExercisesPage() {
  const [exercises, setExercises] = useState(initialExercises);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    group: '',
    difficulty: '',
    met: '',
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name, value) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (formData.name && formData.group && formData.difficulty && formData.met) {
      const newExercise = {
        ...formData,
        met: parseFloat(formData.met),
        status: 'Published',
      };
      setExercises((prev) => [...prev, newExercise]);
      setFormData({ name: '', group: '', difficulty: '', met: '' });
      setIsModalOpen(false);
    }
  };

  const handleDelete = (index) => {
    setExercises((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-6 bg-black">
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
                <Input
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className="bg-[#1c1c1e] border-[#1c1c1e] text-white"
                  required
                />
              </div>
              <div>
                <Label htmlFor="group">Muscle Group</Label>
                <Select value={formData.group} onValueChange={(value) => handleSelectChange('group', value)}>
                  <SelectTrigger className="bg-[#1c1c1e] border-[#1c1c1e] text-white">
                    <SelectValue placeholder="Select a group" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1c1c1e] border-[#1c1c1e] text-white">
                    {groupOptions.map((group) => (
                      <SelectItem key={group} value={group} className="text-white">
                        {group}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="difficulty">Difficulty</Label>
                <Select value={formData.difficulty} onValueChange={(value) => handleSelectChange('difficulty', value)}>
                  <SelectTrigger className="bg-[#1c1c1e] border-[#1c1c1e] text-white">
                    <SelectValue placeholder="Select difficulty" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1c1c1e] border-[#1c1c1e] text-white">
                    {difficultyOptions.map((diff) => (
                      <SelectItem key={diff} value={diff} className="text-white">
                        {diff}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="met">MET Value</Label>
                <Input
                  id="met"
                  name="met"
                  type="number"
                  step="0.1"
                  value={formData.met}
                  onChange={handleInputChange}
                  className="bg-[#1c1c1e] border-[#1c1c1e] text-white"
                  required
                />
              </div>
              <div className="flex justify-end space-x-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" className="bg-red-600 hover:bg-red-700">
                  Add Exercise
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
      <Card className="bg-black border-[#1c1c1e]">
        <CardHeader className="pb-3">
          <div className="flex items-center space-x-2">
            <Dumbbell className="h-5 w-5 text-red-600" />
            <span className="text-lg font-semibold text-white">Exercises</span>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-white">
              <thead>
                <tr className="border-b border-[#1c1c1e]">
                  <th className="text-left py-3">Exercise Name</th>
                  <th className="text-left py-3">Muscle Group</th>
                  <th className="text-left py-3">Difficulty</th>
                  <th className="text-left py-3">MET Value</th>
                  <th className="text-left py-3">Status</th>
                  <th className="text-right py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {exercises.map((exercise, idx) => (
                  <tr key={idx} className="border-b border-black hover:bg-[#1c1c1e]">
                    <td className="py-3">{exercise.name}</td>
                    <td className="py-3">{exercise.group}</td>
                    <td className={`py-3 ${difficultyColors[exercise.difficulty]}`}>
                      {exercise.difficulty}
                    </td>
                    <td className="py-3">{exercise.met}</td>
                    <td className="py-3 text-green-500">{exercise.status}</td>
                    <td className="py-3 text-right">
                      <div className="flex space-x-2 justify-end">
                        <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 text-red-600 hover:text-red-500"
                          onClick={() => handleDelete(idx)}
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
        </CardContent>
      </Card>
    </div>
  );
}