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
import QRCode from 'react-native-qrcode-svg';
import { ArrowLeft, CheckCircle, ExternalLink, ShieldCheck } from 'lucide-react-native';
import { useMobileApp } from '@/context/MobileAppContext';
import { apiRequest } from '@/services/apiClient';

export default function CollectPaymentScreen() {
  const { customerId } = useLocalSearchParams<{ customerId?: string }>();
  const router = useRouter();
  const { user, isOnline, customers, addKhataTransaction } = useMobileApp();

  const customer = useMemo(() => customers.find(c => c.id === customerId), [customers, customerId]);
  const [amountStr, setAmountStr] = useState(
    customer && customer.outstandingBalance > 0 ? String(customer.outstandingBalance) : ''
  );
  const [upiId, setUpiId] = useState(user?.upiId || '');
  const [gatewayOrderId, setGatewayOrderId] = useState('');
  const [activeGateway, setActiveGateway] = useState<'upi' | 'cashfree' | 'razorpay'>('upi');
  const [loading, setLoading] = useState(false);

  const amt = parseFloat(amountStr) || 0;
  const upiUri = useMemo(() => {
    if (!upiId.trim()) return '';
    const pn = encodeURIComponent(user?.businessName || user?.name || 'SmartKhata');
    const tn = encodeURIComponent(`Payment ${customer?.name || ''}`);
    return `upi://pay?pa=${encodeURIComponent(upiId.trim())}&pn=${pn}&am=${amt > 0 ? amt.toFixed(2) : ''}&cu=INR&tn=${tn}`;
  }, [upiId, amt, user?.businessName, user?.name, customer?.name]);

  const handleOpenUpiApp = async () => {
    if (!upiUri || amt <= 0) {
      Alert.alert('Missing Details', 'Enter merchant UPI ID and valid amount.');
      return;
    }
    try {
      await Linking.openURL(upiUri);
    } catch {
      Alert.alert('No UPI App', 'Could not find a UPI app on this device.');
    }
  };

  const handleCreateGatewayOrder = async (gw: 'cashfree' | 'razorpay') => {
    if (!isOnline) {
      Alert.alert('Offline', 'Online connection required for gateway payment links.');
      return;
    }
    if (amt <= 0) {
      Alert.alert('Invalid Amount', 'Enter a valid amount.');
      return;
    }
    setLoading(true);
    try {
      if (gw === 'cashfree') {
        const orderId = `SKP_${Date.now()}_${customer?.id || 'walkin'}`;
        const res = await apiRequest<{ success?: boolean; payment_session_id?: string; order_id?: string; paymentLink?: string; message?: string }>(
          '/api/cashfree/order',
          {
            method: 'POST',
            userId: user?.id,
            body: {
              orderId,
              orderAmount: amt,
              customerName: customer?.name || 'Customer',
              customerPhone: customer?.phone || '9999999999',
              customerEmail: customer?.email || 'customer@smartkhata.in',
              customerId: customer?.id,
              merchantUserId: user?.id,
            },
          }
        );
        if (res.order_id || res.payment_session_id) {
          setGatewayOrderId(res.order_id || orderId);
          setActiveGateway('cashfree');
          Alert.alert('Cashfree Order Ready', `Order ID: ${res.order_id || orderId}. Verify payment after customer pays.`);
        } else {
          Alert.alert('Cashfree Notice', res.message || 'Check Cashfree credentials in Web Settings.');
        }
      } else {
        const res = await apiRequest<{ success?: boolean; orderId?: string; id?: string; message?: string }>(
          '/api/razorpay/order',
          {
            method: 'POST',
            userId: user?.id,
            body: {
              amount: amt,
              customerId: customer?.id,
              merchantUserId: user?.id,
            },
          }
        );
        const rzpId = res.orderId || res.id;
        if (rzpId) {
          setGatewayOrderId(rzpId);
          setActiveGateway('razorpay');
          Alert.alert('Razorpay Order Ready', `Order ID: ${rzpId}. Verify payment after customer pays.`);
        } else {
          Alert.alert('Razorpay Notice', res.message || 'Check Razorpay credentials in Web Settings.');
        }
      }
    } catch (e: any) {
      Alert.alert('Gateway Error', e?.message || 'Could not create order');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyServerPayment = async () => {
    if (!isOnline || !gatewayOrderId) {
      Alert.alert('Verification', 'Create an online gateway order first.');
      return;
    }
    setLoading(true);
    try {
      const endpoint = activeGateway === 'cashfree' ? '/api/cashfree/verify' : '/api/razorpay/verify';
      const verifyRes = await apiRequest<{ success?: boolean; paid?: boolean; status?: string; message?: string }>(
        endpoint,
        {
          method: 'POST',
          userId: user?.id,
          body: { orderId: gatewayOrderId, merchantUserId: user?.id },
        }
      );
      if (verifyRes.success || verifyRes.paid || verifyRes.status === 'PAID') {
        await apiRequest('/api/pay/confirm', {
          method: 'POST',
          userId: user?.id,
          body: {
            customerId: customer?.id,
            merchantUserId: user?.id,
            amount: amt,
            orderId: gatewayOrderId,
            gateway: activeGateway,
          },
        }).catch(() => {});
        if (customer) {
          await addKhataTransaction({
            customerId: customer.id,
            customerName: customer.name,
            customerPhone: customer.phone,
            type: 'debit',
            amount: amt,
            paymentMode: 'upi',
            note: `Verified ${activeGateway.toUpperCase()} (${gatewayOrderId})`,
          });
        }
        Alert.alert('Payment Verified', 'Server verified settlement and updated ledger!');
        router.back();
      } else {
        Alert.alert('Pending', verifyRes.message || 'Payment not yet confirmed by gateway.');
      }
    } catch (e: any) {
      Alert.alert('Verify Error', e?.message || 'Verification failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft size={20} color="#0F172A" />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Collect Payment</Text>
          <Text style={styles.sub}>{customer ? customer.name : 'Direct Collection'}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <TextInput
          style={styles.amountInput}
          placeholder="Amount (₹)"
          keyboardType="numeric"
          value={amountStr}
          onChangeText={setAmountStr}
        />

        <View style={styles.tabRow}>
          {(['upi', 'cashfree', 'razorpay'] as const).map(t => (
            <Pressable
              key={t}
              onPress={() => setActiveGateway(t)}
              style={[styles.tabBtn, activeGateway === t && styles.tabBtnActive]}
            >
              <Text style={[styles.tabText, activeGateway === t && { color: '#FFFFFF' }]}>{t.toUpperCase()}</Text>
            </Pressable>
          ))}
        </View>

        {activeGateway === 'upi' && (
          <View style={styles.card}>
            <TextInput
              style={styles.input}
              placeholder="Merchant UPI ID (e.g. shop@okicici)"
              value={upiId}
              onChangeText={setUpiId}
              autoCapitalize="none"
            />
            {upiUri ? (
              <View style={styles.qrWrap}>
                <QRCode value={upiUri} size={190} />
                <Text style={styles.qrHint}>Scan with GPay / PhonePe / Paytm</Text>
                <Pressable onPress={handleOpenUpiApp} style={styles.upiBtn}>
                  <ExternalLink size={15} color="#FFFFFF" />
                  <Text style={styles.upiBtnText}>Pay via UPI App</Text>
                </Pressable>
              </View>
            ) : (
              <Text style={styles.emptyQr}>Enter your UPI ID above to generate dynamic QR.</Text>
            )}
          </View>
        )}

        {(activeGateway === 'cashfree' || activeGateway === 'razorpay') && (
          <View style={styles.card}>
            <View style={styles.secNote}>
              <ShieldCheck size={16} color="#059669" />
              <Text style={styles.secNoteText}>
                Gateway secrets stay on backend. Payment is never marked paid without server verification.
              </Text>
            </View>
            <Pressable
              onPress={() => handleCreateGatewayOrder(activeGateway)}
              disabled={loading}
              style={styles.gwBtn}
            >
              <Text style={styles.gwBtnText}>
                {loading ? 'Processing...' : `Generate ${activeGateway.toUpperCase()} Order`}
              </Text>
            </Pressable>
            {gatewayOrderId ? (
              <View style={styles.orderBox}>
                <Text style={styles.orderText}>Order ID: {gatewayOrderId}</Text>
                <Pressable onPress={handleVerifyServerPayment} style={styles.verifyBtn}>
                  <CheckCircle size={15} color="#FFFFFF" />
                  <Text style={styles.verifyText}>Verify Settlement on Server</Text>
                </Pressable>
              </View>
            ) : null}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 14, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  backBtn: { padding: 4 },
  title: { fontSize: 18, fontWeight: '800', color: '#0F172A' },
  sub: { fontSize: 12, color: '#64748B' },
  content: { padding: 16, gap: 14 },
  amountInput: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 14, padding: 16, fontSize: 22, fontWeight: '900', textAlign: 'center', color: '#0F172A' },
  tabRow: { flexDirection: 'row', gap: 8 },
  tabBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, backgroundColor: '#E2E8F0', alignItems: 'center' },
  tabBtnActive: { backgroundColor: '#4F46E5' },
  tabText: { fontSize: 12, fontWeight: '800', color: '#475569' },
  card: { backgroundColor: '#FFFFFF', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: '#E2E8F0', gap: 12 },
  input: { backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14 },
  qrWrap: { alignItems: 'center', paddingVertical: 12, gap: 10 },
  qrHint: { fontSize: 12, color: '#64748B', fontWeight: '600' },
  emptyQr: { textAlign: 'center', color: '#94A3B8', paddingVertical: 20, fontSize: 13 },
  upiBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#059669', paddingHorizontal: 18, paddingVertical: 12, borderRadius: 10 },
  upiBtnText: { color: '#FFFFFF', fontWeight: '800', fontSize: 13 },
  secNote: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#ECFDF5', padding: 10, borderRadius: 10 },
  secNoteText: { flex: 1, fontSize: 11, color: '#065F46', fontWeight: '600' },
  gwBtn: { backgroundColor: '#4F46E5', paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  gwBtnText: { color: '#FFFFFF', fontWeight: '800', fontSize: 14 },
  orderBox: { backgroundColor: '#F8FAFC', padding: 12, borderRadius: 10, gap: 10, borderWidth: 1, borderColor: '#CBD5E1' },
  orderText: { fontSize: 12, fontWeight: '700', color: '#0F172A' },
  verifyBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#059669', paddingVertical: 12, borderRadius: 10 },
  verifyText: { color: '#FFFFFF', fontWeight: '800', fontSize: 13 },
});
