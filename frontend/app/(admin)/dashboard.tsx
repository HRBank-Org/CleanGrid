import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  RefreshControl,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../utils/colors';
import { useAuthStore } from '../../stores/authStore';
import api from '../../services/api';

interface AdminStats {
  totalBookings: number;
  totalCustomers: number;
  totalFranchisees: number;
  completedBookings: number;
  totalRevenue: number;
}

export default function AdminDashboard() {
  const user = useAuthStore((state) => state.user);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);

  const loadStats = async () => {
    try {
      const response = await api.get('/api/admin/stats');
      setStats(response.data);
    } catch (error) {
      Alert.alert('Error', 'Failed to load statistics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={loadStats} />
        }
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Admin Dashboard</Text>
            <Text style={styles.name}>{user?.name}</Text>
          </View>
          <View style={styles.iconContainer}>
            <Ionicons name="shield-checkmark" size={28} color={colors.primary} />
          </View>
        </View>

        <View style={styles.revenueCard}>
          <Ionicons name="cash" size={32} color={colors.white} />
          <View style={styles.revenueInfo}>
            <Text style={styles.revenueLabel}>Total Revenue</Text>
            <Text style={styles.revenueValue}>
              ${stats?.totalRevenue.toFixed(2) || '0.00'}
            </Text>
          </View>
        </View>

        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <View
              style={[
                styles.statIconContainer,
                { backgroundColor: `${colors.secondary}15` },
              ]}
            >
              <Ionicons name="calendar" size={24} color={colors.secondary} />
            </View>
            <Text style={styles.statValue}>{stats?.totalBookings || 0}</Text>
            <Text style={styles.statLabel}>Total Bookings</Text>
          </View>

          <View style={styles.statCard}>
            <View
              style={[
                styles.statIconContainer,
                { backgroundColor: `${colors.success}15` },
              ]}
            >
              <Ionicons name="checkmark-circle" size={24} color={colors.success} />
            </View>
            <Text style={styles.statValue}>{stats?.completedBookings || 0}</Text>
            <Text style={styles.statLabel}>Completed</Text>
          </View>
        </View>

        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <View
              style={[
                styles.statIconContainer,
                { backgroundColor: `${colors.primary}15` },
              ]}
            >
              <Ionicons name="people" size={24} color={colors.primary} />
            </View>
            <Text style={styles.statValue}>{stats?.totalCustomers || 0}</Text>
            <Text style={styles.statLabel}>Customers</Text>
          </View>

          <View style={styles.statCard}>
            <View
              style={[
                styles.statIconContainer,
                { backgroundColor: `${colors.warning}15` },
              ]}
            >
              <Ionicons name="briefcase" size={24} color={colors.warning} />
            </View>
            <Text style={styles.statValue}>{stats?.totalFranchisees || 0}</Text>
            <Text style={styles.statLabel}>Franchisees</Text>
          </View>
        </View>

        <View style={styles.insightsCard}>
          <Text style={styles.insightsTitle}>Platform Overview</Text>
          
          <View style={styles.insightRow}>
            <Text style={styles.insightLabel}>Conversion Rate</Text>
            <Text style={styles.insightValue}>
              {stats && stats.totalBookings > 0
                ? ((stats.completedBookings / stats.totalBookings) * 100).toFixed(1)
                : '0'}%
            </Text>
          </View>

          <View style={styles.insightRow}>
            <Text style={styles.insightLabel}>Avg. Booking Value</Text>
            <Text style={styles.insightValue}>
              $
              {stats && stats.completedBookings > 0
                ? (stats.totalRevenue / stats.completedBookings).toFixed(2)
                : '0.00'}
            </Text>
          </View>
        </View>

        <View style={styles.quickActions}>
          <Text style={styles.quickActionsTitle}>Quick Actions</Text>
          <View style={styles.actionButtons}>
            <View style={styles.actionButton}>
              <Ionicons name="add-circle" size={32} color={colors.primary} />
              <Text style={styles.actionText}>Add Service</Text>
            </View>
            <View style={styles.actionButton}>
              <Ionicons name="location" size={32} color={colors.secondary} />
              <Text style={styles.actionText}>Assign FSA</Text>
            </View>
          </View>
        </View>
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
    fontSize: 14,
    color: colors.textSecondary,
  },
  name: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.text,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.gray[100],
    alignItems: 'center',
    justifyContent: 'center',
  },
  revenueCard: {
    flexDirection: 'row',
    backgroundColor: colors.primary,
    borderRadius: 20,
    padding: 24,
    marginBottom: 16,
    alignItems: 'center',
  },
  revenueInfo: {
    marginLeft: 16,
  },
  revenueLabel: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 4,
  },
  revenueValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: colors.white,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  statIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  insightsCard: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 20,
    marginTop: 4,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  insightsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 16,
  },
  insightRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  insightLabel: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  insightValue: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  quickActions: {
    marginBottom: 24,
  },
  quickActionsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 12,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  actionText: {
    fontSize: 12,
    color: colors.text,
    marginTop: 8,
    fontWeight: '500',
    textAlign: 'center',
  },
});