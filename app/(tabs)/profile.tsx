import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as Clipboard from "expo-clipboard";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Avatar } from "@/components/Avatar";
import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";

export default function ProfileScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user, logout } = useAuth();
  const [copied, setCopied] = useState(false);

  const copyKode = async () => {
    if (!user?.kode) return;
    await Clipboard.setStringAsync(user.kode);
    setCopied(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleLogout = () => {
    Alert.alert("Keluar", "Yakin ingin keluar?", [
      { text: "Batal", style: "cancel" },
      {
        text: "Keluar",
        style: "destructive",
        onPress: async () => {
          await logout();
          router.replace("/login");
        },
      },
    ]);
  };

  const s = styles(colors);

  return (
    <ScrollView
      style={[s.container, { paddingTop: Platform.OS === "web" ? insets.top + 67 : 0 }]}
      contentContainerStyle={[s.content, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 80 }]}
    >
      {/* Avatar & Name */}
      <View style={s.profileCard}>
        <Avatar name={user?.nama ?? "?"} color={user?.avatar_warna} size={72} />
        <Text style={s.name}>{user?.nama}</Text>
        <Text style={s.email}>{user?.email}</Text>

        {/* Kode Unik */}
        <Pressable style={s.kodePill} onPress={copyKode}>
          <Feather name="hash" size={14} color={colors.primary} />
          <Text style={s.kodeText}>{user?.kode ?? "..."}</Text>
          <Feather name={copied ? "check" : "copy"} size={14} color={copied ? colors.primary : colors.mutedForeground} />
        </Pressable>
        <Text style={s.kodeHint}>Ketuk untuk salin kode unikmu</Text>
      </View>

      {/* Info section */}
      <View style={s.section}>
        <Text style={s.sectionTitle}>AKUN</Text>
        <View style={s.menuCard}>
          <View style={s.menuItem}>
            <View style={[s.menuIcon, { backgroundColor: "#22c55e20" }]}>
              <Feather name="user" size={16} color={colors.primary} />
            </View>
            <Text style={s.menuLabel}>Nama</Text>
            <Text style={s.menuValue}>{user?.nama}</Text>
          </View>
          <View style={s.divider} />
          <View style={s.menuItem}>
            <View style={[s.menuIcon, { backgroundColor: "#6366f120" }]}>
              <Feather name="mail" size={16} color="#6366f1" />
            </View>
            <Text style={s.menuLabel}>Email</Text>
            <Text style={s.menuValue} numberOfLines={1}>{user?.email}</Text>
          </View>
          <View style={s.divider} />
          <Pressable style={s.menuItem} onPress={copyKode}>
            <View style={[s.menuIcon, { backgroundColor: "#f59e0b20" }]}>
              <Feather name="hash" size={16} color="#f59e0b" />
            </View>
            <Text style={s.menuLabel}>Kode Unik</Text>
            <Text style={s.menuValue}>{user?.kode}</Text>
          </Pressable>
        </View>
      </View>

      {/* About */}
      <View style={s.section}>
        <Text style={s.sectionTitle}>TENTANG</Text>
        <View style={s.menuCard}>
          <View style={s.menuItem}>
            <View style={[s.menuIcon, { backgroundColor: "#14b8a620" }]}>
              <Feather name="map-pin" size={16} color="#14b8a6" />
            </View>
            <Text style={s.menuLabel}>Aplikasi</Text>
            <Text style={s.menuValue}>GeoNode v2.0</Text>
          </View>
          <View style={s.divider} />
          <View style={s.menuItem}>
            <View style={[s.menuIcon, { backgroundColor: "#8b5cf620" }]}>
              <Feather name="globe" size={16} color="#8b5cf6" />
            </View>
            <Text style={s.menuLabel}>Server</Text>
            <Text style={s.menuValue}>bf2cad55-3715-46d8-8c77-c714b7348acf-00-djvj0nekm9uw.janeway.replit.dev</Text>
          </View>
        </View>
      </View>

      {/* Logout */}
      <Pressable style={({ pressed }) => [s.logoutBtn, pressed && { opacity: 0.7 }]} onPress={handleLogout}>
        <Feather name="log-out" size={18} color="#ef4444" />
        <Text style={s.logoutText}>Keluar</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = (colors: ReturnType<typeof useColors>) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    content: { paddingHorizontal: 20 },
    profileCard: { alignItems: "center", marginBottom: 28 },
    name: { fontSize: 22, fontFamily: "Inter_700Bold", color: colors.foreground, marginTop: 14 },
    email: { fontSize: 13, fontFamily: "Inter_400Regular", color: colors.mutedForeground, marginTop: 4 },
    kodePill: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: colors.card, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8, marginTop: 14, borderWidth: 1, borderColor: colors.border },
    kodeText: { fontSize: 16, fontFamily: "Inter_700Bold", color: colors.foreground },
    kodeHint: { fontSize: 11, fontFamily: "Inter_400Regular", color: colors.mutedForeground, marginTop: 6 },
    section: { marginBottom: 20 },
    sectionTitle: { fontSize: 11, fontFamily: "Inter_600SemiBold", color: colors.mutedForeground, marginBottom: 8, letterSpacing: 1 },
    menuCard: { backgroundColor: colors.card, borderRadius: 16, overflow: "hidden" },
    menuItem: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingVertical: 14 },
    menuIcon: { width: 32, height: 32, borderRadius: 10, alignItems: "center", justifyContent: "center" },
    menuLabel: { flex: 1, fontSize: 14, fontFamily: "Inter_500Medium", color: colors.foreground },
    menuValue: { fontSize: 13, fontFamily: "Inter_400Regular", color: colors.mutedForeground, maxWidth: 160 },
    divider: { height: 1, backgroundColor: colors.border, marginLeft: 60 },
    logoutBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, backgroundColor: "#ef444415", borderRadius: 14, height: 52 },
    logoutText: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: "#ef4444" },
  });
