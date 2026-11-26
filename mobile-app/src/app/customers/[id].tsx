import React, { useMemo, useState } from 'react';
import {
  Alert,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { ArrowLeft, CreditCard, Save, Share2, Upload } from 'lucide-react-native';
import { useMobileApp } from '@/context/MobileAppContext';
import { pickDocumentFile, stageOrUploadMedia } from '@/services/mediaService';

export default function CustomerCrmScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user, isOnline, customers, saveCustomer } = useMobileApp();
  const customer = useMemo(() => customers.find(c => c.id === id), [customers, id]);

  const [name, setName] = useState(customer?.name || '');
  const [phone, setPhone] = useState(customer?.phone || '');
  const [email, setEmail] = useState(customer?.email || '');
  const [businessName, setBusinessName] = useState(customer?.businessName || '');
  const [gstNumber, setGstNumber] = useState(customer?.gstNumber || '');
  const [creditLimit, setCreditLimit] = useState(String(customer?.creditLimit || 0));
  const [upiId, setUpiId] = useState(customer?.upiDetails?.[0]?.upiId || '');
  const [notes, setNotes] = useState(customer?.notes || '');

  if (!customer) {
    return (
      <View style={styles.center}>
        <Text>Customer not found</Text>
      </View>
    );
  }

  const handleSave = async () => {
    if (!name.trim()) return;
    await saveCustomer(
      {
        ...customer,
        name: name.trim(),
        phone: phone.trim(),
        email: email.trim(),
        businessName: businessName.trim(),
        gstNumber: gstNumber.trim(),
        creditLimit: parseFloat(creditLimit) || 0,
        notes: notes.trim(),
        upiDetails: upiId.trim()
          ? [{ id: customer.upiDetails?.[0]?.id || `upi_${Date.now()}`, upiId: upiId.trim(), isPrimary: true, createdAt: new Date().toISOString() }]
          : customer.upiDetails,
      },
      true
    );
    Alert.alert('Saved', 'Customer CRM profile updated.');
  };

  const handleUploadVaultDoc = async () => {
    if (!user?.id) return;
    try {
      const picked = await pickDocumentFile();
      if (!picked) return;
      const uploaded = await stageOrUploadMedia({
        userId: user.id,
        media: picked,
        isOnline,
        customerId: customer.id,
        customerName: customer.name,
        folderName: 'DOCUMENTS',
      });
      Alert.alert('Vault Upload', `Saved ${uploaded.fileName} (${uploaded.storageProvider})`);
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Upload failed');
    }
  };

  const handleShareBusinessCard = async () => {
    const html = `<html><body style="font-family:sans-serif;padding:30px;background:#0B0F19;color:#fff;border-radius:16px;">
      <h1>${user?.businessName || user?.name || 'SmartKhata'}</h1>
      <p>Owner: ${user?.name || ''}</p>
      <p>Phone: ${user?.phone || ''} | Email: ${user?.email || ''}</p>
      <p>GSTIN: ${user?.businessGst || 'N/A'} | UPI: ${user?.upiId || 'N/A'}</p>
    </body></html>`;
    const { uri } = await Print.printToFileAsync({ html });
    await Sharing.shareAsync(uri);
  };

  const handleWhatsAppCard = () => {
    const msg = `*${user?.businessName || 'SmartKhata'}*\nOwner: ${user?.name || ''}\nPhone: ${user?.phone || ''}\nUPI: ${user?.upiId || ''}`;
    const clean = (phone || '').replace(/\D/g, '');
    const url = clean.length >= 10 ? `https://wa.me/91${clean.slice(-10)}?text=${encodeURIComponent(msg)}` : `https://wa.me/?text=${encodeURIComponent(msg)}`;
    Linking.openURL(url);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft size={20} color="#0F172A" />
        </Pressable>
        <Text style={styles.title}>Customer CRM</Text>
        <Pressable onPress={handleSave} style={styles.saveIcon}>
          <Save size={18} color="#FFFFFF" />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <Text style={styles.label}>Name</Text>
          <TextInput style={styles.input} value={name} onChangeText={setName} />
          <Text style={styles.label}>Phone</Text>
          <TextInput style={styles.input} value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
          <Text style={styles.label}>Email</Text>
          <TextInput style={styles.input} value={email} onChangeText={setEmail} autoCapitalize="none" />
          <Text style={styles.label}>Business Name</Text>
          <TextInput style={styles.input} value={businessName} onChangeText={setBusinessName} />
          <Text style={styles.label}>GSTIN</Text>
          <TextInput style={styles.input} value={gstNumber} onChangeText={setGstNumber} autoCapitalize="characters" />
          <Text style={styles.label}>Credit Limit (₹)</Text>
          <TextInput style={styles.input} value={creditLimit} onChangeText={setCreditLimit} keyboardType="numeric" />
          <Text style={styles.label}>Customer UPI ID</Text>
          <TextInput style={styles.input} value={upiId} onChangeText={setUpiId} autoCapitalize="none" />
          <Text style={styles.label}>Notes</Text>
          <TextInput style={styles.input} value={notes} onChangeText={setNotes} multiline />
        </View>

        <View style={styles.actionGrid}>
          <Pressable onPress={handleUploadVaultDoc} style={styles.actionBtn}>
            <Upload size={16} color="#4F46E5" />
            <Text style={styles.actionText}>Upload KYC / Doc</Text>
          </Pressable>
          <Pressable onPress={handleShareBusinessCard} style={styles.actionBtn}>
            <CreditCard size={16} color="#0EA5E9" />
            <Text style={[styles.actionText, { color: '#0EA5E9' }]}>PDF Business Card</Text>
          </Pressable>
          <Pressable onPress={handleWhatsAppCard} style={styles.actionBtn}>
            <Share2 size={16} color="#059669" />
            <Text style={[styles.actionText, { color: '#059669' }]}>WhatsApp Card</Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 14, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  backBtn: { padding: 4 },
  title: { flex: 1, fontSize: 18, fontWeight: '800', color: '#0F172A' },
  saveIcon: { backgroundColor: '#4F46E5', padding: 9, borderRadius: 10 },
  content: { padding: 16, gap: 12, paddingBottom: 40 },
  card: { backgroundColor: '#FFFFFF', padding: 14, borderRadius: 16, borderWidth: 1, borderColor: '#E2E8F0', gap: 8 },
  label: { fontSize: 11, fontWeight: '700', color: '#64748B', marginTop: 4 },
  input: { backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: '#0F172A' },
  actionGrid: { gap: 10 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#FFFFFF', padding: 14, borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0' },
  actionText: { fontSize: 13, fontWeight: '800', color: '#4F46E5' },
});
