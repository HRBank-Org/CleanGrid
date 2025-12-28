import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../utils/colors';
import api from '../../services/api';

// Form steps
const STEPS = [
  { id: 1, title: 'Business Info', icon: 'business-outline' },
  { id: 2, title: 'Contact', icon: 'person-outline' },
  { id: 3, title: 'Preferences', icon: 'location-outline' },
  { id: 4, title: 'Agreements', icon: 'document-text-outline' },
];

// Canadian provinces
const PROVINCES = [
  { code: 'ON', name: 'Ontario' },
  { code: 'BC', name: 'British Columbia' },
  { code: 'AB', name: 'Alberta' },
  { code: 'QC', name: 'Quebec' },
  { code: 'MB', name: 'Manitoba' },
  { code: 'SK', name: 'Saskatchewan' },
  { code: 'NS', name: 'Nova Scotia' },
  { code: 'NB', name: 'New Brunswick' },
  { code: 'NL', name: 'Newfoundland and Labrador' },
  { code: 'PE', name: 'Prince Edward Island' },
];

export default function FranchiseeApplicationScreen() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [applicationId, setApplicationId] = useState('');
  
  // Form data
  const [formData, setFormData] = useState({
    // Step 1: Business Info
    legalName: '',
    legalType: 'individual', // individual or corporation
    operatingName: '',
    businessNumber: '',
    
    // Step 2: Contact
    contactName: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    province: 'ON',
    postalCode: '',
    
    // Step 3: Preferences
    preferredFSAs: '',
    vehicleAccess: false,
    experience: '',
    
    // Step 4: Agreements
    agreesToHRBank: false,
    agreesToInsuranceMinimums: false,
    agreesToTerms: false,
  });
  
  const updateField = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when field is updated
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };
  
  const validateStep = (step: number): boolean => {
    const newErrors: Record<string, string> = {};
    
    if (step === 1) {
      if (!formData.legalName.trim()) newErrors.legalName = 'Legal name is required';
      if (!formData.operatingName.trim()) newErrors.operatingName = 'Operating name is required';
    }
    
    if (step === 2) {
      if (!formData.contactName.trim()) newErrors.contactName = 'Contact name is required';
      if (!formData.email.trim()) newErrors.email = 'Email is required';
      else if (!/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = 'Invalid email format';
      if (!formData.phone.trim()) newErrors.phone = 'Phone is required';
      if (!formData.address.trim()) newErrors.address = 'Address is required';
      if (!formData.city.trim()) newErrors.city = 'City is required';
      if (!formData.postalCode.trim()) newErrors.postalCode = 'Postal code is required';
    }
    
    if (step === 4) {
      if (!formData.agreesToHRBank) newErrors.agreesToHRBank = 'You must agree to use HR Bank';
      if (!formData.agreesToInsuranceMinimums) newErrors.agreesToInsuranceMinimums = 'You must agree to insurance requirements';
      if (!formData.agreesToTerms) newErrors.agreesToTerms = 'You must agree to terms';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, 4));
    }
  };
  
  const handleBack = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };
  
  const handleSubmit = async () => {
    if (!validateStep(4)) return;
    
    setLoading(true);
    try {
      const payload = {
        legalName: formData.legalName,
        legalType: formData.legalType,
        operatingName: formData.operatingName,
        businessNumber: formData.businessNumber || undefined,
        contactName: formData.contactName,
        email: formData.email,
        phone: formData.phone,
        address: formData.address,
        city: formData.city,
        province: formData.province,
        postalCode: formData.postalCode.toUpperCase().replace(/\s/g, ''),
        preferredFSAs: formData.preferredFSAs
          ? formData.preferredFSAs.split(',').map(s => s.trim().toUpperCase())
          : [],
        vehicleAccess: formData.vehicleAccess,
        experience: formData.experience || undefined,
        agreesToHRBank: formData.agreesToHRBank,
        agreesToInsuranceMinimums: formData.agreesToInsuranceMinimums,
      };
      
      const response = await api.post('/api/franchisee/apply', payload);
      
      if (response.data.success) {
        setApplicationId(response.data.data.application_id);
        setSubmitted(true);
      }
    } catch (error: any) {
      const message = error.response?.data?.detail || 'Failed to submit application';
      if (Platform.OS === 'web') {
        window.alert('Error: ' + message);
      }
    } finally {
      setLoading(false);
    }
  };
  
  // Render success screen
  if (submitted) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.successContainer}>
          <View style={styles.successIcon}>
            <Ionicons name="checkmark-circle" size={80} color={colors.primary} />
          </View>
          <Text style={styles.successTitle}>Application Submitted!</Text>
          <Text style={styles.successMessage}>
            Thank you for your interest in becoming a CleanGrid franchisee.
            We'll review your application and contact you within 5 business days.
          </Text>
          
          <View style={styles.applicationIdBox}>
            <Text style={styles.applicationIdLabel}>Application ID</Text>
            <Text style={styles.applicationIdValue}>{applicationId}</Text>
            <Text style={styles.applicationIdHint}>
              Save this ID to check your application status
            </Text>
          </View>
          
          <Pressable
            style={styles.checkStatusButton}
            onPress={() => router.push({
              pathname: '/(public)/application-status',
              params: { id: applicationId }
            })}
            role="button"
          >
            <Ionicons name="search" size={20} color={colors.white} />
            <Text style={styles.checkStatusText}>Check Status</Text>
          </Pressable>
          
          <Pressable
            style={styles.homeButton}
            onPress={() => router.push('/')}
            role="button"
          >
            <Text style={styles.homeButtonText}>Back to Home</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }
  
  // Render form
  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        {/* Progress Steps */}
        <View style={styles.stepsContainer}>
          {STEPS.map((step, index) => (
            <React.Fragment key={step.id}>
              <Pressable
                style={[
                  styles.step,
                  currentStep >= step.id && styles.stepActive,
                  currentStep === step.id && styles.stepCurrent,
                ]}
                onPress={() => {
                  if (step.id < currentStep) setCurrentStep(step.id);
                }}
                role="button"
              >
                <Ionicons
                  name={step.icon as any}
                  size={20}
                  color={currentStep >= step.id ? colors.white : colors.gray[400]}
                />
                <Text
                  style={[
                    styles.stepText,
                    currentStep >= step.id && styles.stepTextActive,
                  ]}
                  numberOfLines={1}
                >
                  {step.title}
                </Text>
              </Pressable>
              {index < STEPS.length - 1 && (
                <View
                  style={[
                    styles.stepConnector,
                    currentStep > step.id && styles.stepConnectorActive,
                  ]}
                />
              )}
            </React.Fragment>
          ))}
        </View>
        
        <ScrollView style={styles.formContainer} showsVerticalScrollIndicator={false}>
          {/* Step 1: Business Info */}
          {currentStep === 1 && (
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>Business Information</Text>
              <Text style={styles.stepSubtitle}>
                Tell us about your business entity
              </Text>
              
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Legal Entity Type *</Text>
                <View style={styles.radioGroup}>
                  <Pressable
                    style={[
                      styles.radioOption,
                      formData.legalType === 'individual' && styles.radioOptionSelected,
                    ]}
                    onPress={() => updateField('legalType', 'individual')}
                    role="button"
                  >
                    <View style={[
                      styles.radioCircle,
                      formData.legalType === 'individual' && styles.radioCircleSelected,
                    ]}>
                      {formData.legalType === 'individual' && (
                        <View style={styles.radioInner} />
                      )}
                    </View>
                    <Text style={styles.radioText}>Individual / Sole Proprietor</Text>
                  </Pressable>
                  
                  <Pressable
                    style={[
                      styles.radioOption,
                      formData.legalType === 'corporation' && styles.radioOptionSelected,
                    ]}
                    onPress={() => updateField('legalType', 'corporation')}
                    role="button"
                  >
                    <View style={[
                      styles.radioCircle,
                      formData.legalType === 'corporation' && styles.radioCircleSelected,
                    ]}>
                      {formData.legalType === 'corporation' && (
                        <View style={styles.radioInner} />
                      )}
                    </View>
                    <Text style={styles.radioText}>Corporation</Text>
                  </Pressable>
                </View>
              </View>
              
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Legal Name *</Text>
                <TextInput
                  style={[styles.input, errors.legalName && styles.inputError]}
                  value={formData.legalName}
                  onChangeText={(v) => updateField('legalName', v)}
                  placeholder={formData.legalType === 'corporation' ? 'Corporation legal name' : 'Your full legal name'}
                  placeholderTextColor={colors.gray[400]}
                />
                {errors.legalName && <Text style={styles.errorText}>{errors.legalName}</Text>}
              </View>
              
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Operating Name (DBA) *</Text>
                <TextInput
                  style={[styles.input, errors.operatingName && styles.inputError]}
                  value={formData.operatingName}
                  onChangeText={(v) => updateField('operatingName', v)}
                  placeholder="Your business trading name"
                  placeholderTextColor={colors.gray[400]}
                />
                {errors.operatingName && <Text style={styles.errorText}>{errors.operatingName}</Text>}
              </View>
              
              {formData.legalType === 'corporation' && (
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Business Number (BN)</Text>
                  <TextInput
                    style={styles.input}
                    value={formData.businessNumber}
                    onChangeText={(v) => updateField('businessNumber', v)}
                    placeholder="123456789 RC0001"
                    placeholderTextColor={colors.gray[400]}
                  />
                </View>
              )}
            </View>
          )}
          
          {/* Step 2: Contact Info */}
          {currentStep === 2 && (
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>Contact Information</Text>
              <Text style={styles.stepSubtitle}>
                How can we reach you?
              </Text>
              
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Contact Name *</Text>
                <TextInput
                  style={[styles.input, errors.contactName && styles.inputError]}
                  value={formData.contactName}
                  onChangeText={(v) => updateField('contactName', v)}
                  placeholder="Primary contact person"
                  placeholderTextColor={colors.gray[400]}
                />
                {errors.contactName && <Text style={styles.errorText}>{errors.contactName}</Text>}
              </View>
              
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Email *</Text>
                <TextInput
                  style={[styles.input, errors.email && styles.inputError]}
                  value={formData.email}
                  onChangeText={(v) => updateField('email', v)}
                  placeholder="email@example.com"
                  placeholderTextColor={colors.gray[400]}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
                {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}
              </View>
              
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Phone *</Text>
                <TextInput
                  style={[styles.input, errors.phone && styles.inputError]}
                  value={formData.phone}
                  onChangeText={(v) => updateField('phone', v)}
                  placeholder="(416) 555-1234"
                  placeholderTextColor={colors.gray[400]}
                  keyboardType="phone-pad"
                />
                {errors.phone && <Text style={styles.errorText}>{errors.phone}</Text>}
              </View>
              
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Street Address *</Text>
                <TextInput
                  style={[styles.input, errors.address && styles.inputError]}
                  value={formData.address}
                  onChangeText={(v) => updateField('address', v)}
                  placeholder="123 Main Street, Suite 100"
                  placeholderTextColor={colors.gray[400]}
                />
                {errors.address && <Text style={styles.errorText}>{errors.address}</Text>}
              </View>
              
              <View style={styles.row}>
                <View style={[styles.inputGroup, { flex: 2, marginRight: 12 }]}>
                  <Text style={styles.label}>City *</Text>
                  <TextInput
                    style={[styles.input, errors.city && styles.inputError]}
                    value={formData.city}
                    onChangeText={(v) => updateField('city', v)}
                    placeholder="Toronto"
                    placeholderTextColor={colors.gray[400]}
                  />
                  {errors.city && <Text style={styles.errorText}>{errors.city}</Text>}
                </View>
                
                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={styles.label}>Province *</Text>
                  <View style={styles.selectContainer}>
                    <Pressable
                      style={styles.select}
                      role="button"
                    >
                      <Text style={styles.selectText}>
                        {PROVINCES.find(p => p.code === formData.province)?.code || 'ON'}
                      </Text>
                      <Ionicons name="chevron-down" size={16} color={colors.gray[500]} />
                    </Pressable>
                  </View>
                </View>
              </View>
              
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Postal Code *</Text>
                <TextInput
                  style={[styles.input, errors.postalCode && styles.inputError, { maxWidth: 150 }]}
                  value={formData.postalCode}
                  onChangeText={(v) => updateField('postalCode', v.toUpperCase())}
                  placeholder="M5V 1A1"
                  placeholderTextColor={colors.gray[400]}
                  autoCapitalize="characters"
                  maxLength={7}
                />
                {errors.postalCode && <Text style={styles.errorText}>{errors.postalCode}</Text>}
              </View>
            </View>
          )}
          
          {/* Step 3: Preferences */}
          {currentStep === 3 && (
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>Service Preferences</Text>
              <Text style={styles.stepSubtitle}>
                Tell us about your service area and capabilities
              </Text>
              
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Preferred Service Areas (FSA Codes)</Text>
                <TextInput
                  style={styles.input}
                  value={formData.preferredFSAs}
                  onChangeText={(v) => updateField('preferredFSAs', v.toUpperCase())}
                  placeholder="M5V, M5H, M5G (comma separated)"
                  placeholderTextColor={colors.gray[400]}
                  autoCapitalize="characters"
                />
                <Text style={styles.hint}>
                  Enter FSA codes (first 3 characters of postal codes) where you'd like to operate
                </Text>
              </View>
              
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Do you have access to a vehicle?</Text>
                <Pressable
                  style={[
                    styles.checkbox,
                    formData.vehicleAccess && styles.checkboxChecked,
                  ]}
                  onPress={() => updateField('vehicleAccess', !formData.vehicleAccess)}
                  role="button"
                >
                  {formData.vehicleAccess && (
                    <Ionicons name="checkmark" size={18} color={colors.white} />
                  )}
                </Pressable>
                <Text style={styles.checkboxLabel}>
                  Yes, I have access to a vehicle for transporting equipment and supplies
                </Text>
              </View>
              
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Relevant Experience</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={formData.experience}
                  onChangeText={(v) => updateField('experience', v)}
                  placeholder="Describe your experience in cleaning services, property management, or related fields..."
                  placeholderTextColor={colors.gray[400]}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                />
              </View>
            </View>
          )}
          
          {/* Step 4: Agreements */}
          {currentStep === 4 && (
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>Agreements</Text>
              <Text style={styles.stepSubtitle}>
                Please review and accept the following requirements
              </Text>
              
              <View style={styles.agreementCard}>
                <View style={styles.agreementHeader}>
                  <Ionicons name="people" size={24} color={colors.primary} />
                  <Text style={styles.agreementTitle}>HR Bank Workforce Management</Text>
                </View>
                <Text style={styles.agreementText}>
                  I agree to use HR Bank for workforce scheduling and task management.
                  CleanGrid generates work orders that are routed to HR Bank for assignment
                  to my workforce.
                </Text>
                <Pressable
                  style={styles.agreementCheck}
                  onPress={() => updateField('agreesToHRBank', !formData.agreesToHRBank)}
                  role="button"
                >
                  <View style={[
                    styles.checkbox,
                    formData.agreesToHRBank && styles.checkboxChecked,
                    errors.agreesToHRBank && styles.checkboxError,
                  ]}>
                    {formData.agreesToHRBank && (
                      <Ionicons name="checkmark" size={18} color={colors.white} />
                    )}
                  </View>
                  <Text style={styles.agreementCheckText}>I agree to use HR Bank *</Text>
                </Pressable>
              </View>
              
              <View style={styles.agreementCard}>
                <View style={styles.agreementHeader}>
                  <Ionicons name="shield-checkmark" size={24} color={colors.primary} />
                  <Text style={styles.agreementTitle}>Insurance Requirements</Text>
                </View>
                <Text style={styles.agreementText}>
                  I agree to maintain the following insurance coverage:
                </Text>
                <View style={styles.insuranceList}>
                  <Text style={styles.insuranceItem}>• Commercial General Liability: $2,000,000 minimum</Text>
                  <Text style={styles.insuranceItem}>• Commercial Auto Insurance (if using vehicle)</Text>
                  <Text style={styles.insuranceItem}>• WSIB coverage (where applicable)</Text>
                </View>
                <Pressable
                  style={styles.agreementCheck}
                  onPress={() => updateField('agreesToInsuranceMinimums', !formData.agreesToInsuranceMinimums)}
                  role="button"
                >
                  <View style={[
                    styles.checkbox,
                    formData.agreesToInsuranceMinimums && styles.checkboxChecked,
                    errors.agreesToInsuranceMinimums && styles.checkboxError,
                  ]}>
                    {formData.agreesToInsuranceMinimums && (
                      <Ionicons name="checkmark" size={18} color={colors.white} />
                    )}
                  </View>
                  <Text style={styles.agreementCheckText}>I agree to insurance requirements *</Text>
                </Pressable>
              </View>
              
              <View style={styles.agreementCard}>
                <View style={styles.agreementHeader}>
                  <Ionicons name="document-text" size={24} color={colors.primary} />
                  <Text style={styles.agreementTitle}>Terms & Conditions</Text>
                </View>
                <Text style={styles.agreementText}>
                  I have read and agree to the CleanGrid Franchisee Terms and Conditions,
                  including the per-job platform fee structure and settlement policies.
                </Text>
                <Pressable
                  style={styles.agreementCheck}
                  onPress={() => updateField('agreesToTerms', !formData.agreesToTerms)}
                  role="button"
                >
                  <View style={[
                    styles.checkbox,
                    formData.agreesToTerms && styles.checkboxChecked,
                    errors.agreesToTerms && styles.checkboxError,
                  ]}>
                    {formData.agreesToTerms && (
                      <Ionicons name="checkmark" size={18} color={colors.white} />
                    )}
                  </View>
                  <Text style={styles.agreementCheckText}>I agree to the terms *</Text>
                </Pressable>
              </View>
              
              <View style={styles.feeNotice}>
                <Ionicons name="information-circle" size={20} color={colors.info} />
                <Text style={styles.feeNoticeText}>
                  There is no application fee. You will only be charged after approval
                  if training or background checks are required.
                </Text>
              </View>
            </View>
          )}
          
          <View style={{ height: 100 }} />
        </ScrollView>
        
        {/* Navigation Buttons */}
        <View style={styles.buttonContainer}>
          {currentStep > 1 && (
            <Pressable
              style={styles.backButton}
              onPress={handleBack}
              role="button"
            >
              <Ionicons name="arrow-back" size={20} color={colors.secondary} />
              <Text style={styles.backButtonText}>Back</Text>
            </Pressable>
          )}
          
          {currentStep < 4 ? (
            <Pressable
              style={[styles.nextButton, currentStep === 1 && { flex: 1 }]}
              onPress={handleNext}
              role="button"
            >
              <Text style={styles.nextButtonText}>Continue</Text>
              <Ionicons name="arrow-forward" size={20} color={colors.white} />
            </Pressable>
          ) : (
            <Pressable
              style={[styles.submitButton, loading && styles.buttonDisabled]}
              onPress={handleSubmit}
              disabled={loading}
              role="button"
            >
              {loading ? (
                <ActivityIndicator color={colors.white} />
              ) : (
                <>
                  <Text style={styles.submitButtonText}>Submit Application</Text>
                  <Ionicons name="checkmark-circle" size={20} color={colors.white} />
                </>
              )}
            </Pressable>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  stepsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  step: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius: 8,
    backgroundColor: colors.gray[100],
  },
  stepActive: {
    backgroundColor: colors.primary,
  },
  stepCurrent: {
    backgroundColor: colors.secondary,
  },
  stepText: {
    fontSize: 10,
    color: colors.gray[500],
    marginTop: 4,
    textAlign: 'center',
  },
  stepTextActive: {
    color: colors.white,
  },
  stepConnector: {
    width: 12,
    height: 2,
    backgroundColor: colors.gray[300],
  },
  stepConnectorActive: {
    backgroundColor: colors.primary,
  },
  formContainer: {
    flex: 1,
    padding: 20,
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.secondary,
    marginBottom: 8,
  },
  stepSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 24,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  input: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: colors.text,
  },
  inputError: {
    borderColor: colors.error,
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  errorText: {
    color: colors.error,
    fontSize: 12,
    marginTop: 4,
  },
  hint: {
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: 4,
  },
  row: {
    flexDirection: 'row',
  },
  radioGroup: {
    flexDirection: 'column',
    gap: 12,
  },
  radioOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
  },
  radioOptionSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.teal[50],
  },
  radioCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: colors.gray[300],
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioCircleSelected: {
    borderColor: colors.primary,
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.primary,
  },
  radioText: {
    fontSize: 15,
    color: colors.text,
  },
  selectContainer: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
  },
  select: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  selectText: {
    fontSize: 16,
    color: colors.text,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.gray[300],
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  checkboxChecked: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  checkboxError: {
    borderColor: colors.error,
  },
  checkboxLabel: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
    marginTop: 12,
  },
  agreementCard: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  agreementHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  agreementTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.secondary,
  },
  agreementText: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: 12,
  },
  insuranceList: {
    marginBottom: 12,
  },
  insuranceItem: {
    fontSize: 13,
    color: colors.text,
    marginBottom: 4,
  },
  agreementCheck: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  agreementCheckText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text,
  },
  feeNotice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.navy[50],
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  feeNoticeText: {
    flex: 1,
    fontSize: 13,
    color: colors.secondary,
    lineHeight: 18,
  },
  buttonContainer: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: 12,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.secondary,
    gap: 8,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.secondary,
  },
  nextButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    backgroundColor: colors.primary,
    gap: 8,
  },
  nextButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.white,
  },
  submitButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    backgroundColor: colors.secondary,
    gap: 8,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.white,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  // Success screen
  successContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  successIcon: {
    marginBottom: 24,
  },
  successTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.secondary,
    marginBottom: 16,
    textAlign: 'center',
  },
  successMessage: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  applicationIdBox: {
    backgroundColor: colors.surface,
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
    marginBottom: 32,
    width: '100%',
  },
  applicationIdLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
  },
  applicationIdValue: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.secondary,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    marginBottom: 8,
  },
  applicationIdHint: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  checkStatusButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    gap: 8,
    marginBottom: 16,
    width: '100%',
  },
  checkStatusText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.white,
  },
  homeButton: {
    paddingVertical: 12,
  },
  homeButtonText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
});
