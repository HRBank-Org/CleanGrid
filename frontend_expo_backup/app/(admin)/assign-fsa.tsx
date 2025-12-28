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
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Button from '../../components/Button';
import Input from '../../components/Input';
import { colors } from '../../utils/colors';
import api from '../../services/api';

export default function AssignFSA() {
  const router = useRouter();
  const { franchiseeId, franchiseeName } = useLocalSearchParams();
  const [fsaCodes, setFsaCodes] = useState<string[]>(['']);
  const [loading, setLoading] = useState(false);

  const addFSAField = () => {
    setFsaCodes([...fsaCodes, '']);
  };

  const removeFSAField = (index: number) => {
    const updated = fsaCodes.filter((_, i) => i !== index);
    setFsaCodes(updated.length > 0 ? updated : ['']);
  };

  const updateFSACode = (index: number, value: string) => {
    const updated = [...fsaCodes];
    updated[index] = value.toUpperCase();
    setFsaCodes(updated);
  };

  const handleSubmit = async () => {
    const validFSAs = fsaCodes
      .map((code) => code.trim())
      .filter((code) => code.length > 0);

    if (validFSAs.length === 0) {
      Alert.alert('Error', 'Please enter at least one FSA code');
      return;
    }

    // Validate FSA format (should be last 3 chars of postal code)
    const invalidFSAs = validFSAs.filter(
      (code) => code.length !== 3 || !/^[A-Z0-9]{3}$/.test(code)
    );

    if (invalidFSAs.length > 0) {
      Alert.alert(
        'Error',
        'FSA codes should be 3 characters (last 3 of postal code, e.g., 3A8)'
      );
      return;
    }

    try {
      setLoading(true);
      await api.post('/api/admin/assign-fsa', {
        franchiseeId,
        fsaCodes: validFSAs,
      });

      Alert.alert('Success', `FSA codes assigned to ${franchiseeName}`, [
        {
          text: 'OK',
          onPress: () => router.back(),
        },
      ]);
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to assign FSA codes');
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

          <Text style={styles.title}>Assign FSA Codes</Text>
          <Text style={styles.subtitle}>To: {franchiseeName}</Text>

          <View style={styles.infoCard}>
            <Ionicons name="information-circle" size={20} color={colors.secondary} />
            <Text style={styles.infoText}>
              FSA codes are the last 3 characters of a postal code (e.g., for
              M5V3A8, enter 3A8). These determine which jobs this franchisee
              receives.
            </Text>
          </View>

          {fsaCodes.map((code, index) => (
            <View key={index} style={styles.fsaRow}>
              <Input
                label={`FSA Code ${index + 1}`}
                placeholder="e.g., 3A8"
                value={code}
                onChangeText={(value) => updateFSACode(index, value)}
                autoCapitalize="characters"
                maxLength={3}
                containerStyle={{ flex: 1 }}
              />
              {fsaCodes.length > 1 && (
                <TouchableOpacity
                  style={styles.removeButton}
                  onPress={() => removeFSAField(index)}
                >
                  <Ionicons name="close-circle" size={28} color={colors.error} />
                </TouchableOpacity>
              )}
            </View>
          ))}

          <TouchableOpacity style={styles.addButton} onPress={addFSAField}>
            <Ionicons name="add-circle" size={24} color={colors.primary} />
            <Text style={styles.addButtonText}>Add Another FSA Code</Text>
          </TouchableOpacity>

          <Button
            title="Save FSA Assignments"
            onPress={handleSubmit}
            loading={loading}
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
    marginBottom: 24,
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: colors.gray[50],
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: colors.textSecondary,
    marginLeft: 12,
    lineHeight: 18,
  },
  fsaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  removeButton: {
    marginTop: 22,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: colors.primary,
    borderStyle: 'dashed',
  },
  addButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
    marginLeft: 8,
  },
});