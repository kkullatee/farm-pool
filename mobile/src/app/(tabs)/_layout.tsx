import { Feather } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { ColorValue, View } from 'react-native';

import { useFarmPool } from '@/context/FarmPoolContext';
import { colors } from '@/lib/theme';

type IconName = keyof typeof Feather.glyphMap;

function tabIcon(name: IconName) {
  return function TabIcon({ color, focused }: { color: ColorValue; focused: boolean }) {
    return (
      <View style={{ alignItems: 'center' }}>
        <Feather name={name} size={21} color={color as string} />
        <View
          style={{
            width: 4,
            height: 4,
            borderRadius: 2,
            marginTop: 2,
            backgroundColor: focused ? colors.tan : 'transparent',
          }}
        />
      </View>
    );
  };
}

export default function TabsLayout() {
  const { role, orderRequests, activeSellerFarm } = useFarmPool();
  const pendingForSeller = orderRequests.filter(
    (request) => request.status === 'Pending' && request.farmerName === activeSellerFarm,
  ).length;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.faint,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          borderTopWidth: 1,
        },
        tabBarLabelStyle: { fontSize: 10, fontWeight: '600' },
        sceneStyle: { backgroundColor: colors.background },
      }}>
      <Tabs.Screen name="index" options={{ title: 'Home', tabBarIcon: tabIcon('home') }} />
      <Tabs.Screen
        name="orders"
        options={{
          title: 'Orders',
          tabBarIcon: tabIcon('clipboard'),
          tabBarBadge: role === 'seller' && pendingForSeller > 0 ? pendingForSeller : undefined,
          tabBarBadgeStyle: { backgroundColor: colors.primary, color: colors.cream, fontSize: 10 },
        }}
      />
      <Tabs.Screen
        name="messages"
        options={{ title: 'Messages', tabBarIcon: tabIcon('message-circle') }}
      />
    </Tabs>
  );
}
