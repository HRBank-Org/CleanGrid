import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Pressable,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../utils/colors';
import { useAuthStore } from '../../stores/authStore';

export default function CustomerProfile() {
  const router = useRouter();
  const { user, logout } = useAuthStore();

  const handleLogout = async () => {
    const confirmMsg = 'Are you sure you want to logout?';
    let shouldLogout = false;
    
    if (Platform.OS === 'web') {
      shouldLogout = window.confirm(confirmMsg);
    }
    
    if (shouldLogout) {
      await logout();
      router.replace('/(auth)/welcome');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>Profile</Text>

        <View style={styles.profileCard}>
          <View style={styles.avatarContainer}>
            <Text style={styles.avatarText}>
              {user?.name?.charAt(0).toUpperCase()}
            </Text>
          </View>
          <Text style={styles.name}>{user?.name}</Text>
          <Text style={styles.email}>{user?.email}</Text>
        </View>

        <View style={styles.section}>
          <Pressable style={styles.menuItem} role="button">
            <Ionicons name="person-outline" size={24} color={colors.text} />
            <Text style={styles.menuText}>Edit Profile</Text>
            <Ionicons name="chevron-forward" size={20} color={colors.gray[400]} />
          </Pressable>

          <Pressable style={styles.menuItem} role="button">
            <Ionicons name="location-outline" size={24} color={colors.text} />
            <View style={styles.menuInfo}>
              <Text style={styles.menuText}>Address</Text>
              <Text style={styles.menuSubtext}>{user?.address}</Text>
              <Text style={styles.menuSubtext}>{user?.postalCode}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.gray[400]} />
          </Pressable>

          <Pressable style={styles.menuItem} role="button">
            <Ionicons name="call-outline" size={24} color={colors.text} />
            <View style={styles.menuInfo}>
              <Text style={styles.menuText}>Phone</Text>
              <Text style={styles.menuSubtext}>{user?.phone}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.gray[400]} />
          </Pressable>
        </View>

        <View style={styles.section}>
          <Pressable style={styles.menuItem} role="button">
            <Ionicons name="card-outline" size={24} color={colors.text} />
            <Text style={styles.menuText}>Payment Methods</Text>
            <Ionicons name="chevron-forward" size={20} color={colors.gray[400]} />
          </Pressable>

          <Pressable style={styles.menuItem} role="button">
            <Ionicons name="notifications-outline" size={24} color={colors.text} />
            <Text style={styles.menuText}>Notifications</Text>
            <Ionicons name="chevron-forward" size={20} color={colors.gray[400]} />
          </Pressable>
        </View>

        <View style={styles.section}>
          <Pressable style={styles.menuItem} role="button">
            <Ionicons name="help-circle-outline" size={24} color={colors.text} />
            <Text style={styles.menuText}>Help & Support</Text>
            <Ionicons name="chevron-forward" size={20} color={colors.gray[400]} />
          </Pressable>

          <Pressable style={styles.menuItem} role="button">
            <Ionicons name="document-text-outline" size={24} color={colors.text} />
            <Text style={styles.menuText}>Terms & Privacy</Text>
            <Ionicons name="chevron-forward" size={20} color={colors.gray[400]} />
          </Pressable>
        </View>

        {/* Logout - now uses inline handler with Pressable */}
        <Pressable style={styles.logoutButton} onPress={handleLogout} role="button">
          <Ionicons name="log-out-outline" size={24} color={colors.error} />
          <Text style={styles.logoutText}>Logout</Text>
        </Pressable>
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
  profileCard: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: colors.border,
  },
  avatarContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  avatarText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: colors.white,
  },
  name: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  email: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  section: {
    backgroundColor: colors.white,
    borderRadius: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  menuInfo: {
    flex: 1,
    marginLeft: 16,
  },
  menuText: {
    flex: 1,
    fontSize: 16,
    color: colors.text,
    marginLeft: 16,
  },
  menuSubtext: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.error,
    marginTop: 8,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.error,
    marginLeft: 8,
  },
});