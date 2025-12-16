import React, { useEffect, useState } from 'react';
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

// Web-compatible alert helper
const showAlert = (title: string, message: string, onOk?: () => void) => {
  if (Platform.OS === 'web') {
    window.alert(`${title}: ${message}`);
    if (onOk) onOk();
  } else {
    Alert.alert(title, message, onOk ? [{ text: 'OK', onPress: onOk }] : undefined);
  }
};
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Button from '../../components/Button';
import Input from '../../components/Input';
import { colors } from '../../utils/colors';
import api from '../../services/api';

export default function EditProperty() {
  const router = useRouter();
  const { propertyId } = useLocalSearchParams();
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [apartmentNumber, setApartmentNumber] = useState('');
  const [buzzNumber, setBuzzNumber] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [propertyType, setPropertyType] = useState<'residential' | 'commercial'>('residential');
  const [bedrooms, setBedrooms] = useState('');
  const [bathrooms, setBathrooms] = useState('');
  const [squareFeet, setSquareFeet] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadProperty();
  }, [propertyId]);

  const loadProperty = async () => {
    try {
      const response = await api.get(`/api/properties/${propertyId}`);
      const property = response.data;
      setName(property.name);
      setAddress(property.address);
      setApartmentNumber(property.apartmentNumber || '');
      setBuzzNumber(property.buzzNumber || '');
      setPostalCode(property.postalCode);
      setPropertyType(property.propertyType);
      setBedrooms(property.bedrooms?.toString() || '');
      setBathrooms(property.bathrooms?.toString() || '');
      setSquareFeet(property.squareFeet?.toString() || '');
      setNotes(property.notes || '');
    } catch (error) {
      Alert.alert('Error', 'Failed to load property');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!name || !address || !postalCode) {
      Alert.alert('Error', 'Please fill in required fields');
      return;
    }

    try {
      setSaving(true);
      await api.put(`/api/properties/${propertyId}`, {
        name,
        address,
        apartmentNumber: apartmentNumber || null,
        buzzNumber: buzzNumber || null,
        postalCode: postalCode.replace(/\s/g, '').toUpperCase(),
        propertyType,
        bedrooms: parseInt(bedrooms) || 0,
        bathrooms: parseInt(bathrooms) || 0,
        squareFeet: parseInt(squareFeet) || 0,
        notes,
      });

      Alert.alert('Success', 'Property updated successfully', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to update property');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loading}>
          <Text>Loading...</Text>
        </View>
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

          <Text style={styles.title}>Edit Property</Text>
          <Text style={styles.subtitle}>Update your property details</Text>

          <Input
            label="Property Name *"
            placeholder="e.g., Home, Office, Cottage"
            value={name}
            onChangeText={setName}
          />

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Property Type *</Text>
            <View style={styles.radioGroup}>
              <TouchableOpacity
                style={[
                  styles.radioCard,
                  propertyType === 'residential' && styles.radioCardActive,
                ]}
                onPress={() => setPropertyType('residential')}
              >
                <Ionicons
                  name="home"
                  size={24}
                  color={propertyType === 'residential' ? colors.primary : colors.gray[400]}
                />
                <Text
                  style={[
                    styles.radioText,
                    propertyType === 'residential' && styles.radioTextActive,
                  ]}
                >
                  Residential
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.radioCard,
                  propertyType === 'commercial' && styles.radioCardActive,
                ]}
                onPress={() => setPropertyType('commercial')}
              >
                <Ionicons
                  name="business"
                  size={24}
                  color={propertyType === 'commercial' ? colors.primary : colors.gray[400]}
                />
                <Text
                  style={[
                    styles.radioText,
                    propertyType === 'commercial' && styles.radioTextActive,
                  ]}
                >
                  Commercial
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <Input
            label="Address *"
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
                placeholder="3"
                value={bedrooms}
                onChangeText={setBedrooms}
                keyboardType="number-pad"
                containerStyle={{ flex: 1, marginRight: 8 }}
              />
              <Input
                label="Bathrooms"
                placeholder="2"
                value={bathrooms}
                onChangeText={setBathrooms}
                keyboardType="number-pad"
                containerStyle={{ flex: 1, marginLeft: 8 }}
              />
            </View>
          )}

          <Input
            label="Square Feet"
            placeholder="1500"
            value={squareFeet}
            onChangeText={setSquareFeet}
            keyboardType="number-pad"
          />

          <Input
            label="Notes (Optional)"
            placeholder="Any special details..."
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={3}
            containerStyle={{ height: 100 }}
          />

          <Button title="Save Changes" onPress={handleSubmit} loading={saving} />
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
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    marginBottom: 32,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 14,
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
  row: {
    flexDirection: 'row',
    marginBottom: 0,
  },
});