import React, { useMemo, useState } from 'react';
import { Image, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Bell, Menu, Moon, QrCode, Search, Sun, X } from 'lucide-react-native';
import { useMobileApp } from '@/context/MobileAppContext';
import { getThemeColors } from '@/theme/tokens';

export default function NavbarHeader() {
  const router = useRouter();
  const {
    user,
    darkMode,
    toggleDarkMode,
    setSidebarOpen,
    openCollectModal,
    setGlobalSearchOpen,
    products,
    reminders,
    conflictItems,
  } = useMobileApp();

  const colors = getThemeColors(darkMode);
  const [notifOpen, setNotifOpen] = useState(false);

  const alerts = useMemo(() => {
    const items: { id: string; title: string; subtitle: string; route: string }[] = [];
    products
      .filter(p => !(p as any).isDeleted && p.currentStock <= p.minStock)
      .slice(0, 4)
      .forEach(p => {
        items.push({
          id: `low_${p.id}`,
          title: `Low Stock: ${p.name}`,
          subtitle: `Remaining ${p.currentStock} ${p.unit} (Min: ${p.minStock})`,
          route: '/inventory',
        });
      });
    reminders
      .filter(r => !(r as any).isDeleted && r.status === 'pending')
      .slice(0, 4)
      .forEach(r => {
        items.push({
          id: `rem_${r.id}`,
          title: `Reminder: ${r.customerName}`,
          subtitle: `₹${r.amount.toLocaleString('en-IN')} due ${r.dueDate}`,
          route: '/reminders',
        });
      });
    if (conflictItems.length > 0) {
      items.push({
        id: 'sync_conf',
        title: `${conflictItems.length} Sync Conflict(s)`,
        subtitle: 'Tap to review and resolve safely',
        route: '/sync-conflicts',
      });
    }
    return items;
  }, [products, reminders, conflictItems]);

  return (
    <>
      <View style={[styles.navbar, { backgroundColor: colors.navBg, borderBottomColor: colors.divider }]}>
        <View style={styles.left}>
          <Pressable
            onPress={() => setSidebarOpen(true)}
            style={[styles.iconBtn, { backgroundColor: colors.cardMuted }]}
          >
            <Menu size={19} color={colors.foreground} />
          </Pressable>
          <Pressable onPress={() => router.replace('/(tabs)')} style={styles.brandRow}>
            <Image source={require('../../assets/icon.png')} style={styles.logo} />
            <View>
              <Text style={[styles.brandName, { color: colors.foreground }]} numberOfLines={1}>
                {user?.businessName || 'SmartKhata'}
              </Text>
              <Text style={[styles.brandSub, { color: colors.primary }]}>PRO LEDGER</Text>
            </View>
          </Pressable>
        </View>

        <View style={styles.right}>
          <Pressable
            onPress={() => setGlobalSearchOpen(true)}
            style={[styles.iconBtn, { backgroundColor: colors.cardMuted }]}
          >
            <Search size={17} color={colors.foreground} />
          </Pressable>
          <Pressable
            onPress={toggleDarkMode}
            style={[styles.iconBtn, { backgroundColor: colors.cardMuted }]}
          >
            {darkMode ? <Sun size={17} color="#FBBF24" /> : <Moon size={17} color={colors.foreground} />}
          </Pressable>
          <Pressable
            onPress={() => openCollectModal()}
            style={[styles.iconBtn, { backgroundColor: colors.primaryLight }]}
          >
            <QrCode size={17} color={colors.primary} />
          </Pressable>
          <Pressable
            onPress={() => setNotifOpen(true)}
            style={[styles.iconBtn, { backgroundColor: colors.cardMuted }]}
          >
            <Bell size={17} color={colors.foreground} />
            {alerts.length > 0 && <View style={styles.dot} />}
          </Pressable>
        </View>
      </View>

      <Modal visible={notifOpen} transparent animationType="fade" onRequestClose={() => setNotifOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setNotifOpen(false)}>
          <View style={[styles.notifCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <View style={styles.notifHeader}>
              <Text style={[styles.notifTitle, { color: colors.foreground }]}>Notifications ({alerts.length})</Text>
              <Pressable onPress={() => setNotifOpen(false)}>
                <X size={18} color={colors.mutedText} />
              </Pressable>
            </View>
            <ScrollView style={{ maxHeight: 320 }}>
              {alerts.length === 0 ? (
                <Text style={[styles.emptyNotif, { color: colors.mutedText }]}>All caught up! No pending alerts.</Text>
              ) : (
                alerts.map(a => (
                  <Pressable
                    key={a.id}
                    onPress={() => {
                      setNotifOpen(false);
                      router.push(a.route as any);
                    }}
                    style={[styles.notifRow, { borderBottomColor: colors.divider }]}
                  >
                    <Text style={[styles.notifItemTitle, { color: colors.foreground }]}>{a.title}</Text>
                    <Text style={[styles.notifItemSub, { color: colors.mutedText }]}>{a.subtitle}</Text>
                  </Pressable>
                ))
              )}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  navbar: {
    height: 54,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    borderBottomWidth: 1,
  },
  left: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  logo: { width: 30, height: 30, borderRadius: 8 },
  brandName: { fontSize: 15, fontWeight: '800', maxWidth: 140 },
  brandSub: { fontSize: 9, fontWeight: '800', letterSpacing: 0.8 },
  right: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  iconBtn: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center', position: 'relative' },
  dot: { position: 'absolute', top: 6, right: 6, width: 7, height: 7, borderRadius: 4, backgroundColor: '#E11D48' },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-start', paddingTop: 64, paddingHorizontal: 14 },
  notifCard: { borderRadius: 18, borderWidth: 1, padding: 14 },
  notifHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  notifTitle: { fontSize: 15, fontWeight: '800' },
  emptyNotif: { textAlign: 'center', paddingVertical: 20, fontSize: 13 },
  notifRow: { paddingVertical: 10, borderBottomWidth: 1 },
  notifItemTitle: { fontSize: 13, fontWeight: '700' },
  notifItemSub: { fontSize: 11, marginTop: 2 },
});
