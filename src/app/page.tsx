"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { readPersistedAuthSnapshot } from '@/utils/authStorage';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    const snapshot = readPersistedAuthSnapshot();
    const hasPlatformToken = Boolean(
      snapshot.platformAuth.platformToken && snapshot.platformAuth.platformTokenName,
    );

    if (!hasPlatformToken) {
      router.replace('/login');
      return;
    }

    if (snapshot.platformAuth.principalType === 'platform-admin') {
      router.replace('/admin/dashboard');
      return;
    }

    router.replace('/dashboard');
  }, [router]);

  return null;
}
