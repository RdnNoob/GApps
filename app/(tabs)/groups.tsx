import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { createGroup, getGroups, deleteGroup, Group } from "@/api/geonode";
import { useColors } from "@/hooks/useColors";

const GROUP_COLORS = ["#6366f1", "#ec4899", "#f59e0b", "#14b8a6", "#8b5cf6", "#ef4444"];

export default function GroupsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await getGroups();
      setGroups(data);
    } catch {} finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      await createGroup(newName.trim());
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setNewName("");
      setShowCreate(false);
      load();
    } catch {
      Alert.alert("Gagal", "Tidak bisa membuat grup");
    } finally {
      setCreating(false);
    }
  };

  const handleLongPress = (item: Group, index: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const isAdmin = item.role === "admin";
    const options: any[] = [
      {
        text: "Buka Grup",
        onPress: () => router.push(`/group/${item.id}?nama=${encodeURIComponent(item.nama)}`),
      },
    ];
    if (isAdmin) {
      options.push({
        text: "Hapus Grup",
        style: "destructive",
        onPress: () => {
          Alert.alert("Hapus Grup", `Hapus grup "${item.nama}"? Semua pesan akan hilang.`, [
            { text: "Batal", style: "cancel" },
            {
              text: "Hapus",
              style: "destructive",
              onPress: async () => {
                try {
                  await deleteGroup(item.id);
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  setGroups((prev) => prev.filter((g) => g.id !== item.id));
                } catch {
                  Alert.alert("Gagal", "Tidak bisa menghapus grup");
                }
              },
            },
          ]);
        },
      });
    }
    options.push({ text: "Batal", style: "cancel" });
    Alert.alert(item.nama, `${item.member_count} anggota · ${item.role}`, options);
  };

  const s = styles(colors);

  if (loading) {
    return (
      <View style={[s.center, { paddingTop: insets.top }]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={[s.container, { paddingTop: Platform.OS === "web" ? insets.top + 67 : 0 }]}>
      <View style={[s.header, { paddingTop: insets.top + 16 }]}>
        <Text style={s.title}>Grup</Text>
        <Pressable style={s.addBtn} onPress={() => setShowCreate(!showCreate)}>
          <Feather name={showCreate ? "x" : "plus"} size={20} color={colors.primary} />
        </Pressable>
      </View>

      {showCreate && (
        <View style={s.createBox}>
          <View style={s.createInputWrap}>
            <TextInput
              style={s.createInput}
              value={newName}
              onChangeText={setNewName}
              placeholder="Nama grup baru..."
              placeholderTextColor={colors.mutedForeground}
              onSubmitEditing={handleCreate}
            />
          </View>
          <Pressable style={[s.createConfirmBtn, creating && { opacity: 0.6 }]} onPress={handleCreate} disabled={creating}>
            {creating ? <ActivityIndicator color={colors.primaryForeground} size="small" /> : <Text style={s.createConfirmText}>Buat</Text>}
          </Pressable>
        </View>
      )}

      <FlatList
        data={groups}
        keyExtractor={(i) => String(i.id)}
        renderItem={({ item, index }) => (
          <Pressable
            style={s.card}
            onPress={() => router.push(`/group/${item.id}?nama=${encodeURIComponent(item.nama)}`)}
            onLongPress={() => handleLongPress(item, index)}
            delayLongPress={350}
          >
            <View style={[s.groupIcon, { backgroundColor: GROUP_COLORS[index % GROUP_COLORS.length] + "33" }]}>
              <Feather name="users" size={22} color={GROUP_COLORS[index % GROUP_COLORS.length]} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.cardName}>{item.nama}</Text>
              <Text style={s.cardSub}>{item.member_count} anggota · {item.role}</Text>
            </View>
            {item.role === "admin" && (
              <View style={s.adminBadge}>
                <Text style={s.adminText}>Admin</Text>
              </View>
            )}
            <Feather name="chevron-right" size={18} color={colors.mutedForeground} />
          </Pressable>
        )}
        ListEmptyComponent={
          <View style={s.empty}>
            <Feather name="users" size={40} color={colors.mutedForeground} />
            <Text style={s.emptyText}>Belum ada grup</Text>
            <Text style={s.emptySub}>Buat grup untuk berbagi lokasi bersama</Text>
          </View>
        }
        contentContainerStyle={{ paddingBottom: insets.bottom + 80 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.primary} />}
        scrollEnabled={groups.length > 0}
      />
    </View>
  );
}

const styles = (colors: ReturnType<typeof useColors>) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.background },
    header: { paddingHorizontal: 20, paddingBottom: 12, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
    title: { fontSize: 26, fontFamily: "Inter_700Bold", color: colors.foreground },
    addBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.card, alignItems: "center", justifyContent: "center" },
    createBox: { marginHorizontal: 16, marginBottom: 12, flexDirection: "row", gap: 8 },
    createInputWrap: { flex: 1, backgroundColor: colors.card, borderRadius: 12, borderWidth: 1, borderColor: colors.border },
    createInput: { height: 44, paddingHorizontal: 14, fontSize: 14, fontFamily: "Inter_400Regular", color: colors.foreground },
    createConfirmBtn: { backgroundColor: colors.primary, borderRadius: 12, paddingHorizontal: 18, justifyContent: "center" },
    createConfirmText: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: colors.primaryForeground },
    card: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 20, paddingVertical: 14 },
    groupIcon: { width: 46, height: 46, borderRadius: 14, alignItems: "center", justifyContent: "center" },
    cardName: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: colors.foreground },
    cardSub: { fontSize: 12, fontFamily: "Inter_400Regular", color: colors.mutedForeground, marginTop: 2 },
    adminBadge: { backgroundColor: "#6366f120", borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, marginRight: 4 },
    adminText: { fontSize: 11, fontFamily: "Inter_600SemiBold", color: "#6366f1" },
    empty: { alignItems: "center", justifyContent: "center", paddingTop: 80, gap: 12 },
    emptyText: { fontSize: 16, fontFamily: "Inter_600SemiBold", color: colors.foreground },
    emptySub: { fontSize: 13, fontFamily: "Inter_400Regular", color: colors.mutedForeground, textAlign: "center", paddingHorizontal: 40 },
  });
