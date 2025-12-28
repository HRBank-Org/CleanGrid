import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { useAuthStore } from '../stores/authStore';

export default function RootLayout() {
  const loadAuth = useAuthStore((state) => state.loadAuth);

  useEffect(() => {
    loadAuth();
  }, []);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(customer)" />
      <Stack.Screen name="(franchisee)" />
      <Stack.Screen name="(admin)" />
    </Stack>
  );
}