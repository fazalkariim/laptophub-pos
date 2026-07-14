import { useMutation } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

export function useForgotPassword() {
  return useMutation({
    mutationFn: async (email: string) => {
      const res = await apiClient.post<{ message: string }>(
        '/auth/forgot-password',
        { email }
      );
      return res.data;
    },
  });
}

export function useResetPasswordWithToken() {
  return useMutation({
    mutationFn: async (input: { token: string; newPassword: string }) => {
      const res = await apiClient.post<{ message: string }>(
        '/auth/reset-password-with-token',
        input
      );
      return res.data;
    },
  });
}