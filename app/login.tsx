import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";

export default function LoginScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { login } = useAuth();
  const [kode, setKode] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async () => {
    if (!kode.trim() || !password) {
      setError("Isi semua kolom");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await login(kode.trim(), password);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace("/(tabs)");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Login gagal";
      setError(msg.includes("401") || msg.includes("Invalid") ? "Email/kode atau password salah" : "Gagal terhubung ke server");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setLoading(false);
    }
  };

  const s = styles(colors);

  return (
    <KeyboardAvoidingView
      style={[s.container, { paddingTop: insets.top + (Platform.OS === "web" ? 67 : 0) }]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View style={s.inner}>
        <View style={s.logoRow}>
          <View style={s.logoDot} />
          <Text style={s.logoText}>GeoNode</Text>
        </View>
        <Text style={s.title}>Selamat Datang</Text>
        <Text style={s.subtitle}>Masuk untuk melacak teman di petamu</Text>

        {!!error && (
          <View style={s.errorBox}>
            <Feather name="alert-circle" size={14} color="#ef4444" />
            <Text style={s.errorText}>{error}</Text>
          </View>
        )}

        <View style={s.inputGroup}>
          <Text style={s.label}>Email atau Kode</Text>
          <View style={s.inputWrap}>
            <Feather name="user" size={16} color={colors.mutedForeground} style={s.inputIcon} />
            <TextInput
              style={s.input}
              value={kode}
              onChangeText={setKode}
              placeholder="Email atau kode unikmu"
              placeholderTextColor={colors.mutedForeground}
              autoCapitalize="none"
              keyboardType="email-address"
            />
          </View>
        </View>

        <View style={s.inputGroup}>
          <Text style={s.label}>Password</Text>
          <View style={s.inputWrap}>
            <Feather name="lock" size={16} color={colors.mutedForeground} style={s.inputIcon} />
            <TextInput
              style={[s.input, { flex: 1 }]}
              value={password}
              onChangeText={setPassword}
              placeholder="Password"
              placeholderTextColor={colors.mutedForeground}
              secureTextEntry={!showPass}
              onSubmitEditing={handleLogin}
            />
            <Pressable onPress={() => setShowPass(!showPass)} style={s.eyeBtn}>
              <Feather name={showPass ? "eye-off" : "eye"} size={16} color={colors.mutedForeground} />
            </Pressable>
          </View>
        </View>

        <Pressable
          style={({ pressed }) => [s.btn, pressed && s.btnPressed, loading && s.btnDisabled]}
          onPress={handleLogin}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={colors.primaryForeground} />
          ) : (
            <Text style={s.btnText}>Masuk</Text>
          )}
        </Pressable>

        <Pressable style={s.linkRow} onPress={() => router.push("/register")}>
          <Text style={s.linkText}>Belum punya akun? </Text>
          <Text style={[s.linkText, { color: colors.primary, fontFamily: "Inter_600SemiBold" }]}>Daftar</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = (colors: ReturnType<typeof useColors>) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    inner: { flex: 1, paddingHorizontal: 24, justifyContent: "center" },
    logoRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 32 },
    logoDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: colors.primary },
    logoText: { fontSize: 22, fontFamily: "Inter_700Bold", color: colors.primary },
    title: { fontSize: 28, fontFamily: "Inter_700Bold", color: colors.foreground, marginBottom: 6 },
    subtitle: { fontSize: 14, fontFamily: "Inter_400Regular", color: colors.mutedForeground, marginBottom: 28 },
    errorBox: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#ef444420", borderRadius: 10, padding: 12, marginBottom: 16 },
    errorText: { fontSize: 13, fontFamily: "Inter_400Regular", color: "#ef4444" },
    inputGroup: { marginBottom: 16 },
    label: { fontSize: 13, fontFamily: "Inter_500Medium", color: colors.mutedForeground, marginBottom: 6 },
    inputWrap: { flexDirection: "row", alignItems: "center", backgroundColor: colors.card, borderRadius: 12, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 14 },
    inputIcon: { marginRight: 10 },
    input: { flex: 1, height: 48, fontSize: 15, fontFamily: "Inter_400Regular", color: colors.foreground },
    eyeBtn: { padding: 8 },
    btn: { backgroundColor: colors.primary, borderRadius: 14, height: 52, alignItems: "center", justifyContent: "center", marginTop: 8, marginBottom: 20 },
    btnPressed: { opacity: 0.8 },
    btnDisabled: { opacity: 0.6 },
    btnText: { fontSize: 16, fontFamily: "Inter_600SemiBold", color: colors.primaryForeground },
    linkRow: { flexDirection: "row", justifyContent: "center" },
    linkText: { fontSize: 14, fontFamily: "Inter_400Regular", color: colors.mutedForeground },
  });
