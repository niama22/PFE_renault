import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StatusBar } from 'expo-status-bar';
import { useAuthStore } from '../src/store/auth.store';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 20_000 } },
});

export default function RootLayout() {
  const { loadFromStorage } = useAuthStore();

  useEffect(() => {
    loadFromStorage();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="login" />
        <Stack.Screen name="pin" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="mission/[id]" options={{ headerShown: true, title: 'Mission', headerTintColor: '#f97316', headerStyle: { backgroundColor: '#fff' } }} />
        <Stack.Screen name="incident/new" options={{ headerShown: true, title: 'Signaler un incident', headerTintColor: '#f97316', headerStyle: { backgroundColor: '#fff' } }} />
        <Stack.Screen name="messages/[missionId]" options={{ headerShown: true, title: 'Messagerie', headerTintColor: '#f97316', headerStyle: { backgroundColor: '#fff' } }} />
      </Stack>
    </QueryClientProvider>
  );
}
