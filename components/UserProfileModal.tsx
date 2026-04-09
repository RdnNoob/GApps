import { Feather } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { getUserById, User } from "@/api/geonode";
import { Avatar } from "@/components/Avatar";
import { useColors } from "@/hooks/useColors";

interface Props {
  userId: number | null;
  visible: boolean;
  onClose: () => void;
  onChat?: (user: User) => void;
}

export function UserProfileModal({ userId, visible, onClose, onChat }: Props) {
  const colors = useColors();
  const [user, setUser] = useState<(User & { is_online?: boolean; last_seen?: string }) | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (visible && userId) {
      setLoading(true);
      setUser(null);
      getUserById(userId)
        .then(setUser)
        .catch(() => {})
        .finally(() => setLoading(false));
    }
  }, [visible, userId]);

  const s = styles(colors);

  const formatWaktu = (tgl?: string) => {
    if (!tgl) return "Tidak diketahui";
    const d = new Date(tgl);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    if (diff < 60000) return "Baru saja";
    if (diff < 3600000) return `${Math.floor(diff / 60000)} menit lalu`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)} jam lalu`;
    return d.toLocaleDateString("id-ID");
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={s.overlay} onPress={onClose}>
        <Pressable style={s.card} onPress={() => {}}>
          {loading ? (
            <ActivityIndicator color={colors.primary} style={{ padding: 40 }} />
          ) : user ? (
            <>
              <View style={s.top}>
                <Avatar name={user.nama} color={user.avatar_warna} size={72} online={user.is_online} />
                <View style={s.onlineBadge}>
                  <View style={[s.onlineDot, { backgroundColor: user.is_online ? "#22c55e" : "#64748b" }]} />
                  <Text style={[s.onlineText, { color: user.is_online ? "#22c55e" : "#64748b" }]}>
                    {user.is_online ? "Online" : `Terakhir ${formatWaktu(user.last_seen)}`}
                  </Text>
                </View>
              </View>

              <Text style={s.nama}>{user.nama}</Text>
              <Text style={s.email}>{user.email}</Text>

              <View style={s.kodePill}>
                <Feather name="hash" size={13} color={colors.primary} />
                <Text style={s.kodeText}>{user.kode}</Text>
              </View>

              <Text style={s.joinText}>
                Bergabung {new Date(user.created_at ?? "").toLocaleDateString("id-ID", { year: "numeric", month: "long" })}
              </Text>

              {onChat && (
                <Pressable
                  style={({ pressed }) => [s.chatBtn, pressed && { opacity: 0.8 }]}
                  onPress={() => { onClose(); onChat(user); }}
                >
                  <Feather name="message-circle" size={16} color="#fff" />
                  <Text style={s.chatBtnText}>Kirim Pesan</Text>
                </Pressable>
              )}

              <Pressable style={s.closeBtn} onPress={onClose}>
                <Text style={s.closeBtnText}>Tutup</Text>
              </Pressable>
            </>
          ) : (
            <Text style={s.errorText}>Gagal memuat profil</Text>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = (colors: ReturnType<typeof useColors>) =>
  StyleSheet.create({
    overlay: { flex: 1, backgroundColor: "#00000070", alignItems: "center", justifyContent: "center", padding: 24 },
    card: { backgroundColor: colors.background, borderRadius: 24, padding: 24, width: "100%", maxWidth: 340, alignItems: "center" },
    top: { alignItems: "center", marginBottom: 12 },
    onlineBadge: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 8 },
    onlineDot: { width: 8, height: 8, borderRadius: 4 },
    onlineText: { fontSize: 12, fontFamily: "Inter_500Medium" },
    nama: { fontSize: 22, fontFamily: "Inter_700Bold", color: colors.foreground, textAlign: "center" },
    email: { fontSize: 13, fontFamily: "Inter_400Regular", color: colors.mutedForeground, marginTop: 4, textAlign: "center" },
    kodePill: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: colors.card, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7, marginTop: 12, borderWidth: 1, borderColor: colors.border },
    kodeText: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: colors.foreground },
    joinText: { fontSize: 12, fontFamily: "Inter_400Regular", color: colors.mutedForeground, marginTop: 10, marginBottom: 20 },
    chatBtn: { backgroundColor: colors.primary, borderRadius: 14, height: 46, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, width: "100%", marginBottom: 10 },
    chatBtnText: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: "#fff" },
    closeBtn: { height: 40, alignItems: "center", justifyContent: "center", width: "100%" },
    closeBtnText: { fontSize: 14, fontFamily: "Inter_400Regular", color: colors.mutedForeground },
    errorText: { fontSize: 14, fontFamily: "Inter_400Regular", color: colors.mutedForeground, padding: 20 },
  });
