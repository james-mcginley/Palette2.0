import React, { useState } from 'react';
import { Alert, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import * as AppleAuthentication from 'expo-apple-authentication';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { supabase } from '@/lib/supabase';
import { colors, radii, spacing, textStyles } from '@/theme/tokens';
import type { OnboardingStackParamList } from '@/navigation/types';

/**
 * Sign in with Apple + Google, per COMPLIANCE.md §3 — minimum scopes only
 * (name + email for Apple; openid/email/profile for Google), no sensitive
 * scopes. Google's native button isn't wired up yet: it needs
 * @react-native-google-signin/google-signin or an expo-auth-session flow
 * plus a configured OAuth client, which is a Phase 0 follow-up (see
 * PLAN.md) — the button below is present but inert until that lands. Apple
 * is fully wired because it's the mandatory path for App Store review
 * (guideline 4.8: any social sign-in requires Sign in with Apple alongside it).
 */
export function WelcomeScreen() {
  const [isSigningIn, setIsSigningIn] = useState(false);
  const navigation = useNavigation<NativeStackNavigationProp<OnboardingStackParamList>>();

  const handleAppleSignIn = async () => {
    setIsSigningIn(true);
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      if (!credential.identityToken) throw new Error('No identity token returned by Apple.');

      const { error } = await supabase.auth.signInWithIdToken({
        provider: 'apple',
        token: credential.identityToken,
      });
      if (error) throw error;

      // Apple hands over name/email exactly once, on first authorization —
      // COMPLIANCE.md §3 is explicit this must be persisted immediately or
      // it's gone for good.
      if (credential.fullName?.givenName) {
        const displayName = [credential.fullName.givenName, credential.fullName.familyName]
          .filter(Boolean)
          .join(' ');
        const { data } = await supabase.auth.getUser();
        if (data.user) {
          await supabase.from('profiles').update({ display_name: displayName }).eq('id', data.user.id);
        }
      }

      navigation.navigate('ImportLists');
    } catch (err: any) {
      if (err.code !== 'ERR_REQUEST_CANCELED') {
        Alert.alert('Sign in failed', err.message ?? 'Something went wrong.');
      }
    } finally {
      setIsSigningIn(false);
    }
  };

  return (
    <View style={styles.root}>
      <View style={styles.hero}>
        <Text style={styles.wordmark}>Palette</Text>
        <Text style={styles.tagline}>Discover. Curate. Inspire.</Text>
      </View>

      <View style={styles.actions}>
        {Platform.OS === 'ios' && (
          <AppleAuthentication.AppleAuthenticationButton
            buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
            buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.WHITE}
            cornerRadius={radii.full}
            style={styles.appleButton}
            onPress={handleAppleSignIn}
          />
        )}

        <Pressable
          style={[styles.googleButton, isSigningIn && styles.disabled]}
          disabled={isSigningIn}
          onPress={() => Alert.alert('Not wired up yet', 'Google sign-in needs an OAuth client configured — see PLAN.md Phase 0.')}
        >
          <Text style={styles.googleLabel}>Continue with Google</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surfaceCanvas, justifyContent: 'space-between', padding: spacing[5], paddingVertical: spacing[8] },
  hero: { alignItems: 'center', marginTop: spacing[9] },
  wordmark: { ...textStyles.displayLg, color: colors.textPrimary, textTransform: 'uppercase' },
  tagline: { ...textStyles.caption, color: colors.textSecondary, letterSpacing: 2, marginTop: spacing[2], textTransform: 'uppercase' },
  actions: { gap: spacing[3] },
  appleButton: { width: '100%', height: 50 },
  googleButton: {
    height: 50,
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: colors.borderDefault,
    alignItems: 'center',
    justifyContent: 'center',
  },
  googleLabel: { ...textStyles.bodyStrong, color: colors.textPrimary },
  disabled: { opacity: 0.5 },
});
