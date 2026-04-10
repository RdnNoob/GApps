import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from "@expo-google-fonts/inter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack, router } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect, useState, useCallback } from "react";
import { View, TouchableOpacity, Text, StyleSheet } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { ErrorBoundary } from "@/components/ErrorBoundary";
import { ServerConfigModal } from "@/components/ServerConfigModal";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { LanguageProvider } from "@/context/LanguageContext";
import { LocationProvider } from "@/context/LocationContext";
import { NotificationProvider } from "@/context/NotificationContext";
import { checkMaintenance, loadServerUrl } from "@/api/geonode";

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

function ConfigButton({ onPress }: { onPress: () => void }) {
  return (
    <TouchableOpacity
      style={styles.fab}
      onPress={onPress}
      activeOpacity={0.8}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
    >
      <Text style={styles.fabIcon}>⚙</Text>
    </TouchableOpacity>
  );
}

function RootLayoutNav({ onOpenConfig }: { onOpenConfig: () => void }) {
  const { user, loading } = useAuth();
  const [connectionFailed, setConnectionFailed] = useState(false);

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.replace("/login");
      } else {
        checkMaintenance()
          .then(({ maintenance }) => {
            if (maintenance) {
              router.replace("/maintenance");
            } else {
              router.replace("/(tabs)");
            }
          })
          .catch(() => {
            setConnectionFailed(true);
            router.replace("/login");
          });
      }
    }
  }, [user, loading]);

  useEffect(() => {
    if (connectionFailed) {
      onOpenConfig();
      setConnectionFailed(false);
    }
  }, [connectionFailed, onOpenConfig]);

  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: "#0f172a" } }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="login" options={{ headerShown: false, animation: "fade" }} />
      <Stack.Screen name="register" options={{ headerShown: false, animation: "slide_from_right" }} />
      <Stack.Screen name="admin-login" options={{ headerShown: false, animation: "slide_from_bottom" }} />
      <Stack.Screen name="admin" options={{ headerShown: false, animation: "slide_from_bottom" }} />
      <Stack.Screen name="maintenance" options={{ headerShown: false, animation: "fade" }} />
      <Stack.Screen name="chat/[friendId]" options={{ headerShown: false, animation: "slide_from_right" }} />
      <Stack.Screen name="group/[groupId]" options={{ headerShown: false, animation: "slide_from_right" }} />
    </Stack>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });
  const [serverUrlLoaded, setServerUrlLoaded] = useState(false);
  const [configVisible, setConfigVisible] = useState(false);

  useEffect(() => {
    loadServerUrl().then(() => setServerUrlLoaded(true));
  }, []);

  useEffect(() => {
    if ((fontsLoaded || fontError) && serverUrlLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError, serverUrlLoaded]);

  const openConfig = useCallback(() => setConfigVisible(true), []);
  const closeConfig = useCallback(() => setConfigVisible(false), []);

  if ((!fontsLoaded && !fontError) || !serverUrlLoaded) return null;

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <GestureHandlerRootView style={{ flex: 1 }}>
            <KeyboardProvider>
              <LanguageProvider>
                <AuthProvider>
                  <NotificationProvider>
                    <LocationProvider>
                      <View style={{ flex: 1 }}>
                        <RootLayoutNav onOpenConfig={openConfig} />
                        <ConfigButton onPress={openConfig} />
                        <ServerConfigModal
                          visible={configVisible}
                          onClose={closeConfig}
                          onSaved={() => queryClient.clear()}
                        />
                      </View>
                    </LocationProvider>
                  </NotificationProvider>
                </AuthProvider>
              </LanguageProvider>
            </KeyboardProvider>
          </GestureHandlerRootView>
        </QueryClientProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: "absolute",
    bottom: 28,
    right: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#1e293b",
    borderWidth: 1,
    borderColor: "#334155",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 9999,
  },
  fabIcon: {
    fontSize: 18,
    color: "#94a3b8",
  },
});
