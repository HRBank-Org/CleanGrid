import React, { useEffect, useRef } from 'react';
import { View, Image, StyleSheet, Animated, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { colors } from '../utils/colors';
import { useAuthStore } from '../stores/authStore';

const { width, height } = Dimensions.get('window');

export default function SplashScreen() {
  const router = useRouter();
  const { loadAuth, user, isLoading } = useAuthStore();
  
  const logoScale = useRef(new Animated.Value(0.3)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const bgOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Start animations
    Animated.sequence([
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
      ]),
      Animated.delay(800),
    ]).start(() => {
      // Load auth and navigate
      loadAuth().then(() => {
        Animated.timing(bgOpacity, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
        }).start(() => {
          navigateToNextScreen();
        });
      });
    });
  }, []);

  const navigateToNextScreen = () => {
    const currentUser = useAuthStore.getState().user;
    if (currentUser) {
      // User is logged in, go to appropriate home screen
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
      // No user, go to welcome
      router.replace('/(auth)/welcome');
    }
  };

  return (
    <Animated.View style={[styles.container, { opacity: bgOpacity }]}>
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
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a2744', // Dark blue from the logo
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: width * 0.7,
    height: height * 0.3,
  },
});
