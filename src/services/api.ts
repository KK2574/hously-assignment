import axios, {
  AxiosError,
  type AxiosAdapter,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from 'axios';

import { API_BASE_URL, MOCK_CONFIG, USE_MOCK } from './config';
import { handleMockRequest } from './mock/server';
import { getToken } from './tokenStorage';

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Axios adapter that answers requests from the in-app mock server instead of the network. */
const mockAdapter: AxiosAdapter = async (config: InternalAxiosRequestConfig): Promise<AxiosResponse> => {
  const { minLatencyMs, maxLatencyMs, failureRate } = MOCK_CONFIG;
  await sleep(minLatencyMs + Math.random() * (maxLatencyMs - minLatencyMs));

  if (failureRate > 0 && Math.random() < failureRate) {
    throw new AxiosError('Network Error', AxiosError.ERR_NETWORK, config);
  }

  const url = (config.url ?? '').replace(config.baseURL ?? '', '');
  const [path, qs = ''] = url.split('?');
  const query: Record<string, string> = {};
  new URLSearchParams(qs).forEach((v, k) => (query[k] = v));
  Object.entries((config.params as Record<string, unknown>) ?? {}).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') query[k] = String(v);
  });

  const auth = config.headers?.Authorization;
  const token = typeof auth === 'string' && auth.startsWith('Bearer ') ? auth.slice(7) : null;
  const body = typeof config.data === 'string' ? JSON.parse(config.data) : config.data;

  const res = await handleMockRequest({ method: (config.method ?? 'get').toUpperCase(), path, query, body, token });
  const response: AxiosResponse = { data: res.data, status: res.status, statusText: String(res.status), headers: {}, config };

  if (res.status >= 200 && res.status < 300) return response;
  throw new AxiosError(res.data?.message ?? 'Request failed', AxiosError.ERR_BAD_REQUEST, config, null, response);
};

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15_000,
  headers: { 'Content-Type': 'application/json' },
  ...(USE_MOCK ? { adapter: mockAdapter } : {}),
});

api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ---- 401 handling: the AuthContext registers a callback that logs the user out.
let onUnauthorized: (() => void) | null = null;
export function setUnauthorizedHandler(fn: (() => void) | null) {
  onUnauthorized = fn;
}

api.interceptors.response.use(
  (r) => r,
  (error: AxiosError<{ message?: string }>) => {
    const isAuthCall = error.config?.url?.startsWith('/auth/login') || error.config?.url?.startsWith('/auth/register');
    if (error.response?.status === 401 && !isAuthCall) onUnauthorized?.();
    return Promise.reject(error);
  },
);

/** Converts any thrown value into a message that is safe to show in the UI. */
export function getErrorMessage(error: unknown, fallback = 'Something went wrong. Please try again.'): string {
  if (axios.isAxiosError(error)) {
    if (error.code === 'ECONNABORTED') return 'The request timed out. Please try again.';
    if (!error.response) return 'Network error. Check your connection and try again.';
    const msg = (error.response.data as { message?: string } | undefined)?.message;
    return msg ?? fallback;
  }
  return error instanceof Error ? error.message : fallback;
}
