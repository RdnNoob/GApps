import React, { useState, useEffect } from "react";
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from "react-native";
import { getServerUrl, saveServerUrl, resetServerUrl, loadServerUrl } from "@/api/geonode";

interface Props {
  visible: boolean;
  onClose: () => void;
  onSaved?: () => void;
}

export function ServerConfigModal({ visible, onClose, onSaved }: Props) {
  const [url, setUrl] = useState("");
  const [isTesting, setIsTesting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);

  useEffect(() => {
    if (visible) {
      setUrl(getServerUrl());
      setTestResult(null);
    }
  }, [visible]);

  const handleTest = async () => {
    const trimmed = url.trim().replace(/\/$/, "");
    if (!trimmed) return;
    setIsTesting(true);
    setTestResult(null);
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 8000);
      const res = await fetch(`${trimmed}/api/healthz`, { signal: controller.signal });
      clearTimeout(timer);
      if (res.ok) {
        setTestResult({ ok: true, message: "Koneksi berhasil" });
      } else {
        setTestResult({ ok: false, message: `Server merespons HTTP ${res.status}` });
      }
    } catch (e: unknown) {
      const isTimeout = e instanceof Error && e.name === "AbortError";
      setTestResult({
        ok: false,
        message: isTimeout ? "Koneksi timeout (8 detik)" : "Tidak dapat terhubung ke server",
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSave = async () => {
    const trimmed = url.trim().replace(/\/$/, "");
    if (!trimmed) {
      Alert.alert("URL Kosong", "Masukkan URL server terlebih dahulu.");
      return;
    }
    setIsSaving(true);
    try {
      await saveServerUrl(trimmed);
      await loadServerUrl();
      onSaved?.();
      onClose();
    } catch {
      Alert.alert("Gagal", "Tidak dapat menyimpan URL server.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    Alert.alert(
      "Reset URL Server",
      "URL server akan dikembalikan ke nilai default. Lanjutkan?",
      [
        { text: "Batal", style: "cancel" },
        {
          text: "Reset",
          style: "destructive",
          onPress: async () => {
            await resetServerUrl();
            await loadServerUrl();
            setUrl(getServerUrl());
            setTestResult(null);
            onSaved?.();
          },
        },
      ]
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.container}
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Konfigurasi Server</Text>
            <Text style={styles.subtitle}>Ubah URL server yang digunakan aplikasi</Text>
          </View>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Text style={styles.closeText}>Tutup</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.body}>
          <Text style={styles.label}>URL SERVER</Text>
          <TextInput
            style={styles.input}
            value={url}
            onChangeText={(t) => { setUrl(t); setTestResult(null); }}
            placeholder="https://contoh-server.up.railway.app"
            placeholderTextColor="#475569"
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
          />

          {testResult && (
            <View style={[styles.testBadge, testResult.ok ? styles.testOk : styles.testFail]}>
              <View style={[styles.dot, testResult.ok ? styles.dotOk : styles.dotFail]} />
              <Text style={[styles.testText, testResult.ok ? styles.testTextOk : styles.testTextFail]}>
                {testResult.message}
              </Text>
            </View>
          )}

          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.btn, styles.btnSecondary]}
              onPress={handleTest}
              disabled={isTesting || !url.trim()}
            >
              {isTesting ? (
                <ActivityIndicator size="small" color="#94a3b8" />
              ) : (
                <Text style={styles.btnSecondaryText}>Tes Koneksi</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.btn, styles.btnPrimary, (isSaving || !url.trim()) && styles.btnDisabled]}
              onPress={handleSave}
              disabled={isSaving || !url.trim()}
            >
              {isSaving ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.btnPrimaryText}>Simpan</Text>
              )}
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.resetBtn} onPress={handleReset}>
            <Text style={styles.resetText}>Kembalikan ke URL Default</Text>
          </TouchableOpacity>

          <View style={styles.infoBox}>
            <Text style={styles.infoText}>
              URL yang disimpan akan digunakan di semua sesi. Pastikan URL sudah benar sebelum menyimpan.
            </Text>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0f172a",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#1e293b",
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: "#f1f5f9",
  },
  subtitle: {
    fontSize: 13,
    color: "#64748b",
    marginTop: 2,
  },
  closeBtn: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    backgroundColor: "#1e293b",
    borderRadius: 8,
  },
  closeText: {
    fontSize: 14,
    color: "#94a3b8",
    fontWeight: "500",
  },
  body: {
    flex: 1,
    padding: 20,
  },
  label: {
    fontSize: 11,
    fontWeight: "600",
    color: "#64748b",
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  input: {
    backgroundColor: "#1e293b",
    borderWidth: 1,
    borderColor: "#334155",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: "#f1f5f9",
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
  },
  testBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  testOk: {
    backgroundColor: "rgba(16,185,129,0.1)",
    borderColor: "rgba(16,185,129,0.3)",
  },
  testFail: {
    backgroundColor: "rgba(239,68,68,0.1)",
    borderColor: "rgba(239,68,68,0.3)",
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  dotOk: { backgroundColor: "#10b981" },
  dotFail: { backgroundColor: "#ef4444" },
  testText: { fontSize: 13, fontWeight: "500" },
  testTextOk: { color: "#10b981" },
  testTextFail: { color: "#ef4444" },
  actions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 16,
  },
  btn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  btnPrimary: {
    backgroundColor: "#3b82f6",
  },
  btnPrimaryText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
  },
  btnSecondary: {
    backgroundColor: "#1e293b",
    borderWidth: 1,
    borderColor: "#334155",
  },
  btnSecondaryText: {
    color: "#94a3b8",
    fontSize: 15,
    fontWeight: "500",
  },
  btnDisabled: {
    opacity: 0.5,
  },
  resetBtn: {
    marginTop: 14,
    alignItems: "center",
    paddingVertical: 10,
  },
  resetText: {
    fontSize: 13,
    color: "#ef4444",
  },
  infoBox: {
    marginTop: 24,
    backgroundColor: "#1e293b",
    borderRadius: 10,
    padding: 14,
  },
  infoText: {
    fontSize: 13,
    color: "#64748b",
    lineHeight: 18,
  },
});
