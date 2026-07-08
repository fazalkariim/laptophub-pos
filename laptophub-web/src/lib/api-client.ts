import axios from 'axios';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';

export const apiClient = axios.create({ baseURL: BASE_URL });

// Token storage helpers
export const tokenStore = {
  getAccess: () => (typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null),
  getRefresh: () => (typeof window !== 'undefined' ? localStorage.getItem('refreshToken') : null),
  set: (access: string, refresh: string) => {
    localStorage.setItem('accessToken', access);
    localStorage.setItem('refreshToken', refresh);
  },
  clear: () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
  },
};

// Har request pe access token lagao
apiClient.interceptors.request.use((config) => {
  const token = tokenStore.getAccess();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// 401 pe refresh try karo, phir original request dobara
let isRefreshing = false;
let queue: Array<(t: string) => void> = [];

apiClient.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    if (error.response?.status !== 401 || original._retry) {
      return Promise.reject(error);
    }
    // Refresh endpoint khud 401 de to seedha logout
    if (original.url?.includes('/auth/refresh')) {
      tokenStore.clear();
      if (typeof window !== 'undefined') window.location.href = '/login';
      return Promise.reject(error);
    }

    original._retry = true;

    if (isRefreshing) {
      // Doosri requests ko queue karo jab tak refresh ho raha
      return new Promise((resolve) => {
        queue.push((token: string) => {
          original.headers.Authorization = `Bearer ${token}`;
          resolve(apiClient(original));
        });
      });
    }

   isRefreshing = true;
    try {
      const refreshToken = tokenStore.getRefresh();
      const { data } = await axios.post(
        `${BASE_URL}/auth/refresh`,
        {},
        {
          headers: { Authorization: `Bearer ${refreshToken}` },
          timeout: 8000, // network hang se bachne ke liye
        }
      );
      tokenStore.set(data.accessToken, data.refreshToken);
      queue.forEach((cb) => cb(data.accessToken));
      queue = [];
      original.headers.Authorization = `Bearer ${data.accessToken}`;
      return apiClient(original);
    } catch (e: any) {
      queue = [];
      // Agar refresh khud se koi jawab na de (network/timeout fail),
      // to login se mat nikaalo — cart/sale data bachao, error upar bhej do
      // taake retry-queue usse network-fail samjhe.
      if (!e?.response) {
        return Promise.reject(e);
      }
      // Refresh token sach mein invalid/expired hai (backend ne 401 diya) — ab logout theek hai
      tokenStore.clear();
      if (typeof window !== 'undefined') window.location.href = '/login';
      return Promise.reject(e);
    } finally {
      isRefreshing = false;
    }
  },
);