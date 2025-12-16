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

interface Property {
  _id: string;
  name: string;
  propertyType: string;
}

export default function CustomerHome() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const [services, setServices] = useState<Service[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);

  // Determine what property types user has
  const hasResidential = properties.some(p => p.propertyType === 'residential');
  const hasCommercial = properties.some(p => p.propertyType === 'commercial');
  const hasNoProperties = properties.length === 0;

  // Filter services based on user's property types
  const filteredServices = services.filter(service => {
    if (hasNoProperties) return true; // Show all if no properties
    
    const isResidentialService = service.serviceType === 'residential' || 
      ['regular', 'deep-clean', 'move-in-out', 'post-reno'].includes(service.category);
    const isCommercialService = service.serviceType === 'commercial' || 
      ['commercial', 'commercial-deep'].includes(service.category);
    
    if (hasResidential && hasCommercial) return true; // Show all
    if (hasResidential && isResidentialService) return true;
    if (hasCommercial && isCommercialService) return true;
    
    return false;
  });

  const loadData = async () => {
    try {
      const [servicesRes, propertiesRes] = await Promise.all([
        api.get('/api/services'),
        api.get('/api/properties'),
      ]);
      setServices(servicesRes.data);
      setProperties(propertiesRes.data);
    } catch (error) {
      Alert.alert('Error', 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
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
          <RefreshControl refreshing={loading} onRefresh={loadData} />
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

        {/* No properties prompt */}
        {hasNoProperties && !loading && (
          <TouchableOpacity
            style={styles.addPropertyPrompt}
            onPress={() => router.push('/(customer)/onboarding')}
          >
            <View style={styles.promptIcon}>
              <Ionicons name="location" size={24} color={colors.secondary} />
            </View>
            <View style={styles.promptContent}>
              <Text style={styles.promptTitle}>Add your first property</Text>
              <Text style={styles.promptSubtitle}>
                Get personalized services and pricing for your space
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color={colors.secondary} />
          </TouchableOpacity>
        )}

        {/* Property type badge */}
        {!hasNoProperties && (
          <View style={styles.propertyTypeBadge}>
            <Text style={styles.propertyTypeBadgeText}>
              Showing services for: {hasResidential && hasCommercial ? 'All properties' : hasResidential ? 'Residential' : 'Commercial'}
            </Text>
          </View>
        )}

        <Text style={styles.sectionTitle}>
          {hasNoProperties ? 'Our Services' : 'Your Services'}
        </Text>

        {filteredServices.length === 0 && !loading ? (
          <View style={styles.emptyState}>
            <Ionicons name="cube-outline" size={48} color={colors.gray[300]} />
            <Text style={styles.emptyText}>No services available yet</Text>
            <Text style={styles.emptySubtext}>Check back soon for cleaning services</Text>
          </View>
        ) : (
          filteredServices.map((service) => (
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
                  From ${service.serviceType === 'commercial' ? service.basePriceCommercial : service.basePriceResidential}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={24} color={colors.gray[400]} />
            </TouchableOpacity>
          ))
        )}

        {/* Show other services hint */}
        {!hasNoProperties && !hasResidential && hasCommercial && (
          <TouchableOpacity
            style={styles.otherServicesHint}
            onPress={() => router.push('/(customer)/add-property')}
          >
            <Ionicons name="home-outline" size={20} color={colors.textSecondary} />
            <Text style={styles.otherServicesText}>
              Add a residential property to see home cleaning services
            </Text>
          </TouchableOpacity>
        )}
        
        {!hasNoProperties && hasResidential && !hasCommercial && (
          <TouchableOpacity
            style={styles.otherServicesHint}
            onPress={() => router.push('/(customer)/add-property')}
          >
            <Ionicons name="business-outline" size={20} color={colors.textSecondary} />
            <Text style={styles.otherServicesText}>
              Add a commercial property to see business cleaning services
            </Text>
          </TouchableOpacity>
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
  addPropertyPrompt: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    borderWidth: 2,
    borderColor: colors.secondary,
    borderStyle: 'dashed',
  },
  promptIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.gray[100],
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  promptContent: {
    flex: 1,
  },
  promptTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  promptSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  propertyTypeBadge: {
    backgroundColor: colors.gray[100],
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    alignSelf: 'flex-start',
    marginBottom: 16,
  },
  propertyTypeBadgeText: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  otherServicesHint: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.gray[50],
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
  },
  otherServicesText: {
    flex: 1,
    fontSize: 14,
    color: colors.textSecondary,
    marginLeft: 12,
    lineHeight: 20,
  },
});