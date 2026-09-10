import 'react-native-url-polyfill/auto';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { createClient, type SupportedStorage } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error(
    'Missing EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY — copy .env.example to .env.local.'
  );
}

/**
 * The session (and its refresh token) lives in the Keychain via
 * expo-secure-store, not AsyncStorage — ARCHITECTURE.md §5 is explicit that
 * a refresh token must never sit somewhere readable by other apps or a
 * plain filesystem dump. That module's native binding is a stub on web
 * (there's no Keychain equivalent in a browser), so every call throws —
 * not a rare edge case, but the very first thing that runs after any
 * sign-in, which would break auth completely for anyone testing via
 * `expo start --web`. Web isn't the target platform (see PLAN.md's
 * "Desktop testing" note) so `localStorage` — no keychain-grade guarantee,
 * fine for a browser tab used to click through the app locally — is a
 * reasonable fallback there; native builds are unaffected.
 */
const secureStoreAdapter: SupportedStorage = {
  getItem: (key) => SecureStore.getItemAsync(key),
  setItem: (key, value) => SecureStore.setItemAsync(key, value),
  removeItem: (key) => SecureStore.deleteItemAsync(key),
};

const webStorageAdapter: SupportedStorage = {
  getItem: async (key) => globalThis.localStorage?.getItem(key) ?? null,
  setItem: async (key, value) => globalThis.localStorage?.setItem(key, value),
  removeItem: async (key) => globalThis.localStorage?.removeItem(key),
};

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: Platform.OS === 'web' ? webStorageAdapter : secureStoreAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
