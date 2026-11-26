import React, { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import {
  BarChart3,
  Bell,
  CheckSquare,
  ChevronRight,
  Cloud,
  FileText,
  LogOut,
  Package,
  PiggyBank,
  QrCode,
  RefreshCw,
  Settings,
  Shield,
  ShieldAlert,
  Smartphone,
  Users,
} from 'lucide-react-native';
import { useMobileApp } from '@/context/MobileAppContext';
import { AuthService } from '@/services/authService';
import { SecureStorage } from '@/services/secureStorage';
import { DeviceSession } from '@/types';

export default function MoreTabScreen() {
  const router = useRouter();
  const { user, signOut, triggerSync, pendingCount, conflictItems } = useMobileApp();
  const [devices, setDevices] = useState<DeviceSession[]>([]);
  const [bioAvailable, setBioAvailable] = useState(false);
  const [bioEnabled, setBioEnabled] = useState(false);

  useEffect(() => {
    (async () => {
      setBioAvailable(await AuthService.canUseBiometrics());
      setBioEnabled(await SecureStorage.isBiometricEnabled());
      if (user?.id) {
        try {
          const res = await AuthService.listDevices(user.id);
          if (res?.devices) setDevices(res.devices.filter(d => !d.isRevoked));
        } catch {}
      }
    })();
  }, [user?.id]);

  const toggleBiometric = async (val: boolean) => {
    if (val) {
      const ok = await AuthService.promptBiometricUnlock();
      if (!ok) return;
    }
    await SecureStorage.setBiometricEnabled(val);
    setBioEnabled(val);
  };

  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin';

  const menuItems = [
    { label: 'Collect Payment (UPI / Gateway)', route: '/collect', icon: QrCode, color: '#7C3AED' },
    { label: 'Shared Khata Groups & Split Bills', route: '/khata/groups', icon: Users, color: '#0EA5E9' },
    { label: 'Inventory & Stock', route: '/inventory', icon: Package, color: '#4F46E5' },
    { label: 'Financial Analytics', route: '/analytics', icon: BarChart3, color: '#059669' },
    { label: 'Payment Reminders', route: '/reminders', icon: Bell, color: '#D97706' },
    { label: 'Savings Goals', route: '/savings', icon: PiggyBank, color: '#EC4899' },
    { label: 'Document Vault', route: '/documents', icon: FileText, color: '#6366F1' },
    { label: 'Notes & Tasks', route: '/notes-tasks', icon: CheckSquare, color: '#14B8A6' },
    { label: 'Cloud Backup & Restore', route: '/backup', icon: Cloud, color: '#0284C7' },
    { label: 'Settings & Support', route: '/settings', icon: Settings, color: '#475569' },
  ];

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16, paddingBottom: 36 }}>
      <View style={styles.profileCard}>
        <Text style={styles.name}>{user?.businessName || user?.name}</Text>
        <Text style={styles.email}>{user?.email}</Text>
        <Text style={styles.role}>Role: {user?.role?.toUpperCase()}</Text>
      </View>

      <View style={styles.card}>
        <View style={styles.rowBetween}>
          <Pressable onPress={() => router.push('/sync-conflicts')} style={styles.rowGap}>
            <RefreshCw size={18} color="#4F46E5" />
            <View>
              <Text style={styles.cardTitle}>Offline Sync Queue</Text>
              <Text style={styles.cardSub}>{pendingCount} pending • {conflictItems.length} conflicts</Text>
            </View>
          </Pressable>
          <Pressable onPress={() => triggerSync()} style={styles.smallBtn}>
            <Text style={styles.smallBtnText}>Sync Now</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.menuCard}>
        {menuItems.map((m, idx) => {
          const Icon = m.icon;
          return (
            <Pressable
              key={m.route}
              onPress={() => router.push(m.route as any)}
              style={[styles.menuRow, idx < menuItems.length - 1 && styles.menuBorder]}
            >
              <Icon size={18} color={m.color} />
              <Text style={styles.menuLabel}>{m.label}</Text>
              <ChevronRight size={16} color="#94A3B8" />
            </Pressable>
          );
        })}
      </View>

      {isAdmin && (
        <Pressable onPress={() => router.push('/admin')} style={styles.adminBtn}>
          <ShieldAlert size={18} color="#FFFFFF" />
          <Text style={styles.adminBtnText}>Admin Control Center</Text>
          <ChevronRight size={16} color="#FFFFFF" />
        </Pressable>
      )}

      {bioAvailable && (
        <View style={styles.card}>
          <View style={styles.rowBetween}>
            <View style={styles.rowGap}>
              <Shield size={18} color="#059669" />
              <View>
                <Text style={styles.cardTitle}>Biometric App Lock</Text>
                <Text style={styles.cardSub}>Require fingerprint / face to open</Text>
              </View>
            </View>
            <Switch value={bioEnabled} onValueChange={toggleBiometric} />
          </View>
        </View>
      )}

      <View style={styles.card}>
        <View style={styles.rowGap}>
          <Smartphone size={18} color="#4F46E5" />
          <Text style={styles.cardTitle}>Active Devices ({devices.length || 1})</Text>
        </View>
        {devices.map(d => (
          <View key={d.id} style={styles.deviceRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.deviceName}>{d.deviceName}</Text>
              <Text style={styles.deviceSub}>{d.os} • {d.isCurrent ? 'This Device' : d.ip}</Text>
            </View>
          </View>
        ))}
      </View>

      <Pressable
        onPress={() =>
          Alert.alert('Sign Out', 'Sign out from this device only?', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Sign Out', style: 'destructive', onPress: () => signOut(false) },
          ])
        }
        style={styles.logoutBtn}
      >
        <LogOut size={16} color="#E11D48" />
        <Text style={styles.logoutText}>Sign Out (This Device)</Text>
      </Pressable>

      <Pressable
        onPress={() =>
          Alert.alert('Logout All Devices', 'Revoke sessions on all devices?', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Revoke All', style: 'destructive', onPress: () => signOut(true) },
          ])
        }
        style={[styles.logoutBtn, { marginTop: 8 }]}
      >
        <LogOut size={16} color="#E11D48" />
        <Text style={styles.logoutText}>Logout All Devices</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  profileCard: { backgroundColor: '#0B0F19', borderRadius: 18, padding: 18, marginBottom: 14 },
  name: { color: '#FFFFFF', fontSize: 18, fontWeight: '800' },
  email: { color: '#94A3B8', fontSize: 13, marginTop: 2 },
  role: { color: '#A5B4FC', fontSize: 11, fontWeight: '700', marginTop: 6 },
  card: { backgroundColor: '#FFFFFF', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: '#E2E8F0', marginBottom: 12 },
  menuCard: { backgroundColor: '#FFFFFF', borderRadius: 14, borderWidth: 1, borderColor: '#E2E8F0', marginBottom: 12, overflow: 'hidden' },
  menuRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 13 },
  menuBorder: { borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  menuLabel: { flex: 1, fontSize: 14, fontWeight: '700', color: '#0F172A' },
  adminBtn: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#7C3AED', padding: 14, borderRadius: 14, marginBottom: 12 },
  adminBtnText: { flex: 1, color: '#FFFFFF', fontWeight: '800', fontSize: 14 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  rowGap: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  cardTitle: { fontSize: 14, fontWeight: '800', color: '#0F172A' },
  cardSub: { fontSize: 12, color: '#64748B', marginTop: 1 },
  smallBtn: { backgroundColor: '#EEF2FF', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  smallBtnText: { color: '#4F46E5', fontWeight: '700', fontSize: 12 },
  deviceRow: { marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#F1F5F9' },
  deviceName: { fontSize: 13, fontWeight: '700', color: '#0F172A' },
  deviceSub: { fontSize: 11, color: '#64748B', marginTop: 2 },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#FFF1F2', borderWidth: 1, borderColor: '#FECDD3', paddingVertical: 14, borderRadius: 12 },
  logoutText: { color: '#E11D48', fontWeight: '800', fontSize: 14 },
});
