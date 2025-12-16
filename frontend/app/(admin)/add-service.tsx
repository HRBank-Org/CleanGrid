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

export default function AddService() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<string>('regular');
  const [basePriceResidential, setBasePriceResidential] = useState('');
  const [basePriceCommercial, setBasePriceCommercial] = useState('');
  const [pricePerSqFt, setPricePerSqFt] = useState('');
  const [estimatedDuration, setEstimatedDuration] = useState('');
  const [loading, setLoading] = useState(false);

  const categories = [
    { value: 'regular', label: 'Regular Cleaning', icon: 'home' },
    { value: 'deep-clean', label: 'Deep Cleaning', icon: 'sparkles' },
    { value: 'move-in-out', label: 'Move In/Out', icon: 'exit' },
    { value: 'commercial', label: 'Commercial', icon: 'business' },
  ];

  const handleSubmit = async () => {
    if (
      !name ||
      !description ||
      !basePriceResidential ||
      !basePriceCommercial ||
      !pricePerSqFt ||
      !estimatedDuration
    ) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    try {
      setLoading(true);
      await api.post('/api/services', {
        name,
        description,
        category,
        serviceType: 'both',
        basePriceResidential: parseFloat(basePriceResidential),
        basePriceCommercial: parseFloat(basePriceCommercial),
        pricePerSqFt: parseFloat(pricePerSqFt),
        estimatedDuration: parseInt(estimatedDuration),
      });

      Alert.alert('Success', 'Service added successfully', [
        {
          text: 'OK',
          onPress: () => router.back(),
        },
      ]);
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to add service');
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

          <Text style={styles.title}>Add New Service</Text>
          <Text style={styles.subtitle}>Create a new cleaning service offering</Text>

          <Input
            label="Service Name"
            placeholder="e.g., Deep House Cleaning"
            value={name}
            onChangeText={setName}
          />

          <Input
            label="Description"
            placeholder="Describe the service..."
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={3}
            containerStyle={{ height: 100 }}
          />

          <View style={styles.section}>
            <Text style={styles.label}>Category</Text>
            <View style={styles.categoriesGrid}>
              {categories.map((cat) => (
                <TouchableOpacity
                  key={cat.value}
                  style={[
                    styles.categoryCard,
                    category === cat.value && styles.categoryCardActive,
                  ]}
                  onPress={() => setCategory(cat.value)}
                >
                  <Ionicons
                    name={cat.icon as any}
                    size={24}
                    color={
                      category === cat.value ? colors.primary : colors.gray[400]
                    }
                  />
                  <Text
                    style={[
                      styles.categoryText,
                      category === cat.value && styles.categoryTextActive,
                    ]}
                  >
                    {cat.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.row}>
            <Input
              label="Base Price (Residential)"
              placeholder="99"
              value={basePriceResidential}
              onChangeText={setBasePriceResidential}
              keyboardType="decimal-pad"
              containerStyle={{ flex: 1, marginRight: 8 }}
            />

            <Input
              label="Base Price (Commercial)"
              placeholder="149"
              value={basePriceCommercial}
              onChangeText={setBasePriceCommercial}
              keyboardType="decimal-pad"
              containerStyle={{ flex: 1, marginLeft: 8 }}
            />
          </View>

          <View style={styles.row}>
            <Input
              label="Price Per Sq Ft"
              placeholder="0.15"
              value={pricePerSqFt}
              onChangeText={setPricePerSqFt}
              keyboardType="decimal-pad"
              containerStyle={{ flex: 1, marginRight: 8 }}
            />

            <Input
              label="Est. Duration (min)"
              placeholder="120"
              value={estimatedDuration}
              onChangeText={setEstimatedDuration}
              keyboardType="number-pad"
              containerStyle={{ flex: 1, marginLeft: 8 }}
            />
          </View>

          <Button
            title="Add Service"
            onPress={handleSubmit}
            loading={loading}
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
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 12,
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  categoryCard: {
    width: '48%',
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.border,
  },
  categoryCardActive: {
    borderColor: colors.primary,
    backgroundColor: colors.gray[50],
  },
  categoryText: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 8,
    textAlign: 'center',
  },
  categoryTextActive: {
    color: colors.primary,
    fontWeight: '600',
  },
  row: {
    flexDirection: 'row',
    marginBottom: 0,
  },
});