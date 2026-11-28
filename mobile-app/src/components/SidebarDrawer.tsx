import React from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { usePathname, useRouter } from 'expo-router';
import {
  BellRing,
  BookOpen,
  ClipboardList,
  FileSpreadsheet,
  FolderLock,
  LayoutDashboard,
  LineChart,
  LogOut,
  PackageCheck,
  PiggyBank,
  QrCode,
  Receipt,
  Settings,
  ShieldAlert,
  ShieldCheck,
  Users,
  X,
} from 'lucide-react-native';
import { useMobileApp } from '@/context/MobileAppContext';
import { getThemeColors } from '@/theme/tokens';

const SIDEBAR_ITEMS = [
  { label: 'Dashboard', href: '/(tabs)', match: '/', icon: LayoutDashboard },
  { label: 'Digital KhataBook', href: '/(tabs)/khata', match: '/khata', icon: BookOpen, badge: 'Core' },
  { label: 'Customers CRM', href: '/(tabs)/customers', match: '/customers', icon: Users },
  { label: 'Collect Payment', href: '/collect', match: '/collect', icon: QrCode },
  { label: 'Billing & Invoices', href: '/(tabs)/invoices', match: '/invoices', icon: FileSpreadsheet },
  { label: 'Notes & Tasks', href: '/notes-tasks', match: '/notes-tasks', icon: ClipboardList, badge: 'New' },
  { label: 'Expense Tracker', href: '/(tabs)/expenses', match: '/expenses', icon: Receipt },
  { label: 'Savings Goals', href: '/savings', match: '/savings', icon: PiggyBank },
  { label: 'Inventory & Stock', href: '/inventory', match: '/inventory', icon: PackageCheck },
  { label: 'Payment Reminders', href: '/reminders', match: '/reminders', icon: BellRing },
  { label: 'Document Vault', href: '/documents', match: '/documents', icon: FolderLock },
  { label: 'Financial Analytics', href: '/analytics', match: '/analytics', icon: LineChart },
  { label: 'Settings', href: '/settings', match: '/settings', icon: Settings },
] as const;

export default function SidebarDrawer() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, darkMode, isSidebarOpen, setSidebarOpen, signOut } = useMobileApp();
  const colors = getThemeColors(darkMode);
  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin' || user?.email === 'anantyadav8924@gmail.com';

  const navigateTo = (href: string) => {
    setSidebarOpen(false);
    router.push(href as any);
  };

  return (
    <Modal visible={isSidebarOpen} transparent animationType="fade" onRequestClose={() => setSidebarOpen(false)}>
      <View style={styles.overlay}>
        <View style={[styles.drawer, { backgroundColor: colors.navBg, borderRightColor: colors.divider }]}>
          <View style={[styles.drawerTop, { borderBottomColor: colors.divider }]}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.bizTitle, { color: colors.foreground }]} numberOfLines={1}>
                {user?.businessName || user?.name || 'SmartKhata'}
              </Text>
              <Text style={[styles.bizEmail, { color: colors.mutedText }]} numberOfLines={1}>
                {user?.email}
              </Text>
            </View>
            <Pressable onPress={() => setSidebarOpen(false)} style={styles.closeBtn}>
              <X size={20} color={colors.mutedText} />
            </Pressable>
          </View>

          <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.list}>
            {SIDEBAR_ITEMS.map(item => {
              const Icon = item.icon;
              const isActive =
                item.match === '/'
                  ? pathname === '/' || pathname === '/(tabs)'
                  : pathname.startsWith(item.match);

              return (
                <Pressable
                  key={item.href}
                  onPress={() => navigateTo(item.href)}
                  style={[
                    styles.item,
                    isActive && { backgroundColor: '#4F46E5' },
                  ]}
                >
                  <Icon size={17} color={isActive ? '#FFFFFF' : colors.foreground} />
                  <Text
                    style={[
                      styles.itemLabel,
                      { color: isActive ? '#FFFFFF' : colors.foreground },
                    ]}
                    numberOfLines={1}
                  >
                    {item.label}
                  </Text>
                  {'badge' in item && item.badge && (
                    <View
                      style={[
                        styles.badge,
                        { backgroundColor: isActive ? 'rgba(255,255,255,0.22)' : colors.primaryLight },
                      ]}
                    >
                      <Text style={[styles.badgeText, { color: isActive ? '#FFFFFF' : colors.primary }]}>
                        {item.badge.toUpperCase()}
                      </Text>
                    </View>
                  )}
                </Pressable>
              );
            })}

            {isAdmin && (
              <Pressable
                onPress={() => navigateTo('/admin')}
                style={[styles.item, pathname.startsWith('/admin') && { backgroundColor: '#7C3AED' }]}
              >
                <ShieldAlert size={17} color={pathname.startsWith('/admin') ? '#FFFFFF' : '#7C3AED'} />
                <Text style={[styles.itemLabel, { color: pathname.startsWith('/admin') ? '#FFFFFF' : '#7C3AED' }]}>
                  Admin Control Center
                </Text>
              </Pressable>
            )}
          </ScrollView>

          <View style={[styles.footer, { borderTopColor: colors.divider }]}>
            <View style={styles.secureRow}>
              <ShieldCheck size={14} color="#10B981" />
              <Text style={[styles.secureText, { color: colors.foreground }]}>100% Secure</Text>
              <Text style={[styles.verText, { color: colors.mutedText }]}>v1.0</Text>
            </View>
            <Pressable
              onPress={() => {
                setSidebarOpen(false);
                signOut(false);
              }}
              style={[styles.logoutBtn, { backgroundColor: colors.roseBg }]}
            >
              <LogOut size={14} color={colors.rose} />
              <Text style={[styles.logoutText, { color: colors.rose }]}>Sign Out</Text>
            </Pressable>
          </View>
        </View>
        <Pressable style={styles.backdrop} onPress={() => setSidebarOpen(false)} />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, flexDirection: 'row', backgroundColor: 'rgba(0,0,0,0.55)' },
  backdrop: { flex: 1 },
  drawer: { width: 285, maxWidth: '82%', height: '100%', borderRightWidth: 1 },
  drawerTop: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, gap: 10 },
  bizTitle: { fontSize: 16, fontWeight: '800' },
  bizEmail: { fontSize: 11, marginTop: 2 },
  closeBtn: { padding: 4 },
  list: { padding: 10, gap: 4 },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 11,
    borderRadius: 12,
    gap: 11,
  },
  itemLabel: { flex: 1, fontSize: 13, fontWeight: '700' },
  badge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  badgeText: { fontSize: 9, fontWeight: '800' },
  footer: { padding: 12, borderTopWidth: 1, gap: 8 },
  secureRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  secureText: { fontSize: 11, fontWeight: '600', flex: 1 },
  verText: { fontSize: 10, fontWeight: '700' },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 9, borderRadius: 10 },
  logoutText: { fontSize: 12, fontWeight: '800' },
});
