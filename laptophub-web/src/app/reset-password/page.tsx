'use client';

import { useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import { useResetPasswordWithToken } from '@/hooks/useForgotPassword';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';

export default function ResetPasswordPage() {
  const params = useSearchParams();
  const router = useRouter();
  const token = params.get('token');

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [done, setDone] = useState(false);
  const resetPassword = useResetPasswordWithToken();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!token) {
      toast.error('Link invalid hai — token missing.');
      return;
    }
    if (newPassword.length < 6) {
      toast.error('Password kam se kam 6 characters ka ho.');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('Password match nahi kar rahe.');
      return;
    }

    resetPassword.mutate(
      { token, newPassword },
      {
        onSuccess: () => {
          toast.success('Password reset ho gaya');
          setDone(true);
          setTimeout(() => router.push('/login'), 2000);
        },
        onError: (err: any) => {
          toast.error(
            err?.response?.data?.message ??
              'Link expire ho chuka hai ya invalid hai'
          );
        },
      }
    );
  }

  if (!token) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted p-4">
        <Card className="w-full max-w-sm space-y-4 p-8 text-center">
          <h1 className="text-xl font-heading font-semibold">Invalid Link</h1>
          <p className="text-sm text-muted-foreground">
            Ye reset link theek nahi hai ya token missing hai.
          </p>
          <Link
            href="/forgot-password"
            className="text-sm font-medium text-tertiary hover:underline"
          >
            Naya reset link mangayein
          </Link>
        </Card>
      </div>
    );
  }

  if (done) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted p-4">
        <Card className="w-full max-w-sm space-y-4 p-8 text-center">
          <h1 className="text-xl font-heading font-semibold">Password Reset Ho Gaya</h1>
          <p className="text-sm text-muted-foreground">
            Login page pe le ja rahe hain…
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted p-4">
      <Card className="w-full max-w-sm space-y-6 p-8">
        <div className="space-y-1 text-center">
          <h1 className="text-2xl font-heading font-semibold">Naya Password Set Karein</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="newPassword">Naya Password</Label>
            <Input
              id="newPassword"
              type="password"
              autoComplete="new-password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              disabled={resetPassword.isPending}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="confirmPassword">Naya Password (dobara)</Label>
            <Input
              id="confirmPassword"
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              disabled={resetPassword.isPending}
            />
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={resetPassword.isPending}
          >
            {resetPassword.isPending ? 'Reset ho raha…' : 'Password Reset Karein'}
          </Button>
        </form>
      </Card>
    </div>
  );
}