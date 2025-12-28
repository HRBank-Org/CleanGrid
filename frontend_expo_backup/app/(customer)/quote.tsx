import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Button from '../../components/Button';
import Input from '../../components/Input';
import { colors } from '../../utils/colors';
import api from '../../services/api';

interface Service {
  _id: string;
  name: string;
  description: string;
  basePriceResidential: number;
  basePriceCommercial: number;
  pricePerSqFt: number;
}

interface Quote {
  serviceId: string;
  serviceName: string;
  basePrice: number;
  sqftPrice: number;
  totalPrice: number;
  discount: number;
  finalPrice: number;
  isRecurring: boolean;
  frequency?: string;
}

export default function QuoteScreen() {
  const router = useRouter();
  const { serviceId } = useLocalSearchParams();
  const [service, setService] = useState<Service | null>(null);
  const [serviceType, setServiceType] = useState<'residential' | 'commercial'>('residential');
  const [squareFeet, setSquareFeet] = useState('');
  const [isRecurring, setIsRecurring] = useState(false);
  const [frequency, setFrequency] = useState<'weekly' | 'biweekly' | 'monthly'>('weekly');
  const [quote, setQuote] = useState<Quote | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadService();
  }, [serviceId]);

  const loadService = async () => {
    try {
      const response = await api.get(`/api/services/${serviceId}`);
      setService(response.data);
    } catch (error) {
      Alert.alert('Error', 'Failed to load service');
    }
  };

  const calculateQuote = async () => {
    if (!squareFeet || parseInt(squareFeet) <= 0) {
      Alert.alert('Error', 'Please enter a valid square footage');
      return;
    }

    try {
      setLoading(true);
      const response = await api.post('/api/quotes', {
        serviceId,
        serviceType,
        squareFeet: parseInt(squareFeet),
        isRecurring,
        frequency: isRecurring ? frequency : undefined,
      });
      setQuote(response.data);
    } catch (error) {
      Alert.alert('Error', 'Failed to calculate quote');
    } finally {
      setLoading(false);
    }
  };

  const proceedToBooking = () => {
    if (!quote) return;
    router.push({
      pathname: '/(customer)/book',
      params: {
        serviceId: quote.serviceId,
        serviceType,
        squareFeet,
        isRecurring: isRecurring.toString(),
        frequency: frequency,
        totalPrice: quote.finalPrice.toString(),
      },
    });
  };

  if (!service) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loading}>
          <Text>Loading...</Text>
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
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>

          <Text style={styles.title}>Get a Quote</Text>
          <Text style={styles.subtitle}>{service.name}</Text>

          <View style={styles.section}>
            <Text style={styles.label}>Service Type</Text>
            <View style={styles.radioGroup}>
              <TouchableOpacity
                style={[
                  styles.radioButton,
                  serviceType === 'residential' && styles.radioButtonActive,
                ]}
                onPress={() => setServiceType('residential')}
              >
                <Ionicons
                  name={serviceType === 'residential' ? 'radio-button-on' : 'radio-button-off'}
                  size={24}
                  color={serviceType === 'residential' ? colors.primary : colors.gray[400]}
                />
                <Text style={styles.radioText}>Residential</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.radioButton,
                  serviceType === 'commercial' && styles.radioButtonActive,
                ]}
                onPress={() => setServiceType('commercial')}
              >
                <Ionicons
                  name={serviceType === 'commercial' ? 'radio-button-on' : 'radio-button-off'}
                  size={24}
                  color={serviceType === 'commercial' ? colors.primary : colors.gray[400]}
                />
                <Text style={styles.radioText}>Commercial</Text>
              </TouchableOpacity>
            </View>
          </View>

          <Input
            label="Square Feet"
            placeholder="e.g., 1500"
            value={squareFeet}
            onChangeText={setSquareFeet}
            keyboardType="number-pad"
          />

          <View style={styles.section}>
            <TouchableOpacity
              style={styles.checkboxContainer}
              onPress={() => setIsRecurring(!isRecurring)}
            >
              <Ionicons
                name={isRecurring ? 'checkbox' : 'square-outline'}
                size={24}
                color={isRecurring ? colors.primary : colors.gray[400]}
              />
              <Text style={styles.checkboxLabel}>Make this recurring</Text>
            </TouchableOpacity>

            {isRecurring && (
              <View style={styles.frequencyGroup}>
                {(['weekly', 'biweekly', 'monthly'] as const).map((freq) => (
                  <TouchableOpacity
                    key={freq}
                    style={[
                      styles.frequencyButton,
                      frequency === freq && styles.frequencyButtonActive,
                    ]}
                    onPress={() => setFrequency(freq)}
                  >
                    <Text
                      style={[
                        styles.frequencyText,
                        frequency === freq && styles.frequencyTextActive,
                      ]}
                    >
                      {freq.charAt(0).toUpperCase() + freq.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          <Button title="Calculate Quote" onPress={calculateQuote} loading={loading} />

          {quote && (
            <View style={styles.quoteCard}>
              <Text style={styles.quoteTitle}>Your Quote</Text>
              
              <View style={styles.quoteRow}>
                <Text style={styles.quoteLabel}>Base Price</Text>
                <Text style={styles.quoteValue}>${quote.basePrice.toFixed(2)}</Text>
              </View>

              <View style={styles.quoteRow}>
                <Text style={styles.quoteLabel}>Square Footage ({squareFeet} sq ft)</Text>
                <Text style={styles.quoteValue}>${quote.sqftPrice.toFixed(2)}</Text>
              </View>

              {quote.discount > 0 && (
                <View style={styles.quoteRow}>
                  <Text style={styles.quoteLabel}>Recurring Discount</Text>
                  <Text style={[styles.quoteValue, { color: colors.success }]}>
                    -${quote.discount.toFixed(2)}
                  </Text>
                </View>
              )}

              <View style={styles.quoteDivider} />

              <View style={styles.quoteRow}>
                <Text style={styles.quoteTotalLabel}>Total</Text>
                <Text style={styles.quoteTotalValue}>${quote.finalPrice.toFixed(2)}</Text>
              </View>

              {quote.isRecurring && (
                <Text style={styles.quoteNote}>
                  {quote.frequency} recurring service
                </Text>
              )}

              <Button
                title="Proceed to Booking"
                onPress={proceedToBooking}
                style={{ marginTop: 16 }}
              />
            </View>
          )}
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
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 100,
  },
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    marginBottom: 24,
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
    marginBottom: 32,
  },
  section: {
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 12,
  },
  radioGroup: {
    flexDirection: 'row',
    gap: 12,
  },
  radioButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  radioButtonActive: {
    borderColor: colors.primary,
    backgroundColor: colors.gray[50],
  },
  radioText: {
    fontSize: 14,
    color: colors.text,
    marginLeft: 8,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  checkboxLabel: {
    fontSize: 16,
    color: colors.text,
    marginLeft: 8,
  },
  frequencyGroup: {
    flexDirection: 'row',
    gap: 8,
  },
  frequencyButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  frequencyButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  frequencyText: {
    fontSize: 14,
    color: colors.text,
  },
  frequencyTextActive: {
    color: colors.white,
    fontWeight: '600',
  },
  quoteCard: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 20,
    marginTop: 24,
    borderWidth: 1,
    borderColor: colors.border,
  },
  quoteTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 16,
  },
  quoteRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  quoteLabel: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  quoteValue: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text,
  },
  quoteDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 12,
  },
  quoteTotalLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  quoteTotalValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.primary,
  },
  quoteNote: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 8,
    textAlign: 'center',
  },
});