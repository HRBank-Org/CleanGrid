import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Button from '../../components/Button';
import { colors } from '../../utils/colors';

export default function Welcome() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.header}>
          <Image
            source={require('../../assets/images/neatify-logo.png')}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={styles.title}>Neatify</Text>
          <Text style={styles.subtitle}>Professional Cleaning Services</Text>
          <Text style={styles.description}>
            Book trusted cleaning services for your home or business across Canada
          </Text>
        </View>

        <View style={styles.features}>
          <View style={styles.feature}>
            <Ionicons name="calendar" size={24} color={colors.primary} />
            <Text style={styles.featureText}>Easy Booking</Text>
          </View>
          <View style={styles.feature}>
            <Ionicons name="shield-checkmark" size={24} color={colors.primary} />
            <Text style={styles.featureText}>Trusted Professionals</Text>
          </View>
          <View style={styles.feature}>
            <Ionicons name="cash" size={24} color={colors.primary} />
            <Text style={styles.featureText}>Secure Payments</Text>
          </View>
        </View>

        <View style={styles.buttonContainer}>
          <Button
            title="Get Started"
            onPress={() => router.push('/(auth)/signup')}
          />
          <Button
            title="Sign In"
            onPress={() => router.push('/(auth)/login')}
            variant="outline"
            style={{ marginTop: 12 }}
          />
        </View>
      </View>
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
    paddingTop: 60,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 48,
  },
  iconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.gray[100],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 36,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 18,
    color: colors.textSecondary,
    marginBottom: 16,
  },
  description: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  features: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 48,
  },
  feature: {
    alignItems: 'center',
  },
  featureText: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 8,
    textAlign: 'center',
  },
  buttonContainer: {
    marginTop: 'auto',
  },
});