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
import { useAuthStore } from '../../stores/authStore';
import api from '../../services/api';

interface Service {
  _id: string;
  name: string;
  category: string;
  serviceType: string;
  basePriceResidential: number;
  basePriceCommercial: number;
  description: string;
}

export default function CustomerHome() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
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
      case 'commercial-deep':
        return 'briefcase';
      case 'post-reno':
        return 'construct';
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
          <View>
            <Text style={styles.greeting}>Hello, {user?.name}!</Text>
            <Text style={styles.subgreeting}>What needs cleaning today?</Text>
          </View>
          <View style={styles.iconContainer}>
            <Ionicons name="sparkles" size={32} color={colors.primary} />
          </View>
        </View>

        <TouchableOpacity
          style={styles.enhancedQuoteButton}
          onPress={() => router.push('/(customer)/quote-enhanced')}
        >
          <View style={styles.enhancedQuoteContent}>
            <Ionicons name="calculator" size={28} color={colors.white} />
            <View style={styles.enhancedQuoteText}>
              <Text style={styles.enhancedQuoteTitle}>Get Live Quote</Text>
              <Text style={styles.enhancedQuoteSubtitle}>
                Instant pricing with CleanUnits calculator
              </Text>
            </View>
          </View>
          <Ionicons name="arrow-forward" size={24} color={colors.white} />
        </TouchableOpacity>

        <View style={styles.quickActions}>
          <TouchableOpacity
            style={styles.quickAction}
            onPress={() => router.push('/(customer)/bookings')}
          >
            <Ionicons name="calendar" size={24} color={colors.primary} />
            <Text style={styles.quickActionText}>My Bookings</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickAction}
            onPress={() => Alert.alert('Coming Soon', 'Recurring services feature')}
          >
            <Ionicons name="repeat" size={24} color={colors.secondary} />
            <Text style={styles.quickActionText}>Recurring</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionTitle}>Our Services</Text>

        {services.length === 0 && !loading ? (
          <View style={styles.emptyState}>
            <Ionicons name="cube-outline" size={48} color={colors.gray[300]} />
            <Text style={styles.emptyText}>No services available yet</Text>
            <Text style={styles.emptySubtext}>Check back soon for cleaning services</Text>
          </View>
        ) : (
          services.map((service) => (
            <TouchableOpacity
              key={service._id}
              style={styles.serviceCard}
              onPress={() =>
                router.push({
                  pathname: '/(customer)/quote-enhanced',
                  params: { 
                    serviceId: service._id,
                    serviceName: service.name,
                    serviceCategory: service.category 
                  },
                })
              }
            >
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
                <Text style={styles.servicePrice}>
                  From ${service.basePriceResidential}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={24} color={colors.gray[400]} />
            </TouchableOpacity>
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
  greeting: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.text,
  },
  subgreeting: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 4,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.gray[100],
    alignItems: 'center',
    justifyContent: 'center',
  },
  enhancedQuoteButton: {
    backgroundColor: colors.primary,
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  enhancedQuoteContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  enhancedQuoteText: {
    marginLeft: 16,
    flex: 1,
  },
  enhancedQuoteTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.white,
    marginBottom: 4,
  },
  enhancedQuoteSubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
  },
  quickActions: {
    flexDirection: 'row',
    marginBottom: 32,
    gap: 12,
  },
  quickAction: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  quickActionText: {
    fontSize: 12,
    color: colors.text,
    marginTop: 8,
    fontWeight: '500',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 16,
  },
  serviceCard: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
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
    marginBottom: 4,
  },
  servicePrice: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
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