import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Tabs } from 'expo-router';
import { BookOpen, LayoutDashboard, QrCode, Receipt, Users } from 'lucide-react-native';
import { useMobileApp } from '@/context/MobileAppContext';
import { getThemeColors } from '@/theme/tokens';

export default function TabsLayout() {
  const { darkMode, openCollectModal } = useMobileApp();
  const colors = getThemeColors(darkMode);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: '#94A3B8',
        tabBarStyle: {
          backgroundColor: colors.navBg,
          borderTopColor: colors.divider,
          height: 62,
          paddingBottom: 8,
          paddingTop: 6,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '700',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => <LayoutDashboard size={size - 2} color={color} />,
        }}
      />
      <Tabs.Screen
        name="khata"
        options={{
          title: 'Khata',
          tabBarIcon: ({ color, size }) => <BookOpen size={size - 2} color={color} />,
        }}
      />
      <Tabs.Screen
        name="collect_placeholder"
        listeners={{
          tabPress: (e) => {
            e.preventDefault();
            openCollectModal();
          },
        }}
        options={{
          title: '',
          tabBarButton: () => (
            <Pressable onPress={() => openCollectModal()} style={styles.collectWrap}>
              <View style={styles.collectBtn}>
                <QrCode size={22} color="#FFFFFF" />
              </View>
            </Pressable>
          ),
        }}
      />
      <Tabs.Screen
        name="expenses"
        options={{
          title: 'Expenses',
          tabBarIcon: ({ color, size }) => <Receipt size={size - 2} color={color} />,
        }}
      />
      <Tabs.Screen
        name="customers"
        options={{
          title: 'CRM',
          tabBarIcon: ({ color, size }) => <Users size={size - 2} color={color} />,
        }}
      />
      <Tabs.Screen name="invoices" options={{ href: null }} />
      <Tabs.Screen name="more" options={{ href: null }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  collectWrap: {
    top: -16,
    justifyContent: 'center',
    alignItems: 'center',
    width: 64,
  },
  collectBtn: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: '#4F46E5',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
  },
});
