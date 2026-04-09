import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  AdminStats,
  AdminUser,
  adminGetStats,
  adminGetUsers,
  adminToggleMaintenance,
  adminForceLogout,
  adminDeleteUser,
} from "@/api/geonode";
import { useColors } from "@/hooks/useColors";

type Tab = "stats" | "users" | "control";

export default function AdminScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [adminToken, setAdminToken] = useState<string | null>(null);
  const [adminName, setAdminName] = useState("");
  const [activeTab, setActiveTab] = useState<Tab>("stats");
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [maintenance, setMaintenance] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    AsyncStorage.multiGet(["admin_token", "admin_username"]).then(values => {
      const token = values[0][1];
      const name = values[1][1] || "Admin";
      if (!token) { router.replace("/admin-login"); return; }
      setAdminToken(token);
      setAdminName(name);
    });
  }, []);

  const loadData = useCallback(async (token: string) => {
    try {
      const [s, u] = await Promise.all([adminGetStats(token), adminGetUsers(token)]);
      setStats(s);
      setUsers(u);
    } catch {
      router.replace("/admin-login");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (adminToken) loadData(adminToken);
  }, [adminToken, loadData]);

  const onRefresh = () => {
    setRefreshing(true);
    if (adminToken) loadData(adminToken);
  };

  const handleLogout = async () => {
    await AsyncStorage.multiRemove(["admin_token", "admin_username"]);
    router.replace("/login");
  };

  const toggleMaintenance = async (val: boolean) => {
    if (!adminToken) return;
    try {
      await adminToggleMaintenance(adminToken, val);
      setMaintenance(val);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  };

  const handleForceLogout = (user: AdminUser) => {
    Alert.alert("Force Logout", `Paksa logout ${user.nama}?`, [
      { text: "Batal", style: "cancel" },
      {
        text: "Ya", style: "destructive",
        onPress: async () => {
          if (!adminToken) return;
          await adminForceLogout(adminToken, user.id).catch(() => {});
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
      }
    ]);
  };

  const handleDeleteUser = (user: AdminUser) => {
    Alert.alert("Hapus Pengguna", `Hapus akun ${user.nama}? Tindakan ini tidak dapat dibatalkan.`, [
      { text: "Batal", style: "cancel" },
      {
        text: "Hapus", style: "destructive",
        onPress: async () => {
          if (!adminToken) return;
          await adminDeleteUser(adminToken, user.id).catch(() => {});
          setUsers(prev => prev.filter(u => u.id !== user.id));
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
      }
    ]);
  };

  const formatWaktu = (tgl: string) => {
    const d = new Date(tgl);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    if (diff < 60000) return "Baru saja";
    if (diff < 3600000) return `${Math.floor(diff / 60000)} mnt lalu`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)} jam lalu`;
    return d.toLocaleDateString("id-ID");
  };

  const s = styles(colors);

  if (loading) {
    return (
      <View style={[s.container, { alignItems: "center", justifyContent: "center" }]}>
        <ActivityIndicator color="#f59e0b" size="large" />
      </View>
    );
  }

  return (
    <View style={[s.container, { paddingTop: insets.top }]}>
      <View style={s.header}>
        <View style={s.headerLeft}>
          <Feather name="shield" size={20} color="#f59e0b" />
          <Text style={s.headerTitle}>Admin Panel</Text>
        </View>
        <View style={s.headerRight}>
          <Text style={s.adminName}>{adminName}</Text>
          <Pressable onPress={handleLogout} style={s.logoutBtn}>
            <Feather name="log-out" size={18} color="#ef4444" />
          </Pressable>
        </View>
      </View>

      <View style={s.tabs}>
        {(["stats", "users", "control"] as Tab[]).map(tab => (
          <Pressable key={tab} style={[s.tab, activeTab === tab && s.tabActive]} onPress={() => setActiveTab(tab)}>
            <Text style={[s.tabText, activeTab === tab && s.tabTextActive]}>
              {tab === "stats" ? "Statistik" : tab === "users" ? "Pengguna" : "Kontrol"}
            </Text>
          </Pressable>
        ))}
      </View>

      {activeTab === "stats" && stats && (
        <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#f59e0b" />} style={s.content}>
          <View style={s.statsGrid}>
            {[
              { label: "Total Pengguna", value: stats.total_pengguna, icon: "users", color: "#3b82f6" },
              { label: "Online Sekarang", value: stats.pengguna_online, icon: "wifi", color: "#22c55e" },
              { label: "Total Pertemanan", value: stats.total_pertemanan, icon: "heart", color: "#ec4899" },
              { label: "Total Pesan", value: stats.total_pesan, icon: "message-circle", color: "#8b5cf6" },
              { label: "Daftar Hari Ini", value: stats.pendaftaran_hari_ini, icon: "user-plus", color: "#f59e0b" },
            ].map(item => (
              <View key={item.label} style={s.statCard}>
                <Feather name={item.icon as "users"} size={20} color={item.color} />
                <Text style={[s.statValue, { color: item.color }]}>{item.value}</Text>
                <Text style={s.statLabel}>{item.label}</Text>
              </View>
            ))}
          </View>

          <Text style={s.sectionTitle}>Pengguna Terbaru</Text>
          {stats.recent_users.map(u => (
            <View key={u.id} style={s.logItem}>
              <View style={[s.onlineDot, { backgroundColor: u.is_online ? "#22c55e" : "#ef4444" }]} />
              <View style={{ flex: 1 }}>
                <Text style={s.logName}>{u.nama}</Text>
                <Text style={s.logDetail}>{u.email}</Text>
              </View>
              <Text style={s.logTime}>{formatWaktu(u.created_at)}</Text>
            </View>
          ))}

          <Text style={s.sectionTitle}>Aktivitas Terbaru</Text>
          {stats.recent_logs.slice(0, 10).map(l => (
            <View key={l.id} style={s.logItem}>
              <Feather name="activity" size={14} color={colors.mutedForeground} />
              <View style={{ flex: 1 }}>
                <Text style={s.logName}>{l.aksi}</Text>
                <Text style={s.logDetail}>{l.nama || "-"}</Text>
              </View>
              <Text style={s.logTime}>{formatWaktu(l.created_at)}</Text>
            </View>
          ))}
        </ScrollView>
      )}

      {activeTab === "users" && (
        <FlatList
          data={users}
          keyExtractor={u => String(u.id)}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#f59e0b" />}
          renderItem={({ item }) => (
            <View style={s.userCard}>
              <View style={[s.onlineDot, { backgroundColor: item.is_online ? "#22c55e" : "#64748b" }]} />
              <View style={{ flex: 1 }}>
                <Text style={s.userName}>{item.nama}</Text>
                <Text style={s.userDetail}>{item.email} · {item.kode}</Text>
              </View>
              <View style={s.userActions}>
                <Pressable onPress={() => handleForceLogout(item)} style={s.actionBtn}>
                  <Feather name="log-out" size={16} color="#f59e0b" />
                </Pressable>
                <Pressable onPress={() => handleDeleteUser(item)} style={s.actionBtn}>
                  <Feather name="trash-2" size={16} color="#ef4444" />
                </Pressable>
              </View>
            </View>
          )}
          contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
        />
      )}

      {activeTab === "control" && (
        <ScrollView style={s.content} contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}>
          <View style={s.controlCard}>
            <View style={s.controlRow}>
              <View style={{ flex: 1 }}>
                <Text style={s.controlTitle}>Mode Maintenance</Text>
                <Text style={s.controlDesc}>Nonaktifkan akses pengguna sementara</Text>
              </View>
              <Switch value={maintenance} onValueChange={toggleMaintenance} trackColor={{ true: "#f59e0b" }} />
            </View>
          </View>

          <View style={s.infoCard}>
            <Feather name="info" size={16} color={colors.mutedForeground} />
            <Text style={s.infoText}>Ketuk logo GeoNode 2x di halaman login untuk masuk panel ini</Text>
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const styles = (colors: ReturnType<typeof useColors>) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.border },
    headerLeft: { flexDirection: "row", alignItems: "center", gap: 8 },
    headerTitle: { fontSize: 18, fontFamily: "Inter_700Bold", color: "#f59e0b" },
    headerRight: { flexDirection: "row", alignItems: "center", gap: 10 },
    adminName: { fontSize: 13, fontFamily: "Inter_500Medium", color: colors.mutedForeground },
    logoutBtn: { padding: 6 },
    tabs: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: colors.border },
    tab: { flex: 1, paddingVertical: 12, alignItems: "center" },
    tabActive: { borderBottomWidth: 2, borderBottomColor: "#f59e0b" },
    tabText: { fontSize: 13, fontFamily: "Inter_500Medium", color: colors.mutedForeground },
    tabTextActive: { color: "#f59e0b", fontFamily: "Inter_600SemiBold" },
    content: { flex: 1, paddingHorizontal: 16, paddingTop: 16 },
    statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12, marginBottom: 20 },
    statCard: { backgroundColor: colors.card, borderRadius: 12, padding: 14, alignItems: "center", gap: 6, flex: 1, minWidth: "40%" },
    statValue: { fontSize: 24, fontFamily: "Inter_700Bold" },
    statLabel: { fontSize: 11, fontFamily: "Inter_400Regular", color: colors.mutedForeground, textAlign: "center" },
    sectionTitle: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: colors.foreground, marginBottom: 10, marginTop: 4 },
    logItem: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.border },
    onlineDot: { width: 8, height: 8, borderRadius: 4 },
    logName: { fontSize: 13, fontFamily: "Inter_500Medium", color: colors.foreground },
    logDetail: { fontSize: 11, fontFamily: "Inter_400Regular", color: colors.mutedForeground },
    logTime: { fontSize: 11, fontFamily: "Inter_400Regular", color: colors.mutedForeground },
    userCard: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 12, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: colors.border },
    userName: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: colors.foreground },
    userDetail: { fontSize: 12, fontFamily: "Inter_400Regular", color: colors.mutedForeground },
    userActions: { flexDirection: "row", gap: 8 },
    actionBtn: { padding: 8 },
    controlCard: { backgroundColor: colors.card, borderRadius: 12, padding: 16, marginBottom: 16 },
    controlRow: { flexDirection: "row", alignItems: "center" },
    controlTitle: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: colors.foreground },
    controlDesc: { fontSize: 12, fontFamily: "Inter_400Regular", color: colors.mutedForeground, marginTop: 2 },
    infoCard: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: colors.card, borderRadius: 12, padding: 14 },
    infoText: { flex: 1, fontSize: 12, fontFamily: "Inter_400Regular", color: colors.mutedForeground },
  });
