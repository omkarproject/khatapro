import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { AuthService } from '@/services/authService';
import { useMobileApp } from '@/context/MobileAppContext';

type AuthMode = 'signin' | 'signup' | 'forgot';
type AuthStep = 'form' | 'otp';

export default function LoginScreen() {
  const { signInSuccess } = useMobileApp();
  const [mode, setMode] = useState<AuthMode>('signin');
  const [step, setStep] = useState<AuthStep>('form');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSignIn = async () => {
    if (!email.trim() || !password) {
      Alert.alert('Missing Details', 'Please enter your email/phone and password.');
      return;
    }
    setLoading(true);
    try {
      const res = await AuthService.login(email, password);
      if (res.success && res.user) {
        await signInSuccess(res.user);
      } else if (res.require2FA) {
        if (res.twoFactorType === 'email') {
          await AuthService.sendOtp({ email: email.trim(), purpose: 'login' });
        }
        setStep('otp');
      } else {
        Alert.alert('Sign In Failed', res.message || 'Invalid credentials');
      }
    } catch (err: any) {
      Alert.alert('Sign In Error', err?.message || 'Could not sign in');
    } finally {
      setLoading(false);
    }
  };

  const handleSendOtpForSignupOrForgot = async () => {
    if (!email.trim()) {
      Alert.alert('Email Required', 'Please enter a valid email address.');
      return;
    }
    if (mode === 'signup' && (!name.trim() || !password || password.length < 6)) {
      Alert.alert('Invalid Input', 'Enter your name and a password of at least 6 characters.');
      return;
    }
    setLoading(true);
    try {
      const purpose = mode === 'signup' ? 'signup' : 'forgot_password';
      const res = await AuthService.sendOtp({
        email: email.trim(),
        purpose,
        name: name.trim(),
        phone: phone.trim(),
      });
      if (res.success) {
        setStep('otp');
        Alert.alert('OTP Sent', `Enter the 6-digit verification code sent to ${email.trim()}.`);
      } else {
        Alert.alert('Error', res.message || 'Could not send OTP');
      }
    } catch (err: any) {
      Alert.alert('OTP Error', err?.message || 'Failed to send verification code');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (otp.trim().length !== 6) {
      Alert.alert('Invalid OTP', 'Please enter the 6-digit verification code.');
      return;
    }
    setLoading(true);
    try {
      const purpose = mode === 'signup' ? 'signup' : mode === 'forgot' ? 'forgot_password' : 'login';
      const res = await AuthService.verifyOtp({
        email: email.trim(),
        otp: otp.trim(),
        purpose,
        name: name.trim(),
        phone: phone.trim(),
        businessName: businessName.trim() || name.trim(),
        password,
        newPassword: newPassword || undefined,
      });
      if (res.success && res.user) {
        await signInSuccess(res.user);
      } else if (res.success && mode === 'forgot') {
        Alert.alert('Password Updated', 'Your password has been reset. Please sign in.');
        setMode('signin');
        setStep('form');
        setOtp('');
      } else {
        Alert.alert('Verification Failed', res.message || 'Invalid OTP');
      }
    } catch (err: any) {
      Alert.alert('Verification Error', err?.message || 'OTP verification failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Image source={require('../../../assets/icon.png')} style={styles.logo} />
          <Text style={styles.title}>SmartKhata</Text>
          <Text style={styles.subtitle}>Digital KhataBook, GST Billing & Offline Ledger</Text>
        </View>

        <View style={styles.card}>
          <View style={styles.tabRow}>
            {(['signin', 'signup', 'forgot'] as AuthMode[]).map((m) => (
              <Pressable
                key={m}
                onPress={() => {
                  setMode(m);
                  setStep('form');
                }}
                style={[styles.tabBtn, mode === m && styles.tabBtnActive]}
              >
                <Text style={[styles.tabText, mode === m && styles.tabTextActive]}>
                  {m === 'signin' ? 'Sign In' : m === 'signup' ? 'Sign Up' : 'Reset'}
                </Text>
              </Pressable>
            ))}
          </View>

          {step === 'form' ? (
            <>
              {mode === 'signup' && (
                <>
                  <Text style={styles.label}>Full Name *</Text>
                  <TextInput
                    style={styles.input}
                    value={name}
                    onChangeText={setName}
                    placeholder="Anant Yadav"
                    placeholderTextColor="#94A3B8"
                  />
                  <Text style={styles.label}>Business / Shop Name</Text>
                  <TextInput
                    style={styles.input}
                    value={businessName}
                    onChangeText={setBusinessName}
                    placeholder="SmartKhata Enterprises"
                    placeholderTextColor="#94A3B8"
                  />
                  <Text style={styles.label}>Mobile Number</Text>
                  <TextInput
                    style={styles.input}
                    value={phone}
                    onChangeText={setPhone}
                    keyboardType="phone-pad"
                    placeholder="9876543210"
                    placeholderTextColor="#94A3B8"
                  />
                </>
              )}

              <Text style={styles.label}>
                {mode === 'signin' ? 'Email, Phone or Username *' : 'Email Address *'}
              </Text>
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                placeholder="merchant@example.com"
                placeholderTextColor="#94A3B8"
              />

              {mode !== 'forgot' && (
                <>
                  <Text style={styles.label}>Password *</Text>
                  <TextInput
                    style={styles.input}
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry
                    placeholder="••••••••"
                    placeholderTextColor="#94A3B8"
                  />
                </>
              )}

              <Pressable
                disabled={loading}
                onPress={mode === 'signin' ? handleSignIn : handleSendOtpForSignupOrForgot}
                style={[styles.primaryBtn, loading && styles.disabledBtn]}
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.primaryBtnText}>
                    {mode === 'signin'
                      ? 'Sign In'
                      : mode === 'signup'
                      ? 'Send 6-Digit Verification Code'
                      : 'Send Reset OTP'}
                  </Text>
                )}
              </Pressable>
            </>
          ) : (
            <>
              <View style={styles.otpBanner}>
                <Text style={styles.otpBannerText}>
                  Enter the 6-digit verification code sent to {email.trim()}.
                </Text>
              </View>

              <Text style={styles.label}>6-Digit Verification Code *</Text>
              <TextInput
                style={[styles.input, styles.otpInput]}
                value={otp}
                onChangeText={setOtp}
                keyboardType="number-pad"
                maxLength={6}
                placeholder="123456"
                placeholderTextColor="#94A3B8"
              />

              {mode === 'forgot' && (
                <>
                  <Text style={styles.label}>New Password *</Text>
                  <TextInput
                    style={styles.input}
                    value={newPassword}
                    onChangeText={setNewPassword}
                    secureTextEntry
                    placeholder="Enter new password"
                    placeholderTextColor="#94A3B8"
                  />
                </>
              )}

              <Pressable
                disabled={loading}
                onPress={handleVerifyOtp}
                style={[styles.primaryBtn, loading && styles.disabledBtn]}
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.primaryBtnText}>Verify & Continue</Text>
                )}
              </Pressable>

              <Pressable onPress={() => setStep('form')} style={styles.linkBtn}>
                <Text style={styles.linkBtnText}>Back to Details</Text>
              </Pressable>
            </>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#F8FAFC' },
  container: { flexGrow: 1, justifyContent: 'center', padding: 20 },
  header: { alignItems: 'center', marginBottom: 24 },
  logo: { width: 68, height: 68, borderRadius: 18, marginBottom: 12 },
  title: { fontSize: 26, fontWeight: '900', color: '#0F172A' },
  subtitle: { fontSize: 12, color: '#64748B', marginTop: 4, textAlign: 'center' },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    elevation: 2,
  },
  tabRow: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 14,
    padding: 4,
    marginBottom: 18,
  },
  tabBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
  tabBtnActive: { backgroundColor: '#FFFFFF', elevation: 1 },
  tabText: { fontSize: 12, fontWeight: '700', color: '#64748B' },
  tabTextActive: { color: '#4F46E5' },
  label: { fontSize: 11, fontWeight: '700', color: '#475569', textTransform: 'uppercase', marginBottom: 6, marginTop: 8 },
  input: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: '#0F172A',
    marginBottom: 6,
  },
  otpInput: {
    textAlign: 'center',
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: 6,
  },
  otpBanner: {
    backgroundColor: '#EEF2FF',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
  },
  otpBannerText: { color: '#4338CA', fontSize: 12, fontWeight: '600' },
  primaryBtn: {
    backgroundColor: '#4F46E5',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 14,
  },
  disabledBtn: { opacity: 0.6 },
  primaryBtnText: { color: '#FFFFFF', fontWeight: '800', fontSize: 14 },
  linkBtn: { marginTop: 14, alignItems: 'center' },
  linkBtnText: { color: '#4F46E5', fontWeight: '700', fontSize: 13 },
});
