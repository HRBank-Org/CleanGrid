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

interface Franchisee {
  _id: string;
  name: string;
  email: string;
  phone: string;
  assignedFSAs: string[];
}

export default function FranchiseesScreen() {
  const router = useRouter();
  const [franchisees, setFranchisees] = useState<Franchisee[]>([]);
  const [loading, setLoading] = useState(true);

  const loadFranchisees = async () => {
    try {
      const response = await api.get('/api/admin/franchisees');
      setFranchisees(response.data);
    } catch (error) {
      Alert.alert('Error', 'Failed to load franchisees');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFranchisees();
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={loadFranchisees} />
        }
      >
        <Text style={styles.title}>Franchisees</Text>

        {franchisees.length === 0 && !loading ? (
          <View style={styles.emptyState}>
            <Ionicons name="people-outline" size={64} color={colors.gray[300]} />
            <Text style={styles.emptyText}>No franchisees registered yet</Text>
          </View>
        ) : (
          franchisees.map((franchisee) => (
            <TouchableOpacity
              key={franchisee._id}
              style={styles.franchiseeCard}
              onPress={() =>
                router.push({
                  pathname: '/(admin)/assign-fsa',
                  params: {
                    franchiseeId: franchisee._id,
                    franchiseeName: franchisee.name,
                  },
                })
              }
            >
              <View style={styles.avatarContainer}>
                <Text style={styles.avatarText}>
                  {franchisee.name.charAt(0).toUpperCase()}
                </Text>
              </View>

              <View style={styles.franchiseeInfo}>
                <Text style={styles.franchiseeName}>{franchisee.name}</Text>
                <Text style={styles.franchiseeEmail}>{franchisee.email}</Text>
                <Text style={styles.franchiseePhone}>{franchisee.phone}</Text>
                
                <View style={styles.fsaContainer}>
                  {franchisee.assignedFSAs && franchisee.assignedFSAs.length > 0 ? (
                    <View style={styles.fsaBadges}>
                      {franchisee.assignedFSAs.slice(0, 3).map((fsa, index) => (
                        <View key={index} style={styles.fsaBadge}>
                          <Text style={styles.fsaText}>{fsa}</Text>
                        </View>
                      ))}
                      {franchisee.assignedFSAs.length > 3 && (
                        <Text style={styles.moreText}>
                          +{franchisee.assignedFSAs.length - 3} more
                        </Text>
                      )}
                    </View>
                  ) : (
                    <Text style={styles.noFsaText}>No FSA assigned</Text>
                  )}
                </View>
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
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 24,
  },
  franchiseeCard: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  avatarContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.white,
  },
  franchiseeInfo: {
    flex: 1,
  },
  franchiseeName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 2,
  },
  franchiseeEmail: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  franchiseePhone: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  fsaContainer: {
    marginTop: 4,
  },
  fsaBadges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    alignItems: 'center',
  },
  fsaBadge: {
    backgroundColor: colors.gray[100],
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  fsaText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.primary,
  },
  moreText: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  noFsaText: {
    fontSize: 12,
    color: colors.error,
    fontStyle: 'italic',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 80,
  },
  emptyText: {
    fontSize: 16,
    color: colors.textSecondary,
    marginTop: 16,
  },
});