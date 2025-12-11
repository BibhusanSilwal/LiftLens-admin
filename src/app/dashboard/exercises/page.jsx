import { Button } from '../../../components/ui/Button';
import { Card, CardContent, CardHeader } from '../../../components/ui/Card';
import { Dumbbell, Eye, Trash2 } from 'lucide-react';

const mockExercises = [
  { name: 'Push-ups', group: 'Chest', difficulty: 'Beginner', met: 3.8, status: 'Published' },
  { name: 'Pull-ups', group: 'Back', difficulty: 'Advanced', met: 8, status: 'Published' },
  { name: 'Squats', group: 'Legs', difficulty: 'Beginner', met: 5, status: 'Published' },
  { name: 'Shoulder Press', group: 'Shoulders', difficulty: 'Intermediate', met: 4.5, status: 'Published' },
  { name: 'Bicep Curls', group: 'Arms', difficulty: 'Beginner', met: 3.5, status: 'Published' },
];

const difficultyColors = {
  Beginner: 'text-green-500',
  Intermediate: 'text-yellow-500',
  Advanced: 'text-orange-500',
};

export default function ExercisesPage() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Exercise Catalog</h1>
        <Button className="bg-orange-500 hover:bg-orange-600">+ Add Exercise</Button>
      </div>
      <Card className="bg-gray-900 border-gray-800">
        <CardHeader className="pb-3">
          <div className="flex items-center space-x-2">
            <Dumbbell className="h-5 w-5 text-orange-500" />
            <span className="text-lg font-semibold">Exercises</span>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="text-left py-3">Exercise Name</th>
                  <th className="text-left py-3">Muscle Group</th>
                  <th className="text-left py-3">Difficulty</th>
                  <th className="text-left py-3">MET Value</th>
                  <th className="text-left py-3">Status</th>
                  <th className="text-right py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {mockExercises.map((exercise, idx) => (
                  <tr key={idx} className="border-b border-gray-800 hover:bg-gray-800">
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
                        <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
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