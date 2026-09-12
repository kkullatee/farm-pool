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
        }}
      />
    </FarmPoolProvider>
  );
}
