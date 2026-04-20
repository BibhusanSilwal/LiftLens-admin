import { redirect } from 'next/navigation';
import { getToken } from '@/app/lib/auth';

export default async function HomePage() {
  const token = await getToken();

  if (token) {
    redirect('/dashboard');
  }

  redirect('/login');
}