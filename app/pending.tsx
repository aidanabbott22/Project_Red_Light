/*

Lines 9 - 199 written by Robert Harriman

Screen for if you are still pending on your request

*/

import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, Platform, Animated, Easing, Image } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Colors from '@/constants/colors';

const logoImage = require('@/assets/images/logo.png');

export default function PendingScreen() {
  const insets = useSafeAreaInsets();
  const spinValue = useRef(new Animated.Value(0)).current;
  const pulseValue = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const spin = Animated.loop(
      Animated.timing(spinValue, {
        toValue: 1,
        duration: 2400,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseValue, { toValue: 1.06, duration: 1000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulseValue, { toValue: 1, duration: 1000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    );
    spin.start();
    pulse.start();
    return () => { spin.stop(); pulse.stop(); };
  }, [spinValue, pulseValue]);

  const rotation = spinValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const webTopInset = Platform.OS === 'web' ? 67 : 0;

  return (
    <LinearGradient
      colors={['#1B4965', '#142F42']}
      style={styles.outerContainer}
    >
      <View style={[styles.container, { paddingTop: insets.top + webTopInset + 24, paddingBottom: Platform.OS === 'web' ? 34 : insets.bottom + 24 }]}>
        <View style={styles.logoSection}>
          <View style={styles.logoWrapper}>
            <Image source={logoImage} style={styles.logoImage} resizeMode="contain" />
          </View>
          <Text style={styles.appName}>Project Red Light</Text>
        </View>

        <View style={styles.card}>
          <Animated.View style={[styles.iconWrapper, { transform: [{ scale: pulseValue }] }]}>
            <View style={styles.iconBg}>
              <Animated.View style={{ transform: [{ rotate: rotation }] }}>
                <Ionicons name="sync" size={32} color={Colors.light.tint} />
              </Animated.View>
            </View>
          </Animated.View>

          <Text style={styles.title}>Awaiting Approval</Text>
          <Text style={styles.subtitle}>
            Your access request has been submitted and is pending administrator review. You'll be able to sign in once approved.
          </Text>

          <View style={styles.infoBox}>
            <Ionicons name="information-circle-outline" size={16} color="#4A90C4" />
            <Text style={styles.infoText}>
              Approvals are typically completed within 1–2 business days.
            </Text>
          </View>

          <Pressable
            style={({ pressed }) => [styles.backButton, pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] }]}
            onPress={() => router.replace('/')}
          >
            <Ionicons name="arrow-back" size={17} color="white" />
            <Text style={styles.backButtonText}>Back to Sign In</Text>
          </Pressable>
        </View>

        <Text style={styles.footer}>Contact your administrator if you have questions</Text>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  outerContainer: { flex: 1 },
  container: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'center',
  },
  logoSection: {
    alignItems: 'center',
    marginBottom: 28,
  },
  logoWrapper: {
    marginBottom: 12,
  },
  logoImage: { width: 70, height: 70 },
  appName: {
    fontFamily: 'Inter_700Bold',
    fontSize: 18,
    color: 'white',
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 24,
    elevation: 12,
  },
  iconWrapper: {
    marginBottom: 20,
  },
  iconBg: {
    width: 72,
    height: 72,
    borderRadius: 20,
    backgroundColor: '#EBF5FB',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  title: {
    fontFamily: 'Inter_700Bold',
    fontSize: 22,
    color: '#1B4965',
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    color: '#6C757D',
    textAlign: 'center',
    lineHeight: 21,
    marginBottom: 20,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#F0F7FF',
    borderRadius: 10,
    padding: 12,
    gap: 8,
    marginBottom: 24,
    alignSelf: 'stretch',
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  infoText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: '#1E40AF',
    flex: 1,
    lineHeight: 19,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.light.tint,
    paddingVertical: 13,
    paddingHorizontal: 24,
    borderRadius: 10,
  },
  backButtonText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 15,
    color: 'white',
  },
  footer: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: 'rgba(255,255,255,0.4)',
    textAlign: 'center',
    marginTop: 24,
  },
});
