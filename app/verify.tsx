/*

Lines 7 - 324 written by Ryan Gartner 

Verify screen if you get accepted. Still needs updates due to misscommunication. 

*/

import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TextInput, Pressable, StyleSheet, ActivityIndicator,
  KeyboardAvoidingView, Platform, ScrollView, Image,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '@/lib/auth-context';

const logoImage = require('@/assets/images/logo.png');

const RESEND_COOLDOWN = 60;

export default function VerifyScreen() {
  const insets = useSafeAreaInsets();
  const { userId } = useLocalSearchParams<{ userId: string }>();
  const { verify, resendVerification } = useAuth();

  const [emailCode, setEmailCode] = useState('');
  const [phoneCode, setPhoneCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [resending, setResending] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const emailRef = useRef<TextInput>(null);
  const phoneRef = useRef<TextInput>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const startCooldown = () => {
    setCooldown(RESEND_COOLDOWN);
    timerRef.current = setInterval(() => {
      setCooldown(prev => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleVerify = async () => {
    if (!emailCode.trim() || !phoneCode.trim()) {
      setError('Please enter both verification codes');
      return;
    }
    if (emailCode.trim().length !== 6 || phoneCode.trim().length !== 6) {
      setError('Each code must be 6 digits');
      return;
    }
    if (!userId) {
      setError('Missing user ID. Please restart registration.');
      return;
    }

    setError('');
    setSubmitting(true);

    const result = await verify(userId, emailCode.trim(), phoneCode.trim());

    if (result.success) {
      setSuccess(true);
      setTimeout(() => router.replace('/pending'), 1200);
    } else {
      setError(result.message || 'Verification failed');
    }

    setSubmitting(false);
  };

  const handleResend = async () => {
    if (!userId || cooldown > 0 || resending) return;
    setResending(true);
    setError('');

    const result = await resendVerification(userId);

    if (result.success) {
      startCooldown();
    } else {
      setError(result.message || 'Failed to resend codes');
    }

    setResending(false);
  };

  const webTopInset = Platform.OS === 'web' ? 67 : 0;

  return (
    <LinearGradient colors={['#1B4965', '#142F42']} style={styles.outerContainer}>
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
            <Image source={logoImage} style={styles.logoImage} resizeMode="contain" />
            <Text style={styles.appName}>Project Red Light</Text>
            <Text style={styles.tagline}>Verify Your Identity</Text>
          </View>

          <View style={styles.card}>
            {success ? (
              <View style={styles.successContainer}>
                <View style={styles.successIcon}>
                  <Ionicons name="checkmark-circle" size={52} color="#28A745" />
                </View>
                <Text style={styles.successTitle}>Verified!</Text>
                <Text style={styles.successText}>Your identity has been confirmed. Redirecting…</Text>
              </View>
            ) : (
              <>
                <Text style={styles.cardTitle}>Enter Your Codes</Text>
                <Text style={styles.cardSubtitle}>
                  We sent 6-digit codes to your email and phone number. Enter both below to verify your account.
                </Text>

                {error ? (
                  <View style={styles.errorContainer}>
                    <Ionicons name="alert-circle" size={15} color="#DC3545" />
                    <Text style={styles.errorText}>{error}</Text>
                  </View>
                ) : null}

                <View style={styles.codeBlock}>
                  <View style={styles.codeIconRow}>
                    <View style={styles.codeIconCircle}>
                      <Ionicons name="mail" size={18} color="#1B4965" />
                    </View>
                    <Text style={styles.codeLabel}>Email Code</Text>
                  </View>
                  <TextInput
                    ref={emailRef}
                    style={styles.codeInput}
                    placeholder="000000"
                    placeholderTextColor="#ADB5BD"
                    value={emailCode}
                    onChangeText={(v) => {
                      const digits = v.replace(/\D/g, '').slice(0, 6);
                      setEmailCode(digits);
                      if (digits.length === 6) phoneRef.current?.focus();
                    }}
                    keyboardType="number-pad"
                    maxLength={6}
                    autoFocus
                    textContentType="oneTimeCode"
                  />
                </View>

                <View style={[styles.codeBlock, { marginTop: 16 }]}>
                  <View style={styles.codeIconRow}>
                    <View style={styles.codeIconCircle}>
                      <Ionicons name="phone-portrait" size={18} color="#1B4965" />
                    </View>
                    <Text style={styles.codeLabel}>Phone Code</Text>
                  </View>
                  <TextInput
                    ref={phoneRef}
                    style={styles.codeInput}
                    placeholder="000000"
                    placeholderTextColor="#ADB5BD"
                    value={phoneCode}
                    onChangeText={(v) => {
                      const digits = v.replace(/\D/g, '').slice(0, 6);
                      setPhoneCode(digits);
                    }}
                    keyboardType="number-pad"
                    maxLength={6}
                    textContentType="oneTimeCode"
                  />
                </View>

                <Pressable
                  style={({ pressed }) => [
                    styles.verifyButton,
                    pressed && styles.verifyButtonPressed,
                    submitting && styles.verifyButtonDisabled,
                  ]}
                  onPress={handleVerify}
                  disabled={submitting}
                >
                  <LinearGradient
                    colors={['#4A90C4', '#3A7AB0']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.verifyButtonGradient}
                  >
                    {submitting ? (
                      <ActivityIndicator color="white" size="small" />
                    ) : (
                      <Text style={styles.verifyButtonText}>Verify Account</Text>
                    )}
                  </LinearGradient>
                </Pressable>

                <View style={styles.resendRow}>
                  <Text style={styles.resendLabel}>Didn't receive a code?</Text>
                  <Pressable
                    onPress={handleResend}
                    disabled={cooldown > 0 || resending}
                    style={({ pressed }) => pressed && { opacity: 0.7 }}
                  >
                    {resending ? (
                      <ActivityIndicator size="small" color="#4A90C4" />
                    ) : (
                      <Text style={[styles.resendLink, (cooldown > 0) && styles.resendLinkDisabled]}>
                        {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend Codes'}
                      </Text>
                    )}
                  </Pressable>
                </View>

                <View style={styles.noteRow}>
                  <Ionicons name="time-outline" size={13} color="#ADB5BD" />
                  <Text style={styles.noteText}>Codes expire after 10 minutes</Text>
                </View>
              </>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  outerContainer: { flex: 1 },
  scrollContent: { flexGrow: 1, paddingHorizontal: 24 },
  logoSection: { alignItems: 'center', marginBottom: 32 },
  logoImage: { width: 72, height: 72, marginBottom: 14 },
  appName: { fontFamily: 'Inter_700Bold', fontSize: 22, color: 'white', letterSpacing: -0.3 },
  tagline: { fontFamily: 'Inter_400Regular', fontSize: 13, color: 'rgba(255,255,255,0.55)', marginTop: 4 },
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
  cardTitle: { fontFamily: 'Inter_700Bold', fontSize: 22, color: '#1B4965', marginBottom: 4 },
  cardSubtitle: { fontFamily: 'Inter_400Regular', fontSize: 14, color: '#6C757D', marginBottom: 24, lineHeight: 20 },
  errorContainer: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#FFF5F5', borderWidth: 1, borderColor: '#FECDD3',
    borderRadius: 10, padding: 12, marginBottom: 18, gap: 8,
  },
  errorText: { fontFamily: 'Inter_400Regular', fontSize: 13, color: '#DC3545', flex: 1 },
  codeBlock: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E9ECEF',
    padding: 16,
  },
  codeIconRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  codeIconCircle: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: '#DBEAFE',
    alignItems: 'center', justifyContent: 'center',
  },
  codeLabel: { fontFamily: 'Inter_600SemiBold', fontSize: 14, color: '#1B4965' },
  codeInput: {
    backgroundColor: 'white',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#DEE2E6',
    fontFamily: 'Inter_700Bold',
    fontSize: 28,
    letterSpacing: 10,
    textAlign: 'center',
    paddingVertical: 14,
    color: '#1B4965',
  },
  verifyButton: { borderRadius: 10, overflow: 'hidden', marginTop: 24 },
  verifyButtonGradient: { paddingVertical: 15, alignItems: 'center', justifyContent: 'center' },
  verifyButtonPressed: { opacity: 0.92, transform: [{ scale: 0.98 }] },
  verifyButtonDisabled: { opacity: 0.7 },
  verifyButtonText: { fontFamily: 'Inter_600SemiBold', fontSize: 16, color: 'white' },
  resendRow: {
    flexDirection: 'row', justifyContent: 'center',
    alignItems: 'center', gap: 5, marginTop: 20,
  },
  resendLabel: { fontFamily: 'Inter_400Regular', fontSize: 14, color: '#6C757D' },
  resendLink: { fontFamily: 'Inter_600SemiBold', fontSize: 14, color: '#4A90C4' },
  resendLinkDisabled: { color: '#ADB5BD' },
  noteRow: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', gap: 5, marginTop: 12,
  },
  noteText: { fontFamily: 'Inter_400Regular', fontSize: 12, color: '#ADB5BD' },
  successContainer: { alignItems: 'center', paddingVertical: 16 },
  successIcon: { marginBottom: 16 },
  successTitle: { fontFamily: 'Inter_700Bold', fontSize: 24, color: '#1B4965', marginBottom: 8 },
  successText: { fontFamily: 'Inter_400Regular', fontSize: 14, color: '#6C757D', textAlign: 'center', lineHeight: 20 },
});
