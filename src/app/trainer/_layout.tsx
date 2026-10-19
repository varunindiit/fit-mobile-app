import { router, Stack } from 'expo-router';
import { useEffect } from 'react';

import { LockedScreen } from '@/components/premium/locked';
import { DEFAULT_TRAINER_ID } from '@/data/trainers';
import { useStore } from '@/lib/store';
import { useAccess } from '@/lib/useAccess';
import { C } from '@/theme';

const goBack = () => (router.canGoBack() ? router.back() : router.replace('/(tabs)'));

/**
 * Everything under /trainer is Pro-only, gated once here rather than in each screen.
 * A Pro member without a trainer yet is assigned one on arrival.
 */
export default function TrainerLayout() {
  const { state, assignTrainer } = useStore();
  const access = useAccess();
  const pro = access.can('trainer');

  useEffect(() => {
    if (pro && !state.trainerId) assignTrainer(DEFAULT_TRAINER_ID);
  }, [pro, state.trainerId, assignTrainer]);

  if (!pro) return <LockedScreen lock={access.lock('trainer')!} eyebrow="Personal coaching" onBack={goBack} />;

  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: C.bg }, animation: 'ios_from_right' }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="chat" />
      <Stack.Screen name="request-session" />
      <Stack.Screen name="call" options={{ presentation: 'fullScreenModal', animation: 'fade', gestureEnabled: false }} />
    </Stack>
  );
}
