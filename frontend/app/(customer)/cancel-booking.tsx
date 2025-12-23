import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Platform } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { colors } from '../../utils/colors';
import api from '../../services/api';

export default function CancelBookingScreen() {
  const router = useRouter();
  const { bookingId } = useLocalSearchParams();

  useEffect(() => {
    const cancelBooking = async () => {
      if (!bookingId) {
        router.back();
        return;
      }

      try {
        await api.delete(`/api/bookings/${bookingId}`);
        
        if (Platform.OS === 'web') {
          window.alert('Booking cancelled successfully!');
        }
        
        // Navigate back to bookings
        router.replace('/(customer)/bookings');
      } catch (error: any) {
        const errorMsg = error.response?.data?.detail || 'Failed to cancel booking';
        if (Platform.OS === 'web') {
          window.alert('Error: ' + errorMsg);
        }
        router.back();
      }
    };

    // Small delay then cancel
    const timer = setTimeout(cancelBooking, 500);
    return () => clearTimeout(timer);
  }, [bookingId]);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={colors.primary} />
      <Text style={styles.text}>Cancelling booking...</Text>
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
