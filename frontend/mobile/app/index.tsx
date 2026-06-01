import { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { Redirect } from 'expo-router';
import { useAuthStore } from '../src/store/auth.store';
import { Colors } from '../src/theme/colors';

export default function Index() {
  const { isAuthenticated, pinHash, hydrated, loadFromStorage } = useAuthStore();

  useEffect(() => {
    loadFromStorage();
  }, []);

  // Spinner pendant le chargement du store
  if (!hydrated) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.bg }}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (isAuthenticated && pinHash) return <Redirect href="/pin" />;
  if (isAuthenticated && !pinHash) return <Redirect href="/pin?setup=1" />;
  return <Redirect href="/login" />;
}
