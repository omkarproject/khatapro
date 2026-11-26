import * as Device from 'expo-device';
import * as LocalAuthentication from 'expo-local-authentication';
import { Platform } from 'react-native';
import { apiRequest } from './apiClient';
import { SecureStorage } from './secureStorage';
import { clearUserSqliteData } from '@/db/sqlite';
import { DeviceSession, UserProfile } from '@/types';

export const AuthService = {
  async getLockoutState(email: string) {
    return apiRequest<{ success: boolean; isLocked: boolean; remainingSeconds: number }>(
      `/api/auth/login?email=${encodeURIComponent(email.trim())}`
    );
  },

  async login(email: string, password: string) {
    return apiRequest<{
      success: boolean;
      user?: UserProfile;
      require2FA?: boolean;
      twoFactorType?: 'authenticator' | 'email';
      message?: string;
      isLocked?: boolean;
      remainingSeconds?: number;
    }>('/api/auth/login', {
      method: 'POST',
      body: { email: email.trim(), password },
    });
  },

  async sendOtp(params: {
    email: string;
    purpose: 'signup' | 'login' | 'forgot_password' | 'resend';
    name?: string;
    phone?: string;
  }) {
    return apiRequest<{ success: boolean; message?: string; otpSent?: boolean }>('/api/auth/otp/send', {
      method: 'POST',
      body: params,
    });
  },

  async verifyOtp(params: {
    email: string;
    otp: string;
    purpose: 'signup' | 'login' | 'forgot_password';
    name?: string;
    phone?: string;
    businessName?: string;
    password?: string;
    newPassword?: string;
  }) {
    return apiRequest<{ success: boolean; user?: UserProfile; message?: string }>('/api/auth/otp/verify', {
      method: 'POST',
      body: params,
    });
  },

  async register(payload: {
    name: string;
    email: string;
    password: string;
    businessName?: string;
    phone?: string;
  }) {
    return apiRequest<{ success: boolean; user?: UserProfile; message?: string }>('/api/auth/register', {
      method: 'POST',
      body: payload,
    });
  },

  async registerCurrentDevice(userId: string) {
    const deviceId = await SecureStorage.getOrCreateDeviceId();
    const deviceName = `${Device.manufacturer || 'Android'} ${Device.modelName || 'Device'}`.trim();
    return apiRequest<{ success: boolean; devices?: DeviceSession[] }>('/api/auth/devices', {
      method: 'POST',
      userId,
      body: {
        action: 'register',
        deviceId,
        deviceName,
        deviceType: 'mobile',
        browser: 'SmartKhata Native App',
        os: `${Platform.OS} ${Device.osVersion || ''}`.trim(),
      },
    });
  },

  async listDevices(userId: string) {
    const deviceId = await SecureStorage.getOrCreateDeviceId();
    return apiRequest<{ success: boolean; devices: DeviceSession[]; isCurrentRevoked?: boolean }>(
      `/api/auth/devices?deviceId=${encodeURIComponent(deviceId)}&userId=${encodeURIComponent(userId)}`,
      { userId }
    );
  },

  async revokeDevice(userId: string, targetDeviceId: string) {
    return apiRequest('/api/auth/devices', {
      method: 'POST',
      userId,
      body: { action: 'logout_device', deviceId: targetDeviceId },
    });
  },

  async logout(userId: string | undefined, allDevices = false) {
    const deviceId = await SecureStorage.getOrCreateDeviceId();
    if (userId) {
      try {
        await apiRequest('/api/auth/devices', {
          method: 'POST',
          userId,
          body: allDevices
            ? { action: 'logout_all', keepCurrent: false, deviceId }
            : { action: 'logout_device', deviceId },
        });
      } catch {}
      await clearUserSqliteData(userId);
    }
    await SecureStorage.clearSession();
  },

  async canUseBiometrics(): Promise<boolean> {
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const enrolled = await LocalAuthentication.isEnrolledAsync();
      return hasHardware && enrolled;
    } catch {
      return false;
    }
  },

  async promptBiometricUnlock(): Promise<boolean> {
    try {
      const res = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Unlock SmartKhata',
        fallbackLabel: 'Use Device PIN',
        cancelLabel: 'Cancel',
      });
      return res.success;
    } catch {
      return false;
    }
  },
};
