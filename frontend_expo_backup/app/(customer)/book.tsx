import React, { useState } from 'react';
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
import { format } from 'date-fns';
import Button from '../../components/Button';
import Input from '../../components/Input';
import { colors } from '../../utils/colors';
import { useAuthStore } from '../../stores/authStore';
import api from '../../services/api';

export default function BookScreen() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const params = useLocalSearchParams();
  
  const { serviceId, serviceType, squareFeet, isRecurring, frequency, totalPrice } = params;

  const [address, setAddress] = useState(user?.address || '');
  const [postalCode, setPostalCode] = useState(user?.postalCode || '');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  const handleBooking = async () => {
    if (!address || !postalCode) {
      Alert.alert('Error', 'Please provide address and postal code');
      return;
    }

    try {
      setLoading(true);
      await api.post('/api/bookings', {
        serviceId,
        serviceType,
        address,
        postalCode: postalCode.replace(/\s/g, '').toUpperCase(),
        squareFeet: parseInt(squareFeet as string),
        scheduledDate: selectedDate.toISOString(),
        isRecurring: isRecurring === 'true',
        recurringFrequency: isRecurring === 'true' ? frequency : undefined,
        totalPrice: parseFloat(totalPrice as string),
        notes,
      });

      Alert.alert(
        'Success!',
        'Your booking has been confirmed. A franchisee will be assigned soon.',
        [
          {
            text: 'View Bookings',
            onPress: () => router.push('/(customer)/bookings'),
          },
        ]
      );
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Booking failed');
    } finally {
      setLoading(false);
    }
  };

  const getNextWeekDates = () => {
    const dates = [];
    const today = new Date();
    for (let i = 1; i <= 7; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      dates.push(date);
    }
    return dates;
  };

  const dates = getNextWeekDates();

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

          <Text style={styles.title}>Complete Booking</Text>
          <Text style={styles.subtitle}>Schedule your cleaning service</Text>

          <View style={styles.summaryCard}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Service Type</Text>
              <Text style={styles.summaryValue}>
                {serviceType === 'residential' ? 'Residential' : 'Commercial'}
              </Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Square Feet</Text>
              <Text style={styles.summaryValue}>{squareFeet} sq ft</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Recurring</Text>
              <Text style={styles.summaryValue}>
                {isRecurring === 'true' ? `Yes (${frequency})` : 'No'}
              </Text>
            </View>
            <View style={[styles.summaryRow, { marginTop: 8 }]}>
              <Text style={styles.totalLabel}>Total</Text>
              <Text style={styles.totalValue}>${totalPrice}</Text>
            </View>
          </View>

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

          <View style={styles.section}>
            <Text style={styles.label}>Select Date</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.datesList}>
                {dates.map((date) => {
                  const isSelected = format(date, 'yyyy-MM-dd') === format(selectedDate, 'yyyy-MM-dd');
                  return (
                    <TouchableOpacity
                      key={date.toString()}
                      style={[
                        styles.dateCard,
                        isSelected && styles.dateCardActive,
                      ]}
                      onPress={() => setSelectedDate(date)}
                    >
                      <Text
                        style={[
                          styles.dateDay,
                          isSelected && styles.dateDayActive,
                        ]}
                      >
                        {format(date, 'EEE')}
                      </Text>
                      <Text
                        style={[
                          styles.dateNumber,
                          isSelected && styles.dateNumberActive,
                        ]}
                      >
                        {format(date, 'dd')}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>
          </View>

          <Input
            label="Additional Notes (Optional)"
            placeholder="Any special instructions?"
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={3}
            containerStyle={{ height: 100 }}
          />

          <View style={styles.paymentInfo}>
            <Ionicons name="information-circle" size={20} color={colors.secondary} />
            <Text style={styles.paymentText}>
              Payment will be securely held in escrow until service completion
            </Text>
          </View>

          <Button title="Confirm Booking" onPress={handleBooking} loading={loading} />
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
    marginBottom: 24,
  },
  summaryCard: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: colors.border,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text,
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  totalValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.primary,
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
  datesList: {
    flexDirection: 'row',
    gap: 12,
  },
  dateCard: {
    backgroundColor: colors.white,
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    minWidth: 80,
  },
  dateCardActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  dateDay: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  dateDayActive: {
    color: colors.white,
  },
  dateNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
  },
  dateNumberActive: {
    color: colors.white,
  },
  paymentInfo: {
    flexDirection: 'row',
    backgroundColor: colors.gray[50],
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  paymentText: {
    flex: 1,
    fontSize: 13,
    color: colors.textSecondary,
    marginLeft: 12,
    lineHeight: 18,
  },
});