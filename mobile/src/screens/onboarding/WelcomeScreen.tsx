import React, { useState } from 'react';
import { Alert, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
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
  const [devEmail, setDevEmail] = useState('');
  const [devPassword, setDevPassword] = useState('');
  const [isDevAuthing, setIsDevAuthing] = useState(false);
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

  /**
   * Dev-only email/password auth, gated by `__DEV__` so it's stripped from
   * release builds entirely — not a real sign-in method, just a way to get
   * past this screen without an Apple Developer account + dev build, which
   * `expo-apple-authentication` needs (it isn't available in plain Expo Go).
   * Needs "Confirm email" off in Supabase → Authentication → Providers →
   * Email for sign-up to return a session immediately; otherwise it queues
   * a confirmation email and there's nothing to sign in with until that's
   * clicked.
   */
  const handleDevAuth = async (mode: 'signUp' | 'signIn') => {
    if (!devEmail || !devPassword) return;
    setIsDevAuthing(true);
    try {
      const { data, error } =
        mode === 'signUp'
          ? await supabase.auth.signUp({ email: devEmail, password: devPassword })
          : await supabase.auth.signInWithPassword({ email: devEmail, password: devPassword });
      if (error) throw error;

      if (!data.session) {
        Alert.alert(
          'Check your email',
          'Account created but needs confirming before it has a session. For local testing, turn off "Confirm email" in Supabase → Authentication → Providers → Email, then use Sign in with the same credentials.'
        );
        return;
      }

      navigation.navigate('ImportLists');
    } catch (err: any) {
      Alert.alert('Dev sign-in failed', err.message ?? 'Something went wrong.');
    } finally {
      setIsDevAuthing(false);
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

        {__DEV__ && (
          <View style={styles.devBlock}>
            <Text style={styles.devLabel}>Dev sign-in — testing only, stripped from release builds</Text>
            <TextInput
              style={styles.devInput}
              placeholder="email"
              placeholderTextColor={colors.textDim}
              value={devEmail}
              onChangeText={setDevEmail}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
            />
            <TextInput
              style={styles.devInput}
              placeholder="password"
              placeholderTextColor={colors.textDim}
              value={devPassword}
              onChangeText={setDevPassword}
              autoCapitalize="none"
              autoCorrect={false}
              secureTextEntry
            />
            <View style={styles.devButtonRow}>
              <Pressable
                style={[styles.devButton, isDevAuthing && styles.disabled]}
                disabled={isDevAuthing}
                onPress={() => handleDevAuth('signUp')}
              >
                <Text style={styles.devButtonLabel}>Sign up</Text>
              </Pressable>
              <Pressable
                style={[styles.devButton, isDevAuthing && styles.disabled]}
                disabled={isDevAuthing}
                onPress={() => handleDevAuth('signIn')}
              >
                <Text style={styles.devButtonLabel}>Sign in</Text>
              </Pressable>
            </View>
          </View>
        )}
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
  devBlock: {
    marginTop: spacing[4],
    paddingTop: spacing[4],
    borderTopWidth: 1,
    borderTopColor: colors.borderSoft,
    gap: spacing[2],
  },
  devLabel: { ...textStyles.caption, color: colors.amber, textAlign: 'center' },
  devInput: {
    height: 44,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.borderDefault,
    paddingHorizontal: spacing[3],
    color: colors.textPrimary,
    ...textStyles.bodySm,
  },
  devButtonRow: { flexDirection: 'row', gap: spacing[2] },
  devButton: {
    flex: 1,
    height: 44,
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: colors.borderDefault,
    alignItems: 'center',
    justifyContent: 'center',
  },
  devButtonLabel: { ...textStyles.bodyStrong, color: colors.textSecondary },
});
