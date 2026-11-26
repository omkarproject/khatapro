import React, { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, LifeBuoy, Lock, Save } from 'lucide-react-native';
import { useMobileApp } from '@/context/MobileAppContext';
import { apiRequest } from '@/services/apiClient';
import { SecureStorage } from '@/services/secureStorage';

export default function SettingsScreen() {
  const router = useRouter();
  const { user, isOnline, signInSuccess } = useMobileApp();
  const [businessName, setBusinessName] = useState(user?.businessName || '');
  const [gstin, setGstin] = useState(user?.businessGst || '');
  const [upiId, setUpiId] = useState(user?.upiId || '');
  const [newPassword, setNewPassword] = useState('');
  const [ticketSubject, setTicketSubject] = useState('');
  const [ticketMessage, setTicketMessage] = useState('');

  const handleSaveProfile = async () => {
    if (!user) return;
    const updated = {
      ...user,
      businessName: businessName.trim(),
      businessGst: gstin.trim(),
      upiId: upiId.trim(),
    };
    await SecureStorage.setUser(updated);
    await signInSuccess(updated);
    if (isOnline) {
      apiRequest('/api/db/sync', {
        method: 'POST',
        userId: user.id,
        body: {
          userId: user.id,
          table: 'system_settings',
          records: [
            {
              user_id: user.id,
              business_name: updated.businessName,
              payment_settings: { upiId: updated.upiId, businessGst: updated.businessGst },
              updated_at: new Date().toISOString(),
            },
          ],
        },
      }).catch(() => {});
    }
    Alert.alert('Saved', 'Business profile updated.');
  };

  const handleUpdatePassword = async () => {
    if (!isOnline || !user?.id || newPassword.length < 6) {
      Alert.alert('Invalid', 'Password must be at least 6 characters (online required).');
      return;
    }
    try {
      const res = await apiRequest<{ success: boolean; message?: string }>('/api/auth/update-password', {
        method: 'POST',
        userId: user.id,
        body: { userId: user.id, newPassword },
      });
      Alert.alert(res.success ? 'Updated' : 'Error', res.message || 'Password updated.');
      if (res.success) setNewPassword('');
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to update password');
    }
  };

  const handleSendTicket = async () => {
    if (!isOnline || !user?.id || !ticketSubject.trim() || !ticketMessage.trim()) {
      Alert.alert('Missing Fields', 'Enter subject and description (online required).');
      return;
    }
    try {
      const res = await apiRequest<{ success: boolean; message?: string }>('/api/support/tickets', {
        method: 'POST',
        userId: user.id,
        body: {
          userId: user.id,
          userName: user.name,
          userEmail: user.email,
          subject: ticketSubject.trim(),
          message: ticketMessage.trim(),
        },
      });
      Alert.alert(res.success ? 'Ticket Sent' : 'Notice', res.message || 'Support team will respond.');
      if (res.success) {
        setTicketSubject('');
        setTicketMessage('');
      }
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Could not submit ticket');
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft size={20} color="#0F172A" />
        </Pressable>
        <Text style={styles.title}>Settings & Support</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Business Profile</Text>
          <TextInput style={styles.input} placeholder="Business Name" value={businessName} onChangeText={setBusinessName} />
          <TextInput style={styles.input} placeholder="GSTIN" value={gstin} onChangeText={setGstin} autoCapitalize="characters" />
          <TextInput style={styles.input} placeholder="Merchant UPI ID" value={upiId} onChangeText={setUpiId} autoCapitalize="none" />
          <Pressable onPress={handleSaveProfile} style={styles.btn}>
            <Save size={15} color="#FFFFFF" />
            <Text style={styles.btnText}>Save Business Profile</Text>
          </Pressable>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Change Password</Text>
          <TextInput style={styles.input} placeholder="New Password (min 6 chars)" secureTextEntry value={newPassword} onChangeText={setNewPassword} />
          <Pressable onPress={handleUpdatePassword} style={[styles.btn, { backgroundColor: '#0EA5E9' }]}>
            <Lock size={15} color="#FFFFFF" />
            <Text style={styles.btnText}>Update Password</Text>
          </Pressable>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Support Ticket</Text>
          <TextInput style={styles.input} placeholder="Subject" value={ticketSubject} onChangeText={setTicketSubject} />
          <TextInput style={[styles.input, { height: 76 }]} placeholder="Describe your issue..." multiline value={ticketMessage} onChangeText={setTicketMessage} />
          <Pressable onPress={handleSendTicket} style={[styles.btn, { backgroundColor: '#059669' }]}>
            <LifeBuoy size={15} color="#FFFFFF" />
            <Text style={styles.btnText}>Submit Ticket</Text>
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
  content: { padding: 16, gap: 14, paddingBottom: 40 },
  card: { backgroundColor: '#FFFFFF', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: '#E2E8F0', gap: 10 },
  cardTitle: { fontSize: 15, fontWeight: '800', color: '#0F172A' },
  input: { backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14 },
  btn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#4F46E5', paddingVertical: 13, borderRadius: 10 },
  btnText: { color: '#FFFFFF', fontWeight: '800', fontSize: 13 },
});
