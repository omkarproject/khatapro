import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { AlertTriangle, ArrowLeft, Check, RefreshCw, X } from 'lucide-react-native';
import { useMobileApp } from '@/context/MobileAppContext';

export default function SyncConflictsScreen() {
  const router = useRouter();
  const { conflictItems, resolveConflict, triggerSync } = useMobileApp();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft size={20} color="#0F172A" />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Sync Conflicts</Text>
          <Text style={styles.subtitle}>Never auto-overwrite financial records</Text>
        </View>
        <Pressable onPress={() => triggerSync()} style={styles.retryBtn}>
          <RefreshCw size={15} color="#4F46E5" />
          <Text style={styles.retryText}>Retry</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {conflictItems.length === 0 ? (
          <View style={styles.emptyBox}>
            <Check size={28} color="#059669" />
            <Text style={styles.emptyTitle}>No Pending Conflicts</Text>
            <Text style={styles.emptyDesc}>All your financial entries are cleanly synchronized.</Text>
          </View>
        ) : (
          conflictItems.map(item => {
            let parsed: Record<string, any> = {};
            try {
              parsed = JSON.parse(item.payload_json || '{}');
            } catch {
              parsed = {};
            }
            return (
              <View key={item.id} style={styles.card}>
                <View style={styles.cardTop}>
                  <AlertTriangle size={16} color="#DC2626" />
                  <Text style={styles.entityBadge}>
                    {item.entity_type.toUpperCase()} • {item.operation}
                  </Text>
                </View>
                <Text style={styles.recordTitle}>
                  {parsed.name || parsed.customerName || parsed.invoiceNumber || parsed.title || item.entity_id}
                </Text>
                {parsed.amount !== undefined && (
                  <Text style={styles.amountLine}>Amount: ₹{Number(parsed.amount || 0).toLocaleString('en-IN')}</Text>
                )}
                <Text style={styles.errorText}>
                  {item.last_error || 'Version conflict detected between local offline edit and server record.'}
                </Text>
                <View style={styles.actions}>
                  <Pressable
                    onPress={() => resolveConflict(item.id, 'keep_local')}
                    style={[styles.actionBtn, styles.keepLocalBtn]}
                  >
                    <Check size={14} color="#FFFFFF" />
                    <Text style={styles.keepLocalText}>Keep My Edit</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => resolveConflict(item.id, 'keep_server')}
                    style={[styles.actionBtn, styles.keepServerBtn]}
                  >
                    <X size={14} color="#475569" />
                    <Text style={styles.keepServerText}>Discard Local</Text>
                  </Pressable>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>
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
  title: { fontSize: 17, fontWeight: '800', color: '#0F172A' },
  subtitle: { fontSize: 11, color: '#64748B', marginTop: 1 },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  retryText: { fontSize: 12, fontWeight: '700', color: '#4F46E5' },
  content: { padding: 16, gap: 12 },
  emptyBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  emptyTitle: { fontSize: 16, fontWeight: '800', color: '#0F172A', marginTop: 10 },
  emptyDesc: { fontSize: 12, color: '#64748B', marginTop: 4, textAlign: 'center' },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  entityBadge: { fontSize: 11, fontWeight: '800', color: '#DC2626' },
  recordTitle: { fontSize: 15, fontWeight: '800', color: '#0F172A', marginTop: 8 },
  amountLine: { fontSize: 13, fontWeight: '700', color: '#334155', marginTop: 4 },
  errorText: { fontSize: 12, color: '#64748B', marginTop: 6 },
  actions: { flexDirection: 'row', gap: 10, marginTop: 12 },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
  },
  keepLocalBtn: { backgroundColor: '#4F46E5' },
  keepLocalText: { color: '#FFFFFF', fontSize: 12, fontWeight: '800' },
  keepServerBtn: { backgroundColor: '#F1F5F9', borderWidth: 1, borderColor: '#CBD5E1' },
  keepServerText: { color: '#475569', fontSize: 12, fontWeight: '800' },
});
