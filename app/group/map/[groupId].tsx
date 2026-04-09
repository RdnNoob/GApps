import { Feather } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Avatar } from "@/components/Avatar";
import { getGroupMap, GroupMapMember } from "@/api/geonode";
import { useColors } from "@/hooks/useColors";
import { useLanguage } from "@/context/LanguageContext";

function timeAgo(dateStr: string, t: ReturnType<typeof useLanguage>["t"]): string {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60) return diff + "d";
  if (diff < 3600) return Math.floor(diff / 60) + "m";
  if (diff < 86400) return Math.floor(diff / 3600) + "j";
  return Math.floor(diff / 86400) + "h";
}

export default function GroupMapScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { t } = useLanguage();
  const { groupId, nama } = useLocalSearchParams<{ groupId: string; nama: string }>();
  const gid = Number(groupId);
  const groupNama = decodeURIComponent(nama ?? "Grup");

  const [members, setMembers] = useState<GroupMapMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await getGroupMap(gid);
      setMembers(data);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal memuat");
    } finally {
      setLoading(false);
    }
  }, [gid]);

  useEffect(() => {
    load();
    pollRef.current = setInterval(load, 5000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [load]);

  const withLocation = members.filter((m) => m.lat != null && m.lng != null);
  const noLocation = members.filter((m) => m.lat == null || m.lng == null);

  const s = styles(colors);

  return (
    <View style={[s.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={s.header}>
        <Pressable style={s.backBtn} onPress={() => router.back()}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </Pressable>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={s.headerTitle}>{t.groupMap}</Text>
          <Text style={s.headerSub}>{groupNama}</Text>
        </View>
        <Pressable style={s.refreshBtn} onPress={load}>
          <Feather name="refresh-cw" size={18} color={colors.primary} />
        </Pressable>
      </View>

      {loading ? (
        <View style={s.center}>
          <ActivityIndicator color={colors.primary} size="large" />
          <Text style={s.loadingText}>{t.loading}</Text>
        </View>
      ) : error ? (
        <View style={s.center}>
          <Feather name="wifi-off" size={40} color={colors.mutedForeground} />
          <Text style={s.errorText}>{error}</Text>
          <Pressable style={s.retryBtn} onPress={load}>
            <Text style={s.retryText}>Coba Lagi</Text>
          </Pressable>
        </View>
      ) : (
        <ScrollView contentContainerStyle={[s.scroll, { paddingBottom: insets.bottom + 24 }]}>
          {/* Stats Row */}
          <View style={s.statsRow}>
            <View style={s.statCard}>
              <Text style={s.statNum}>{members.length}</Text>
              <Text style={s.statLabel}>{t.members}</Text>
            </View>
            <View style={s.statCard}>
              <Text style={[s.statNum, { color: colors.primary }]}>{withLocation.length}</Text>
              <Text style={s.statLabel}>Aktif</Text>
            </View>
            <View style={s.statCard}>
              <Text style={[s.statNum, { color: colors.mutedForeground }]}>{noLocation.length}</Text>
              <Text style={s.statLabel}>Belum ada lokasi</Text>
            </View>
          </View>

          {/* Members with location */}
          {withLocation.length > 0 && (
            <>
              <Text style={s.sectionTitle}>📍 {t.groupMapSub}</Text>
              {withLocation.map((m) => (
                <View key={m.user_id} style={s.memberCard}>
                  <View style={s.memberLeft}>
                    <Avatar name={m.nama} color={m.avatar_warna} size={44} />
                    <View style={s.onlineDot} />
                  </View>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={s.memberName}>{m.nama}</Text>
                    <Text style={s.memberSub}>#{m.kode}</Text>
                    {m.lat != null && m.lng != null && (
                      <Text style={s.coordText}>
                        📍 {m.lat!.toFixed(5)}, {m.lng!.toFixed(5)}
                      </Text>
                    )}
                    {m.last_seen && (
                      <Text style={s.timeText}>
                        🕐 {timeAgo(m.last_seen, t)} lalu
                      </Text>
                    )}
                  </View>
                  <View style={[s.rolePill, m.role === "admin" && s.rolePillAdmin]}>
                    <Text style={[s.roleText, m.role === "admin" && s.roleTextAdmin]}>
                      {m.role === "admin" ? t.admin : t.member}
                    </Text>
                  </View>
                </View>
              ))}
            </>
          )}

          {/* Members without location */}
          {noLocation.length > 0 && (
            <>
              <Text style={[s.sectionTitle, { marginTop: 20 }]}>⏳ Belum Ada Lokasi</Text>
              {noLocation.map((m) => (
                <View key={m.user_id} style={[s.memberCard, { opacity: 0.6 }]}>
                  <Avatar name={m.nama} color={m.avatar_warna} size={44} />
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={s.memberName}>{m.nama}</Text>
                    <Text style={s.memberSub}>#{m.kode} · {t.noLocation}</Text>
                  </View>
                  <View style={s.rolePill}>
                    <Text style={s.roleText}>
                      {m.role === "admin" ? t.admin : t.member}
                    </Text>
                  </View>
                </View>
              ))}
            </>
          )}

          {members.length === 0 && (
            <View style={s.empty}>
              <Feather name="map-pin" size={48} color={colors.mutedForeground} />
              <Text style={s.emptyTitle}>{t.noLocation}</Text>
              <Text style={s.emptySub}>{t.groupMapSub}</Text>
            </View>
          )}

          {/* Map hint */}
          <View style={s.hintCard}>
            <Feather name="info" size={16} color={colors.primary} />
            <Text style={s.hintText}>
              Lokasi diperbarui otomatis setiap 5 detik. Pastikan anggota mengizinkan akses lokasi.
            </Text>
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const styles = (colors: ReturnType<typeof useColors>) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    backBtn: { padding: 4 },
    headerTitle: { fontSize: 16, fontFamily: "Inter_700Bold", color: colors.foreground },
    headerSub: { fontSize: 12, fontFamily: "Inter_400Regular", color: colors.mutedForeground },
    refreshBtn: {
      width: 36, height: 36, borderRadius: 18,
      backgroundColor: colors.card, alignItems: "center", justifyContent: "center",
    },
    center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
    loadingText: { fontSize: 14, fontFamily: "Inter_400Regular", color: colors.mutedForeground },
    errorText: { fontSize: 14, fontFamily: "Inter_500Medium", color: colors.foreground, textAlign: "center", paddingHorizontal: 32 },
    retryBtn: { backgroundColor: colors.primary, borderRadius: 12, paddingHorizontal: 24, paddingVertical: 10, marginTop: 8 },
    retryText: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: "#fff" },
    scroll: { padding: 16 },
    statsRow: { flexDirection: "row", gap: 10, marginBottom: 20 },
    statCard: {
      flex: 1, backgroundColor: colors.card, borderRadius: 14,
      padding: 14, alignItems: "center", borderWidth: 1, borderColor: colors.border,
    },
    statNum: { fontSize: 24, fontFamily: "Inter_700Bold", color: colors.foreground },
    statLabel: { fontSize: 11, fontFamily: "Inter_400Regular", color: colors.mutedForeground, marginTop: 2, textAlign: "center" },
    sectionTitle: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: colors.mutedForeground, marginBottom: 10 },
    memberCard: {
      flexDirection: "row", alignItems: "center",
      backgroundColor: colors.card, borderRadius: 14,
      padding: 12, marginBottom: 8, borderWidth: 1, borderColor: colors.border,
    },
    memberLeft: { position: "relative" },
    onlineDot: {
      position: "absolute", bottom: 0, right: 0,
      width: 10, height: 10, borderRadius: 5,
      backgroundColor: "#22c55e", borderWidth: 1.5, borderColor: colors.card,
    },
    memberName: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: colors.foreground },
    memberSub: { fontSize: 12, fontFamily: "Inter_400Regular", color: colors.mutedForeground },
    coordText: { fontSize: 11, fontFamily: "Inter_400Regular", color: colors.primary, marginTop: 2 },
    timeText: { fontSize: 11, fontFamily: "Inter_400Regular", color: colors.mutedForeground, marginTop: 1 },
    rolePill: {
      backgroundColor: colors.background, borderRadius: 8,
      paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: colors.border,
    },
    rolePillAdmin: { backgroundColor: "#6366f120", borderColor: "#6366f140" },
    roleText: { fontSize: 11, fontFamily: "Inter_600SemiBold", color: colors.mutedForeground },
    roleTextAdmin: { color: "#6366f1" },
    empty: { alignItems: "center", gap: 12, paddingVertical: 60 },
    emptyTitle: { fontSize: 16, fontFamily: "Inter_600SemiBold", color: colors.foreground },
    emptySub: { fontSize: 13, fontFamily: "Inter_400Regular", color: colors.mutedForeground, textAlign: "center" },
    hintCard: {
      flexDirection: "row", gap: 10, alignItems: "flex-start",
      backgroundColor: colors.card + "80", borderRadius: 12,
      padding: 14, marginTop: 20, borderWidth: 1, borderColor: colors.border,
    },
    hintText: { flex: 1, fontSize: 12, fontFamily: "Inter_400Regular", color: colors.mutedForeground, lineHeight: 18 },
  });
