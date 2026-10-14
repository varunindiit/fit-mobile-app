import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useEffect } from 'react';
import { ActivityIndicator, Platform, View } from 'react-native';

import { ToastProvider } from '@/components/ui';
import { StoreProvider, useStore } from '@/lib/store';
import { C } from '@/theme';

SplashScreen.preventAutoHideAsync().catch(() => {});

// Web preview: inputs draw their own brand focus border, so drop the browser's default focus outline.
if (Platform.OS === 'web' && typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = 'input:focus, textarea:focus { outline: none; }';
  document.head.appendChild(style);
}

function RootStack() {
  const { hydrated } = useStore();

  useEffect(() => {
    if (hydrated) SplashScreen.hideAsync().catch(() => {});
  }, [hydrated]);

  if (!hydrated)
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: C.bg, gap: 22 }}>
        <View style={{ width: 72, height: 72, borderRadius: 24, backgroundColor: C.primaryDark, alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name="leaf" size={34} color={C.white} />
        </View>
        <ActivityIndicator color={C.primary} />
      </View>
    );

  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: C.bg }, animation: 'ios_from_right' }}>
      <Stack.Screen name="index" options={{ animation: 'none' }} />
      <Stack.Screen name="onboarding" options={{ animation: 'fade', gestureEnabled: false }} />
      <Stack.Screen name="(tabs)" options={{ animation: 'fade', gestureEnabled: false }} />
      <Stack.Screen name="snap" options={{ presentation: 'fullScreenModal', animation: 'slide_from_bottom' }} />
      <Stack.Screen name="food-search" options={{ animation: 'fade_from_bottom' }} />
      <Stack.Screen name="player" options={{ presentation: 'fullScreenModal', animation: 'slide_from_bottom', gestureEnabled: false }} />
      <Stack.Screen name="streak" options={{ animation: 'fade', gestureEnabled: false }} />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <StoreProvider>
      <ToastProvider>
        <StatusBar style="dark" />
        <RootStack />
      </ToastProvider>
    </StoreProvider>
  );
}
