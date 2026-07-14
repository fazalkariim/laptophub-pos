'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useForgotPassword } from '@/hooks/useForgotPassword';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const forgotPassword = useForgotPassword();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    forgotPassword.mutate(email, {
      onSuccess: () => setSubmitted(true),
      onSettled: () => setSubmitted(true), // rate-limit/error pe bhi same message dikhao
    });
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted p-4">
      <Card className="w-full max-w-sm space-y-6 p-8">
        <div className="space-y-1 text-center">
          <h1 className="text-2xl font-heading font-semibold">Password Bhool Gaye?</h1>
          <p className="text-sm text-muted-foreground">
            Apna admin email daalein, reset link bhej denge.
          </p>
        </div>

        {submitted ? (
          <div className="space-y-4 text-center">
            <p className="text-sm">
              Agar ye email ek admin account hai, reset link bhej diya gaya hai.
              Apna inbox check karein (30 minute mein expire ho jaayega).
            </p>
            <Link
              href="/login"
              className="text-sm font-medium text-tertiary hover:underline"
            >
              ← Login pe wapas jayein
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="admin@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={forgotPassword.isPending}
              />
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={forgotPassword.isPending}
            >
              {forgotPassword.isPending ? 'Bhej rahe…' : 'Reset Link Bhejein'}
            </Button>

            <p className="text-center text-xs text-muted-foreground">
              <Link href="/login" className="hover:underline">
                ← Login pe wapas jayein
              </Link>
            </p>
          </form>
        )}
      </Card>
    </div>
  );
}