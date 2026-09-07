import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { queryClient, persistOptions, configureOnlineManager } from '@/state/queryClient';
import { subscribeToAuthChanges, useAuthStore } from '@/state/authStore';
import { RootNavigator } from '@/navigation/RootNavigator';
import { colors } from '@/theme/tokens';

export default function App() {
  const isAuthLoading = useAuthStore((s) => s.isLoading);
  const [isPersistReady, setPersistReady] = useState(false);

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
          {isAuthLoading || !isPersistReady ? (
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
