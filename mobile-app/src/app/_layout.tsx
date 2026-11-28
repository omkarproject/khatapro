import React, { useEffect } from 'react';
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Slot, useRouter, useSegments } from 'expo-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Fingerprint } from 'lucide-react-native';
import { MobileAppProvider, useMobileApp } from '@/context/MobileAppContext';
import OfflineSyncNotch from '@/components/OfflineSyncNotch';
import NavbarHeader from '@/components/NavbarHeader';
import SidebarDrawer from '@/components/SidebarDrawer';
import QuickUPICollectModal from '@/components/QuickUPICollectModal';
import GlobalSearchModal from '@/components/GlobalSearchModal';
import { getThemeColors } from '@/theme/tokens';

const queryClient = new QueryClient();

function RootNavigatorGate() {
  const { user, darkMode, isAuthLoading, isBiometricLocked, unlockWithBiometric } = useMobileApp();
  const segments = useSegments();
  const router = useRouter();
  const colors = getThemeColors(darkMode);

  useEffect(() => {
    if (isAuthLoading) return;
    const inAuthGroup = segments[0] === '(auth)';
    if (!user && !inAuthGroup) {
      router.replace('/(auth)/login');
    } else if (user && inAuthGroup) {
      router.replace('/(tabs)');
    }
  }, [user, isAuthLoading, segments, router]);

  if (isAuthLoading) {
    return (
      <View style={styles.centerContainer}>
        <Image source={require('../../assets/icon.png')} style={styles.logo} />
        <Text style={styles.brandTitle}>SmartKhata</Text>
        <ActivityIndicator size="large" color="#4F46E5" style={{ marginTop: 18 }} />
      </View>
    );
  }

  if (user && isBiometricLocked) {
    return (
      <View style={styles.centerContainer}>
        <Image source={require('../../assets/icon.png')} style={styles.logo} />
        <Text style={styles.brandTitle}>SmartKhata Locked</Text>
        <Text style={styles.subtitle}>Verify fingerprint or device PIN to access your ledger</Text>
        <Pressable onPress={unlockWithBiometric} style={styles.unlockBtn}>
          <Fingerprint size={20} color="#FFFFFF" />
          <Text style={styles.unlockBtnText}>Unlock App</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={['top', 'left', 'right']}>
      <StatusBar style={darkMode ? 'light' : 'dark'} />
      {user && <NavbarHeader />}
      {user && <OfflineSyncNotch />}
      <View style={{ flex: 1 }}>
        <Slot />
      </View>
      {user && <SidebarDrawer />}
      {user && <QuickUPICollectModal />}
      {user && <GlobalSearchModal />}
    </SafeAreaView>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <MobileAppProvider>
          <RootNavigatorGate />
        </MobileAppProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  centerContainer: {
    flex: 1,
    backgroundColor: '#0B0F19',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  logo: { width: 84, height: 84, borderRadius: 20, marginBottom: 16 },
  brandTitle: { fontSize: 22, fontWeight: '800', color: '#FFFFFF' },
  subtitle: { fontSize: 13, color: '#94A3B8', marginTop: 8, textAlign: 'center' },
  unlockBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 22,
    backgroundColor: '#4F46E5',
    paddingHorizontal: 22,
    paddingVertical: 13,
    borderRadius: 14,
  },
  unlockBtnText: { color: '#FFFFFF', fontWeight: '800', fontSize: 15 },
});
