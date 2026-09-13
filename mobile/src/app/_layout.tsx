import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { FarmPoolProvider } from '@/context/FarmPoolContext';
import { colors } from '@/lib/theme';

export default function RootLayout() {
  return (
    <FarmPoolProvider>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerShown: false,
          animation: 'slide_from_right',
          contentStyle: { backgroundColor: colors.background },
        }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="matches" />
        <Stack.Screen name="listings" />
        <Stack.Screen name="account" />
        <Stack.Screen name="buyer" />
        <Stack.Screen name="farmer" />
        <Stack.Screen name="farmer-result" />
        <Stack.Screen name="chat" />
        <Stack.Screen name="how-it-works" />
      </Stack>
    </FarmPoolProvider>
  );
}
