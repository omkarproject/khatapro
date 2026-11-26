import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';
import { UserProfile } from '@/types';

const KEYS = {
  USER_PROFILE: 'skp_native_user_profile',
  DEVICE_ID: 'skp_native_device_id',
  BIOMETRIC_LOCK: 'skp_native_biometric_lock',
  THEME_MODE: 'skp_native_theme_mode',
} as const;

export const SecureStorage = {
  async getUser(): Promise<UserProfile | null> {
    try {
      const raw = await SecureStore.getItemAsync(KEYS.USER_PROFILE);
      return raw ? (JSON.parse(raw) as UserProfile) : null;
    } catch {
      return null;
    }
  },

  async setUser(user: UserProfile | null): Promise<void> {
    if (!user) {
      await SecureStore.deleteItemAsync(KEYS.USER_PROFILE);
    } else {
      await SecureStore.setItemAsync(KEYS.USER_PROFILE, JSON.stringify(user));
    }
  },

  async getOrCreateDeviceId(): Promise<string> {
    try {
      const existing = await SecureStore.getItemAsync(KEYS.DEVICE_ID);
      if (existing) return existing;
      const newId = `dev_android_${Crypto.randomUUID()}`;
      await SecureStore.setItemAsync(KEYS.DEVICE_ID, newId);
      return newId;
    } catch {
      return `dev_android_${Date.now()}`;
    }
  },

  async isBiometricEnabled(): Promise<boolean> {
    try {
      return (await SecureStore.getItemAsync(KEYS.BIOMETRIC_LOCK)) === '1';
    } catch {
      return false;
    }
  },

  async setBiometricEnabled(enabled: boolean): Promise<void> {
    if (enabled) {
      await SecureStore.setItemAsync(KEYS.BIOMETRIC_LOCK, '1');
    } else {
      await SecureStore.deleteItemAsync(KEYS.BIOMETRIC_LOCK);
    }
  },

  async getThemeMode(): Promise<'light' | 'dark' | 'system'> {
    try {
      const val = await SecureStore.getItemAsync(KEYS.THEME_MODE);
      if (val === 'light' || val === 'dark') return val;
      return 'system';
    } catch {
      return 'system';
    }
  },

  async setThemeMode(mode: 'light' | 'dark' | 'system'): Promise<void> {
    await SecureStore.setItemAsync(KEYS.THEME_MODE, mode);
  },

  async clearSession(): Promise<void> {
    await Promise.allSettled([
      SecureStore.deleteItemAsync(KEYS.USER_PROFILE),
      SecureStore.deleteItemAsync(KEYS.BIOMETRIC_LOCK),
    ]);
  },
};
