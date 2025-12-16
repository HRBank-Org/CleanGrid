import React, { useState } from 'react';
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
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Button from '../../components/Button';
import Input from '../../components/Input';
import { colors } from '../../utils/colors';
import api from '../../services/api';

export default function AddProperty() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [propertyType, setPropertyType] = useState<'residential' | 'commercial'>('residential');
  const [bedrooms, setBedrooms] = useState('');
  const [bathrooms, setBathrooms] = useState('');
  const [squareFeet, setSquareFeet] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!name || !address || !postalCode) {
      Alert.alert('Error', 'Please fill in required fields');
      return;
    }

    try {
      setLoading(true);
      await api.post('/api/properties', {
        name,
        address,
        postalCode: postalCode.replace(/\s/g, '').toUpperCase(),
        propertyType,
        bedrooms: parseInt(bedrooms) || 0,
        bathrooms: parseInt(bathrooms) || 0,
        squareFeet: parseInt(squareFeet) || 0,
        notes,
      });

      Alert.alert('Success', 'Property added successfully', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to add property');
    } finally {
      setLoading(false);
    }
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

          <Text style={styles.title}>Add Property</Text>
          <Text style={styles.subtitle}>Save your property details for easy booking</Text>

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

          <Button title="Add Property" onPress={handleSubmit} loading={loading} />
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