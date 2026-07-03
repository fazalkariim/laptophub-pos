'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient, tokenStore } from '@/lib/api-client';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';

export default function LoginPage() {
  const router = useRouter();
  const setUser = useAuth((s) => s.setUser);
  const [email, setEmail] = useState('admin@laptophub.com');
  const [password, setPassword] = useState('password123');
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await apiClient.post('/auth/login', { email, password });
      tokenStore.set(data.accessToken, data.refreshToken);
      setUser(data.user);
      toast.success('Login ho gaya');
      router.push('/dashboard');
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? 'Login fail ho gaya');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50">
      <Card className="w-full max-w-sm p-6 space-y-4">
        <h1 className="text-xl font-semibold">LaptopHub — Login</h1>
        <form onSubmit={handleLogin} className="space-y-3">
          <Input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <Input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} />
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Login ho raha...' : 'Login'}
          </Button>
        </form>
      </Card>
    </div>
  );
}