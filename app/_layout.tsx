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
import React, { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { ErrorBoundary } from "@/components/ErrorBoundary";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { LocationProvider } from "@/context/LocationContext";
import { checkMaintenance } from "@/api/geonode";

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

function RootLayoutNav() {
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.replace("/login");
      } else {
        checkMaintenance().then(({ maintenance }) => {
          if (maintenance) {
            router.replace("/maintenance");
          } else {
            router.replace("/(tabs)");
          }
        }).catch(() => router.replace("/(tabs)"));
      }
    }
  }, [user, loading]);

  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: "#0f172a" } }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="login" options={{ headerShown: false, animation: "fade" }} />
      <Stack.Screen name="register" options={{ headerShown: false, animation: "slide_from_right" }} />
      <Stack.Screen name="admin-login" options={{ headerShown: false, animation: "slide_from_bottom" }} />
      <Stack.Screen name="admin" options={{ headerShown: false, animation: "slide_from_bottom" }} />
      <Stack.Screen name="maintenance" options={{ headerShown: false, animation: "fade" }} />
      <Stack.Screen
        name="chat/[friendId]"
        options={{ headerShown: false, animation: "slide_from_right" }}
      />
      <Stack.Screen
        name="group/[groupId]"
        options={{ headerShown: false, animation: "slide_from_right" }}
      />
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

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <GestureHandlerRootView style={{ flex: 1 }}>
            <KeyboardProvider>
              <AuthProvider>
                <LocationProvider>
                  <RootLayoutNav />
                </LocationProvider>
              </AuthProvider>
            </KeyboardProvider>
          </GestureHandlerRootView>
        </QueryClientProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
