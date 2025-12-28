import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../utils/colors';
import api from '../../services/api';

interface ApplicationData {
  application_id: string;
  operating_name: string;
  status: string;
  submitted_at: string;
  assigned_fsas: string[];
}

const STATUS_CONFIG: Record<string, { icon: string; color: string; label: string; description: string }> = {
  draft: {
    icon: 'create-outline',
    color: colors.gray[500],
    label: 'Draft',
    description: 'Your application is saved but not yet submitted.',
  },
  submitted: {
    icon: 'paper-plane',
    color: colors.info,
    label: 'Submitted',
    description: 'Your application has been received and is awaiting review.',
  },
  under_review: {
    icon: 'search',
    color: colors.warning,
    label: 'Under Review',
    description: 'Our team is currently reviewing your application.',
  },
  approved: {
    icon: 'checkmark-circle',
    color: colors.success,
    label: 'Approved',
    description: 'Congratulations! Your application has been approved. Please complete the onboarding steps.',
  },
  activated: {
    icon: 'rocket',
    color: colors.primary,
    label: 'Activated',
    description: 'Your franchise is active and ready to accept jobs!',
  },
  rejected: {
    icon: 'close-circle',
    color: colors.error,
    label: 'Not Approved',
    description: 'Unfortunately, your application was not approved at this time.',
  },
  suspended: {
    icon: 'pause-circle',
    color: colors.error,
    label: 'Suspended',
    description: 'Your franchise has been temporarily suspended.',
  },
};

export default function ApplicationStatusScreen() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const [applicationId, setApplicationId] = useState(params.id as string || '');
  const [loading, setLoading] = useState(false);
  const [application, setApplication] = useState<ApplicationData | null>(null);
  const [error, setError] = useState('');
  
  useEffect(() => {
    if (params.id) {
      fetchStatus(params.id as string);
    }
  }, [params.id]);
  
  const fetchStatus = async (id: string) => {
    if (!id.trim()) {
      setError('Please enter an application ID');
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      const response = await api.get(`/api/franchisee/application/${id}`);
      if (response.data.success) {
        setApplication(response.data.data);
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Application not found');
      setApplication(null);
    } finally {
      setLoading(false);
    }
  };
  
  const statusConfig = application ? STATUS_CONFIG[application.status] || STATUS_CONFIG.submitted : null;
  
  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <View style={styles.content}>
        <View style={styles.header}>
          <Ionicons name="document-text" size={48} color={colors.primary} />
          <Text style={styles.title}>Check Application Status</Text>
          <Text style={styles.subtitle}>
            Enter your application ID to check the status
          </Text>
        </View>
        
        <View style={styles.searchBox}>
          <TextInput
            style={styles.input}
            value={applicationId}
            onChangeText={setApplicationId}
            placeholder="Enter Application ID"
            placeholderTextColor={colors.gray[400]}
            autoCapitalize="none"
            autoCorrect={false}
          />
          <Pressable
            style={[styles.searchButton, loading && styles.buttonDisabled]}
            onPress={() => fetchStatus(applicationId)}
            disabled={loading}
            role="button"
          >
            {loading ? (
              <ActivityIndicator color={colors.white} size="small" />
            ) : (
              <Ionicons name="search" size={20} color={colors.white} />
            )}
          </Pressable>
        </View>
        
        {error && (
          <View style={styles.errorBox}>
            <Ionicons name="alert-circle" size={20} color={colors.error} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}
        
        {application && statusConfig && (
          <View style={styles.resultCard}>
            <View style={[styles.statusBadge, { backgroundColor: statusConfig.color + '20' }]}>
              <Ionicons name={statusConfig.icon as any} size={32} color={statusConfig.color} />
            </View>
            
            <Text style={styles.businessName}>{application.operating_name}</Text>
            
            <View style={[styles.statusPill, { backgroundColor: statusConfig.color }]}>
              <Text style={styles.statusText}>{statusConfig.label}</Text>
            </View>
            
            <Text style={styles.statusDescription}>{statusConfig.description}</Text>
            
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Submitted</Text>
              <Text style={styles.infoValue}>
                {new Date(application.submitted_at).toLocaleDateString('en-CA', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </Text>
            </View>
            
            {application.assigned_fsas && application.assigned_fsas.length > 0 && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Assigned Areas</Text>
                <View style={styles.fsaContainer}>
                  {application.assigned_fsas.map((fsa, index) => (
                    <View key={index} style={styles.fsaTag}>
                      <Text style={styles.fsaText}>{fsa}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}
            
            {application.status === 'approved' && (
              <Pressable style={styles.continueButton} role="button">
                <Text style={styles.continueButtonText}>Continue Onboarding</Text>
                <Ionicons name="arrow-forward" size={20} color={colors.white} />
              </Pressable>
            )}
          </View>
        )}
        
        <Pressable
          style={styles.applyLink}
          onPress={() => router.push('/(public)/apply')}
          role="button"
        >
          <Text style={styles.applyLinkText}>Don't have an application? Apply now</Text>
          <Ionicons name="arrow-forward" size={16} color={colors.primary} />
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    padding: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.secondary,
    marginTop: 16,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  searchBox: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  input: {
    flex: 1,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: colors.text,
  },
  searchButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.error + '10',
    padding: 12,
    borderRadius: 8,
    gap: 8,
    marginBottom: 16,
  },
  errorText: {
    color: colors.error,
    fontSize: 14,
  },
  resultCard: {
    backgroundColor: colors.white,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 24,
  },
  statusBadge: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  businessName: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.secondary,
    marginBottom: 12,
  },
  statusPill: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 16,
  },
  statusText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '600',
  },
  statusDescription: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  infoRow: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  infoLabel: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text,
  },
  fsaContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  fsaTag: {
    backgroundColor: colors.teal[50],
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  fsaText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
  },
  continueButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    gap: 8,
    marginTop: 16,
    width: '100%',
  },
  continueButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.white,
  },
  applyLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
  },
  applyLinkText: {
    fontSize: 14,
    color: colors.primary,
  },
});
