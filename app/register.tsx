/*

Lines 9 - 562 written by Nate Gibson and John Henson

New reformat for registration screen sisnce it looked bad. 

Now adds job types: Law Enforcement, Healthcare Providers, and Social Services. 
*/

import React, { useState } from 'react';
import {
  View, Text, TextInput, Pressable, StyleSheet, ActivityIndicator,
  KeyboardAvoidingView, Platform, ScrollView, Image,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '@/lib/auth-context';
import Colors from '@/constants/colors';

const logoImage = require('@/assets/images/logo.png');

const USER_TYPE_OPTIONS = [
  { value: 'law_enforcement', label: 'Law Enforcement', icon: 'shield-checkmark' as const },
  { value: 'nurse', label: 'Healthcare Providers', icon: 'medkit' as const },
  { value: 'cps', label: 'Social Services', icon: 'people' as const },
];

const OCCUPATIONS: Record<string, string[]> = {
  law_enforcement: ['Officer / Deputy', 'Detective / Investigator', 'Command Staff', 'Analyst', 'Professional Staff', 'Researcher', 'Trainer / Academy Instructor', 'Evidence Technician', 'Crime Scene Technician', 'K-9 Handler', 'School Resource Officer (SRO)', 'Community Liaison / Resource Officer', 'Dispatcher / Communications', 'Chaplain', 'Legal Advisor / General Counsel', 'Other'],
  nurse: ['Registered Nurse', 'Nurse Practitioner', 'SANE/FNE Nurse', 'Emergency Nurse', 'Physician', 'OB-GYN', 'Midwife', 'Paramedic', 'EMT', 'Clinical Psychologist', 'Psychiatrist', 'Urologist', 'Hospital Social Worker', 'Other'],
  cps: ['CPS Investigator', 'APS Investigator', 'Case Manager', 'Supervisor', 'Intake Specialist', 'Other'],
};

const states = [
  "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA",
  "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD",
  "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ",
  "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC",
  "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY"
];

export default function RegisterScreen() {
  const insets = useSafeAreaInsets();
  const { register } = useAuth();
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    role: '',
    occupation: '',
    department: '',
    city: '',
    state: '',
    password: '',
    confirmPassword: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [showOccupationPicker, setShowOccupationPicker] = useState(false);

  const updateField = (key: string, value: string) => {
    setForm(prev => ({ ...prev, [key]: value }));
  };

  const [showStatePicker, setShowStatePicker] = useState(false);
  const currentOccupations = form.role ? (OCCUPATIONS[form.role] || []) : [];

  const handleRegister = async () => {
    const { firstName, lastName, email, phone, role, occupation, department, city, state, password, confirmPassword } = form;

    if (!firstName || !lastName || !email || !phone || !role || !occupation || !department || !city || !state || !password) {
      setError('Please fill in all fields');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setError('');
    setSubmitting(true);

    const result = await register({
      firstName,
      lastName,
      email: email.trim(),
      phone,
      occupation,
      department,
      city,
      state,
      password,
      role,
    });

    if (result.success && result.userId) {
      router.replace({ pathname: '/verify', params: { userId: result.userId } });
    } else {
      setError(result.message || 'Registration failed');
    }

    setSubmitting(false);
  };

  const webTopInset = Platform.OS === 'web' ? 67 : 0;

  return (
    <LinearGradient
      colors={['#1B4965', '#142F42']}
      style={styles.outerContainer}
    >
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            { paddingTop: insets.top + webTopInset + 20, paddingBottom: Platform.OS === 'web' ? 34 : insets.bottom + 24 },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.headerRow}>
            <Pressable onPress={() => router.back()} style={styles.backBtn}>
              <Ionicons name="arrow-back" size={22} color="white" />
            </Pressable>
            <View style={styles.headerCenter}>
              <Image source={logoImage} style={styles.logoImage} resizeMode="contain" />
              <Text style={styles.appName}>Project Red Light</Text>
            </View>
            <View style={{ width: 40 }} />
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Request Access</Text>
            <Text style={styles.cardSubtitle}>Fill in your details to request approval</Text>

            {error ? (
              <View style={styles.errorContainer}>
                <Ionicons name="alert-circle" size={15} color="#DC3545" />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            <View style={styles.row}>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.label}>First Name</Text>
                <TextInput
                  style={styles.input}
                  placeholder="First name"
                  placeholderTextColor="#ADB5BD"
                  value={form.firstName}
                  onChangeText={(v) => updateField('firstName', v)}
                />
              </View>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.label}>Last Name</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Last name"
                  placeholderTextColor="#ADB5BD"
                  value={form.lastName}
                  onChangeText={(v) => updateField('lastName', v)}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                style={styles.input}
                placeholder="your.email@department.gov"
                placeholderTextColor="#ADB5BD"
                value={form.email}
                onChangeText={(v) => updateField('email', v)}
                autoCapitalize="none"
                keyboardType="email-address"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Phone Number</Text>
              <TextInput
                style={styles.input}
                placeholder="(555) 555-5555"
                placeholderTextColor="#ADB5BD"
                value={form.phone}
                onChangeText={(v) => updateField('phone', v)}
                keyboardType="phone-pad"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>I am a...</Text>
              <View style={styles.roleOptions}>
                {USER_TYPE_OPTIONS.map(option => (
                  <Pressable
                    key={option.value}
                    style={[styles.roleOption, form.role === option.value && styles.roleOptionActive]}
                    onPress={() => {
                      updateField('role', option.value);
                      updateField('occupation', '');
                      setShowOccupationPicker(false);
                    }}
                  >
                    <Ionicons
                      name={option.icon}
                      size={20}
                      color={form.role === option.value ? 'white' : Colors.light.tint}
                    />
                    <Text style={[styles.roleOptionText, form.role === option.value && styles.roleOptionTextActive]}>
                      {option.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            {form.role ? (
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Occupation</Text>
                <Pressable
                  style={styles.selectBtn}
                  onPress={() => setShowOccupationPicker(!showOccupationPicker)}
                >
                  <Text style={[styles.selectText, !form.occupation && styles.placeholder]}>
                    {form.occupation || 'Select occupation'}
                  </Text>
                  <Ionicons name={showOccupationPicker ? "chevron-up" : "chevron-down"} size={17} color="#ADB5BD" />
                </Pressable>
                {showOccupationPicker && (
                  <View style={styles.pickerDropdown}>
                    {currentOccupations.map(occ => (
                      <Pressable
                        key={occ}
                        style={[styles.pickerItem, form.occupation === occ && styles.pickerItemActive]}
                        onPress={() => {
                          updateField('occupation', occ);
                          setShowOccupationPicker(false);
                        }}
                      >
                        <Text style={[styles.pickerItemText, form.occupation === occ && styles.pickerItemTextActive]}>
                          {occ}
                        </Text>
                        {form.occupation === occ && (
                          <Ionicons name="checkmark" size={15} color={Colors.light.tint} />
                        )}
                      </Pressable>
                    ))}
                  </View>
                )}
              </View>
            ) : null}

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Department / Agency</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Campbell County Sheriff"
                placeholderTextColor="#ADB5BD"
                value={form.department}
                onChangeText={(v) => updateField('department', v)}
              />
            </View>
            <View style={styles.row}>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.label}>City</Text>
                <TextInput
                  style={styles.input}
                  placeholder="eg. New York City"
                  placeholderTextColor="#ADB5BD"
                  value={form.city}
                  onChangeText={(v) => updateField('city', v)}
                />
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>State</Text>

                <Pressable
                  style={styles.selectBtn}
                  onPress={() => setShowStatePicker(!showStatePicker)}
                >
                  <Text style={[styles.selectText, !form.state && styles.placeholder]}>
                    {form.state || 'Select state'}
                  </Text>

                  <Ionicons
                    name={showStatePicker ? "chevron-up" : "chevron-down"}
                    size={17}
                    color="#ADB5BD"
                  />
                </Pressable>

                {showStatePicker && (
                  <View style={styles.pickerDropdown}>
                    {states.map((st) => (
                      <Pressable
                        key={st}
                        style={[
                          styles.pickerItem,
                          form.state === st && styles.pickerItemActive
                        ]}
                        onPress={() => {
                          updateField('state', st);
                          setShowStatePicker(false);
                        }}
                      >
                        <Text
                          style={[
                            styles.pickerItemText,
                            form.state === st && styles.pickerItemTextActive
                          ]}
                        >
                          {st}
                        </Text>

                        {form.state === st && (
                          <Ionicons
                            name="checkmark"
                            size={15}
                            color={Colors.light.tint}
                          />
                        )}
                      </Pressable>
                    ))}
                  </View>
                )}
              </View>
            </View>

            <View style={styles.sectionDivider}>
              <View style={styles.sectionDividerLine} />
              <Text style={styles.sectionDividerLabel}>Create Password</Text>
              <View style={styles.sectionDividerLine} />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Password</Text>
              <TextInput
                style={styles.input}
                placeholder="At least 6 characters"
                placeholderTextColor="#ADB5BD"
                value={form.password}
                onChangeText={(v) => updateField('password', v)}
                secureTextEntry
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Confirm Password</Text>
              <TextInput
                style={styles.input}
                placeholder="Confirm your password"
                placeholderTextColor="#ADB5BD"
                value={form.confirmPassword}
                onChangeText={(v) => updateField('confirmPassword', v)}
                secureTextEntry
              />
            </View>

            <Pressable
              style={({ pressed }) => [styles.submitButton, pressed && styles.submitButtonPressed, submitting && styles.submitButtonDisabled]}
              onPress={handleRegister}
              disabled={submitting}
            >
              <LinearGradient
                colors={['#4A90C4', '#3A7AB0']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.submitButtonGradient}
              >
                {submitting ? (
                  <ActivityIndicator color="white" size="small" />
                ) : (
                  <Text style={styles.submitButtonText}>Submit Request</Text>
                )}
              </LinearGradient>
            </Pressable>

            <View style={styles.signInRow}>
              <Text style={styles.signInLabel}>Already have an account?</Text>
              <Pressable onPress={() => router.replace('/')}>
                <Text style={styles.signInLink}>Sign In</Text>
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  outerContainer: { flex: 1 },
  scrollContent: { flexGrow: 1, paddingHorizontal: 20 },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  backBtn: {
    width: 40, height: 40,
    justifyContent: 'center', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
  },
  logoImage: { width: 34, height: 34 },
  appName: {
    fontFamily: 'Inter_700Bold',
    fontSize: 16,
    color: 'white',
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 24,
    elevation: 12,
  },
  cardTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 22,
    color: '#1B4965',
    marginBottom: 4,
  },
  cardSubtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    color: '#6C757D',
    marginBottom: 22,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF5F5',
    borderWidth: 1,
    borderColor: '#FECDD3',
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
    gap: 8,
  },
  errorText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: '#DC3545',
    flex: 1,
  },
  row: { flexDirection: 'row', gap: 10 },
  inputGroup: { marginBottom: 14 },
  label: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
    color: '#343A40',
    marginBottom: 6,
  },
  input: {
    backgroundColor: 'white',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#DEE2E6',
    padding: 12,
    fontFamily: 'Inter_400Regular',
    fontSize: 15,
    color: '#212529',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#DEE2E6',
  },
  inputWrapperFocused: {
    borderColor: '#4A90C4',
    shadowColor: '#4A90C4',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 2,
  },
  inputFocused: {
    borderColor: '#4A90C4',
    shadowColor: '#4A90C4',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 2,
  },
  roleOptions: {
    flexDirection: 'row',
    gap: 8,
  },
  roleOption: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8F9FA',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 6,
    gap: 5,
    borderWidth: 1.5,
    borderColor: '#DEE2E6',
  },
  roleOptionActive: {
    backgroundColor: Colors.light.tint,
    borderColor: Colors.light.tint,
  },
  roleOptionText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 10,
    color: '#495057',
    textAlign: 'center',
  },
  roleOptionTextActive: {
    color: 'white',
    fontFamily: 'Inter_600SemiBold',
  },
  selectBtn: {
    backgroundColor: 'white',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#DEE2E6',
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  selectText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 15,
    color: '#212529',
  },
  placeholder: { color: '#ADB5BD' },
  pickerDropdown: {
    backgroundColor: 'white',
    borderRadius: 10,
    marginTop: 4,
    borderWidth: 1,
    borderColor: '#DEE2E6',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 6,
    overflow: 'hidden',
  },
  pickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 13,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F2F5',
  },
  pickerItemActive: { backgroundColor: '#F0F7FF' },
  pickerItemText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    color: '#212529',
  },
  pickerItemTextActive: {
    color: Colors.light.tint,
    fontFamily: 'Inter_600SemiBold',
  },
  sectionDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
    marginTop: 2,
  },
  sectionDividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E9ECEF',
  },
  sectionDividerLabel: {
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
    color: '#ADB5BD',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  submitButton: {
    borderRadius: 10,
    overflow: 'hidden',
    marginTop: 8,
  },
  submitButtonGradient: {
    paddingVertical: 15,
    alignItems: 'center',
  },
  submitButtonPressed: { opacity: 0.92, transform: [{ scale: 0.98 }] },
  submitButtonDisabled: { opacity: 0.7 },
  submitButtonText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 16,
    color: 'white',
  },
  signInRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 18,
    gap: 5,
  },
  signInLabel: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    color: '#6C757D',
  },
  signInLink: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
    color: '#4A90C4',
  },
});
