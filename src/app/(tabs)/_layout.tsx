import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import React from 'react';
import type { ColorValue } from 'react-native';

import { useTheme } from '@/context/ThemeContext';

type IconName = keyof typeof Ionicons.glyphMap;

const tab = (title: string, active: IconName, inactive: IconName) => ({
  title,
  tabBarIcon: ({ color, focused, size }: { color: ColorValue; focused: boolean; size: number }) => (
    <Ionicons name={focused ? active : inactive} size={size} color={color as string} />
  ),
});

export default function TabsLayout() {
  const { colors } = useTheme();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: colors.background },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
      }}
    >
      <Tabs.Screen name="index" options={tab('Dashboard', 'grid', 'grid-outline')} />
      <Tabs.Screen name="properties" options={tab('Properties', 'business', 'business-outline')} />
      <Tabs.Screen name="leads" options={tab('Leads', 'people', 'people-outline')} />
      <Tabs.Screen name="followups" options={tab('Follow-ups', 'alarm', 'alarm-outline')} />
      <Tabs.Screen name="more" options={tab('More', 'menu', 'menu-outline')} />
    </Tabs>
  );
}
