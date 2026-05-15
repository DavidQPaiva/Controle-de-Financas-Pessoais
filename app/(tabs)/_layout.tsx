import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

export default function TabsLayout() {
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#0f0f23',
          borderTopColor: '#2d2d50',
          borderTopWidth: 1,
          paddingTop: 6,
          paddingBottom: insets.bottom + 10,
          height: 60 + insets.bottom,
        },
        tabBarActiveTintColor: '#6366f1',
        tabBarInactiveTintColor: '#6b7280',
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Início',
          tabBarIcon: ({ color, size }: { color: string; size: number }) => (
            <Ionicons name={'home' as IconName} size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="add"
        options={{
          title: 'Adicionar',
          tabBarIcon: ({ color, size }: { color: string; size: number }) => (
            <Ionicons name={'add-circle' as IconName} size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="statement"
        options={{
          title: 'Extrato',
          tabBarIcon: ({ color, size }: { color: string; size: number }) => (
            <Ionicons name={'list' as IconName} size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Configurações',
          tabBarIcon: ({ color, size }: { color: string; size: number }) => (
            <Ionicons name={'settings' as IconName} size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
