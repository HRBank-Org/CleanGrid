import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { colors } from '../../utils/colors';
import { useAuthStore } from '../../stores/authStore';

export default function LogoutScreen() {
  const router = useRouter();
  const logout = useAuthStore((state) => state.logout);

  useEffect(() => {
    const performLogout = async () => {
      try {
        // Clear all storage
        if (typeof window !== 'undefined') {
          localStorage.clear();
          sessionStorage.clear();
        }
        await logout();
        
        // Small delay then redirect
        setTimeout(() => {
          router.replace('/(auth)/welcome');
        }, 500);
      } catch (error) {
        console.error('Logout error:', error);
        router.replace('/(auth)/welcome');
      }
    };

    performLogout();
  }, []);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={colors.primary} />
      <Text style={styles.text}>Logging out...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  text: {
    marginTop: 16,
    fontSize: 16,
    color: colors.textSecondary,
  },
});
