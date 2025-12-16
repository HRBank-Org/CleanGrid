import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import Button from '../../components/Button';
import { colors } from '../../utils/colors';
import api from '../../services/api';

interface Booking {
  _id: string;
  serviceType: string;
  address: string;
  postalCode: string;
  squareFeet: number;
  scheduledDate: string;
  status: string;
  totalPrice: number;
  isRecurring: boolean;
  recurringFrequency?: string;
  notes?: string;
  escrowStatus: string;
}

export default function BookingDetail() {
  const router = useRouter();
  const { bookingId } = useLocalSearchParams();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);

  const loadBooking = async () => {
    try {
      const response = await api.get(`/api/bookings/${bookingId}`);
      setBooking(response.data);
    } catch (error) {
      Alert.alert('Error', 'Failed to load booking details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBooking();
  }, [bookingId]);

  const handleCancel = () => {
    Alert.alert(
      'Cancel Booking',
      'Are you sure you want to cancel this booking?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/api/bookings/${bookingId}`);
              Alert.alert('Success', 'Booking cancelled');
              router.back();
            } catch (error) {
              Alert.alert('Error', 'Failed to cancel booking');
            }
          },
        },
      ]
    );
  };

  const handleReview = () => {
    router.push({
      pathname: '/(customer)/review',
      params: { bookingId: bookingId as string },
    });
  };

  if (loading || !booking) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loading}>
          <Text>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return colors.success;
      case 'in-progress':
        return colors.secondary;
      case 'cancelled':
        return colors.error;
      default:
        return colors.warning;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>

        <Text style={styles.title}>Booking Details</Text>

        <View
          style={[
            styles.statusCard,
            { backgroundColor: `${getStatusColor(booking.status)}15` },
          ]}
        >
          <Ionicons
            name="information-circle"
            size={24}
            color={getStatusColor(booking.status)}
          />
          <View style={styles.statusInfo}>
            <Text style={styles.statusLabel}>Status</Text>
            <Text
              style={[
                styles.statusValue,
                { color: getStatusColor(booking.status) },
              ]}
            >
              {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
            </Text>
          </View>
        </View>

        <View style={styles.detailsCard}>
          <View style={styles.detailRow}>
            <Ionicons name="location" size={20} color={colors.textSecondary} />
            <View style={styles.detailInfo}>
              <Text style={styles.detailLabel}>Address</Text>
              <Text style={styles.detailValue}>{booking.address}</Text>
              <Text style={styles.detailValue}>{booking.postalCode}</Text>
            </View>
          </View>

          <View style={styles.detailRow}>
            <Ionicons name="calendar" size={20} color={colors.textSecondary} />
            <View style={styles.detailInfo}>
              <Text style={styles.detailLabel}>Scheduled Date</Text>
              <Text style={styles.detailValue}>
                {format(new Date(booking.scheduledDate), 'MMMM dd, yyyy')}
              </Text>
            </View>
          </View>

          <View style={styles.detailRow}>
            <Ionicons name="home" size={20} color={colors.textSecondary} />
            <View style={styles.detailInfo}>
              <Text style={styles.detailLabel}>Service Type</Text>
              <Text style={styles.detailValue}>
                {booking.serviceType === 'residential' ? 'Residential' : 'Commercial'}
              </Text>
            </View>
          </View>

          <View style={styles.detailRow}>
            <Ionicons name="resize" size={20} color={colors.textSecondary} />
            <View style={styles.detailInfo}>
              <Text style={styles.detailLabel}>Square Feet</Text>
              <Text style={styles.detailValue}>{booking.squareFeet} sq ft</Text>
            </View>
          </View>

          {booking.isRecurring && (
            <View style={styles.detailRow}>
              <Ionicons name="repeat" size={20} color={colors.textSecondary} />
              <View style={styles.detailInfo}>
                <Text style={styles.detailLabel}>Recurring</Text>
                <Text style={styles.detailValue}>
                  {booking.recurringFrequency?.charAt(0).toUpperCase() +
                    booking.recurringFrequency?.slice(1)}
                </Text>
              </View>
            </View>
          )}

          {booking.notes && (
            <View style={styles.detailRow}>
              <Ionicons name="document-text" size={20} color={colors.textSecondary} />
              <View style={styles.detailInfo}>
                <Text style={styles.detailLabel}>Notes</Text>
                <Text style={styles.detailValue}>{booking.notes}</Text>
              </View>
            </View>
          )}
        </View>

        <View style={styles.paymentCard}>
          <Text style={styles.paymentLabel}>Payment Status</Text>
          <Text style={styles.paymentStatus}>
            {booking.escrowStatus === 'held'
              ? 'Held in Escrow'
              : 'Released'}
          </Text>
          <View style={styles.paymentDivider} />
          <View style={styles.paymentRow}>
            <Text style={styles.paymentTotalLabel}>Total Amount</Text>
            <Text style={styles.paymentTotalValue}>${booking.totalPrice}</Text>
          </View>
        </View>

        {booking.status === 'completed' && (
          <Button
            title="Write a Review"
            onPress={handleReview}
            variant="primary"
          />
        )}

        {['pending', 'assigned'].includes(booking.status) && (
          <Button
            title="Cancel Booking"
            onPress={handleCancel}
            variant="outline"
            style={{ borderColor: colors.error }}
            textStyle={{ color: colors.error }}
          />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 40,
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
    marginBottom: 24,
  },
  statusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    marginBottom: 24,
  },
  statusInfo: {
    marginLeft: 12,
  },
  statusLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  statusValue: {
    fontSize: 18,
    fontWeight: '600',
  },
  detailsCard: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  detailRow: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  detailInfo: {
    flex: 1,
    marginLeft: 12,
  },
  detailLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 15,
    color: colors.text,
    fontWeight: '500',
  },
  paymentCard: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: colors.border,
  },
  paymentLabel: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  paymentStatus: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.secondary,
    marginBottom: 16,
  },
  paymentDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginBottom: 16,
  },
  paymentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  paymentTotalLabel: {
    fontSize: 16,
    color: colors.text,
    fontWeight: '500',
  },
  paymentTotalValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.primary,
  },
});