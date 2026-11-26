import React from 'react';
import { Tabs } from 'expo-router';
import { BookOpen, FileSpreadsheet, LayoutDashboard, Menu, Receipt } from 'lucide-react-native';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#4F46E5',
        tabBarInactiveTintColor: '#64748B',
        tabBarStyle: {
          height: 62,
          paddingBottom: 8,
          paddingTop: 6,
          backgroundColor: '#FFFFFF',
          borderTopColor: '#E2E8F0',
        },
        tabBarLabelStyle: {
          fontSize: 11,
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
        name="invoices"
        options={{
          title: 'Billing',
          tabBarIcon: ({ color, size }) => <FileSpreadsheet size={size - 2} color={color} />,
        }}
      />
      <Tabs.Screen
        name="expenses"
        options={{
          title: 'Expense',
          tabBarIcon: ({ color, size }) => <Receipt size={size - 2} color={color} />,
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          title: 'More',
          tabBarIcon: ({ color, size }) => <Menu size={size - 2} color={color} />,
        }}
      />
    </Tabs>
  );
}
