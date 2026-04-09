import { Feather } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import { StyleSheet, Text, View, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { checkMaintenance } from "@/api/geonode";

export default function MaintenanceScreen() {
  const insets = useSafeAreaInsets();
  const [checking, setChecking] = useState(false);

  const handleRetry = async () => {
    setChecking(true);
    try {
      const { maintenance } = await checkMaintenance();
      if (!maintenance) router.replace("/(tabs)");
    } catch {} finally {
      setChecking(false);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Feather name="tool" size={64} color="#f59e0b" />
      <Text style={styles.title}>Sedang Maintenance</Text>
      <Text style={styles.subtitle}>Server sedang dalam pemeliharaan. Silakan coba beberapa saat lagi.</Text>
      <Pressable style={styles.btn} onPress={handleRetry} disabled={checking}>
        <Text style={styles.btnText}>{checking ? "Memeriksa..." : "Coba Lagi"}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0f172a", alignItems: "center", justifyContent: "center", padding: 32, gap: 16 },
  title: { fontSize: 24, fontFamily: "Inter_700Bold", color: "#f59e0b", textAlign: "center" },
  subtitle: { fontSize: 14, fontFamily: "Inter_400Regular", color: "#94a3b8", textAlign: "center", lineHeight: 22 },
  btn: { backgroundColor: "#f59e0b", borderRadius: 12, paddingHorizontal: 28, paddingVertical: 12, marginTop: 8 },
  btnText: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: "#fff" },
});
