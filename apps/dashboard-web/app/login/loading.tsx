'use client';

import { AuthSkeleton } from '@/components/ui/AuthSkeleton';

export default function LoginLoading() {
  return <AuthSkeleton title="w-72" fields={2} showForgotRow />;
}
