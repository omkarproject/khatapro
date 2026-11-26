import React, { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, Megaphone, ShieldAlert, Trash2, Users } from 'lucide-react-native';
import { useMobileApp } from '@/context/MobileAppContext';
import { apiRequest } from '@/services/apiClient';

export default function AdminControlCenterScreen() {
  const router = useRouter();
  const { user, isOnline } = useMobileApp();
  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin';

  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [broadcastMsg, setBroadcastMsg] = useState('');
  const [brandName, setBrandName] = useState('SmartKhata');
  const [usersList, setUsersList] = useState<any[]>([]);
  const [tickets, setTickets] = useState<any[]>([]);

  useEffect(() => {
    if (!isAdmin || !isOnline || !user?.id) return;
    apiRequest<{ config?: any }>('/api/system/config', { userId: user.id })
      .then(res => {
        if (res?.config) {
          setMaintenanceMode(Boolean(res.config.maintenanceMode));
          if (res.config.brandName) setBrandName(res.config.brandName);
          if (res.config.broadcastMessage) setBroadcastMsg(res.config.broadcastMessage);
        }
      })
      .catch(() => {});

    apiRequest<{ users?: any[] }>('/api/admin/users', { userId: user.id })
      .then(res => setUsersList(res?.users || []))
      .catch(() => {});

    apiRequest<{ tickets?: any[] }>('/api/support/tickets', { userId: user.id })
      .then(res => setTickets(res?.tickets || []))
      .catch(() => {});
  }, [isAdmin, isOnline, user?.id]);

  if (!isAdmin) {
    return (
      <View style={styles.center}>
        <ShieldAlert size={36} color="#DC2626" />
        <Text style={{ fontSize: 16, fontWeight: '800', marginTop: 10 }}>Admin Access Required</Text>
      </View>
    );
  }

  const handleSaveGlobalConfig = async () => {
    try {
      const res = await apiRequest<{ success: boolean; message?: string }>('/api/system/config', {
        method: 'POST',
        userId: user?.id,
        body: {
          userId: user?.id,
          brandName: brandName.trim(),
          maintenanceMode,
          broadcastMessage: broadcastMsg.trim(),
        },
      });
      Alert.alert(res.success ? 'Updated' : 'Notice', res.message || 'Global config saved.');
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to update config');
    }
  };

  const handleFactoryReset = () => {
    Alert.alert(
      'DANGER: Database Factory Reset',
      'This will wipe non-admin records on the server. Are you 100% sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm Reset',
          style: 'destructive',
          onPress: async () => {
            try {
              const res = await apiRequest<{ success: boolean; message?: string }>('/api/admin/database-reset', {
                method: 'POST',
                userId: user?.id,
                body: { userId: user?.id, confirm: true },
              });
              Alert.alert('Reset', res.message || 'Done');
            } catch (e: any) {
              Alert.alert('Error', e?.message || 'Reset failed');
            }
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft size={20} color="#0F172A" />
        </Pressable>
        <Text style={styles.title}>Admin Control Center</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Branding, Broadcast & Maintenance</Text>
          <TextInput style={styles.input} placeholder="App Brand Name" value={brandName} onChangeText={setBrandName} />
          <TextInput style={styles.input} placeholder="Global Broadcast Banner" value={broadcastMsg} onChangeText={setBroadcastMsg} />
          <View style={styles.rowBetween}>
            <Text style={styles.label}>Maintenance Mode</Text>
            <Switch value={maintenanceMode} onValueChange={setMaintenanceMode} />
          </View>
          <Pressable onPress={handleSaveGlobalConfig} style={styles.btn}>
            <Megaphone size={15} color="#FFFFFF" />
            <Text style={styles.btnText}>Publish Global Config</Text>
          </Pressable>
        </View>

        <View style={styles.card}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Users size={18} color="#4F46E5" />
            <Text style={styles.cardTitle}>Registered Users ({usersList.length})</Text>
          </View>
          {usersList.slice(0, 8).map((u, i) => (
            <View key={u.id || i} style={styles.listRow}>
              <Text style={styles.listName}>{u.business_name || u.full_name || u.email}</Text>
              <Text style={styles.listSub}>{u.role || 'user'}</Text>
            </View>
          ))}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Support Tickets ({tickets.length})</Text>
          {tickets.slice(0, 6).map((t, i) => (
            <View key={t.id || i} style={styles.listRow}>
              <Text style={styles.listName} numberOfLines={1}>{t.subject || 'Ticket'}</Text>
              <Text style={styles.listSub}>{t.status || 'open'}</Text>
            </View>
          ))}
        </View>

        <Pressable onPress={handleFactoryReset} style={styles.dangerBtn}>
          <Trash2 size={16} color="#FFFFFF" />
          <Text style={styles.dangerText}>Factory Reset Controls</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 14, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  backBtn: { padding: 4 },
  title: { fontSize: 18, fontWeight: '800', color: '#0F172A' },
  content: { padding: 16, gap: 14, paddingBottom: 40 },
  card: { backgroundColor: '#FFFFFF', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: '#E2E8F0', gap: 10 },
  cardTitle: { fontSize: 15, fontWeight: '800', color: '#0F172A' },
  input: { backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  label: { fontSize: 13, fontWeight: '700', color: '#334155' },
  btn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#4F46E5', paddingVertical: 13, borderRadius: 10 },
  btnText: { color: '#FFFFFF', fontWeight: '800', fontSize: 13 },
  listRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderTopWidth: 1, borderTopColor: '#F1F5F9' },
  listName: { fontSize: 13, fontWeight: '700', color: '#0F172A', flex: 1 },
  listSub: { fontSize: 11, fontWeight: '700', color: '#64748B' },
  dangerBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#DC2626', paddingVertical: 14, borderRadius: 12 },
  dangerText: { color: '#FFFFFF', fontWeight: '800', fontSize: 14 },
});
