import React, { useCallback, useState } from 'react';
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
  isActive?: boolean;
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
  const [showInactive, setShowInactive] = useState(false);

  const loadProperties = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/api/properties?include_inactive=${showInactive}`);
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
    }, [showInactive])
  );

  const handleDeactivate = async (propertyId: string, propertyName: string) => {
    const count = bookingCounts[propertyId];
    
    if (count && count.activeBookings > 0) {
      const msg = `Cannot deactivate "${propertyName}" - it has ${count.activeBookings} active booking(s). Complete or cancel them first.`;
      if (Platform.OS === 'web') {
        window.alert(msg);
      }
      return;
    }
    
    const confirmMsg = `Deactivate "${propertyName}"? You can reactivate it later.`;
    let shouldDeactivate = false;
    
    if (Platform.OS === 'web') {
      shouldDeactivate = window.confirm(confirmMsg);
    }
    
    if (shouldDeactivate) {
      try {
        await api.delete(`/api/properties/${propertyId}`);
        if (Platform.OS === 'web') {
          window.alert('Property deactivated');
        }
        loadProperties();
      } catch (error: any) {
        const errorMsg = error.response?.data?.detail || 'Failed to deactivate';
        if (Platform.OS === 'web') {
          window.alert('Error: ' + errorMsg);
        }
      }
    }
  };

  const handleReactivate = async (propertyId: string) => {
    try {
      await api.post(`/api/properties/${propertyId}/reactivate`);
      if (Platform.OS === 'web') {
        window.alert('Property reactivated');
      }
      loadProperties();
    } catch (error: any) {
      const errorMsg = error.response?.data?.detail || 'Failed to reactivate';
      if (Platform.OS === 'web') {
        window.alert('Error: ' + errorMsg);
      }
    }
  };

  const activeProperties = properties.filter(p => p.isActive !== false);
  const inactiveProperties = properties.filter(p => p.isActive === false);

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
            <TouchableOpacity style={styles.addButton}>
              <Ionicons name="add" size={24} color={colors.white} />
            </TouchableOpacity>
          </Link>
        </View>

        {activeProperties.length === 0 && !loading ? (
          <View style={styles.emptyState}>
            <Ionicons name="home-outline" size={64} color={colors.gray[300]} />
            <Text style={styles.emptyTitle}>No Properties Yet</Text>
            <Text style={styles.emptySubtitle}>
              Add your first property to get personalized quotes
            </Text>
            <Link href="/(customer)/add-property" asChild>
              <TouchableOpacity style={styles.emptyButton}>
                <Text style={styles.emptyButtonText}>Add Property</Text>
              </TouchableOpacity>
            </Link>
          </View>
        ) : (
          <>
            {/* Active Properties */}
            {activeProperties.map((property) => {
              const count = bookingCounts[property._id];
              const hasActiveBookings = count && count.activeBookings > 0;
              
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

                  {/* Booking Status Badge */}
                  {count && (
                    <View style={styles.bookingStatus}>
                      {hasActiveBookings ? (
                        <View style={styles.activeBookingBadge}>
                          <Ionicons name="calendar" size={14} color={colors.primary} />
                          <Text style={styles.activeBookingText}>
                            {count.activeBookings} active booking{count.activeBookings > 1 ? 's' : ''}
                          </Text>
                        </View>
                      ) : (
                        <View style={styles.noBookingBadge}>
                          <Text style={styles.noBookingText}>No active bookings</Text>
                        </View>
                      )}
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
                      <TouchableOpacity style={styles.actionButton}>
                        <Ionicons name="pencil" size={18} color={colors.primary} />
                        <Text style={[styles.actionText, { color: colors.primary }]}>Edit</Text>
                      </TouchableOpacity>
                    </Link>

                    {hasActiveBookings ? (
                      <View style={[styles.actionButton, styles.lockedButton]}>
                        <Ionicons name="lock-closed" size={18} color={colors.gray[400]} />
                        <Text style={[styles.actionText, { color: colors.gray[400] }]}>Locked</Text>
                      </View>
                    ) : (
                      <TouchableOpacity
                        style={styles.actionButton}
                        onPress={() => handleDeactivate(property._id, property.name)}
                      >
                        <Ionicons name="eye-off-outline" size={18} color={colors.warning} />
                        <Text style={[styles.actionText, { color: colors.warning }]}>Deactivate</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              );
            })}

            {/* Show Inactive Toggle */}
            <TouchableOpacity
              style={styles.toggleInactive}
              onPress={() => setShowInactive(!showInactive)}
            >
              <Ionicons
                name={showInactive ? 'chevron-up' : 'chevron-down'}
                size={20}
                color={colors.textSecondary}
              />
              <Text style={styles.toggleInactiveText}>
                {showInactive ? 'Hide' : 'Show'} inactive properties
                {inactiveProperties.length > 0 && ` (${inactiveProperties.length})`}
              </Text>
            </TouchableOpacity>

            {/* Inactive Properties */}
            {showInactive && inactiveProperties.length > 0 && (
              <View style={styles.inactiveSection}>
                <Text style={styles.inactiveSectionTitle}>Inactive Properties</Text>
                {inactiveProperties.map((property) => (
                  <View key={property._id} style={[styles.propertyCard, styles.inactiveCard]}>
                    <View style={styles.propertyHeader}>
                      <View style={[styles.propertyIcon, styles.inactiveIcon]}>
                        <Ionicons
                          name={property.propertyType === 'residential' ? 'home' : 'business'}
                          size={24}
                          color={colors.gray[400]}
                        />
                      </View>
                      <View style={styles.propertyInfo}>
                        <Text style={[styles.propertyName, styles.inactiveText]}>{property.name}</Text>
                        <Text style={styles.propertyAddress}>{property.address}</Text>
                        <View style={styles.inactiveBadge}>
                          <Text style={styles.inactiveBadgeText}>Inactive</Text>
                        </View>
                      </View>
                    </View>

                    <TouchableOpacity
                      style={styles.reactivateButton}
                      onPress={() => handleReactivate(property._id)}
                    >
                      <Ionicons name="refresh" size={18} color={colors.success} />
                      <Text style={styles.reactivateText}>Reactivate</Text>
                    </TouchableOpacity>
                  </View>
                ))}
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
  inactiveCard: {
    opacity: 0.7,
    backgroundColor: colors.gray[50],
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
    backgroundColor: colors.gray[100],
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  inactiveIcon: {
    backgroundColor: colors.gray[200],
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
  inactiveText: {
    color: colors.gray[500],
  },
  propertyAddress: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  propertyBuzz: {
    fontSize: 13,
    color: colors.secondary,
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
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  activeBookingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary + '15',
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
  noBookingBadge: {
    backgroundColor: colors.gray[100],
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  noBookingText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  completedText: {
    fontSize: 12,
    color: colors.success,
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
  },
  lockedButton: {
    backgroundColor: colors.gray[100],
  },
  actionText: {
    fontSize: 14,
    fontWeight: '500',
  },
  toggleInactive: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  toggleInactiveText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  inactiveSection: {
    marginTop: 8,
  },
  inactiveSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 12,
  },
  inactiveBadge: {
    backgroundColor: colors.gray[200],
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  inactiveBadgeText: {
    fontSize: 11,
    color: colors.gray[600],
    fontWeight: '500',
  },
  reactivateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  reactivateText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.success,
  },
});
