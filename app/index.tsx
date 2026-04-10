/*

Lines 9 - 358 written by Nate Gibson 

Really the starting screen of the app but for the time being it is always the login screen. 

*/

import React, { useState, useEffect } from 'react';
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
import Constants from 'expo-constants';

const { databaseUrl, sessionSecret, resendApiKey, publicDomain } = Constants.expoConfig?.extra ?? {};

console.log("Database URL:", databaseUrl);
console.log("Session Secret Loaded:", !!sessionSecret);
console.log("Resend API Key Loaded:", !!resendApiKey);
console.log("Public Domain:", publicDomain);

const logoImage = require('@/assets/images/logo.png');

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const { user, isLoading, isAuthenticated, login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isLoading && isAuthenticated && user) {
      if (user.status === 'approved') {
        router.replace('/guide');
      }
    }
  }, [isLoading, isAuthenticated, user]);

  if (isLoading) {
    return (
      <LinearGradient colors={['#1B4965', '#142F42']} style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="white" />
      </LinearGradient>
    );
  }

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      setError('Please fill in all fields');
      return;
    }
    setError('');
    setSubmitting(true);
    const result = await login(email.trim(), password.trim());
    if (result.success) {
      router.replace('/guide');
    } else if (result.status === 'unverified' && result.userId) {
      router.replace({ pathname: '/verify', params: { userId: result.userId } });
    } else if (result.status === 'pending') {
      router.replace('/pending');
    } else if (result.status === 'denied') {
      setError('Your access request has been denied. Please contact an administrator.');
    } else {
      setError(result.message || 'Login failed');
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
            { paddingTop: insets.top + webTopInset + 32, paddingBottom: Platform.OS === 'web' ? 34 : insets.bottom + 24 },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.logoSection}>
            <View style={styles.logoWrapper}>
              <Image source={logoImage} style={styles.logoImage} resizeMode="contain" />
            </View>
            <Text style={styles.appName}>Project Red Light</Text>
            <Text style={styles.tagline}>Law Enforcement Reference Guide</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Sign In</Text>
            <Text style={styles.cardSubtitle}>Enter your credentials to continue</Text>

            {error ? (
              <View style={styles.errorContainer}>
                <Ionicons name="alert-circle" size={15} color="#DC3545" />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="mail-outline" size={17} color="#ADB5BD" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="your.email@department.gov"
                  placeholderTextColor="#ADB5BD"
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  autoComplete="email"
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Password</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="lock-closed-outline" size={17} color="#ADB5BD" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Enter your password"
                  placeholderTextColor="#ADB5BD"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                />
                <Pressable onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
                  <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={19} color="#ADB5BD" />
                </Pressable>
              </View>
            </View>

            <Pressable
              style={({ pressed }) => [styles.loginButton, pressed && styles.loginButtonPressed, submitting && styles.loginButtonDisabled]}
              onPress={handleLogin}
              disabled={submitting}
            >
              <LinearGradient
                colors={['#4A90C4', '#3A7AB0']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.loginButtonGradient}
              >
                {submitting ? (
                  <ActivityIndicator color="white" size="small" />
                ) : (
                  <Text style={styles.loginButtonText}>Sign In</Text>
                )}
              </LinearGradient>
            </Pressable>

            <View style={styles.divider}>
              <View style={styles.dividerLine} />
            </View>

            <View style={styles.registerRow}>
              <Text style={styles.registerLabel}>Don't have an account?</Text>
              <Pressable onPress={() => router.push('/register')}>
                <Text style={styles.registerLink}>Request Access</Text>
              </Pressable>
            </View>
          </View>

          <View style={styles.footer}>
            <Ionicons name="shield-checkmark" size={13} color="rgba(255,255,255,0.4)" />
            <Text style={styles.footerText}>Secure Law Enforcement Access</Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  outerContainer: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
  },
  logoSection: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logoWrapper: {
    marginBottom: 14,
  },
  logoImage: {
    width: 82,
    height: 82,
  },
  appName: {
    fontFamily: 'Inter_700Bold',
    fontSize: 22,
    color: 'white',
    letterSpacing: -0.3,
  },
  tagline: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: 'rgba(255,255,255,0.55)',
    marginTop: 4,
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 28,
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
    marginBottom: 24,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF5F5',
    borderWidth: 1,
    borderColor: '#FECDD3',
    borderRadius: 10,
    padding: 12,
    marginBottom: 18,
    gap: 8,
  },
  errorText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: '#DC3545',
    flex: 1,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
    color: '#343A40',
    marginBottom: 6,
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
  inputIcon: {
    paddingLeft: 14,
  },
  input: {
    flex: 1,
    fontFamily: 'Inter_400Regular',
    fontSize: 15,
    padding: 13,
    color: '#212529',
  },
  eyeBtn: {
    padding: 13,
  },
  loginButton: {
    borderRadius: 10,
    overflow: 'hidden',
    marginTop: 8,
  },
  loginButtonGradient: {
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loginButtonPressed: {
    opacity: 0.92,
    transform: [{ scale: 0.98 }],
  },
  loginButtonDisabled: {
    opacity: 0.7,
  },
  loginButtonText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 16,
    color: 'white',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E9ECEF',
  },
  registerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 5,
  },
  registerLabel: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    color: '#6C757D',
  },
  registerLink: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
    color: '#4A90C4',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 24,
  },
  footerText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: 'rgba(255,255,255,0.4)',
  },
});
