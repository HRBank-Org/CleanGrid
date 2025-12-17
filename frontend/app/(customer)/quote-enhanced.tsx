import React, { useState, useEffect, useCallback } from 'react';
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
  ActivityIndicator,
  Modal,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import Button from '../../components/Button';
import { colors } from '../../utils/colors';
import api from '../../services/api';

interface Property {
  _id: string;
  name: string;
  address: string;
  apartmentNumber?: string;
  postalCode: string;
  propertyType: string;
  bedrooms?: number;
  bathrooms?: number;
  squareFeet?: number;
}

interface AddOn {
  id: string;
  name: string;
  price: number;
  quantity: number;
  needs_quantity?: boolean;
}

interface LineItem {
  label: string;
  amount: number;
}

interface QuoteData {
  cu_total: number;
  multiplier: number;
  grand_total: number;
  estimated_hours: number;
  recommended_crew_size: number;
  line_items: LineItem[];
  discount_amount: number;
}

export default function EnhancedQuoteScreen() {
  const router = useRouter();
  const { serviceId, serviceName, serviceCategory } = useLocalSearchParams();
  
  // Properties
  const [properties, setProperties] = useState<Property[]>([]);
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [loadingProperties, setLoadingProperties] = useState(true);
  
  // Determine service level from category
  const getInitialServiceLevel = (): string => {
    if (serviceCategory === 'deep-clean' || serviceCategory === 'commercial-deep') return 'deep';
    if (serviceCategory === 'move-in-out') return 'move_in_out';
    if (serviceCategory === 'post-reno') return 'post_reno';
    return 'standard';
  };
  
  const isOneTimeService = serviceCategory === 'move-in-out' || serviceCategory === 'post-reno';
  
  // Service options
  const [serviceLevel, setServiceLevel] = useState(getInitialServiceLevel());
  const [frequency, setFrequency] = useState('one_time');
  
  // Add-ons
  const [availableAddons, setAvailableAddons] = useState<any[]>([]);
  const [selectedAddons, setSelectedAddons] = useState<AddOn[]>([]);
  
  // Quote data
  const [quote, setQuote] = useState<QuoteData | null>(null);
  const [loading, setLoading] = useState(false);

  // Load properties on focus
  useFocusEffect(
    useCallback(() => {
      loadProperties();
      loadAvailableAddons();
    }, [])
  );

  const loadProperties = async () => {
    try {
      setLoadingProperties(true);
      const response = await api.get('/api/properties');
      setProperties(response.data);
      
      // Auto-select first property if available
      if (response.data.length > 0 && !selectedProperty) {
        // If coming from a service card, try to match property type
        if (serviceCategory) {
          const isCommercialService = ['commercial', 'commercial-deep'].includes(serviceCategory as string);
          const matchingProperty = response.data.find((p: Property) => 
            isCommercialService ? p.propertyType === 'commercial' : p.propertyType === 'residential'
          );
          setSelectedProperty(matchingProperty || response.data[0]);
        } else {
          setSelectedProperty(response.data[0]);
        }
      }
    } catch (error) {
      console.error('Failed to load properties:', error);
    } finally {
      setLoadingProperties(false);
    }
  };

  const loadAvailableAddons = async () => {
    try {
      const response = await api.get('/api/quotes/addons');
      setAvailableAddons(response.data.addons);
    } catch (error) {
      console.error('Failed to load add-ons:', error);
    }
  };

  // Auto-calculate quote when inputs change
  useEffect(() => {
    if (!selectedProperty) return;
    
    const timer = setTimeout(() => {
      calculateQuote();
    }, 300);

    return () => clearTimeout(timer);
  }, [selectedProperty, serviceLevel, frequency, selectedAddons]);

  const calculateQuote = async () => {
    if (!selectedProperty) return;

    try {
      setLoading(true);
      
      const isCommercial = selectedProperty.propertyType === 'commercial';
      
      const requestData: any = {
        job_type: selectedProperty.propertyType,
        postal_code: selectedProperty.postalCode,
        service_level: serviceLevel,
        condition: 'normal',
        frequency: frequency,
        time_window: 'normal',
        tax_rate: 0.13,
        add_ons: selectedAddons,
      };

      if (isCommercial) {
        requestData.commercial = {
          sqft: selectedProperty.squareFeet || 1000,
          washrooms: selectedProperty.bathrooms || 2,
          kitchenette: false,
          floor_service: null,
          trash_service: 'none',
          high_touch_disinfection: false,
        };
      } else {
        requestData.residential = {
          bedrooms: selectedProperty.bedrooms || 2,
          bathrooms: selectedProperty.bathrooms || 1,
          kitchen: true,
          living_rooms: 1,
          dining_rooms: 0,
          stairs: false,
          hallways: true,
          laundry_room: false,
        };
      }

      const response = await api.post('/api/quotes/enhanced', requestData);
      setQuote(response.data);
    } catch (error) {
      console.error('Quote calculation error:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleAddon = (addon: any) => {
    const exists = selectedAddons.find(a => a.id === addon.id);
    if (exists) {
      setSelectedAddons(selectedAddons.filter(a => a.id !== addon.id));
    } else {
      setSelectedAddons([...selectedAddons, {
        id: addon.id,
        name: addon.name,
        price: addon.price,
        quantity: 1,
      }]);
    }
  };

  const updateAddonQuantity = (addonId: string, quantity: number) => {
    setSelectedAddons(selectedAddons.map(a => 
      a.id === addonId ? { ...a, quantity: Math.max(1, quantity) } : a
    ));
  };

  const [bookingLoading, setBookingLoading] = useState(false);

  const proceedToBooking = async () => {
    if (!quote || !selectedProperty) return;
    
    try {
      setBookingLoading(true);
      
      // Create the booking
      const bookingData = {
        serviceId: serviceId || 'general-cleaning',
        serviceType: selectedProperty.propertyType,
        address: selectedProperty.address + (selectedProperty.apartmentNumber ? `, Unit ${selectedProperty.apartmentNumber}` : ''),
        postalCode: selectedProperty.postalCode,
        squareFeet: selectedProperty.squareFeet || 1000,
        scheduledDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // Default to 1 week from now
        isRecurring: frequency !== 'one_time',
        recurringFrequency: frequency !== 'one_time' ? frequency : null,
        totalPrice: quote.grand_total,
        notes: `Service: ${serviceLevel}, Add-ons: ${selectedAddons.map(a => a.name).join(', ') || 'None'}`,
      };

      await api.post('/api/bookings', bookingData);
      
      if (Platform.OS === 'web') {
        window.alert(`Booking created! Total: $${quote.grand_total.toFixed(2)}\nWe'll contact you to confirm the date.`);
      } else {
        Alert.alert(
          'Booking Created!', 
          `Total: $${quote.grand_total.toFixed(2)}\nWe'll contact you to confirm the date.`,
          [{ text: 'OK', onPress: () => router.push('/(customer)/bookings') }]
        );
      }
      
      // Navigate to bookings
      router.push('/(customer)/bookings');
    } catch (error: any) {
      console.error('Booking error:', error);
      const errorMsg = error.response?.data?.detail || 'Failed to create booking';
      if (Platform.OS === 'web') {
        window.alert('Error: ' + errorMsg);
      } else {
        Alert.alert('Error', errorMsg);
      }
    } finally {
      setBookingLoading(false);
    }
  };

  // No properties - prompt to add one
  if (!loadingProperties && properties.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>

          <View style={styles.emptyState}>
            <Ionicons name="home-outline" size={64} color={colors.gray[300]} />
            <Text style={styles.emptyTitle}>No Properties Yet</Text>
            <Text style={styles.emptySubtitle}>
              Add a property first to get an instant quote with your home's details
            </Text>
            <Button
              title="Add Your First Property"
              onPress={() => router.push('/(customer)/onboarding')}
              style={{ marginTop: 24 }}
            />
          </View>
        </ScrollView>
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

          <Text style={styles.title}>
            {serviceName ? `${serviceName}` : 'Get Your Quote'}
          </Text>
          <Text style={styles.subtitle}>Select property & options for instant pricing</Text>

          {/* Live Price Display */}
          {quote && (
            <View style={styles.livePrice}>
              <View style={styles.priceHeader}>
                <Ionicons name="pricetag" size={24} color={colors.white} />
                <View style={styles.priceInfo}>
                  <Text style={styles.priceLabel}>Total Price</Text>
                  <Text style={styles.priceValue}>${quote.grand_total.toFixed(2)}</Text>
                </View>
                {loading && <ActivityIndicator color={colors.white} />}
              </View>
              <View style={styles.priceDetails}>
                <Text style={styles.priceDetail}>~{quote.estimated_hours.toFixed(1)}h</Text>
                <Text style={styles.priceDetail}>•</Text>
                <Text style={styles.priceDetail}>{quote.recommended_crew_size} crew</Text>
              </View>
              {quote.discount_amount > 0 && (
                <View style={styles.savingsBadge}>
                  <Text style={styles.savingsText}>Save ${quote.discount_amount.toFixed(2)}</Text>
                </View>
              )}
            </View>
          )}

          {/* Property Selector */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Select Property</Text>
            {loadingProperties ? (
              <ActivityIndicator color={colors.primary} />
            ) : (
              <View style={styles.propertyList}>
                {properties.map((property) => (
                  <TouchableOpacity
                    key={property._id}
                    style={[
                      styles.propertyCard,
                      selectedProperty?._id === property._id && styles.propertyCardActive,
                    ]}
                    onPress={() => setSelectedProperty(property)}
                  >
                    <View style={styles.propertyIconSmall}>
                      <Ionicons
                        name={property.propertyType === 'residential' ? 'home' : 'business'}
                        size={20}
                        color={selectedProperty?._id === property._id ? colors.primary : colors.gray[400]}
                      />
                    </View>
                    <View style={styles.propertyCardInfo}>
                      <Text style={[
                        styles.propertyCardName,
                        selectedProperty?._id === property._id && styles.propertyCardNameActive,
                      ]}>
                        {property.name}
                      </Text>
                      <Text style={styles.propertyCardDetails}>
                        {property.propertyType === 'residential' 
                          ? `${property.bedrooms || 0} BD • ${property.bathrooms || 0} BA`
                          : `${property.squareFeet || 0} sq ft`
                        }
                      </Text>
                    </View>
                    {selectedProperty?._id === property._id && (
                      <Ionicons name="checkmark-circle" size={24} color={colors.primary} />
                    )}
                  </TouchableOpacity>
                ))}
                
                <TouchableOpacity
                  style={styles.addPropertyLink}
                  onPress={() => router.push('/(customer)/add-property')}
                >
                  <Ionicons name="add-circle-outline" size={20} color={colors.secondary} />
                  <Text style={styles.addPropertyText}>Add another property</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Selected Property Details (Read-only) */}
          {selectedProperty && (
            <View style={styles.propertyDetailsCard}>
              <View style={styles.propertyDetailsHeader}>
                <Ionicons
                  name={selectedProperty.propertyType === 'residential' ? 'home' : 'business'}
                  size={24}
                  color={colors.primary}
                />
                <Text style={styles.propertyDetailsTitle}>{selectedProperty.name}</Text>
              </View>
              <Text style={styles.propertyDetailsAddress}>
                {selectedProperty.address}
                {selectedProperty.apartmentNumber ? `, Unit ${selectedProperty.apartmentNumber}` : ''}
              </Text>
              <View style={styles.propertyDetailsStats}>
                {selectedProperty.propertyType === 'residential' ? (
                  <>
                    <View style={styles.statItem}>
                      <Ionicons name="bed-outline" size={16} color={colors.textSecondary} />
                      <Text style={styles.statText}>{selectedProperty.bedrooms || 0} Bedrooms</Text>
                    </View>
                    <View style={styles.statItem}>
                      <Ionicons name="water-outline" size={16} color={colors.textSecondary} />
                      <Text style={styles.statText}>{selectedProperty.bathrooms || 0} Bathrooms</Text>
                    </View>
                  </>
                ) : (
                  <View style={styles.statItem}>
                    <Ionicons name="resize-outline" size={16} color={colors.textSecondary} />
                    <Text style={styles.statText}>{selectedProperty.squareFeet || 0} sq ft</Text>
                  </View>
                )}
              </View>
            </View>
          )}

          {/* Service Level */}
          {!serviceName && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Service Type</Text>
              <View style={styles.chipGroup}>
                {[
                  { value: 'standard', label: 'Regular Clean' },
                  { value: 'deep', label: 'Deep Clean' },
                  { value: 'move_in_out', label: 'Move In/Out' },
                  { value: 'post_reno', label: 'Post-Renovation' },
                ].map((level) => (
                  <TouchableOpacity
                    key={level.value}
                    style={[styles.chip, serviceLevel === level.value && styles.chipActive]}
                    onPress={() => setServiceLevel(level.value)}
                  >
                    <Text style={[styles.chipText, serviceLevel === level.value && styles.chipTextActive]}>
                      {level.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* Frequency */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Frequency</Text>
            {isOneTimeService ? (
              <View style={styles.oneTimeNotice}>
                <Ionicons name="information-circle" size={20} color={colors.secondary} />
                <Text style={styles.oneTimeNoticeText}>
                  This is a one-time service
                </Text>
              </View>
            ) : (
              <View style={styles.chipGroup}>
                {[
                  { value: 'one_time', label: 'One Time' },
                  { value: 'weekly', label: 'Weekly', discount: '15% off' },
                  { value: 'biweekly', label: 'Bi-weekly', discount: '10% off' },
                  { value: 'monthly', label: 'Monthly', discount: '5% off' },
                ].map((freq) => (
                  <TouchableOpacity
                    key={freq.value}
                    style={[styles.chip, frequency === freq.value && styles.chipActive]}
                    onPress={() => setFrequency(freq.value)}
                  >
                    <Text style={[styles.chipText, frequency === freq.value && styles.chipTextActive]}>
                      {freq.label}
                    </Text>
                    {freq.discount && (
                      <Text style={[styles.chipDiscount, frequency === freq.value && styles.chipDiscountActive]}>
                        {freq.discount}
                      </Text>
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          {/* Add-ons */}
          {availableAddons.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Add-on Services</Text>
              {availableAddons.map((addon) => {
                const selected = selectedAddons.find(a => a.id === addon.id);
                return (
                  <TouchableOpacity
                    key={addon.id}
                    style={[styles.addonCard, selected && styles.addonCardActive]}
                    onPress={() => toggleAddon(addon)}
                  >
                    <View style={styles.addonInfo}>
                      <Ionicons
                        name={selected ? 'checkbox' : 'square-outline'}
                        size={24}
                        color={selected ? colors.primary : colors.gray[400]}
                      />
                      <View style={styles.addonText}>
                        <Text style={styles.addonName}>{addon.name}</Text>
                        <Text style={styles.addonPrice}>${addon.price}</Text>
                      </View>
                    </View>
                    {selected && addon.needs_quantity && (
                      <View style={styles.quantityControl}>
                        <TouchableOpacity
                          onPress={() => updateAddonQuantity(addon.id, selected.quantity - 1)}
                          style={styles.quantityButton}
                        >
                          <Ionicons name="remove" size={20} color={colors.primary} />
                        </TouchableOpacity>
                        <Text style={styles.quantityText}>{selected.quantity}</Text>
                        <TouchableOpacity
                          onPress={() => updateAddonQuantity(addon.id, selected.quantity + 1)}
                          style={styles.quantityButton}
                        >
                          <Ionicons name="add" size={20} color={colors.primary} />
                        </TouchableOpacity>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          {/* Price Breakdown */}
          {quote && quote.line_items && (
            <View style={styles.breakdownCard}>
              <Text style={styles.breakdownTitle}>Price Breakdown</Text>
              {quote.line_items.map((item, index) => (
                <View key={index} style={styles.breakdownRow}>
                  <Text style={styles.breakdownLabel}>{item.label}</Text>
                  <Text style={[
                    styles.breakdownValue,
                    item.amount < 0 && styles.breakdownDiscount
                  ]}>
                    {item.amount < 0 ? '-' : ''}${Math.abs(item.amount).toFixed(2)}
                  </Text>
                </View>
              ))}
            </View>
          )}

          <Button
            title={bookingLoading ? "Creating Booking..." : "Book Now"}
            onPress={proceedToBooking}
            disabled={!quote || !selectedProperty || bookingLoading}
            loading={bookingLoading}
            style={{ marginTop: 24 }}
          />
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
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    marginBottom: 24,
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
    paddingHorizontal: 20,
  },
  livePrice: {
    backgroundColor: colors.primary,
    borderRadius: 20,
    padding: 20,
    marginBottom: 24,
  },
  priceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  priceInfo: {
    marginLeft: 12,
    flex: 1,
  },
  priceLabel: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
  },
  priceValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: colors.white,
  },
  priceDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  priceDetail: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.9)',
  },
  savingsBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginTop: 12,
  },
  savingsText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.white,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 12,
  },
  propertyList: {
    gap: 8,
  },
  propertyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 14,
    borderWidth: 2,
    borderColor: colors.border,
  },
  propertyCardActive: {
    borderColor: colors.primary,
    backgroundColor: colors.gray[50],
  },
  propertyIconSmall: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.gray[100],
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  propertyCardInfo: {
    flex: 1,
  },
  propertyCardName: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  propertyCardNameActive: {
    color: colors.primary,
  },
  propertyCardDetails: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
  addPropertyLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 8,
  },
  addPropertyText: {
    fontSize: 14,
    color: colors.secondary,
    fontWeight: '500',
  },
  propertyDetailsCard: {
    backgroundColor: colors.gray[50],
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: colors.border,
  },
  propertyDetailsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  propertyDetailsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginLeft: 8,
  },
  propertyDetailsAddress: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 12,
  },
  propertyDetailsStats: {
    flexDirection: 'row',
    gap: 20,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statText: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  chipGroup: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    backgroundColor: colors.white,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipText: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  chipTextActive: {
    color: colors.white,
    fontWeight: '600',
  },
  chipDiscount: {
    fontSize: 11,
    color: colors.success,
    marginTop: 2,
  },
  chipDiscountActive: {
    color: 'rgba(255,255,255,0.9)',
  },
  oneTimeNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.gray[50],
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.secondary,
  },
  oneTimeNoticeText: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
    marginLeft: 12,
  },
  addonCard: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  addonCardActive: {
    borderColor: colors.primary,
    backgroundColor: colors.gray[50],
  },
  addonInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  addonText: {
    marginLeft: 12,
  },
  addonName: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text,
  },
  addonPrice: {
    fontSize: 13,
    color: colors.primary,
    marginTop: 2,
  },
  quantityControl: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  quantityButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.gray[100],
    alignItems: 'center',
    justifyContent: 'center',
  },
  quantityText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    minWidth: 24,
    textAlign: 'center',
  },
  breakdownCard: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  breakdownTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 16,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  breakdownLabel: {
    fontSize: 14,
    color: colors.textSecondary,
    flex: 1,
  },
  breakdownValue: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text,
  },
  breakdownDiscount: {
    color: colors.success,
  },
});
