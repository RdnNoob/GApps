import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import AsyncStorage from "@react-native-async-storage/async-storage";
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
import { adminLogin } from "@/api/geonode";
import { useColors } from "@/hooks/useColors";

export default function AdminLoginScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async () => {
    if (!username.trim() || !password) {
      setError("Isi semua kolom");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await adminLogin(username.trim(), password);
      await AsyncStorage.setItem("admin_token", res.token);
      await AsyncStorage.setItem("admin_username", res.username);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace("/admin");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Login gagal";
      setError(msg);
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
        <Pressable style={s.backBtn} onPress={() => router.back()}>
          <Feather name="arrow-left" size={20} color={colors.foreground} />
        </Pressable>

        <View style={s.logoRow}>
          <Feather name="shield" size={28} color="#f59e0b" />
          <Text style={s.logoText}>Admin Panel</Text>
        </View>
        <Text style={s.subtitle}>Masuk sebagai administrator</Text>

        {!!error && (
          <View style={s.errorBox}>
            <Feather name="alert-circle" size={14} color="#ef4444" />
            <Text style={s.errorText}>{error}</Text>
          </View>
        )}

        <View style={s.inputGroup}>
          <Text style={s.label}>Username</Text>
          <View style={s.inputWrap}>
            <Feather name="user" size={16} color={colors.mutedForeground} style={s.inputIcon} />
            <TextInput
              style={s.input}
              value={username}
              onChangeText={setUsername}
              placeholder="Username admin"
              placeholderTextColor={colors.mutedForeground}
              autoCapitalize="none"
            />
          </View>
        </View>

        <View style={s.inputGroup}>
          <Text style={s.label}>Kata Sandi</Text>
          <View style={s.inputWrap}>
            <Feather name="lock" size={16} color={colors.mutedForeground} style={s.inputIcon} />
            <TextInput
              style={[s.input, { flex: 1 }]}
              value={password}
              onChangeText={setPassword}
              placeholder="Kata sandi admin"
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
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={s.btnText}>Masuk Admin</Text>
          )}
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = (colors: ReturnType<typeof useColors>) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    inner: { flex: 1, paddingHorizontal: 24, justifyContent: "center" },
    backBtn: { position: "absolute", top: 20, left: 24, width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center", zIndex: 10 },
    logoRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 8 },
    logoText: { fontSize: 24, fontFamily: "Inter_700Bold", color: "#f59e0b" },
    subtitle: { fontSize: 14, fontFamily: "Inter_400Regular", color: colors.mutedForeground, marginBottom: 32 },
    errorBox: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#ef444420", borderRadius: 10, padding: 12, marginBottom: 16 },
    errorText: { fontSize: 13, fontFamily: "Inter_400Regular", color: "#ef4444" },
    inputGroup: { marginBottom: 16 },
    label: { fontSize: 13, fontFamily: "Inter_500Medium", color: colors.mutedForeground, marginBottom: 6 },
    inputWrap: { flexDirection: "row", alignItems: "center", backgroundColor: colors.card, borderRadius: 12, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 14 },
    inputIcon: { marginRight: 10 },
    input: { flex: 1, height: 48, fontSize: 15, fontFamily: "Inter_400Regular", color: colors.foreground },
    eyeBtn: { padding: 8 },
    btn: { backgroundColor: "#f59e0b", borderRadius: 14, height: 52, alignItems: "center", justifyContent: "center", marginTop: 8 },
    btnPressed: { opacity: 0.8 },
    btnDisabled: { opacity: 0.6 },
    btnText: { fontSize: 16, fontFamily: "Inter_600SemiBold", color: "#fff" },
  });
