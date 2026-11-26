import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as Crypto from 'expo-crypto';
import { ArrowLeft, Plus, Users } from 'lucide-react-native';
import { useMobileApp } from '@/context/MobileAppContext';
import { apiRequest } from '@/services/apiClient';
import { KhataGroup } from '@/types';

export default function KhataGroupsScreen() {
  const router = useRouter();
  const { user, isOnline } = useMobileApp();
  const [groups, setGroups] = useState<KhataGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [joinOpen, setJoinOpen] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [groupDesc, setGroupDesc] = useState('');
  const [joinUsername, setJoinUsername] = useState('');

  const loadGroups = useCallback(async () => {
    if (!user?.id || !isOnline) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await apiRequest<{ success: boolean; groups: KhataGroup[] }>(
        `/api/groups?userId=${encodeURIComponent(user.id)}`,
        { userId: user.id }
      );
      if (res.success && Array.isArray(res.groups)) {
        setGroups(res.groups);
      }
    } catch {
      // ignore offline
    } finally {
      setLoading(false);
    }
  }, [user?.id, isOnline]);

  useEffect(() => {
    loadGroups();
  }, [loadGroups]);

  const handleCreate = async () => {
    if (!user?.id || !groupName.trim()) return;
    if (!isOnline) {
      Alert.alert('Offline', 'Connect to internet to create a shared group.');
      return;
    }
    const now = new Date().toISOString();
    const newGroup: KhataGroup = {
      id: `grp_${Crypto.randomUUID()}`,
      name: groupName.trim(),
      description: groupDesc.trim(),
      createdByUserId: user.id,
      createdByUsername: user.username || user.email?.split('@')[0] || 'merchant',
      createdByName: user.businessName || user.name || 'Merchant',
      members: [
        {
          userId: user.id,
          username: user.username || user.email?.split('@')[0] || 'merchant',
          name: user.name || 'Merchant',
          businessName: user.businessName,
          phone: user.phone,
          role: 'creator',
          joinedAt: now,
        },
      ],
      createdAt: now,
      updatedAt: now,
    };
    try {
      const res = await apiRequest<{ success: boolean; message?: string }>('/api/groups', {
        method: 'POST',
        userId: user.id,
        body: { action: 'create', group: newGroup },
      });
      if (res.success) {
        setCreateOpen(false);
        setGroupName('');
        setGroupDesc('');
        loadGroups();
      } else {
        Alert.alert('Error', res.message || 'Could not create group');
      }
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Could not create group');
    }
  };

  const handleJoin = async () => {
    if (!user?.id || !joinUsername.trim()) return;
    if (!isOnline) {
      Alert.alert('Offline', 'Internet required to request group join.');
      return;
    }
    try {
      const res = await apiRequest<{ success: boolean; message?: string }>('/api/groups/join', {
        method: 'POST',
        userId: user.id,
        body: {
          action: 'request',
          username: joinUsername.trim().replace(/^@/, ''),
          user,
        },
      });
      Alert.alert(res.success ? 'Request Sent' : 'Notice', res.message || 'Done');
      if (res.success) {
        setJoinOpen(false);
        setJoinUsername('');
        loadGroups();
      }
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to send join request');
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft size={20} color="#0F172A" />
        </Pressable>
        <Text style={styles.title}>Shared Khata Groups</Text>
        <Pressable onPress={() => setJoinOpen(true)} style={styles.joinBtn}>
          <Text style={styles.joinBtnText}>Join</Text>
        </Pressable>
        <Pressable onPress={() => setCreateOpen(true)} style={styles.addBtn}>
          <Plus size={18} color="#FFFFFF" />
        </Pressable>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#4F46E5" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={groups}
          keyExtractor={g => g.id}
          contentContainerStyle={{ padding: 16 }}
          ListEmptyComponent={
            <Text style={styles.empty}>
              {isOnline ? 'No shared groups yet. Create one or join via @username.' : 'Offline — connect to view shared groups.'}
            </Text>
          }
          renderItem={({ item }) => (
            <Pressable
              style={styles.card}
              onPress={() => router.push(`/khata/group/${item.id}`)}
            >
              <View style={styles.iconWrap}>
                <Users size={20} color="#4F46E5" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.groupName}>{item.name}</Text>
                <Text style={styles.groupMeta}>
                  {item.members?.length || 1} member(s) • @{item.createdByUsername || 'group'}
                </Text>
              </View>
            </Pressable>
          )}
        />
      )}

      <Modal visible={createOpen} transparent animationType="slide">
        <View style={styles.backdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Create Shared Group</Text>
            <TextInput style={styles.input} placeholder="Group Name (e.g. Shop Partners)" value={groupName} onChangeText={setGroupName} />
            <TextInput style={styles.input} placeholder="Description (optional)" value={groupDesc} onChangeText={setGroupDesc} />
            <View style={styles.modalActions}>
              <Pressable onPress={() => setCreateOpen(false)} style={styles.cancelBtn}>
                <Text style={styles.cancelText}>Cancel</Text>
              </Pressable>
              <Pressable onPress={handleCreate} style={styles.saveBtn}>
                <Text style={styles.saveText}>Create</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={joinOpen} transparent animationType="slide">
        <View style={styles.backdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Join Group by @Username</Text>
            <TextInput style={styles.input} placeholder="Creator @username" value={joinUsername} onChangeText={setJoinUsername} autoCapitalize="none" />
            <View style={styles.modalActions}>
              <Pressable onPress={() => setJoinOpen(false)} style={styles.cancelBtn}>
                <Text style={styles.cancelText}>Cancel</Text>
              </Pressable>
              <Pressable onPress={handleJoin} style={styles.saveBtn}>
                <Text style={styles.saveText}>Send Request</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  backBtn: { padding: 4 },
  title: { flex: 1, fontSize: 17, fontWeight: '800', color: '#0F172A' },
  joinBtn: { backgroundColor: '#EEF2FF', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 },
  joinBtnText: { color: '#4F46E5', fontWeight: '800', fontSize: 12 },
  addBtn: { backgroundColor: '#4F46E5', padding: 8, borderRadius: 10 },
  empty: { textAlign: 'center', color: '#64748B', marginTop: 40, fontSize: 13 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#FFFFFF',
    padding: 14,
    borderRadius: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  iconWrap: { width: 42, height: 42, borderRadius: 12, backgroundColor: '#EEF2FF', alignItems: 'center', justifyContent: 'center' },
  groupName: { fontSize: 15, fontWeight: '800', color: '#0F172A' },
  groupMeta: { fontSize: 12, color: '#64748B', marginTop: 2 },
  backdrop: { flex: 1, backgroundColor: 'rgba(15,23,42,0.55)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 20, gap: 12 },
  modalTitle: { fontSize: 18, fontWeight: '800', color: '#0F172A' },
  input: { backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14 },
  modalActions: { flexDirection: 'row', gap: 10 },
  cancelBtn: { flex: 1, paddingVertical: 12, borderRadius: 12, backgroundColor: '#F1F5F9', alignItems: 'center' },
  cancelText: { fontWeight: '700', color: '#475569' },
  saveBtn: { flex: 1, paddingVertical: 12, borderRadius: 12, backgroundColor: '#4F46E5', alignItems: 'center' },
  saveText: { fontWeight: '800', color: '#FFFFFF' },
});
