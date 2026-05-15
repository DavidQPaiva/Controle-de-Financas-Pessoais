import { Stack } from 'expo-router';
import { SQLiteProvider } from 'expo-sqlite';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, initialWindowMetrics } from 'react-native-safe-area-context';
import { initializeDatabase } from '../database/database';

export default function RootLayout() {
  return (
    <SafeAreaProvider initialMetrics={initialWindowMetrics}>
      <StatusBar style="light" />
      <SQLiteProvider databaseName="finance.db" onInit={initializeDatabase}>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="categories" options={{ presentation: 'modal' }} />
          <Stack.Screen name="credit-cards" options={{ presentation: 'modal' }} />
        </Stack>
      </SQLiteProvider>
    </SafeAreaProvider>
  );
}