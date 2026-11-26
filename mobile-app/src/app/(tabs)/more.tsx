import React, { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { LogOut, RefreshCw, Shield, Smartphone } from 'lucide-react-native';
import { useMobileApp } from '@/context/MobileAppContext';
import { AuthService } from '@/services/authService';
import { SecureStorage } from '@/services/secureStorage';
import { DeviceSession } from '@/types';

export default function MoreTabScreen() {
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

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
      <View style={styles.profileCard}>
        <Text style={styles.name}>{user?.businessName || user?.name}</Text>
        <Text style={styles.email}>{user?.email}</Text>
        <Text style={styles.role}>Role: {user?.role?.toUpperCase()}</Text>
      </View>

      <View style={styles.card}>
        <View style={styles.rowBetween}>
          <View style={styles.rowGap}>
            <RefreshCw size={18} color="#4F46E5" />
            <View>
              <Text style={styles.cardTitle}>Offline Sync Queue</Text>
              <Text style={styles.cardSub}>{pendingCount} pending • {conflictItems.length} conflicts</Text>
            </View>
          </View>
          <Pressable onPress={() => triggerSync()} style={styles.smallBtn}>
            <Text style={styles.smallBtnText}>Sync Now</Text>
          </Pressable>
        </View>
      </View>

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
          Alert.alert('Logout All Devices', 'Revoke sessions across all phones & browsers?', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Logout All', style: 'destructive', onPress: () => signOut(true) },
          ])
        }
        style={[styles.logoutBtn, { backgroundColor: '#9F1239', borderColor: '#9F1239' }]}
      >
        <LogOut size={16} color="#FFFFFF" />
        <Text style={[styles.logoutText, { color: '#FFFFFF' }]}>Logout All Devices</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  profileCard: { backgroundColor: '#4F46E5', borderRadius: 20, padding: 18, marginBottom: 14 },
  name: { fontSize: 18, fontWeight: '900', color: '#FFFFFF' },
  email: { fontSize: 12, color: '#E0E7FF', marginTop: 2 },
  role: { fontSize: 10, fontWeight: '800', color: '#C7D2FE', marginTop: 6 },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 10,
  },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  rowGap: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  cardTitle: { fontSize: 14, fontWeight: '800', color: '#0F172A' },
  cardSub: { fontSize: 11, color: '#64748B' },
  smallBtn: { backgroundColor: '#EEF2FF', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 },
  smallBtnText: { color: '#4F46E5', fontWeight: '700', fontSize: 12 },
  deviceRow: { paddingTop: 10, marginTop: 10, borderTopWidth: 1, borderTopColor: '#F1F5F9' },
  deviceName: { fontSize: 13, fontWeight: '700', color: '#0F172A' },
  deviceSub: { fontSize: 11, color: '#64748B' },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FFF1F2',
    borderWidth: 1,
    borderColor: '#FECDD3',
    paddingVertical: 14,
    borderRadius: 14,
    marginTop: 8,
  },
  logoutText: { color: '#E11D48', fontWeight: '800', fontSize: 13 },
});
