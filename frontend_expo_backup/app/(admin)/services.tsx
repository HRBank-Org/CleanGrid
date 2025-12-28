import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../utils/colors';
import api from '../../services/api';

interface Service {
  _id: string;
  name: string;
  category: string;
  basePriceResidential: number;
  basePriceCommercial: number;
  description: string;
}

export default function ServicesScreen() {
  const router = useRouter();
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);

  const loadServices = async () => {
    try {
      const response = await api.get('/api/services');
      setServices(response.data);
    } catch (error) {
      Alert.alert('Error', 'Failed to load services');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadServices();
  }, []);

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'deep-clean':
        return 'sparkles';
      case 'regular':
        return 'home';
      case 'move-in-out':
        return 'exit';
      case 'commercial':
        return 'business';
      default:
        return 'checkmark-circle';
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={loadServices} />
        }
      >
        <View style={styles.header}>
          <Text style={styles.title}>Services</Text>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => router.push('/(admin)/add-service')}
          >
            <Ionicons name="add" size={24} color={colors.white} />
          </TouchableOpacity>
        </View>

        {services.length === 0 && !loading ? (
          <View style={styles.emptyState}>
            <Ionicons name="list-outline" size={64} color={colors.gray[300]} />
            <Text style={styles.emptyText}>No services available</Text>
            <Text style={styles.emptySubtext}>Add your first service to get started</Text>
          </View>
        ) : (
          services.map((service) => (
            <View key={service._id} style={styles.serviceCard}>
              <View style={styles.serviceIcon}>
                <Ionicons
                  name={getCategoryIcon(service.category) as any}
                  size={28}
                  color={colors.primary}
                />
              </View>

              <View style={styles.serviceInfo}>
                <Text style={styles.serviceName}>{service.name}</Text>
                <Text style={styles.serviceDescription}>
                  {service.description}
                </Text>
                <View style={styles.priceRow}>
                  <Text style={styles.priceLabel}>Residential: </Text>
                  <Text style={styles.priceValue}>
                    ${service.basePriceResidential}
                  </Text>
                  <Text style={styles.priceSeparator}> | </Text>
                  <Text style={styles.priceLabel}>Commercial: </Text>
                  <Text style={styles.priceValue}>
                    ${service.basePriceCommercial}
                  </Text>
                </View>
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
  serviceCard: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  serviceIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.gray[100],
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  serviceInfo: {
    flex: 1,
  },
  serviceName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  serviceDescription: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  priceLabel: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  priceValue: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary,
  },
  priceSeparator: {
    fontSize: 12,
    color: colors.gray[300],
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 80,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 4,
  },
});