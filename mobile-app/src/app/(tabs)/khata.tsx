import React, { useMemo, useState } from 'react';
import {
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
import { BadgeCheck, Plus, Search, UserPlus } from 'lucide-react-native';
import { useMobileApp } from '@/context/MobileAppContext';

export default function KhataScreen() {
  const { customers, saveCustomer } = useMobileApp();
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'due' | 'advance'>('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return customers.filter(c => {
      if (c.isDeleted || c.status === 'deleted') return false;
      if (filter === 'due' && c.outstandingBalance <= 0) return false;
      if (filter === 'advance' && c.outstandingBalance >= 0) return false;
      if (q && !c.name.toLowerCase().includes(q) && !(c.phone || '').includes(q)) return false;
      return true;
    });
  }, [customers, search, filter]);

  const handleAddCustomer = async () => {
    if (!newName.trim()) {
      Alert.alert('Name Required', 'Please enter customer or merchant name.');
      return;
    }
    const created = await saveCustomer({ name: newName.trim(), phone: newPhone.trim() });
    setNewName('');
    setNewPhone('');
    setModalOpen(false);
    router.push({ pathname: '/khata/[customerId]', params: { customerId: created.id } });
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Digital KhataBook ({filtered.length})</Text>
        <Pressable onPress={() => setModalOpen(true)} style={styles.addBtn}>
          <Plus size={16} color="#FFFFFF" />
          <Text style={styles.addBtnText}>Add</Text>
        </Pressable>
      </View>

      <View style={styles.searchBox}>
        <Search size={16} color="#64748B" />
        <TextInput
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder="Search customer or phone..."
          placeholderTextColor="#94A3B8"
        />
      </View>

      <View style={styles.filterRow}>
        {(['all', 'due', 'advance'] as const).map(f => (
          <Pressable
            key={f}
            onPress={() => setFilter(f)}
            style={[styles.filterChip, filter === f && styles.filterChipActive]}
          >
            <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>
              {f.toUpperCase()}
            </Text>
          </Pressable>
        ))}
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingBottom: 24 }}
        ListEmptyComponent={<Text style={styles.empty}>No customers yet. Tap + Add to start.</Text>}
        renderItem={({ item }) => {
          const bal = Number(item.outstandingBalance) || 0;
          const isDue = bal > 0;
          const isAdv = bal < 0;
          return (
            <Pressable
              onPress={() => router.push({ pathname: '/khata/[customerId]', params: { customerId: item.id } })}
              style={styles.card}
            >
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{item.name.charAt(0).toUpperCase()}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <View style={styles.nameRow}>
                  <Text style={styles.name}>{item.name}</Text>
                  {item.category === 'Merchant' && <BadgeCheck size={14} color="#059669" />}
                </View>
                <Text style={styles.phone}>{item.phone || 'No phone'}</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={[styles.bal, { color: isDue ? '#E11D48' : isAdv ? '#059669' : '#64748B' }]}>
                  ₹{Math.abs(bal).toLocaleString('en-IN')}
                </Text>
                <Text style={styles.balLabel}>{isDue ? 'DUE' : isAdv ? 'ADVANCE' : 'SETTLED'}</Text>
              </View>
            </Pressable>
          );
        }}
      />

      <Modal visible={modalOpen} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <UserPlus size={20} color="#4F46E5" />
              <Text style={styles.modalTitle}>Add Customer (Offline-Ready)</Text>
            </View>
            <TextInput
              style={styles.modalInput}
              value={newName}
              onChangeText={setNewName}
              placeholder="Customer / Merchant Name *"
              placeholderTextColor="#94A3B8"
            />
            <TextInput
              style={styles.modalInput}
              value={newPhone}
              onChangeText={setNewPhone}
              keyboardType="phone-pad"
              placeholder="Phone Number"
              placeholderTextColor="#94A3B8"
            />
            <View style={styles.modalActions}>
              <Pressable onPress={() => setModalOpen(false)} style={styles.cancelBtn}>
                <Text style={styles.cancelText}>Cancel</Text>
              </Pressable>
              <Pressable onPress={handleAddCustomer} style={styles.saveBtn}>
                <Text style={styles.saveText}>Save Customer</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC', padding: 16 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  title: { fontSize: 18, fontWeight: '900', color: '#0F172A' },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#4F46E5',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
  },
  addBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 12 },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 10,
  },
  searchInput: { flex: 1, fontSize: 13, color: '#0F172A' },
  filterRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: '#E2E8F0',
  },
  filterChipActive: { backgroundColor: '#4F46E5' },
  filterText: { fontSize: 11, fontWeight: '700', color: '#475569' },
  filterTextActive: { color: '#FFFFFF' },
  empty: { textAlign: 'center', color: '#94A3B8', marginTop: 40, fontSize: 13 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#FFFFFF',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 8,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 16, fontWeight: '800', color: '#4F46E5' },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  name: { fontSize: 14, fontWeight: '800', color: '#0F172A' },
  phone: { fontSize: 11, color: '#64748B', marginTop: 2 },
  bal: { fontSize: 15, fontWeight: '900' },
  balLabel: { fontSize: 9, fontWeight: '800', color: '#64748B' },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  modalTitle: { fontSize: 16, fontWeight: '800', color: '#0F172A' },
  modalInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    marginBottom: 10,
  },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 8 },
  cancelBtn: { flex: 1, paddingVertical: 12, borderRadius: 12, backgroundColor: '#F1F5F9', alignItems: 'center' },
  cancelText: { fontWeight: '700', color: '#475569' },
  saveBtn: { flex: 1, paddingVertical: 12, borderRadius: 12, backgroundColor: '#4F46E5', alignItems: 'center' },
  saveText: { fontWeight: '700', color: '#FFFFFF' },
});
