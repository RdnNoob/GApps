import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as Clipboard from "expo-clipboard";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Avatar } from "@/components/Avatar";
import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";
import { updateProfile } from "@/api/geonode";
import { useLanguage, LANGUAGES } from "@/context/LanguageContext";

const AVATAR_COLORS = [
  "#6366f1","#ec4899","#f59e0b","#14b8a6","#8b5cf6",
  "#ef4444","#22c55e","#3b82f6","#f97316","#a855f7",
];

export default function ProfileScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user, logout, setUser } = useAuth();
  const [copied, setCopied] = useState(false);

  // Edit modal
  const [editVisible, setEditVisible] = useState(false);
  const [editNama, setEditNama] = useState(user?.nama ?? "");
  const [editColor, setEditColor] = useState(user?.avatar_warna ?? AVATAR_COLORS[0]);
  const [saving, setSaving] = useState(false);
  const { language, setLanguage, t } = useLanguage();
  const [showLangModal, setShowLangModal] = useState(false);

  const copyKode = async () => {
    if (!user?.kode) return;
    await Clipboard.setStringAsync(user.kode);
    setCopied(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setTimeout(() => setCopied(false), 2000);
  };

  const openEdit = () => {
    setEditNama(user?.nama ?? "");
    setEditColor(user?.avatar_warna ?? AVATAR_COLORS[0]);
    setEditVisible(true);
  };

  const handleSave = async () => {
    if (!editNama.trim()) {
      Alert.alert("Error", "Nama tidak boleh kosong");
      return;
    }
    setSaving(true);
    try {
      const updated = await updateProfile(editNama.trim(), editColor);
      setUser(updated);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setEditVisible(false);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Gagal menyimpan";
      Alert.alert("Gagal", msg);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setSaving(false);
    }
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
    <>
      <ScrollView
        style={[s.container, { paddingTop: Platform.OS === "web" ? insets.top + 67 : 0 }]}
        contentContainerStyle={[s.content, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 80 }]}
      >
        {/* Avatar & Name */}
        <View style={s.profileCard}>
          <Avatar name={user?.nama ?? "?"} color={user?.avatar_warna} size={72} />
          <Text style={s.name}>{user?.nama}</Text>
          <Text style={s.email}>{user?.email}</Text>

          {/* Edit profil */}
          <Pressable style={({ pressed }) => [s.editBtn, pressed && { opacity: 0.7 }]} onPress={openEdit}>
            <Feather name="edit-2" size={13} color={colors.primary} />
            <Text style={s.editBtnText}>Edit Profil</Text>
          </Pressable>

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
            <Pressable style={s.menuItem} onPress={openEdit}>
              <View style={[s.menuIcon, { backgroundColor: "#22c55e20" }]}>
                <Feather name="user" size={16} color={colors.primary} />
              </View>
              <Text style={s.menuLabel}>Nama</Text>
              <Text style={s.menuValue}>{user?.nama}</Text>
              <Feather name="chevron-right" size={14} color={colors.mutedForeground} />
            </Pressable>
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
              <Feather name={copied ? "check" : "copy"} size={14} color={copied ? "#f59e0b" : colors.mutedForeground} />
            </Pressable>
          </View>
        </View>


        {/* Bahasa */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>{t.language.toUpperCase()}</Text>
          <View style={s.menuCard}>
            <Pressable style={s.menuItem} onPress={() => setShowLangModal(true)}>
              <View style={[s.menuIcon, { backgroundColor: "#8b5cf620" }]}>
                <Feather name="globe" size={16} color="#8b5cf6" />
              </View>
              <Text style={s.menuLabel}>{t.language}</Text>
              <Text style={s.menuValue}>
                {LANGUAGES.find(l => l.code === language)?.flag + " " + LANGUAGES.find(l => l.code === language)?.label}
              </Text>
              <Feather name="chevron-right" size={14} color={colors.mutedForeground} />
            </Pressable>
          </View>
        </View>

        {/* About */}}
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
          </View>
        </View>

        {/* Logout */}
        <Pressable style={({ pressed }) => [s.logoutBtn, pressed && { opacity: 0.7 }]} onPress={handleLogout}>
          <Feather name="log-out" size={18} color="#ef4444" />
          <Text style={s.logoutText}>{t.logout}</Text>
        </Pressable>
      </ScrollView>


      {/* Modal Pilih Bahasa */}
      <Modal visible={showLangModal} animationType="slide" transparent onRequestClose={() => setShowLangModal(false)}>
        <Pressable style={s.modalOverlay} onPress={() => setShowLangModal(false)}>
          <View style={s.modalCard}>
            <View style={s.modalHandle} />
            <Text style={s.modalTitle}>{t.chooseLanguage}</Text>
            {LANGUAGES.map((lang) => (
              <Pressable
                key={lang.code}
                style={[s.menuItem, { paddingHorizontal: 0, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.border }]}
                onPress={() => { setLanguage(lang.code); setShowLangModal(false); }}
              >
                <Text style={{ fontSize: 24 }}>{lang.flag}</Text>
                <Text style={[s.menuLabel, { fontSize: 16, marginLeft: 8 }]}>{lang.label}</Text>
                {language === lang.code && (
                  <Feather name="check" size={18} color={colors.primary} />
                )}
              </Pressable>
            ))}
            <Pressable style={[s.cancelBtn, { marginBottom: 20 }]} onPress={() => setShowLangModal(false)}>
              <Text style={s.cancelBtnText}>{t.cancel}</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>

      {/* Modal Edit Profil */}
      <Modal visible={editVisible} transparent animationType="slide" onRequestClose={() => setEditVisible(false)}>
        <Pressable style={s.modalOverlay} onPress={() => setEditVisible(false)}>
          <Pressable style={[s.modalCard, { paddingBottom: insets.bottom + 16 }]} onPress={() => {}}>
            <View style={s.modalHandle} />
            <Text style={s.modalTitle}>Edit Profil</Text>

            <Text style={s.fieldLabel}>Nama</Text>
            <TextInput
              style={s.fieldInput}
              value={editNama}
              onChangeText={setEditNama}
              placeholder="Nama kamu"
              placeholderTextColor={colors.mutedForeground}
              autoFocus
            />

            <Text style={s.fieldLabel}>Warna Avatar</Text>
            <View style={s.colorRow}>
              {AVATAR_COLORS.map(c => (
                <Pressable
                  key={c}
                  style={[s.colorDot, { backgroundColor: c }, editColor === c && s.colorDotActive]}
                  onPress={() => {
                    setEditColor(c);
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }}
                >
                  {editColor === c && <Feather name="check" size={14} color="#fff" />}
                </Pressable>
              ))}
            </View>

            <View style={s.modalPreview}>
              <Avatar name={editNama || user?.nama || "?"} color={editColor} size={52} />
              <Text style={s.modalPreviewName}>{editNama || user?.nama}</Text>
            </View>

            <Pressable
              style={({ pressed }) => [s.saveBtn, pressed && { opacity: 0.8 }, saving && { opacity: 0.5 }]}
              onPress={handleSave}
              disabled={saving}
            >
              <Text style={s.saveBtnText}>{saving ? "Menyimpan..." : "Simpan Perubahan"}</Text>
            </Pressable>

            <Pressable style={s.cancelBtn} onPress={() => setEditVisible(false)}>
              <Text style={s.cancelBtnText}>Batal</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = (colors: ReturnType<typeof useColors>) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    content: { paddingHorizontal: 20 },
    profileCard: { alignItems: "center", marginBottom: 28 },
    name: { fontSize: 22, fontFamily: "Inter_700Bold", color: colors.foreground, marginTop: 14 },
    email: { fontSize: 13, fontFamily: "Inter_400Regular", color: colors.mutedForeground, marginTop: 4 },
    editBtn: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 10, paddingHorizontal: 14, paddingVertical: 6, backgroundColor: colors.card, borderRadius: 20, borderWidth: 1, borderColor: colors.border },
    editBtnText: { fontSize: 12, fontFamily: "Inter_500Medium", color: colors.primary },
    kodePill: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: colors.card, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8, marginTop: 14, borderWidth: 1, borderColor: colors.border },
    kodeText: { fontSize: 16, fontFamily: "Inter_700Bold", color: colors.foreground },
    kodeHint: { fontSize: 11, fontFamily: "Inter_400Regular", color: colors.mutedForeground, marginTop: 6 },
    section: { marginBottom: 20 },
    sectionTitle: { fontSize: 11, fontFamily: "Inter_600SemiBold", color: colors.mutedForeground, marginBottom: 8, letterSpacing: 1 },
    menuCard: { backgroundColor: colors.card, borderRadius: 16, overflow: "hidden" },
    menuItem: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingVertical: 14 },
    menuIcon: { width: 32, height: 32, borderRadius: 10, alignItems: "center", justifyContent: "center" },
    menuLabel: { flex: 1, fontSize: 14, fontFamily: "Inter_500Medium", color: colors.foreground },
    menuValue: { fontSize: 13, fontFamily: "Inter_400Regular", color: colors.mutedForeground, maxWidth: 140 },
    divider: { height: 1, backgroundColor: colors.border, marginLeft: 60 },
    logoutBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, backgroundColor: "#ef444415", borderRadius: 14, height: 52 },
    logoutText: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: "#ef4444" },
    // Modal
    modalOverlay: { flex: 1, backgroundColor: "#00000060", justifyContent: "flex-end" },
    modalCard: { backgroundColor: colors.background, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 24, paddingTop: 12 },
    modalHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border, alignSelf: "center", marginBottom: 20 },
    modalTitle: { fontSize: 18, fontFamily: "Inter_700Bold", color: colors.foreground, marginBottom: 20 },
    fieldLabel: { fontSize: 13, fontFamily: "Inter_500Medium", color: colors.mutedForeground, marginBottom: 8 },
    fieldInput: { backgroundColor: colors.card, borderRadius: 12, borderWidth: 1, borderColor: colors.border, height: 48, paddingHorizontal: 14, fontSize: 15, fontFamily: "Inter_400Regular", color: colors.foreground, marginBottom: 20 },
    colorRow: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 20 },
    colorDot: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
    colorDotActive: { borderWidth: 3, borderColor: "#fff" },
    modalPreview: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: colors.card, borderRadius: 14, padding: 14, marginBottom: 20 },
    modalPreviewName: { fontSize: 16, fontFamily: "Inter_600SemiBold", color: colors.foreground },
    saveBtn: { backgroundColor: colors.primary, borderRadius: 14, height: 52, alignItems: "center", justifyContent: "center", marginBottom: 10 },
    saveBtnText: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: "#fff" },
    cancelBtn: { height: 44, alignItems: "center", justifyContent: "center" },
    cancelBtnText: { fontSize: 14, fontFamily: "Inter_400Regular", color: colors.mutedForeground },
  });
