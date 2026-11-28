import React, { useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { BookOpen, Plus, Search, UserCheck } from 'lucide-react-native';
import { useMobileApp } from '@/context/MobileAppContext';
import { formatINR, getThemeColors } from '@/theme/tokens';
import { Customer } from '@/types';

const CATEGORIES: Customer['category'][] = ['Regular', 'VIP', 'Wholesale', 'Retail', 'Merchant'];

export default function CustomersCrmTabScreen() {
  const router = useRouter();
  const { darkMode, customers, saveCustomer } = useMobileApp();
  const colors = getThemeColors(darkMode);

  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState<string>('All');
  const [modalOpen, setModalOpen] = useState(false);

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [gstNumber, setGstNumber] = useState('');
  const [creditLimit, setCreditLimit] = useState('0');
  const [category, setCategory] = useState<Customer['category']>('Regular');
  const [excludeTxns, setExcludeTxns] = useState(false);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return customers
      .filter(c => !c.isDeleted && c.status !== 'deleted')
      .filter(c => (catFilter === 'All' ? true : c.category === catFilter))
      .filter(
        c =>
          !q ||
          c.name.toLowerCase().includes(q) ||
          (c.phone || '').includes(q) ||
          (c.businessName || '').toLowerCase().includes(q)
      )
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [customers, search, catFilter]);

  const handleAdd = async () => {
    if (!name.trim()) {
      Alert.alert('Required', 'Customer name is required.');
      return;
    }
    await saveCustomer(
      {
        name: name.trim(),
        phone: phone.trim(),
        email: email.trim(),
        businessName: businessName.trim(),
        gstNumber: gstNumber.trim(),
        creditLimit: parseFloat(creditLimit) || 0,
        category,
        excludeTransactions: excludeTxns,
      },
      false
    );
    setModalOpen(false);
    setName('');
    setPhone('');
    setEmail('');
    setBusinessName('');
    setGstNumber('');
    setCreditLimit('0');
    setExcludeTxns(false);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <View>
          <Text style={[styles.title, { color: colors.foreground }]}>Customers CRM ({filtered.length})</Text>
          <Text style={{ fontSize: 11, color: colors.mutedText }}>Profiles, GSTIN, Bank & Drive Vault</Text>
        </View>
        <Pressable onPress={() => setModalOpen(true)} style={[styles.addBtn, { backgroundColor: colors.primary }]}>
          <Plus size={16} color="#FFFFFF" />
          <Text style={styles.addBtnText}>Add</Text>
        </Pressable>
      </View>

      <View style={[styles.searchBox, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
        <Search size={16} color={colors.mutedText} />
        <TextInput
          style={[styles.searchInput, { color: colors.foreground }]}
          placeholder="Search customer, phone or business..."
          placeholderTextColor={colors.mutedText}
          value={search}
          onChangeText={setSearch}
        />
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ maxHeight: 38, marginBottom: 10 }}>
        {(['All', ...CATEGORIES] as const).map(cat => (
          <Pressable
            key={cat}
            onPress={() => setCatFilter(cat)}
            style={[
              styles.chip,
              { backgroundColor: catFilter === cat ? colors.primary : colors.cardMuted },
            ]}
          >
            <Text style={{ fontSize: 11, fontWeight: '800', color: catFilter === cat ? '#FFFFFF' : colors.foreground }}>
              {cat}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      <FlatList
        data={filtered}
        keyExtractor={c => c.id}
        contentContainerStyle={{ paddingBottom: 40 }}
        ListEmptyComponent={
          <Text style={{ textAlign: 'center', color: colors.mutedText, marginTop: 40 }}>
            No customers found. Tap + Add to create your first CRM profile.
          </Text>
        }
        renderItem={({ item }) => (
          <Pressable
            onPress={() => router.push(`/customers/${item.id}`)}
            style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
          >
            <View style={[styles.avatar, { backgroundColor: colors.primaryLight }]}>
              <Text style={[styles.avatarText, { color: colors.primary }]}>{item.name.charAt(0).toUpperCase()}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={[styles.name, { color: colors.foreground }]} numberOfLines={1}>
                  {item.name}
                </Text>
                <View style={[styles.catBadge, { backgroundColor: colors.cardMuted }]}>
                  <Text style={{ fontSize: 9, fontWeight: '800', color: colors.mutedText }}>{item.category}</Text>
                </View>
                {item.p2pPeerUserId && <UserCheck size={13} color={colors.emerald} />}
              </View>
              <Text style={{ fontSize: 11, color: colors.mutedText, marginTop: 2 }}>
                {item.businessName || item.phone || 'No phone'}
              </Text>
            </View>
            <View style={{ alignItems: 'flex-end', gap: 4 }}>
              <Text style={{ fontSize: 14, fontWeight: '900', color: item.outstandingBalance >= 0 ? colors.rose : colors.emerald }}>
                {formatINR(item.outstandingBalance)}
              </Text>
              <Pressable
                onPress={() => router.push(`/khata/${item.id}`)}
                style={[styles.ledgerBtn, { backgroundColor: colors.primaryLight }]}
              >
                <BookOpen size={11} color={colors.primary} />
                <Text style={{ fontSize: 10, fontWeight: '800', color: colors.primary }}>Khata</Text>
              </Pressable>
            </View>
          </Pressable>
        )}
      />

      <Modal visible={modalOpen} transparent animationType="slide" onRequestClose={() => setModalOpen(false)}>
        <View style={styles.backdrop}>
          <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'flex-end' }}>
            <View style={[styles.modalCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
              <Text style={[styles.modalTitle, { color: colors.foreground }]}>Add Customer (CRM)</Text>
              <TextInput style={[styles.input, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, color: colors.foreground }]} placeholder="Full Name *" placeholderTextColor={colors.mutedText} value={name} onChangeText={setName} />
              <TextInput style={[styles.input, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, color: colors.foreground }]} placeholder="Phone" placeholderTextColor={colors.mutedText} keyboardType="phone-pad" value={phone} onChangeText={setPhone} />
              <TextInput style={[styles.input, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, color: colors.foreground }]} placeholder="Email" placeholderTextColor={colors.mutedText} autoCapitalize="none" value={email} onChangeText={setEmail} />
              <TextInput style={[styles.input, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, color: colors.foreground }]} placeholder="Business Name" placeholderTextColor={colors.mutedText} value={businessName} onChangeText={setBusinessName} />
              <TextInput style={[styles.input, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, color: colors.foreground }]} placeholder="GSTIN" placeholderTextColor={colors.mutedText} autoCapitalize="characters" value={gstNumber} onChangeText={setGstNumber} />
              <TextInput style={[styles.input, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, color: colors.foreground }]} placeholder="Credit Limit (₹)" placeholderTextColor={colors.mutedText} keyboardType="numeric" value={creditLimit} onChangeText={setCreditLimit} />

              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                {CATEGORIES.map(c => (
                  <Pressable
                    key={c}
                    onPress={() => setCategory(c)}
                    style={[styles.chip, { backgroundColor: category === c ? colors.primary : colors.cardMuted }]}
                  >
                    <Text style={{ fontSize: 11, fontWeight: '700', color: category === c ? '#FFFFFF' : colors.foreground }}>{c}</Text>
                  </Pressable>
                ))}
              </View>

              <View style={styles.switchRow}>
                <Text style={{ fontSize: 12, fontWeight: '700', color: colors.foreground }}>Exclude from Dashboard Totals</Text>
                <Switch value={excludeTxns} onValueChange={setExcludeTxns} />
              </View>

              <View style={styles.modalActions}>
                <Pressable onPress={() => setModalOpen(false)} style={[styles.cancelBtn, { backgroundColor: colors.cardMuted }]}>
                  <Text style={{ fontWeight: '700', color: colors.mutedText }}>Cancel</Text>
                </Pressable>
                <Pressable onPress={handleAdd} style={[styles.saveBtn, { backgroundColor: colors.primary }]}>
                  <Text style={{ fontWeight: '800', color: '#FFFFFF' }}>Save Customer</Text>
                </Pressable>
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 14 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  title: { fontSize: 18, fontWeight: '900' },
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10 },
  addBtnText: { color: '#FFFFFF', fontWeight: '800', fontSize: 13 },
  searchBox: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 12, borderWidth: 1, paddingHorizontal: 12, height: 42, marginBottom: 10 },
  searchInput: { flex: 1, fontSize: 14 },
  chip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10, marginRight: 6 },
  card: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 13, borderRadius: 16, borderWidth: 1, marginBottom: 8 },
  avatar: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 16, fontWeight: '900' },
  name: { fontSize: 14, fontWeight: '800', flexShrink: 1 },
  catBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  ledgerBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)' },
  modalCard: { borderTopLeftRadius: 24, borderTopRightRadius: 24, borderWidth: 1, padding: 20, gap: 10 },
  modalTitle: { fontSize: 18, fontWeight: '800' },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14 },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 4 },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 4 },
  cancelBtn: { flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: 'center' },
  saveBtn: { flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: 'center' },
});
