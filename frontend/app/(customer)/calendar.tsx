import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Calendar, CalendarList } from 'react-native-calendars';
import { format, startOfWeek, endOfWeek, addDays, isSameDay } from 'date-fns';
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
  notes?: string;
}

type ViewMode = 'month' | 'week' | 'day';

export default function CalendarScreen() {
  const router = useRouter();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('month');

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

  useFocusEffect(
    useCallback(() => {
      loadBookings();
    }, [])
  );

  // Generate marked dates for calendar
  const getMarkedDates = () => {
    const marked: any = {};
    
    bookings.forEach(booking => {
      const dateStr = format(new Date(booking.scheduledDate), 'yyyy-MM-dd');
      const dotColor = getStatusColor(booking.status);
      
      if (marked[dateStr]) {
        marked[dateStr].dots.push({ color: dotColor });
      } else {
        marked[dateStr] = {
          dots: [{ color: dotColor }],
          marked: true,
        };
      }
    });

    // Mark selected date
    const selectedStr = format(selectedDate, 'yyyy-MM-dd');
    if (marked[selectedStr]) {
      marked[selectedStr].selected = true;
      marked[selectedStr].selectedColor = colors.primary;
    } else {
      marked[selectedStr] = {
        selected: true,
        selectedColor: colors.primary,
      };
    }

    return marked;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return colors.success;
      case 'in-progress': return colors.secondary;
      case 'cancelled': return colors.error;
      case 'assigned': return colors.primary;
      default: return colors.warning;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return 'checkmark-circle';
      case 'in-progress': return 'time';
      case 'cancelled': return 'close-circle';
      default: return 'hourglass';
    }
  };

  // Filter bookings for selected date/range
  const getFilteredBookings = () => {
    if (viewMode === 'day') {
      return bookings.filter(b => 
        isSameDay(new Date(b.scheduledDate), selectedDate)
      );
    } else if (viewMode === 'week') {
      const weekStart = startOfWeek(selectedDate, { weekStartsOn: 0 });
      const weekEnd = endOfWeek(selectedDate, { weekStartsOn: 0 });
      return bookings.filter(b => {
        const bookingDate = new Date(b.scheduledDate);
        return bookingDate >= weekStart && bookingDate <= weekEnd;
      });
    }
    // Month view - show all bookings for selected month
    return bookings.filter(b => {
      const bookingDate = new Date(b.scheduledDate);
      return bookingDate.getMonth() === selectedDate.getMonth() &&
             bookingDate.getFullYear() === selectedDate.getFullYear();
    });
  };

  // Get week days for week view
  const getWeekDays = () => {
    const weekStart = startOfWeek(selectedDate, { weekStartsOn: 0 });
    return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  };

  const renderBookingCard = (booking: Booking) => (
    <TouchableOpacity
      key={booking._id}
      style={styles.bookingCard}
      onPress={() => router.push({
        pathname: '/(customer)/booking-detail',
        params: { bookingId: booking._id },
      })}
    >
      <View style={[styles.statusStrip, { backgroundColor: getStatusColor(booking.status) }]} />
      <View style={styles.bookingContent}>
        <View style={styles.bookingHeader}>
          <Text style={styles.bookingTime}>
            {format(new Date(booking.scheduledDate), 'h:mm a')}
          </Text>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(booking.status) + '20' }]}>
            <Ionicons name={getStatusIcon(booking.status) as any} size={12} color={getStatusColor(booking.status)} />
            <Text style={[styles.statusText, { color: getStatusColor(booking.status) }]}>
              {booking.status}
            </Text>
          </View>
        </View>
        <Text style={styles.bookingAddress} numberOfLines={1}>{booking.address}</Text>
        <View style={styles.bookingFooter}>
          <Text style={styles.bookingType}>{booking.serviceType}</Text>
          <Text style={styles.bookingPrice}>${booking.totalPrice.toFixed(2)}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderDayView = () => {
    const dayBookings = getFilteredBookings().sort(
      (a, b) => new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime()
    );

    return (
      <View style={styles.dayView}>
        <View style={styles.dayHeader}>
          <TouchableOpacity onPress={() => setSelectedDate(addDays(selectedDate, -1))}>
            <Ionicons name="chevron-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <View style={styles.dayHeaderCenter}>
            <Text style={styles.dayHeaderTitle}>{format(selectedDate, 'EEEE')}</Text>
            <Text style={styles.dayHeaderDate}>{format(selectedDate, 'MMMM d, yyyy')}</Text>
          </View>
          <TouchableOpacity onPress={() => setSelectedDate(addDays(selectedDate, 1))}>
            <Ionicons name="chevron-forward" size={24} color={colors.text} />
          </TouchableOpacity>
        </View>

        {dayBookings.length === 0 ? (
          <View style={styles.emptyDay}>
            <Ionicons name="calendar-outline" size={48} color={colors.gray[300]} />
            <Text style={styles.emptyText}>No bookings on this day</Text>
          </View>
        ) : (
          <ScrollView style={styles.bookingsList}>
            {dayBookings.map(renderBookingCard)}
          </ScrollView>
        )}
      </View>
    );
  };

  const renderWeekView = () => {
    const weekDays = getWeekDays();
    
    return (
      <View style={styles.weekView}>
        <View style={styles.weekHeader}>
          <TouchableOpacity onPress={() => setSelectedDate(addDays(selectedDate, -7))}>
            <Ionicons name="chevron-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.weekHeaderTitle}>
            {format(weekDays[0], 'MMM d')} - {format(weekDays[6], 'MMM d, yyyy')}
          </Text>
          <TouchableOpacity onPress={() => setSelectedDate(addDays(selectedDate, 7))}>
            <Ionicons name="chevron-forward" size={24} color={colors.text} />
          </TouchableOpacity>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.weekDaysRow}>
            {weekDays.map((day, index) => {
              const dayBookings = bookings.filter(b => 
                isSameDay(new Date(b.scheduledDate), day)
              );
              const isSelected = isSameDay(day, selectedDate);
              const isToday = isSameDay(day, new Date());

              return (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.weekDay,
                    isSelected && styles.weekDaySelected,
                    isToday && styles.weekDayToday,
                  ]}
                  onPress={() => {
                    setSelectedDate(day);
                    setViewMode('day');
                  }}
                >
                  <Text style={[styles.weekDayName, isSelected && styles.weekDayNameSelected]}>
                    {format(day, 'EEE')}
                  </Text>
                  <Text style={[styles.weekDayNumber, isSelected && styles.weekDayNumberSelected]}>
                    {format(day, 'd')}
                  </Text>
                  {dayBookings.length > 0 && (
                    <View style={styles.weekDayDots}>
                      {dayBookings.slice(0, 3).map((b, i) => (
                        <View
                          key={i}
                          style={[styles.weekDayDot, { backgroundColor: getStatusColor(b.status) }]}
                        />
                      ))}
                    </View>
                  )}
                  {dayBookings.length > 0 && (
                    <Text style={styles.weekDayCount}>{dayBookings.length}</Text>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>

        <ScrollView style={styles.bookingsList}>
          <Text style={styles.weekBookingsTitle}>
            This Week ({getFilteredBookings().length} bookings)
          </Text>
          {getFilteredBookings()
            .sort((a, b) => new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime())
            .map(booking => (
              <View key={booking._id}>
                <Text style={styles.bookingDateLabel}>
                  {format(new Date(booking.scheduledDate), 'EEEE, MMM d')}
                </Text>
                {renderBookingCard(booking)}
              </View>
            ))}
        </ScrollView>
      </View>
    );
  };

  const renderMonthView = () => (
    <View style={styles.monthView}>
      <Calendar
        current={format(selectedDate, 'yyyy-MM-dd')}
        onDayPress={(day: any) => {
          setSelectedDate(new Date(day.dateString));
          setViewMode('day');
        }}
        onMonthChange={(month: any) => {
          setSelectedDate(new Date(month.dateString));
        }}
        markingType="multi-dot"
        markedDates={getMarkedDates()}
        theme={{
          backgroundColor: colors.background,
          calendarBackground: colors.white,
          textSectionTitleColor: colors.textSecondary,
          selectedDayBackgroundColor: colors.primary,
          selectedDayTextColor: colors.white,
          todayTextColor: colors.primary,
          dayTextColor: colors.text,
          textDisabledColor: colors.gray[300],
          dotColor: colors.primary,
          arrowColor: colors.primary,
          monthTextColor: colors.text,
          textMonthFontWeight: 'bold',
          textDayFontSize: 14,
          textMonthFontSize: 16,
        }}
        style={styles.calendar}
      />

      <View style={styles.legendContainer}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: colors.warning }]} />
          <Text style={styles.legendText}>Pending</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: colors.primary }]} />
          <Text style={styles.legendText}>Assigned</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: colors.success }]} />
          <Text style={styles.legendText}>Completed</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: colors.error }]} />
          <Text style={styles.legendText}>Cancelled</Text>
        </View>
      </View>

      <ScrollView style={styles.bookingsList}>
        <Text style={styles.monthBookingsTitle}>
          {format(selectedDate, 'MMMM yyyy')} ({getFilteredBookings().length} bookings)
        </Text>
        {getFilteredBookings()
          .sort((a, b) => new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime())
          .map(renderBookingCard)}
      </ScrollView>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Calendar</Text>
        <TouchableOpacity
          style={styles.todayButton}
          onPress={() => setSelectedDate(new Date())}
        >
          <Text style={styles.todayButtonText}>Today</Text>
        </TouchableOpacity>
      </View>

      {/* View Mode Tabs */}
      <View style={styles.viewTabs}>
        {(['day', 'week', 'month'] as ViewMode[]).map((mode) => (
          <TouchableOpacity
            key={mode}
            style={[styles.viewTab, viewMode === mode && styles.viewTabActive]}
            onPress={() => setViewMode(mode)}
          >
            <Text style={[styles.viewTabText, viewMode === mode && styles.viewTabTextActive]}>
              {mode.charAt(0).toUpperCase() + mode.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={loadBookings} />
        }
      >
        {viewMode === 'day' && renderDayView()}
        {viewMode === 'week' && renderWeekView()}
        {viewMode === 'month' && renderMonthView()}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.text,
  },
  todayButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  todayButtonText: {
    color: colors.white,
    fontWeight: '600',
    fontSize: 14,
  },
  viewTabs: {
    flexDirection: 'row',
    marginHorizontal: 24,
    backgroundColor: colors.gray[100],
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
  },
  viewTab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 10,
  },
  viewTabActive: {
    backgroundColor: colors.white,
  },
  viewTabText: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  viewTabTextActive: {
    color: colors.primary,
    fontWeight: '600',
  },
  content: {
    paddingBottom: 100,
  },
  // Day View
  dayView: {
    flex: 1,
  },
  dayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    marginBottom: 16,
  },
  dayHeaderCenter: {
    alignItems: 'center',
  },
  dayHeaderTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
  },
  dayHeaderDate: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 4,
  },
  emptyDay: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    color: colors.textSecondary,
    marginTop: 12,
  },
  // Week View
  weekView: {
    flex: 1,
  },
  weekHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    marginBottom: 16,
  },
  weekHeaderTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  weekDaysRow: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    marginBottom: 16,
  },
  weekDay: {
    width: 52,
    alignItems: 'center',
    paddingVertical: 12,
    marginHorizontal: 4,
    borderRadius: 16,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
  },
  weekDaySelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  weekDayToday: {
    borderColor: colors.primary,
    borderWidth: 2,
  },
  weekDayName: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  weekDayNameSelected: {
    color: colors.white,
  },
  weekDayNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginTop: 4,
  },
  weekDayNumberSelected: {
    color: colors.white,
  },
  weekDayDots: {
    flexDirection: 'row',
    marginTop: 6,
    gap: 2,
  },
  weekDayDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  weekDayCount: {
    fontSize: 10,
    color: colors.textSecondary,
    marginTop: 4,
  },
  weekBookingsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    paddingHorizontal: 24,
    marginBottom: 12,
  },
  bookingDateLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    paddingHorizontal: 24,
    marginTop: 8,
    marginBottom: 4,
  },
  // Month View
  monthView: {
    flex: 1,
  },
  calendar: {
    marginHorizontal: 16,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  legendContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    paddingHorizontal: 24,
    paddingVertical: 12,
    gap: 16,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  monthBookingsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    paddingHorizontal: 24,
    marginBottom: 12,
  },
  // Booking Card
  bookingsList: {
    paddingHorizontal: 24,
  },
  bookingCard: {
    backgroundColor: colors.white,
    borderRadius: 12,
    marginBottom: 12,
    flexDirection: 'row',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  statusStrip: {
    width: 4,
  },
  bookingContent: {
    flex: 1,
    padding: 14,
  },
  bookingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  bookingTime: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  bookingAddress: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  bookingFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bookingType: {
    fontSize: 12,
    color: colors.textSecondary,
    textTransform: 'capitalize',
  },
  bookingPrice: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.primary,
  },
});
