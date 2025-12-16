import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Button from '../../components/Button';
import Input from '../../components/Input';
import { colors } from '../../utils/colors';
import api from '../../services/api';
import { useAuthStore } from '../../stores/authStore';

export default function OnboardingScreen() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  
  const [step, setStep] = useState<'welcome' | 'add-property'>('welcome');
  const [propertyType, setPropertyType] = useState<'residential' | 'commercial' | null>(null);
  
  // Property form fields
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [apartmentNumber, setApartmentNumber] = useState('');
  const [buzzNumber, setBuzzNumber] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [bedrooms, setBedrooms] = useState('2');
  const [bathrooms, setBathrooms] = useState('1');
  const [squareFeet, setSquareFeet] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSkip = () => {
    router.replace('/(customer)/home');
  };

  const handleAddProperty = async () => {
    if (!name || !address || !postalCode || !propertyType) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    try {
      setLoading(true);
      await api.post('/api/properties', {
        name,
        address,
        apartmentNumber: apartmentNumber || null,
        buzzNumber: buzzNumber || null,
        postalCode: postalCode.replace(/\s/g, '').toUpperCase(),
        propertyType,
        bedrooms: propertyType === 'residential' ? parseInt(bedrooms) || 0 : 0,
        bathrooms: propertyType === 'residential' ? parseInt(bathrooms) || 0 : 0,
        squareFeet: parseInt(squareFeet) || 0,
        notes: '',
      });

      Alert.alert(
        'Property Added!',
        'Great! You can now see personalized cleaning services.',
        [{ text: 'Continue', onPress: () => router.replace('/(customer)/home') }]
      );
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to add property');
    } finally {
      setLoading(false);
    }
  };

  // Welcome step - ask what type of property they have
  if (step === 'welcome') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          <View style={styles.header}>
            <View style={styles.iconCircle}>
              <Ionicons name="sparkles" size={48} color={colors.primary} />
            </View>
            <Text style={styles.welcomeTitle}>Welcome, {user?.name}!</Text>
            <Text style={styles.welcomeSubtitle}>
              Let's set up your first property so we can show you relevant cleaning services
            </Text>
          </View>

          <Text style={styles.questionText}>What type of property do you have?</Text>

          <TouchableOpacity
            style={[
              styles.propertyTypeCard,
              propertyType === 'residential' && styles.propertyTypeCardActive,
            ]}
            onPress={() => setPropertyType('residential')}
          >
            <Ionicons
              name="home"
              size={32}
              color={propertyType === 'residential' ? colors.primary : colors.gray[400]}
            />
            <View style={styles.propertyTypeInfo}>
              <Text style={[
                styles.propertyTypeTitle,
                propertyType === 'residential' && styles.propertyTypeTitleActive,
              ]}>
                Home / Residential
              </Text>
              <Text style={styles.propertyTypeDesc}>
                House, apartment, condo, townhouse
              </Text>
            </View>
            {propertyType === 'residential' && (
              <Ionicons name="checkmark-circle" size={24} color={colors.primary} />
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.propertyTypeCard,
              propertyType === 'commercial' && styles.propertyTypeCardActive,
            ]}
            onPress={() => setPropertyType('commercial')}
          >
            <Ionicons
              name="business"
              size={32}
              color={propertyType === 'commercial' ? colors.primary : colors.gray[400]}
            />
            <View style={styles.propertyTypeInfo}>
              <Text style={[
                styles.propertyTypeTitle,
                propertyType === 'commercial' && styles.propertyTypeTitleActive,
              ]}>
                Business / Commercial
              </Text>
              <Text style={styles.propertyTypeDesc}>
                Office, retail, restaurant, warehouse
              </Text>
            </View>
            {propertyType === 'commercial' && (
              <Ionicons name="checkmark-circle" size={24} color={colors.primary} />
            )}
          </TouchableOpacity>

          <View style={styles.bottomButtons}>
            <Button
              title="Continue"
              onPress={() => setStep('add-property')}
              disabled={!propertyType}
              style={{ flex: 1 }}
            />
          </View>

          <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
            <Text style={styles.skipText}>Skip for now</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Add property details step
  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <TouchableOpacity style={styles.backButton} onPress={() => setStep('welcome')}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>

          <View style={styles.stepHeader}>
            <Text style={styles.formTitle}>Property Details</Text>
            <Text style={styles.formSubtitle}>
              Quick setup - you can add more properties later
            </Text>
          </View>

          {/* Property Type Selection */}
          <Text style={styles.fieldLabel}>Property Type *</Text>
          <View style={styles.typeSelector}>
            <TouchableOpacity
              style={[
                styles.typeOption,
                propertyType === 'residential' && styles.typeOptionActive,
              ]}
              onPress={() => setPropertyType('residential')}
            >
              <Ionicons
                name="home"
                size={20}
                color={propertyType === 'residential' ? colors.primary : colors.gray[400]}
              />
              <Text style={[
                styles.typeOptionText,
                propertyType === 'residential' && styles.typeOptionTextActive,
              ]}>
                Residential
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.typeOption,
                propertyType === 'commercial' && styles.typeOptionActive,
              ]}
              onPress={() => setPropertyType('commercial')}
            >
              <Ionicons
                name="business"
                size={20}
                color={propertyType === 'commercial' ? colors.primary : colors.gray[400]}
              />
              <Text style={[
                styles.typeOptionText,
                propertyType === 'commercial' && styles.typeOptionTextActive,
              ]}>
                Commercial
              </Text>
            </TouchableOpacity>
          </View>

          <Input
            label="Property Name *"
            placeholder={propertyType === 'residential' ? 'e.g., My Home, Downtown Condo' : 'e.g., Main Office, Store #1'}
            value={name}
            onChangeText={setName}
          />

          <Input
            label="Street Address *"
            placeholder="123 Main Street"
            value={address}
            onChangeText={setAddress}
          />

          <View style={styles.row}>
            <Input
              label="Apt/Unit #"
              placeholder="205"
              value={apartmentNumber}
              onChangeText={setApartmentNumber}
              containerStyle={{ flex: 1, marginRight: 8 }}
            />
            <Input
              label="Buzz Code"
              placeholder="1234"
              value={buzzNumber}
              onChangeText={setBuzzNumber}
              containerStyle={{ flex: 1, marginLeft: 8 }}
            />
          </View>

          <Input
            label="Postal Code *"
            placeholder="M5V 3A8"
            value={postalCode}
            onChangeText={setPostalCode}
            autoCapitalize="characters"
          />

          {propertyType === 'residential' && (
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
          )}

          <Input
            label="Square Feet (optional)"
            placeholder="1500"
            value={squareFeet}
            onChangeText={setSquareFeet}
            keyboardType="number-pad"
          />

          <Button
            title="Save & Continue"
            onPress={handleAddProperty}
            loading={loading}
            style={{ marginTop: 16 }}
          />

          <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
            <Text style={styles.skipText}>Skip for now</Text>
          </TouchableOpacity>
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
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 40,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  iconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.gray[100],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  welcomeTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 12,
    textAlign: 'center',
  },
  welcomeSubtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 16,
  },
  questionText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 16,
  },
  propertyTypeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: colors.border,
  },
  propertyTypeCardActive: {
    borderColor: colors.primary,
    backgroundColor: colors.gray[50],
  },
  propertyTypeInfo: {
    flex: 1,
    marginLeft: 16,
  },
  propertyTypeTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  propertyTypeTitleActive: {
    color: colors.primary,
  },
  propertyTypeDesc: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  bottomButtons: {
    flexDirection: 'row',
    marginTop: 24,
    gap: 12,
  },
  skipButton: {
    alignItems: 'center',
    paddingVertical: 16,
    marginTop: 8,
  },
  skipText: {
    fontSize: 15,
    color: colors.textSecondary,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    marginBottom: 16,
  },
  stepHeader: {
    marginBottom: 24,
  },
  propertyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.gray[100],
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    alignSelf: 'flex-start',
    marginBottom: 16,
  },
  propertyBadgeText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary,
    marginLeft: 6,
  },
  formTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 8,
  },
  formSubtitle: {
    fontSize: 15,
    color: colors.textSecondary,
  },
  row: {
    flexDirection: 'row',
  },
});
