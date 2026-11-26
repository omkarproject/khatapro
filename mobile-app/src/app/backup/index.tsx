import React, { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { ArrowLeft, Cloud, Download, RefreshCw, Upload } from 'lucide-react-native';
import { useMobileApp } from '@/context/MobileAppContext';
import { apiRequest } from '@/services/apiClient';

export default function BackupScreen() {
  const router = useRouter();
  const { user, isOnline, customers, transactions, invoices, expenses, products, refreshLocalState } = useMobileApp();
  const [driveConnected, setDriveConnected] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user?.id || !isOnline) return;
    apiRequest<{ connected?: boolean }>(`/api/backup/google-drive/status?userId=${encodeURIComponent(user.id)}`, {
      userId: user.id,
    })
      .then(res => setDriveConnected(Boolean(res?.connected)))
      .catch(() => {});
  }, [user?.id, isOnline]);

  const handleCloudBackup = async () => {
    if (!user?.id || !isOnline) {
      Alert.alert('Offline', 'Connect to internet to run Google Drive backup.');
      return;
    }
    setBusy(true);
    try {
      const res = await apiRequest<{ success: boolean; message?: string }>('/api/backup/google-drive/backup-now', {
        method: 'POST',
        userId: user.id,
        timeoutMs: 45000,
        body: { userId: user.id },
      });
      Alert.alert(res.success ? 'Backup Complete' : 'Notice', res.message || 'Cloud backup finished.');
    } catch (e: any) {
      Alert.alert('Backup Failed', e?.message || 'Could not complete backup');
    } finally {
      setBusy(false);
    }
  };

  const handleRestore = async () => {
    if (!user?.id || !isOnline) {
      Alert.alert('Offline', 'Internet required to restore from Google Drive.');
      return;
    }
    Alert.alert('Restore Backup', 'Restore latest cloud snapshot into your account?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Restore',
        onPress: async () => {
          setBusy(true);
          try {
            const res = await apiRequest<{ success: boolean; message?: string }>('/api/backup/google-drive/restore', {
              method: 'POST',
              userId: user.id,
              timeoutMs: 45000,
              body: { userId: user.id },
            });
            await refreshLocalState();
            Alert.alert(res.success ? 'Restored' : 'Notice', res.message || 'Done');
          } catch (e: any) {
            Alert.alert('Restore Error', e?.message || 'Failed');
          } finally {
            setBusy(false);
          }
        },
      },
    ]);
  };

  const handleLocalExport = async () => {
    const snapshot = {
      exportedAt: new Date().toISOString(),
      merchantId: user?.id,
      customers,
      transactions,
      invoices,
      expenses,
      products,
    };
    const path = `${FileSystem.documentDirectory}smartkhata_backup_${Date.now()}.json`;
    await FileSystem.writeAsStringAsync(path, JSON.stringify(snapshot, null, 2));
    await Sharing.shareAsync(path);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft size={20} color="#0F172A" />
        </Pressable>
        <Text style={styles.title}>Cloud Backup & Restore</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Cloud size={22} color="#0284C7" />
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>Google Drive Integration</Text>
              <Text style={styles.cardSub}>
                Status: {driveConnected ? 'Connected (Server-side OAuth)' : 'Fallback: Supabase Isolation'}
              </Text>
            </View>
          </View>
          <Pressable onPress={handleCloudBackup} disabled={busy} style={styles.primaryBtn}>
            <Upload size={16} color="#FFFFFF" />
            <Text style={styles.primaryText}>{busy ? 'Working...' : 'Backup Now to Cloud'}</Text>
          </Pressable>
          <Pressable onPress={handleRestore} disabled={busy} style={styles.secondaryBtn}>
            <RefreshCw size={16} color="#4F46E5" />
            <Text style={styles.secondaryText}>Restore Latest Cloud Snapshot</Text>
          </Pressable>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Offline Device Export</Text>
          <Text style={styles.cardSub}>
            Export all SQLite records ({customers.length} customers, {transactions.length} entries) as portable JSON.
          </Text>
          <Pressable onPress={handleLocalExport} style={styles.secondaryBtn}>
            <Download size={16} color="#059669" />
            <Text style={[styles.secondaryText, { color: '#059669' }]}>Export & Share JSON Backup</Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 14, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  backBtn: { padding: 4 },
  title: { fontSize: 18, fontWeight: '800', color: '#0F172A' },
  content: { padding: 16, gap: 14 },
  card: { backgroundColor: '#FFFFFF', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: '#E2E8F0', gap: 12 },
  cardTitle: { fontSize: 15, fontWeight: '800', color: '#0F172A' },
  cardSub: { fontSize: 12, color: '#64748B' },
  primaryBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#4F46E5', paddingVertical: 13, borderRadius: 12 },
  primaryText: { color: '#FFFFFF', fontWeight: '800', fontSize: 14 },
  secondaryBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#F1F5F9', paddingVertical: 13, borderRadius: 12 },
  secondaryText: { color: '#4F46E5', fontWeight: '800', fontSize: 13 },
});
