// Set EXPO_PUBLIC_API_URL (in a .env file) to point the app at a real backend.
// When it is not set, the app runs against the built-in mock API (see services/mock/*).

export const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'https://api.hously.mock/v1';
export const USE_MOCK = !process.env.EXPO_PUBLIC_API_URL;

export const MOCK_CONFIG = {
  /** Simulated network latency range (ms). */
  minLatencyMs: 250,
  maxLatencyMs: 650,
  /**
   * Probability (0-1) that a request fails with a network error.
   * Set to e.g. 0.3 while testing to see the error / retry states.
   */
  failureRate: 0,
};
