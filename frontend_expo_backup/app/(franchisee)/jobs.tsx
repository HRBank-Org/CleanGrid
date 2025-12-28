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
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import Button from '../../components/Button';
import { colors } from '../../utils/colors';
import api from '../../services/api';

interface Job {
  _id: string;
  address: string;
  scheduledDate: string;
  status: string;
  totalPrice: number;
  serviceType: string;
  squareFeet: number;
}

export default function FranchiseeJobs() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);

  const loadJobs = async () => {
    try {
      const response = await api.get('/api/bookings');
      setJobs(response.data);
    } catch (error) {
      Alert.alert('Error', 'Failed to load jobs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadJobs();
  }, []);

  const updateJobStatus = async (jobId: string, status: string) => {
    try {
      await api.patch(`/api/bookings/${jobId}/status`, { status });
      Alert.alert('Success', `Job marked as ${status}`);
      loadJobs();
    } catch (error) {
      Alert.alert('Error', 'Failed to update job status');
    }
  };

  const handleStartJob = (jobId: string) => {
    updateJobStatus(jobId, 'in-progress');
  };

  const handleCompleteJob = (jobId: string) => {
    Alert.alert(
      'Complete Job',
      'Mark this job as completed? Payment will be released from escrow.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Complete',
          onPress: () => updateJobStatus(jobId, 'completed'),
        },
      ]
    );
  };

  const activeJobs = jobs.filter((j) =>
    ['assigned', 'in-progress'].includes(j.status)
  );
  const completedJobs = jobs.filter((j) => j.status === 'completed');

  const renderJobCard = (job: Job, showActions: boolean) => (
    <View key={job._id} style={styles.jobCard}>
      <View style={styles.jobHeader}>
        <View
          style={[
            styles.statusBadge,
            {
              backgroundColor:
                job.status === 'completed'
                  ? `${colors.success}15`
                  : job.status === 'in-progress'
                  ? `${colors.secondary}15`
                  : `${colors.warning}15`,
            },
          ]}
        >
          <Text
            style={[
              styles.statusText,
              {
                color:
                  job.status === 'completed'
                    ? colors.success
                    : job.status === 'in-progress'
                    ? colors.secondary
                    : colors.warning,
              },
            ]}
          >
            {job.status.charAt(0).toUpperCase() + job.status.slice(1)}
          </Text>
        </View>
        <Text style={styles.jobPrice}>${job.totalPrice}</Text>
      </View>

      <View style={styles.jobInfo}>
        <View style={styles.jobInfoRow}>
          <Ionicons name="location" size={16} color={colors.textSecondary} />
          <Text style={styles.jobInfoText}>{job.address}</Text>
        </View>

        <View style={styles.jobInfoRow}>
          <Ionicons name="calendar" size={16} color={colors.textSecondary} />
          <Text style={styles.jobInfoText}>
            {format(new Date(job.scheduledDate), 'MMM dd, yyyy')}
          </Text>
        </View>

        <View style={styles.jobInfoRow}>
          <Ionicons name="home" size={16} color={colors.textSecondary} />
          <Text style={styles.jobInfoText}>
            {job.serviceType} • {job.squareFeet} sq ft
          </Text>
        </View>
      </View>

      {showActions && (
        <View style={styles.jobActions}>
          {job.status === 'assigned' && (
            <Button
              title="Start Job"
              onPress={() => handleStartJob(job._id)}
              variant="primary"
            />
          )}
          {job.status === 'in-progress' && (
            <Button
              title="Mark Complete"
              onPress={() => handleCompleteJob(job._id)}
              variant="primary"
            />
          )}
        </View>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={loadJobs} />
        }
      >
        <Text style={styles.title}>My Jobs</Text>

        {jobs.length === 0 && !loading ? (
          <View style={styles.emptyState}>
            <Ionicons name="briefcase-outline" size={64} color={colors.gray[300]} />
            <Text style={styles.emptyText}>No jobs assigned yet</Text>
            <Text style={styles.emptySubtext}>
              Jobs will appear here once you're assigned FSA codes
            </Text>
          </View>
        ) : (
          <>
            {activeJobs.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Active Jobs ({activeJobs.length})</Text>
                {activeJobs.map((job) => renderJobCard(job, true))}
              </View>
            )}

            {completedJobs.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Completed</Text>
                {completedJobs.map((job) => renderJobCard(job, false))}
              </View>
            )}
          </>
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
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 12,
  },
  jobCard: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  jobHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  jobPrice: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.primary,
  },
  jobInfo: {
    marginBottom: 16,
  },
  jobInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  jobInfoText: {
    fontSize: 14,
    color: colors.textSecondary,
    marginLeft: 8,
  },
  jobActions: {
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
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
});