import { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Image, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../stores/authStore';
import { colors } from '../utils/colors';

const { width, height } = Dimensions.get('window');

export default function Index() {
  const router = useRouter();
  const { loadAuth } = useAuthStore();
  
  const logoScale = useRef(new Animated.Value(0.3)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Start splash animation
    Animated.parallel([
      Animated.spring(logoScale, {
        toValue: 1,
        tension: 10,
        friction: 3,
        useNativeDriver: true,
      }),
      Animated.timing(logoOpacity, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();

    // Load auth and navigate after delay
    const timer = setTimeout(async () => {
      await loadAuth();
      navigateToNextScreen();
    }, 1500);

    return () => clearTimeout(timer);
  }, []);

  const navigateToNextScreen = () => {
    const currentUser = useAuthStore.getState().user;
    if (currentUser) {
      switch (currentUser.role) {
        case 'admin':
          router.replace('/(admin)/dashboard');
          break;
        case 'franchisee':
          router.replace('/(franchisee)/dashboard');
          break;
        case 'workforce':
          router.replace('/(workforce)/dashboard');
          break;
        default:
          router.replace('/(customer)/home');
      }
    } else {
      router.replace('/(auth)/welcome');
    }
  };

  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.logoContainer,
          {
            opacity: logoOpacity,
            transform: [{ scale: logoScale }],
          },
        ]}
      >
        <Image
          source={require('../assets/images/neatify-logo.png')}
          style={styles.logo}
          resizeMode="contain"
        />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a2744',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: width * 0.65,
    height: height * 0.25,
  },
});