import Link from 'next/link';
import { getToken, getUserType, getIsAdmin } from '@/app/lib/auth';
import DashboardShell from './DashboardShell';

export default async function DashboardLayout({ children }) {
  const token = await getToken();
  const userType = await getUserType();
  const isAdmin = await getIsAdmin();

  if (!token || (!isAdmin && userType !== 'gym')) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black px-4">
        <div className="w-full max-w-md rounded-lg border border-red-700 bg-red-950/60 p-6 text-center">
          <h1 className="text-xl font-semibold text-red-200">Access denied</h1>
          <p className="mt-2 text-sm text-red-100">
            You must have admin or gym privileges to view dashboard pages.
          </p>
          <Link
            href="/login"
            className="mt-5 inline-block rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-500"
          >
            Go to login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <DashboardShell>{children}</DashboardShell>
  );
}