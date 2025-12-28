import React, { useCallback, useState } from 'react';
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
import { useRouter, Link } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../utils/colors';
import api from '../../services/api';

interface Property {
  _id: string;
  name: string;
  address: string;
  apartmentNumber?: string;
  buzzNumber?: string;
  postalCode: string;
  propertyType: string;
  bedrooms?: number;
  bathrooms?: number;
  squareFeet?: number;
}

interface BookingCount {
  activeBookings: number;
  completedBookings: number;
  canDeactivate: boolean;
}

export default function PropertiesScreen() {
  const router = useRouter();
  const [properties, setProperties] = useState<Property[]>([]);
  const [bookingCounts, setBookingCounts] = useState<Record<string, BookingCount>>({});
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);

  const loadProperties = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/properties');
      setProperties(response.data);
      
      // Load booking counts for each property
      const counts: Record<string, BookingCount> = {};
      for (const prop of response.data) {
        try {
          const countRes = await api.get(`/api/properties/${prop._id}/bookings-count`);
          counts[prop._id] = countRes.data;
        } catch (e) {
          counts[prop._id] = { activeBookings: 0, completedBookings: 0, canDeactivate: true };
        }
      }
      setBookingCounts(counts);
    } catch (error) {
      console.error('Failed to load properties:', error);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadProperties();
    }, [])
  );

  const handleDelete = async (propertyId: string, propertyName: string) => {
    const count = bookingCounts[propertyId];
    
    if (count && count.activeBookings > 0) {
      const msg = `Cannot delete "${propertyName}" - it has ${count.activeBookings} active booking(s). Complete or cancel them first.`;
      if (Platform.OS === 'web') {
        window.alert(msg);
      }
      return;
    }
    
    const confirmMsg = `Delete "${propertyName}"? This cannot be undone.`;
    let shouldDelete = false;
    
    if (Platform.OS === 'web') {
      shouldDelete = window.confirm(confirmMsg);
    }
    
    if (shouldDelete) {
      try {
        setDeleting(propertyId);
        await api.delete(`/api/properties/${propertyId}`);
        // Remove from local state
        setProperties(prev => prev.filter(p => p._id !== propertyId));
        if (Platform.OS === 'web') {
          window.alert('Property deleted');
        }
      } catch (error: any) {
        const errorMsg = error.response?.data?.detail || 'Failed to delete';
        if (Platform.OS === 'web') {
          window.alert('Error: ' + errorMsg);
        }
        loadProperties();
      } finally {
        setDeleting(null);
      }
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={loadProperties} />
        }
      >
        <View style={styles.header}>
          <Text style={styles.title}>My Properties</Text>
          <Link href="/(customer)/add-property" asChild>
            <Pressable style={styles.addButton} role="button">
              <Ionicons name="add" size={24} color={colors.white} />
            </Pressable>
          </Link>
        </View>

        {properties.length === 0 && !loading ? (
          <View style={styles.emptyState}>
            <Ionicons name="home-outline" size={64} color={colors.gray[300]} />
            <Text style={styles.emptyTitle}>No Properties Yet</Text>
            <Text style={styles.emptySubtitle}>
              Add your first property to get personalized quotes
            </Text>
            <Link href="/(customer)/add-property" asChild>
              <Pressable style={styles.emptyButton} role="button">
                <Text style={styles.emptyButtonText}>Add Property</Text>
              </Pressable>
            </Link>
          </View>
        ) : (
          properties.map((property) => {
            const count = bookingCounts[property._id];
            const hasActiveBookings = count && count.activeBookings > 0;
            const isDeleting = deleting === property._id;
            
            return (
              <View key={property._id} style={styles.propertyCard}>
                <View style={styles.propertyHeader}>
                  <View style={styles.propertyIcon}>
                    <Ionicons
                      name={property.propertyType === 'residential' ? 'home' : 'business'}
                      size={24}
                      color={colors.primary}
                    />
                  </View>
                  <View style={styles.propertyInfo}>
                    <Text style={styles.propertyName}>{property.name}</Text>
                    <Text style={styles.propertyAddress}>
                      {property.address}
                      {property.apartmentNumber ? `, Unit ${property.apartmentNumber}` : ''}
                    </Text>
                    {property.buzzNumber && (
                      <Text style={styles.propertyBuzz}>Buzz: {property.buzzNumber}</Text>
                    )}
                    <Text style={styles.propertyPostal}>{property.postalCode}</Text>
                  </View>
                </View>

                {/* Booking Status */}
                {count && (
                  <View style={styles.bookingStatus}>
                    {hasActiveBookings ? (
                      <View style={styles.activeBookingBadge}>
                        <Ionicons name="calendar" size={14} color={colors.primary} />
                        <Text style={styles.activeBookingText}>
                          {count.activeBookings} active booking{count.activeBookings > 1 ? 's' : ''}
                        </Text>
                      </View>
                    ) : null}
                    {count.completedBookings > 0 && (
                      <Text style={styles.completedText}>
                        {count.completedBookings} completed
                      </Text>
                    )}
                  </View>
                )}

                <View style={styles.propertyDetails}>
                  {property.propertyType === 'residential' ? (
                    <>
                      <View style={styles.detailItem}>
                        <Ionicons name="bed-outline" size={16} color={colors.textSecondary} />
                        <Text style={styles.detailText}>{property.bedrooms || 0} Beds</Text>
                      </View>
                      <View style={styles.detailItem}>
                        <Ionicons name="water" size={16} color={colors.textSecondary} />
                        <Text style={styles.detailText}>{property.bathrooms || 0} Baths</Text>
                      </View>
                    </>
                  ) : (
                    <View style={styles.detailItem}>
                      <Ionicons name="resize-outline" size={16} color={colors.textSecondary} />
                      <Text style={styles.detailText}>{property.squareFeet || 0} sq ft</Text>
                    </View>
                  )}
                </View>

                <View style={styles.propertyActions}>
                  <Link
                    href={{
                      pathname: '/(customer)/edit-property',
                      params: { propertyId: property._id },
                    }}
                    asChild
                  >
                    <Pressable style={styles.actionButton} role="button">
                      <Ionicons name="pencil" size={18} color={colors.primary} />
                      <Text style={[styles.actionText, { color: colors.primary }]}>Edit</Text>
                    </Pressable>
                  </Link>

                  {hasActiveBookings ? (
                    <View style={[styles.actionButton, styles.lockedButton]}>
                      <Ionicons name="lock-closed" size={18} color={colors.gray[400]} />
                      <Text style={[styles.actionText, { color: colors.gray[400] }]}>
                        Has bookings
                      </Text>
                    </View>
                  ) : (
                    <Pressable
                      style={[styles.actionButton, isDeleting && styles.disabledButton]}
                      onPress={() => handleDelete(property._id, property.name)}
                      disabled={isDeleting}
                      role="button"
                    >
                      <Ionicons 
                        name="trash-outline" 
                        size={18} 
                        color={isDeleting ? colors.gray[400] : colors.error} 
                      />
                      <Text style={[styles.actionText, { color: isDeleting ? colors.gray[400] : colors.error }]}>
                        {isDeleting ? 'Deleting...' : 'Delete'}
                      </Text>
                    </Pressable>
                  )}
                </View>
              </View>
            );
          })
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.text,
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer' as any,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text,
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 22,
  },
  emptyButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 24,
  },
  emptyButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  propertyCard: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  propertyHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  propertyIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.teal[50],
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  propertyInfo: {
    flex: 1,
  },
  propertyName: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  propertyAddress: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  propertyBuzz: {
    fontSize: 13,
    color: colors.primary,
    marginBottom: 2,
  },
  propertyPostal: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  bookingStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  activeBookingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.teal[50],
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  activeBookingText: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: '500',
  },
  completedText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  propertyDetails: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 16,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  detailText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  propertyActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: colors.gray[50],
    cursor: 'pointer' as any,
  },
  lockedButton: {
    backgroundColor: colors.gray[100],
  },
  disabledButton: {
    opacity: 0.5,
  },
  actionText: {
    fontSize: 14,
    fontWeight: '500',
  },
});
