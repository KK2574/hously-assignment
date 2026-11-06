import { DarkTheme, DefaultTheme, Stack, ThemeProvider as NavThemeProvider, type ErrorBoundaryProps } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import * as SystemUI from 'expo-system-ui';
import React, { useEffect, useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AuthProvider, useAuth } from '@/context/AuthContext';
import { ThemeProvider, useTheme } from '@/context/ThemeContext';

// Keep the splash screen up until the stored session has been checked.
SplashScreen.preventAutoHideAsync().catch(() => undefined);

function RootNavigator() {
  const { isAuthenticated, isLoading } = useAuth();
  const { colors, isDark } = useTheme();

  useEffect(() => {
    if (!isLoading) SplashScreen.hideAsync().catch(() => undefined);
  }, [isLoading]);

  // The window itself must match the theme too, otherwise a white frame shows between screen transitions.
  useEffect(() => {
    SystemUI.setBackgroundColorAsync(colors.background).catch(() => undefined);
  }, [colors.background]);

  // React Navigation paints every screen with its own theme (white by default): match our palette.
  const navTheme = useMemo(() => {
    const base = isDark ? DarkTheme : DefaultTheme;
    return {
      ...base,
      colors: { ...base.colors, background: colors.background, card: colors.surface, border: colors.border, text: colors.text, primary: colors.primary },
    };
  }, [isDark, colors]);

  if (isLoading) return null;

  return (
    <NavThemeProvider value={navTheme}>
      <View style={{ flex: 1, backgroundColor: colors.background }}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
        {/* Protected navigation: these routes exist only while signed in. */}
        <Stack.Protected guard={isAuthenticated}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="property/[id]" />
          <Stack.Screen name="lead/[id]" />
          <Stack.Screen name="followup/[id]" />
          <Stack.Screen name="visits" />
          <Stack.Screen name="visit/[id]" />
          <Stack.Screen name="notifications" />
          <Stack.Screen name="profile" />
          <Stack.Screen name="change-password" />
        </Stack.Protected>

        {/* ...and these only while signed out. */}
        <Stack.Protected guard={!isAuthenticated}>
          <Stack.Screen name="(auth)" />
        </Stack.Protected>
      </Stack>
      </View>
    </NavThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <RootNavigator />
      </AuthProvider>
    </ThemeProvider>
  );
}

/** expo-router renders this when anything below the root layout throws, instead of a blank screen. */
export function ErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  return (
    <View style={errorStyles.wrap}>
      <Text style={errorStyles.emoji}>⚠️</Text>
      <Text style={errorStyles.title}>Something went wrong</Text>
      <Text style={errorStyles.message}>{error.message || 'An unexpected error occurred.'}</Text>
      <Pressable accessibilityRole="button" onPress={retry} style={errorStyles.button}>
        <Text style={errorStyles.buttonText}>Try again</Text>
      </Pressable>
    </View>
  );
}

const errorStyles = StyleSheet.create({
  wrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, backgroundColor: '#F4F6FA' },
  emoji: { fontSize: 44, marginBottom: 12 },
  title: { fontSize: 20, fontWeight: '800', color: '#0B1F44', marginBottom: 8 },
  message: { fontSize: 14, color: '#64708A', textAlign: 'center', marginBottom: 24 },
  button: { backgroundColor: '#1565D8', paddingHorizontal: 28, paddingVertical: 14, borderRadius: 12 },
  buttonText: { color: '#FFFFFF', fontWeight: '700', fontSize: 15 },
});