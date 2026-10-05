import { redirect } from 'next/navigation';
import { getToken, getUserType } from '@/app/lib/auth';

export default async function HomePage() {
  const token = await getToken();
  const userType = await getUserType();

  if (token) {
    if (userType === 'gym') {
      redirect('/dashboard/users');
    } else {
      redirect('/dashboard');
    }
  }

  redirect('/login');
}