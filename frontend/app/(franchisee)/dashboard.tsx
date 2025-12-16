import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../utils/colors';
import { useAuthStore } from '../../stores/authStore';
import api from '../../services/api';

interface Stats {
  totalEarnings: number;
  completedJobs: number;
  averageJobValue: number;
}

export default function FranchiseeDashboard() {
  const user = useAuthStore((state) => state.user);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  const loadStats = async () => {
    try {
      const response = await api.get('/api/franchisee/earnings');
      setStats(response.data);
    } catch (error) {
      Alert.alert('Error', 'Failed to load earnings');
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
            <Text style={styles.greeting}>Welcome back!</Text>
            <Text style={styles.name}>{user?.name}</Text>
          </View>
          <View style={styles.iconContainer}>
            <Ionicons name="briefcase" size={28} color={colors.primary} />
          </View>
        </View>

        <View style={styles.earningsCard}>
          <Text style={styles.earningsLabel}>Total Earnings</Text>
          <Text style={styles.earningsValue}>
            ${stats?.totalEarnings.toFixed(2) || '0.00'}
          </Text>
          <Text style={styles.earningsSubtext}>
            From {stats?.completedJobs || 0} completed jobs
          </Text>
        </View>

        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Ionicons name="checkmark-circle" size={32} color={colors.success} />
            <Text style={styles.statValue}>{stats?.completedJobs || 0}</Text>
            <Text style={styles.statLabel}>Completed Jobs</Text>
          </View>

          <View style={styles.statCard}>
            <Ionicons name="trending-up" size={32} color={colors.secondary} />
            <Text style={styles.statValue}>
              ${stats?.averageJobValue.toFixed(0) || '0'}
            </Text>
            <Text style={styles.statLabel}>Avg Job Value</Text>
          </View>
        </View>

        <View style={styles.fsaCard}>
          <Text style={styles.fsaTitle}>Assigned FSA Codes</Text>
          {user?.assignedFSAs && user.assignedFSAs.length > 0 ? (
            <View style={styles.fsaList}>
              {user.assignedFSAs.map((fsa, index) => (
                <View key={index} style={styles.fsaBadge}>
                  <Text style={styles.fsaText}>{fsa}</Text>
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.noFsa}>
              <Ionicons name="information-circle-outline" size={24} color={colors.textSecondary} />
              <Text style={styles.noFsaText}>
                No FSA codes assigned yet. Contact admin to get assigned.
              </Text>
            </View>
          )}
        </View>

        <View style={styles.tipsCard}>
          <Ionicons name="bulb" size={24} color={colors.warning} />
          <View style={styles.tipsContent}>
            <Text style={styles.tipsTitle}>Pro Tips</Text>
            <Text style={styles.tipsText}>
              Keep your availability updated to receive more jobs. Complete jobs on time to maintain good ratings.
            </Text>
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
  earningsCard: {
    backgroundColor: colors.primary,
    borderRadius: 20,
    padding: 24,
    marginBottom: 16,
  },
  earningsLabel: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 8,
  },
  earningsValue: {
    fontSize: 40,
    fontWeight: 'bold',
    color: colors.white,
    marginBottom: 4,
  },
  earningsSubtext: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
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
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
    marginTop: 12,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  fsaCard: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  fsaTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 12,
  },
  fsaList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  fsaBadge: {
    backgroundColor: colors.gray[100],
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  fsaText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
  noFsa: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  noFsaText: {
    flex: 1,
    fontSize: 13,
    color: colors.textSecondary,
    marginLeft: 12,
    lineHeight: 18,
  },
  tipsCard: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tipsContent: {
    flex: 1,
    marginLeft: 12,
  },
  tipsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  tipsText: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
  },
});