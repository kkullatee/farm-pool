import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Platform, StyleSheet, View } from 'react-native';

import { FarmPoolProvider } from '@/context/FarmPoolContext';
import { colors } from '@/lib/theme';

export default function RootLayout() {
  return (
    <FarmPoolProvider>
      <StatusBar style="dark" />
      <View style={styles.page}>
        <View style={styles.frame}>
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
        </View>
      </View>
    </FarmPoolProvider>
  );
}

// Web only: the whole app renders inside a centered, mobile-width column so
// the deployed site looks like the phone app. Native layout is untouched.
const styles = StyleSheet.create({
  page: {
    flex: 1,
    ...(Platform.OS === 'web'
      ? { backgroundColor: '#E8E5DE', alignItems: 'center' as const }
      : null),
  },
  frame: {
    flex: 1,
    width: '100%',
    ...(Platform.OS === 'web'
      ? {
          maxWidth: 430,
          backgroundColor: colors.background,
          borderLeftWidth: 1,
          borderRightWidth: 1,
          borderColor: '#DAD6CC',
        }
      : null),
  },
});
