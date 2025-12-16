import { useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../stores/authStore';
import { colors } from '../utils/colors';

export default function Index() {
  const router = useRouter();
  const { user, isLoading } = useAuthStore();

  useEffect(() => {
    if (!isLoading) {
      if (user) {
        // Route based on role
        if (user.role === 'customer') {
          router.replace('/(customer)/home');
        } else if (user.role === 'franchisee') {
          router.replace('/(franchisee)/dashboard');
        } else if (user.role === 'admin') {
          router.replace('/(admin)/dashboard');
        }
      } else {
        router.replace('/(auth)/welcome');
      }
    }
  }, [user, isLoading]);

  return (
    <View style={styles.container}>
      <Image
        source={require('../assets/images/neatify-logo.png')}
        style={styles.logo}
        resizeMode="contain"
      />
      <ActivityIndicator size="large" color={colors.primary} />
      <Text style={styles.text}>Loading Neatify...</Text>
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
  logo: {
    width: 120,
    height: 120,
    marginBottom: 24,
  },
  text: {
    marginTop: 16,
    fontSize: 16,
    color: colors.textSecondary,
  },
});