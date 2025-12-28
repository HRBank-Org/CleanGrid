import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Button from '../../components/Button';
import Input from '../../components/Input';
import { colors } from '../../utils/colors';
import api from '../../services/api';
import { useAuthStore } from '../../stores/authStore';

export default function Signup() {
  const router = useRouter();
  const setAuth = useAuthStore((state) => state.setAuth);
  const [role, setRole] = useState<'customer' | 'franchisee' | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [address, setAddress] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSignup = async () => {
    if (!role || !name || !email || !phone || !password) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    if (role === 'customer' && (!address || !postalCode)) {
      Alert.alert('Error', 'Please provide address and postal code');
      return;
    }

    try {
      setLoading(true);
      const response = await api.post('/api/auth/signup', {
        name,
        email: email.toLowerCase(),
        phone,
        password,
        role,
        address: role === 'customer' ? address : undefined,
        postalCode: role === 'customer' ? postalCode : undefined,
      });

      const { access_token, user } = response.data;
      await setAuth(user, access_token);

      // Route based on role
      if (user.role === 'customer') {
        // New customers go to onboarding to add their first property
        router.replace('/(customer)/onboarding');
      } else if (user.role === 'franchisee') {
        router.replace('/(franchisee)/dashboard');
      }
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Signup failed');
    } finally {
      setLoading(false);
    }
  };

  if (!role) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>

          <View style={styles.header}>
            <Text style={styles.title}>Join Neatify</Text>
            <Text style={styles.subtitle}>I want to...</Text>
          </View>

          <TouchableOpacity
            style={styles.roleCard}
            onPress={() => setRole('customer')}
          >
            <Ionicons name="home" size={32} color={colors.primary} />
            <Text style={styles.roleTitle}>Book Cleaning Services</Text>
            <Text style={styles.roleDescription}>
              Find trusted cleaning professionals for your home or business
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.roleCard}
            onPress={() => setRole('franchisee')}
          >
            <Ionicons name="briefcase" size={32} color={colors.secondary} />
            <Text style={styles.roleTitle}>Become a Franchisee</Text>
            <Text style={styles.roleDescription}>
              Grow your cleaning business with Neatify's platform
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => setRole(null)}
          >
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>

          <View style={styles.header}>
            <Text style={styles.title}>Create Account</Text>
            <Text style={styles.subtitle}>
              {role === 'customer' ? 'Customer' : 'Franchisee'} Registration
            </Text>
          </View>

          <View style={styles.form}>
            <Input
              label="Full Name"
              placeholder="John Doe"
              value={name}
              onChangeText={setName}
            />

            <Input
              label="Email"
              placeholder="your@email.com"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <Input
              label="Phone"
              placeholder="(123) 456-7890"
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
            />

            {role === 'customer' && (
              <>
                <Input
                  label="Address"
                  placeholder="123 Main St"
                  value={address}
                  onChangeText={setAddress}
                />

                <Input
                  label="Postal Code"
                  placeholder="M5V 3A8"
                  value={postalCode}
                  onChangeText={setPostalCode}
                  autoCapitalize="characters"
                />
              </>
            )}

            <Input
              label="Password"
              placeholder="Create a password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />

            <Button
              title="Create Account"
              onPress={handleSignup}
              loading={loading}
              style={{ marginTop: 8 }}
            />

            <TouchableOpacity
              style={styles.loginLink}
              onPress={() => router.push('/(auth)/login')}
            >
              <Text style={styles.loginText}>
                Already have an account?{' '}
                <Text style={styles.loginTextBold}>Sign In</Text>
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 20,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 40,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    marginBottom: 24,
  },
  header: {
    marginBottom: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  roleCard: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 24,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: colors.border,
  },
  roleTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text,
    marginTop: 12,
    marginBottom: 8,
  },
  roleDescription: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  form: {
    flex: 1,
  },
  loginLink: {
    marginTop: 24,
    alignItems: 'center',
  },
  loginText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  loginTextBold: {
    color: colors.primary,
    fontWeight: '600',
  },
});