import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { Platform, View } from 'react-native';

import { AnimatedSplash } from '@/components/AnimatedSplash';
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
  // The animated splash picks up from the native one and stays until the store has hydrated.
  const [splash, setSplash] = useState(true);
  const [revealed, setRevealed] = useState(false);

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      {hydrated && revealed && <Routes />}
      {splash && <AnimatedSplash ready={hydrated} onReveal={() => setRevealed(true)} onDone={() => setSplash(false)} />}
    </View>
  );
}

function Routes() {
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: C.bg }, animation: 'ios_from_right' }}>
      <Stack.Screen name="index" options={{ animation: 'none' }} />
      <Stack.Screen name="onboarding" options={{ animation: 'fade', gestureEnabled: false }} />
      <Stack.Screen name="(tabs)" options={{ animation: 'fade', gestureEnabled: false }} />
      <Stack.Screen name="snap" options={{ presentation: 'fullScreenModal', animation: 'slide_from_bottom' }} />
      <Stack.Screen name="food-search" options={{ animation: 'fade_from_bottom' }} />
      <Stack.Screen name="player" options={{ presentation: 'fullScreenModal', animation: 'slide_from_bottom', gestureEnabled: false }} />
      <Stack.Screen name="streak" options={{ animation: 'fade', gestureEnabled: false }} />
      <Stack.Screen name="pro-welcome" options={{ presentation: 'fullScreenModal', animation: 'fade', gestureEnabled: false }} />
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
