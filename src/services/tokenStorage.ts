import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

// The JWT lives in the OS keychain / keystore via expo-secure-store.
// SecureStore is unavailable on web, so we fall back to AsyncStorage there (dev only).

const TOKEN_KEY = 'hously_auth_token';
const useSecure = Platform.OS !== 'web';

let memoryToken: string | null = null; // read synchronously by the axios interceptor

export async function loadToken(): Promise<string | null> {
  try {
    memoryToken = useSecure ? await SecureStore.getItemAsync(TOKEN_KEY) : await AsyncStorage.getItem(TOKEN_KEY);
  } catch {
    memoryToken = null;
  }
  return memoryToken;
}

export async function saveToken(token: string): Promise<void> {
  memoryToken = token;
  if (useSecure) await SecureStore.setItemAsync(TOKEN_KEY, token);
  else await AsyncStorage.setItem(TOKEN_KEY, token);
}

export async function clearToken(): Promise<void> {
  memoryToken = null;
  try {
    if (useSecure) await SecureStore.deleteItemAsync(TOKEN_KEY);
    else await AsyncStorage.removeItem(TOKEN_KEY);
  } catch {
    // nothing to clean up
  }
}

export function getToken(): string | null {
  return memoryToken;
}
