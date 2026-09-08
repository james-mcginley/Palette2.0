import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
// Imported from the per-weight subpath, not the package root — the root
// `index.js` re-exports every weight unconditionally, and Metro bundles
// every `require()` it finds while evaluating a module, not just the named
// export actually used. Importing the root pulled in all 18 RobotoMono
// files and all 4 Caveat files (~2.4MB) for the one weight of each this
// app actually uses.
import { RobotoMono_500Medium } from '@expo-google-fonts/roboto-mono/500Medium';
import { Caveat_400Regular } from '@expo-google-fonts/caveat/400Regular';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { queryClient, persistOptions, configureOnlineManager } from '@/state/queryClient';
import { subscribeToAuthChanges, useAuthStore } from '@/state/authStore';
import { RootNavigator } from '@/navigation/RootNavigator';
import { colors } from '@/theme/tokens';

/**
 * Only these two custom faces, deliberately not the base Roboto/Bold/Medium
 * set `theme/tokens.ts` names: `fontFamily: 'Roboto'` was never actually
 * loaded, which sounds like a bug but currently isn't one in practice — on
 * iOS an unregistered family name silently falls back to the real system
 * font (San Francisco), which still honors `fontWeight` correctly. Loading
 * one "Roboto" file under that exact name would break that: custom fonts on
 * iOS need a distinct family name per weight, and every `textStyles` entry
 * would render in whatever single weight got loaded, since `fontWeight` is
 * ignored once the family name resolves to a custom font. Properly fixing
 * that means touching every weight this app uses, across every screen — a
 * much larger, high-blast-radius change than this pass should make
 * unverified. RobotoMono and Caveat are different: both are used at exactly
 * one weight each (500 and 400 — see `textStyles.monoMd/monoSm` and
 * `.handNote`), and both are typefaces the design depends on for a
 * *distinctive* character no iOS system font can substitute — a monospace
 * stamp face, and a handwritten annotation face. Skipping those would
 * visibly defeat the Logbook's whole "this looks handwritten" premise.
 */
export default function App() {
  const isAuthLoading = useAuthStore((s) => s.isLoading);
  const [isPersistReady, setPersistReady] = useState(false);
  const [fontsLoaded] = useFonts({ RobotoMono: RobotoMono_500Medium, Caveat: Caveat_400Regular });

  useEffect(() => {
    const unsubscribeAuth = subscribeToAuthChanges();
    const unsubscribeNetwork = configureOnlineManager();
    return () => {
      unsubscribeAuth();
      unsubscribeNetwork();
    };
  }, []);

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <PersistQueryClientProvider
          client={queryClient}
          persistOptions={persistOptions}
          onSuccess={async () => {
            // A log made offline right before a force-quit is now sitting in
            // the rehydrated cache as a paused mutation — this is what
            // actually replays it (ARCHITECTURE.md §5). Safe to call even if
            // still offline: a paused mutation just stays paused.
            await queryClient.resumePausedMutations();
            setPersistReady(true);
          }}
        >
          <StatusBar style="light" />
          {isAuthLoading || !isPersistReady || !fontsLoaded ? (
            <View style={styles.loading}>
              <ActivityIndicator color={colors.accent} />
            </View>
          ) : (
            <NavigationContainer>
              <RootNavigator />
            </NavigationContainer>
          )}
        </PersistQueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceCanvas },
});
