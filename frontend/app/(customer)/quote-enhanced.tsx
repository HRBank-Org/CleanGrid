import React, { useState, useEffect } from 'react';
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
import { useAuthStore } from '../../stores/authStore';

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
  const user = useAuthStore((state) => state.user);
  const { serviceId, serviceName, serviceCategory } = useLocalSearchParams();
  
  // Determine job type from service category if provided
  const getInitialJobType = (): 'residential' | 'commercial' => {
    if (serviceCategory === 'commercial') return 'commercial';
    return 'residential'; // Default to residential
  };
  
  const getInitialServiceLevel = (): string => {
    if (serviceCategory === 'deep-clean') return 'deep';
    if (serviceCategory === 'move-in-out') return 'move_in_out';
    if (serviceCategory === 'post-reno') return 'post_reno';
    return 'standard';
  };
  
  // Job Type Selection
  const [jobType, setJobType] = useState<'residential' | 'commercial'>(getInitialJobType());
  
  // Common fields
  const [postalCode, setPostalCode] = useState(user?.postalCode || '');
  const [serviceLevel, setServiceLevel] = useState(getInitialServiceLevel());
  const [condition, setCondition] = useState('normal');
  const [frequency, setFrequency] = useState('one_time');
  const [timeWindow, setTimeWindow] = useState('normal');
  
  // Residential fields
  const [bedrooms, setBedrooms] = useState('2');
  const [bathrooms, setBathrooms] = useState('1');
  const [kitchen, setKitchen] = useState(true);
  const [livingRooms, setLivingRooms] = useState('1');
  const [diningRooms, setDiningRooms] = useState('0');
  const [stairs, setStairs] = useState(false);
  const [hallways, setHallways] = useState(true);
  const [laundryRoom, setLaundryRoom] = useState(false);
  
  // Commercial fields
  const [commercialMode, setCommercialMode] = useState<'sqft' | 'rooms'>('sqft');
  const [sqft, setSqft] = useState('1000');
  const [washrooms, setWashrooms] = useState('2');
  const [kitchenette, setKitchenette] = useState(false);
  const [floorService, setFloorService] = useState<string | null>(null);
  const [trashService, setTrashService] = useState('none');
  const [highTouchDisinfection, setHighTouchDisinfection] = useState(false);
  
  // Add-ons
  const [availableAddons, setAvailableAddons] = useState<any[]>([]);
  const [selectedAddons, setSelectedAddons] = useState<AddOn[]>([]);
  
  // Quote data
  const [quote, setQuote] = useState<QuoteData | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadAvailableAddons();
  }, []);

  useEffect(() => {
    // Auto-calculate quote when inputs change
    const timer = setTimeout(() => {
      calculateQuote();
    }, 500); // Debounce 500ms

    return () => clearTimeout(timer);
  }, [
    jobType, postalCode, serviceLevel, condition, frequency, timeWindow,
    bedrooms, bathrooms, kitchen, livingRooms, diningRooms, stairs, hallways, laundryRoom,
    sqft, washrooms, kitchenette, floorService, trashService, highTouchDisinfection,
    selectedAddons
  ]);

  const loadAvailableAddons = async () => {
    try {
      const response = await api.get('/api/quotes/addons');
      setAvailableAddons(response.data.addons);
    } catch (error) {
      console.error('Failed to load add-ons:', error);
    }
  };

  const calculateQuote = async () => {
    if (!postalCode || postalCode.length < 3) return;

    try {
      setLoading(true);
      
      const requestData: any = {
        job_type: jobType,
        postal_code: postalCode,
        service_level: serviceLevel,
        condition: condition,
        frequency: frequency,
        time_window: timeWindow,
        tax_rate: 0.13,
        add_ons: selectedAddons,
      };

      if (jobType === 'residential') {
        requestData.residential = {
          bedrooms: parseInt(bedrooms) || 0,
          bathrooms: parseInt(bathrooms) || 0,
          kitchen,
          living_rooms: parseInt(livingRooms) || 0,
          dining_rooms: parseInt(diningRooms) || 0,
          stairs,
          hallways,
          laundry_room: laundryRoom,
        };
      } else {
        requestData.commercial = {
          sqft: parseInt(sqft) || 0,
          washrooms: parseInt(washrooms) || 0,
          kitchenette,
          floor_service: floorService,
          trash_service: trashService,
          high_touch_disinfection: highTouchDisinfection,
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

  const proceedToBooking = () => {
    if (!quote) return;
    
    // Navigate to booking with quote data
    Alert.alert('Coming Soon', 'Booking flow with enhanced quote will be integrated next!');
  };

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
            {serviceName ? `Quote: ${serviceName}` : 'Get Your Quote'}
          </Text>
          <Text style={styles.subtitle}>Live pricing as you customize</Text>

          {/* Live Price Display */}
          {quote && (
            <View style={styles.livePrice}>
              <View style={styles.priceHeader}>
                <Ionicons name="pricetag" size={24} color={colors.primary} />
                <View style={styles.priceInfo}>
                  <Text style={styles.priceLabel}>Total Price</Text>
                  <Text style={styles.priceValue}>${quote.grand_total.toFixed(2)}</Text>
                </View>
              </View>
              <View style={styles.priceDetails}>
                <Text style={styles.priceDetail}>{Math.round(quote.cu_total)} CleanUnits</Text>
                <Text style={styles.priceDetail}>•</Text>
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

          {/* Job Type Selection */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Job Type</Text>
            <View style={styles.radioGroup}>
              <TouchableOpacity
                style={[styles.radioCard, jobType === 'residential' && styles.radioCardActive]}
                onPress={() => setJobType('residential')}
              >
                <Ionicons name="home" size={24} color={jobType === 'residential' ? colors.primary : colors.gray[400]} />
                <Text style={[styles.radioText, jobType === 'residential' && styles.radioTextActive]}>
                  Residential
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.radioCard, jobType === 'commercial' && styles.radioCardActive]}
                onPress={() => setJobType('commercial')}
              >
                <Ionicons name="business" size={24} color={jobType === 'commercial' ? colors.primary : colors.gray[400]} />
                <Text style={[styles.radioText, jobType === 'commercial' && styles.radioTextActive]}>
                  Commercial
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Postal Code */}
          <Input
            label="Postal Code"
            placeholder="M5V 3A8"
            value={postalCode}
            onChangeText={setPostalCode}
            autoCapitalize="characters"
          />

          {/* Service Level */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Service Level</Text>
            <View style={styles.chipGroup}>
              {['standard', 'deep', 'move_in_out', 'post_reno'].map((level) => (
                <TouchableOpacity
                  key={level}
                  style={[styles.chip, serviceLevel === level && styles.chipActive]}
                  onPress={() => setServiceLevel(level)}
                >
                  <Text style={[styles.chipText, serviceLevel === level && styles.chipTextActive]}>
                    {level.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Condition */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Condition</Text>
            <View style={styles.chipGroup}>
              {['light', 'normal', 'heavy'].map((cond) => (
                <TouchableOpacity
                  key={cond}
                  style={[styles.chip, condition === cond && styles.chipActive]}
                  onPress={() => setCondition(cond)}
                >
                  <Text style={[styles.chipText, condition === cond && styles.chipTextActive]}>
                    {cond.charAt(0).toUpperCase() + cond.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Frequency */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Frequency</Text>
            <View style={styles.chipGroup}>
              {[
                { value: 'one_time', label: 'One Time' },
                { value: 'weekly', label: 'Weekly (15% off)' },
                { value: 'biweekly', label: 'Bi-weekly (10% off)' },
                { value: 'monthly', label: 'Monthly (5% off)' },
              ].map((freq) => (
                <TouchableOpacity
                  key={freq.value}
                  style={[styles.chip, frequency === freq.value && styles.chipActive]}
                  onPress={() => setFrequency(freq.value)}
                >
                  <Text style={[styles.chipText, frequency === freq.value && styles.chipTextActive]}>
                    {freq.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Residential-specific fields */}
          {jobType === 'residential' && (
            <>
              <Text style={styles.sectionTitle}>Room Details</Text>
              <View style={styles.row}>
                <Input
                  label="Bedrooms"
                  placeholder="2"
                  value={bedrooms}
                  onChangeText={setBedrooms}
                  keyboardType="number-pad"
                  containerStyle={{ flex: 1, marginRight: 8 }}
                />
                <Input
                  label="Bathrooms"
                  placeholder="1"
                  value={bathrooms}
                  onChangeText={setBathrooms}
                  keyboardType="number-pad"
                  containerStyle={{ flex: 1, marginLeft: 8 }}
                />
              </View>

              <View style={styles.row}>
                <Input
                  label="Living Rooms"
                  placeholder="1"
                  value={livingRooms}
                  onChangeText={setLivingRooms}
                  keyboardType="number-pad"
                  containerStyle={{ flex: 1, marginRight: 8 }}
                />
                <Input
                  label="Dining Rooms"
                  placeholder="0"
                  value={diningRooms}
                  onChangeText={setDiningRooms}
                  keyboardType="number-pad"
                  containerStyle={{ flex: 1, marginLeft: 8 }}
                />
              </View>

              <View style={styles.checkboxGroup}>
                {[
                  { label: 'Kitchen', value: kitchen, setter: setKitchen },
                  { label: 'Stairs', value: stairs, setter: setStairs },
                  { label: 'Hallways', value: hallways, setter: setHallways },
                  { label: 'Laundry Room', value: laundryRoom, setter: setLaundryRoom },
                ].map((item) => (
                  <TouchableOpacity
                    key={item.label}
                    style={styles.checkbox}
                    onPress={() => item.setter(!item.value)}
                  >
                    <Ionicons
                      name={item.value ? 'checkbox' : 'square-outline'}
                      size={24}
                      color={item.value ? colors.primary : colors.gray[400]}
                    />
                    <Text style={styles.checkboxLabel}>{item.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}

          {/* Commercial-specific fields */}
          {jobType === 'commercial' && (
            <>
              <Input
                label="Square Footage"
                placeholder="1000"
                value={sqft}
                onChangeText={setSqft}
                keyboardType="number-pad"
              />

              <View style={styles.row}>
                <Input
                  label="Washrooms"
                  placeholder="2"
                  value={washrooms}
                  onChangeText={setWashrooms}
                  keyboardType="number-pad"
                  containerStyle={{ flex: 1, marginRight: 8 }}
                />
                <View style={styles.checkboxContainer}>
                  <Text style={styles.label}>Kitchenette</Text>
                  <TouchableOpacity
                    style={styles.checkbox}
                    onPress={() => setKitchenette(!kitchenette)}
                  >
                    <Ionicons
                      name={kitchenette ? 'checkbox' : 'square-outline'}
                      size={24}
                      color={kitchenette ? colors.primary : colors.gray[400]}
                    />
                    <Text style={styles.checkboxLabel}>Include</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Floor Service (Optional)</Text>
                <View style={styles.chipGroup}>
                  {[
                    { value: null, label: 'None' },
                    { value: 'vacuum_mop', label: 'Vacuum/Mop' },
                    { value: 'machine_scrub', label: 'Machine Scrub' },
                    { value: 'buff_polish', label: 'Buff/Polish' },
                  ].map((floor) => (
                    <TouchableOpacity
                      key={floor.label}
                      style={[styles.chip, floorService === floor.value && styles.chipActive]}
                      onPress={() => setFloorService(floor.value)}
                    >
                      <Text style={[styles.chipText, floorService === floor.value && styles.chipTextActive]}>
                        {floor.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Trash Service</Text>
                <View style={styles.chipGroup}>
                  {['none', 'basic', 'heavy'].map((trash) => (
                    <TouchableOpacity
                      key={trash}
                      style={[styles.chip, trashService === trash && styles.chipActive]}
                      onPress={() => setTrashService(trash)}
                    >
                      <Text style={[styles.chipText, trashService === trash && styles.chipTextActive]}>
                        {trash.charAt(0).toUpperCase() + trash.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <TouchableOpacity
                style={styles.checkbox}
                onPress={() => setHighTouchDisinfection(!highTouchDisinfection)}
              >
                <Ionicons
                  name={highTouchDisinfection ? 'checkbox' : 'square-outline'}
                  size={24}
                  color={highTouchDisinfection ? colors.primary : colors.gray[400]}
                />
                <Text style={styles.checkboxLabel}>High-Touch Disinfection</Text>
              </TouchableOpacity>
            </>
          )}

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
                    ${Math.abs(item.amount).toFixed(2)}
                  </Text>
                </View>
              ))}
            </View>
          )}

          <Button
            title="Proceed to Booking"
            onPress={proceedToBooking}
            disabled={!quote}
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
  radioGroup: {
    flexDirection: 'row',
    gap: 12,
  },
  radioCard: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.border,
  },
  radioCardActive: {
    borderColor: colors.primary,
    backgroundColor: colors.gray[50],
  },
  radioText: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 8,
  },
  radioTextActive: {
    color: colors.primary,
    fontWeight: '600',
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
  row: {
    flexDirection: 'row',
    marginBottom: 0,
  },
  checkboxGroup: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 8,
  },
  checkbox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: colors.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  checkboxLabel: {
    fontSize: 14,
    color: colors.text,
    marginLeft: 8,
  },
  checkboxContainer: {
    flex: 1,
    marginLeft: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
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
