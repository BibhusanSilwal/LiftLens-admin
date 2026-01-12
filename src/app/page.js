'use client';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { getToken } from '@/app/lib/auth'; // Your auth lib

export default function ProtectedPage() {
  const router = useRouter();
  useEffect(() => {
    if (!getToken()) {
      router.push('/login');
    }
  }, [router]);

  if (!getToken()) return null; // Or loading spinner
  return <div>Your protected content</div>;
}