import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Pressable,
  RefreshControl,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { colors } from '../../utils/colors';
import api from '../../services/api';

interface Booking {
  _id: string;
  serviceType: string;
  address: string;
  scheduledDate: string;
  status: string;
  totalPrice: number;
  isRecurring: boolean;
  recurringFrequency?: string;
}

export default function BookingsScreen() {
  const router = useRouter();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  const loadBookings = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/bookings');
      setBookings(response.data);
    } catch (error) {
      console.error('Failed to load bookings:', error);
    } finally {
      setLoading(false);
    }
  };

  // Reload on screen focus
  useFocusEffect(
    useCallback(() => {
      loadBookings();
    }, [])
  );

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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return 'checkmark-circle';
      case 'in-progress':
        return 'time';
      case 'cancelled':
        return 'close-circle';
      default:
        return 'hourglass';
    }
  };

  const upcomingBookings = bookings.filter(
    (b) => ['pending', 'assigned', 'in-progress'].includes(b.status)
  );
  const pastBookings = bookings.filter(
    (b) => ['completed', 'cancelled'].includes(b.status)
  );

  const canCancel = (status: string) => {
    return ['pending', 'assigned'].includes(status);
  };

  const renderBookingCard = (booking: Booking) => (
    <View key={booking._id} style={styles.bookingCard}>
      <TouchableOpacity
        onPress={() =>
          router.push({
            pathname: '/(customer)/booking-detail',
            params: { bookingId: booking._id },
          })
        }
      >
        <View style={styles.bookingHeader}>
          <View style={styles.statusBadge}>
            <Ionicons
              name={getStatusIcon(booking.status) as any}
              size={16}
              color={getStatusColor(booking.status)}
            />
            <Text
              style={[
                styles.statusText,
                { color: getStatusColor(booking.status) },
              ]}
            >
              {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
            </Text>
          </View>
          {booking.isRecurring && (
            <View style={styles.recurringBadge}>
              <Ionicons name="repeat" size={14} color={colors.secondary} />
              <Text style={styles.recurringText}>Recurring</Text>
            </View>
          )}
        </View>

        <Text style={styles.bookingAddress}>{booking.address}</Text>
        <Text style={styles.bookingDate}>
          {format(new Date(booking.scheduledDate), 'MMM dd, yyyy • h:mm a')}
        </Text>

        <View style={styles.bookingFooter}>
          <Text style={styles.bookingPrice}>${booking.totalPrice.toFixed(2)}</Text>
          <Ionicons name="chevron-forward" size={20} color={colors.gray[400]} />
        </View>
      </TouchableOpacity>

      {/* Cancel button for pending/assigned bookings */}
      {canCancel(booking.status) && (
        <Link
          href={{
            pathname: '/(customer)/cancel-booking',
            params: { bookingId: booking._id },
          }}
          asChild
        >
          <TouchableOpacity style={styles.cancelButton}>
            <Ionicons name="close-circle-outline" size={18} color={colors.error} />
            <Text style={styles.cancelButtonText}>Cancel Booking</Text>
          </TouchableOpacity>
        </Link>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={loadBookings} />
        }
      >
        <Text style={styles.title}>My Bookings</Text>

        {bookings.length === 0 && !loading ? (
          <View style={styles.emptyState}>
            <Ionicons name="calendar-outline" size={64} color={colors.gray[300]} />
            <Text style={styles.emptyText}>No bookings yet</Text>
            <Text style={styles.emptySubtext}>
              Book your first cleaning service from the home screen
            </Text>
          </View>
        ) : (
          <>
            {upcomingBookings.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Upcoming</Text>
                {upcomingBookings.map(renderBookingCard)}
              </View>
            )}

            {pastBookings.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Past</Text>
                {pastBookings.map(renderBookingCard)}
              </View>
            )}
          </>
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
    paddingBottom: 100,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 24,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 12,
  },
  bookingCard: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  bookingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.gray[50],
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  recurringBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.gray[50],
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  recurringText: {
    fontSize: 11,
    color: colors.secondary,
    marginLeft: 4,
    fontWeight: '500',
  },
  bookingAddress: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  bookingDate: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 12,
  },
  bookingFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  bookingPrice: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.primary,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 80,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 8,
    textAlign: 'center',
  },
  cancelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: 6,
  },
  cancelButtonPressed: {
    opacity: 0.7,
  },
  cancelButtonDisabled: {
    opacity: 0.5,
  },
  cancelButtonText: {
    fontSize: 14,
    color: colors.error,
    fontWeight: '500',
  },
  cancelButtonTextDisabled: {
    color: colors.gray[400],
  },
});