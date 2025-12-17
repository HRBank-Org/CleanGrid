import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Pressable,
  Alert,
  RefreshControl,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
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

export default function PropertiesScreen() {
  const router = useRouter();
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);

  const loadProperties = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/properties');
      setProperties(response.data);
    } catch (error) {
      console.error('Failed to load properties:', error);
      if (Platform.OS === 'web') {
        console.error('Load error');
      } else {
        Alert.alert('Error', 'Failed to load properties');
      }
    } finally {
      setLoading(false);
    }
  };

  // Reload properties when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      loadProperties();
    }, [])
  );

  const handleDelete = (propertyId: string, propertyName: string) => {
    // Simple confirmation and delete
    const doDelete = async () => {
      try {
        setDeleting(propertyId);
        const response = await api.delete(`/api/properties/${propertyId}`);
        console.log('Delete response:', response.status);
        
        // Remove from local state immediately
        setProperties(prev => prev.filter(p => p._id !== propertyId));
        
        if (Platform.OS === 'web') {
          window.alert('Property deleted!');
        } else {
          Alert.alert('Success', 'Property deleted');
        }
      } catch (error: any) {
        console.error('Delete error:', error);
        const errorMsg = error.response?.data?.detail || 'Failed to delete';
        if (Platform.OS === 'web') {
          window.alert('Error: ' + errorMsg);
        } else {
          Alert.alert('Error', errorMsg);
        }
        // Reload to get fresh data
        loadProperties();
      } finally {
        setDeleting(null);
      }
    };

    // Confirmation
    if (Platform.OS === 'web') {
      if (window.confirm(`Delete "${propertyName}"?`)) {
        doDelete();
      }
    } else {
      Alert.alert(
        'Delete Property',
        `Are you sure you want to delete "${propertyName}"?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Delete', style: 'destructive', onPress: doDelete },
        ]
      );
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
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => router.push('/(customer)/add-property')}
          >
            <Ionicons name="add" size={24} color={colors.white} />
          </TouchableOpacity>
        </View>

        {properties.length === 0 && !loading ? (
          <View style={styles.emptyState}>
            <Ionicons name="home-outline" size={64} color={colors.gray[300]} />
            <Text style={styles.emptyText}>No properties yet</Text>
            <Text style={styles.emptySubtext}>
              Add your properties to streamline booking
            </Text>
            <TouchableOpacity
              style={styles.emptyButton}
              onPress={() => router.push('/(customer)/add-property')}
            >
              <Text style={styles.emptyButtonText}>Add First Property</Text>
            </TouchableOpacity>
          </View>
        ) : (
          properties.map((property) => (
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

              <View style={styles.propertyDetails}>
                {property.bedrooms! > 0 && (
                  <View style={styles.detailItem}>
                    <Ionicons name="bed" size={16} color={colors.textSecondary} />
                    <Text style={styles.detailText}>{property.bedrooms} BD</Text>
                  </View>
                )}
                {property.bathrooms! > 0 && (
                  <View style={styles.detailItem}>
                    <Ionicons name="water" size={16} color={colors.textSecondary} />
                    <Text style={styles.detailText}>{property.bathrooms} BA</Text>
                  </View>
                )}
                {property.squareFeet! > 0 && (
                  <View style={styles.detailItem}>
                    <Ionicons name="resize" size={16} color={colors.textSecondary} />
                    <Text style={styles.detailText}>{property.squareFeet} sq ft</Text>
                  </View>
                )}
              </View>

              <View style={styles.propertyActions}>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() =>
                    router.push({
                      pathname: '/(customer)/edit-property',
                      params: { propertyId: property._id },
                    })
                  }
                >
                  <Ionicons name="pencil" size={18} color={colors.secondary} />
                  <Text style={styles.actionText}>Edit</Text>
                </TouchableOpacity>

                <Pressable
                  style={({ pressed }) => [
                    styles.actionButton,
                    styles.deleteButton,
                    deleting === property._id && styles.actionButtonDisabled,
                    pressed && styles.buttonPressed,
                  ]}
                  onPress={() => {
                    console.log('Delete button pressed for:', property._id);
                    handleDelete(property._id, property.name);
                  }}
                  disabled={deleting === property._id}
                >
                  <Ionicons name="trash" size={18} color={deleting === property._id ? colors.gray[400] : colors.error} />
                  <Text style={[styles.actionText, { color: deleting === property._id ? colors.gray[400] : colors.error }]}>
                    {deleting === property._id ? 'Deleting...' : 'Delete'}
                  </Text>
                </Pressable>
              </View>
            </View>
          ))
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
    fontSize: 32,
    fontWeight: 'bold',
    color: colors.text,
  },
  addButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  propertyCard: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  propertyHeader: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  propertyIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.gray[100],
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
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
  propertyPostal: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  propertyBuzz: {
    fontSize: 13,
    color: colors.secondary,
    marginBottom: 2,
  },
  propertyDetails: {
    flexDirection: 'row',
    gap: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  detailText: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  propertyActions: {
    flexDirection: 'row',
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
  actionButtonDisabled: {
    opacity: 0.6,
  },
  actionText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.secondary,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 80,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 8,
    textAlign: 'center',
  },
  emptyButton: {
    marginTop: 24,
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  emptyButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.white,
  },
});