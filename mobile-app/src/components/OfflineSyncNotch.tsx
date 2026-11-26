import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { AlertTriangle, CheckCircle2, WifiOff } from 'lucide-react-native';
import { useMobileApp } from '@/context/MobileAppContext';

export default function OfflineSyncNotch() {
  const router = useRouter();
  const { isOnline, syncPhase, syncProgress, pendingCount, conflictItems } = useMobileApp();

  if (isOnline && syncPhase === 'idle' && pendingCount === 0 && conflictItems.length === 0) {
    return null;
  }

  if (conflictItems.length > 0 || syncPhase === 'conflict') {
    return (
      <View style={styles.wrapper}>
        <Pressable onPress={() => router.push('/sync-conflicts')} style={[styles.pill, styles.conflictPill]}>
          <AlertTriangle size={12} color="#FCA5A5" />
          <Text style={styles.conflictText}>
            Sync Conflict ({conflictItems.length}) • Tap to resolve
          </Text>
        </Pressable>
      </View>
    );
  }

  if (!isOnline || syncPhase === 'offline') {
    return (
      <View style={styles.wrapper}>
        <View style={[styles.pill, styles.offlinePill]}>
          <View style={styles.amberDot} />
          <WifiOff size={12} color="#FBBF24" />
          <Text style={styles.offlineText}>
            Offline Work{pendingCount > 0 ? ` • ${pendingCount} Saved Locally` : ''}
          </Text>
        </View>
      </View>
    );
  }

  if (syncPhase === 'syncing') {
    return (
      <View style={styles.wrapper}>
        <View style={[styles.pill, styles.syncingPill]}>
          <ActivityIndicator size="small" color="#34D399" style={{ transform: [{ scale: 0.65 }] }} />
          <Text style={styles.syncingText}>
            Online • Syncing {Math.max(1, Math.min(100, syncProgress))}%
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.wrapper}>
      <View style={[styles.pill, styles.syncedPill]}>
        <CheckCircle2 size={12} color="#34D399" />
        <Text style={styles.syncedText}>Online • Synced 100%</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 2,
    paddingBottom: 2,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
  },
  offlinePill: {
    backgroundColor: '#451A03',
    borderColor: '#D97706',
  },
  amberDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FBBF24',
  },
  offlineText: {
    color: '#FDE68A',
    fontSize: 11,
    fontWeight: '700',
  },
  syncingPill: {
    backgroundColor: '#0F172A',
    borderColor: '#10B981',
  },
  syncingText: {
    color: '#A7F3D0',
    fontSize: 11,
    fontWeight: '700',
  },
  syncedPill: {
    backgroundColor: '#064E3B',
    borderColor: '#10B981',
  },
  syncedText: {
    color: '#D1FAE5',
    fontSize: 11,
    fontWeight: '700',
  },
  conflictPill: {
    backgroundColor: '#7F1D1D',
    borderColor: '#EF4444',
  },
  conflictText: {
    color: '#FECACA',
    fontSize: 11,
    fontWeight: '700',
  },
});
