import { Button } from '../../../components/ui/Button';
import { Card, CardContent, CardHeader } from '../../../components/ui/Card';
import { Users, Flame, AlertTriangle, Clock } from 'lucide-react';

const mockUsers = [
  { email: 'user1@example.com', streak: 12, risk: 'Low', status: 'Active', lastActive: '2 hours ago' },
  { email: 'user2@example.com', streak: 45, risk: 'Medium', status: 'Active', lastActive: '1 day ago' },
  { email: 'user3@example.com', streak: 3, risk: 'High', status: 'Inactive', lastActive: '5 days ago' },
  { email: 'user4@example.com', streak: 28, risk: 'Low', status: 'Active', lastActive: '3 hours ago' },
];

const riskColors = {
  Low: 'text-green-500',
  Medium: 'text-yellow-500',
  High: 'text-red-500',
};

const statusColors = {
  Active: 'text-green-500',
  Inactive: 'text-red-500',
};

export default function UsersPage() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">User Management</h1>
        <Button className="bg-orange-500 hover:bg-orange-600">+ Add New User</Button>
      </div>
      <Card className="bg-gray-900 border-gray-800">
        <CardHeader className="pb-3">
          <div className="flex items-center space-x-2">
            <Users className="h-5 w-5 text-orange-500" />
            <span className="text-lg font-semibold">Users</span>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex space-x-4 mb-4">
            <input type="text" placeholder="Search users..." className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white placeholder-gray-400" />
            <select className="bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white">
              <option>Filter</option>
            </select>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="text-left py-3">User</th>
                  <th className="text-left py-3">Streak</th>
                  <th className="text-left py-3">Injury Risk</th>
                  <th className="text-left py-3">Status</th>
                  <th className="text-left py-3">Last Active</th>
                  <th className="text-right py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {mockUsers.map((user, idx) => (
                  <tr key={idx} className="border-b border-gray-800 hover:bg-gray-800">
                    <td className="py-3">{user.email}</td>
                    <td className="py-3 flex items-center space-x-1">
                      <Flame className="h-4 w-4 text-orange-500" />
                      <span>{user.streak} days</span>
                    </td>
                    <td className={`py-3 ${riskColors[user.risk]}`}>
                      {user.risk}
                    </td>
                    <td className={`py-3 ${statusColors[user.status]}`}>
                      {user.status}
                    </td>
                    <td className="py-3">
                      <Clock className="h-4 w-4 inline mr-1" />
                      {user.lastActive}
                    </td>
                    <td className="py-3 text-right">
                      <div className="flex space-x-2 justify-end">
                        <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                          ✏️
                        </Button>
                        <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                          🗑️
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