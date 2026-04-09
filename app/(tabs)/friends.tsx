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
import { addFriend, acceptFriend, rejectFriend, getFriends, getFriendRequests, deleteFriend, Friend, FriendRequest, User } from "@/api/geonode";
import { Avatar } from "@/components/Avatar";
import { UserProfileModal } from "@/components/UserProfileModal";
import { useColors } from "@/hooks/useColors";

export default function FriendsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [friends, setFriends] = useState<Friend[]>([]);
  const [requests, setRequests] = useState<FriendRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [addCode, setAddCode] = useState("");
  const [addLoading, setAddLoading] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [profileUserId, setProfileUserId] = useState<number | null>(null);

  const load = useCallback(async () => {
    try {
      const [f, r] = await Promise.all([getFriends(), getFriendRequests()]);
      setFriends(f);
      setRequests(r);
    } catch {} finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleAdd = async () => {
    if (!addCode.trim()) return;
    setAddLoading(true);
    try {
      await addFriend(addCode.trim());
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setAddCode("");
      setShowAdd(false);
      load();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Gagal";
      Alert.alert("Gagal", msg.includes("not found") || msg.includes("tidak") ? "Kode tidak ditemukan" : "Gagal menambah teman");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setAddLoading(false);
    }
  };

  const handleAccept = async (id: number) => {
    try {
      await acceptFriend(id);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      load();
    } catch {}
  };

  const handleReject = async (id: number) => {
    try {
      await rejectFriend(id);
      load();
    } catch {}
  };

  const handleDeleteFriend = (friend: Friend) => {
    Alert.alert(
      "Hapus Teman",
      `Hapus ${friend.nama} dari daftar teman?`,
      [
        { text: "Batal", style: "cancel" },
        {
          text: "Hapus",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteFriend(friend.id);
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              setFriends((prev) => prev.filter((f) => f.id !== friend.id));
            } catch {
              Alert.alert("Gagal", "Tidak bisa menghapus teman");
            }
          },
        },
      ]
    );
  };

  const handleFriendLongPress = (friend: Friend) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(friend.nama, undefined, [
      { text: "Lihat Profil", onPress: () => setProfileUserId(friend.id) },
      { text: "Kirim Pesan", onPress: () => router.push(`/chat/${friend.id}?nama=${encodeURIComponent(friend.nama)}`) },
      { text: "Hapus Teman", style: "destructive", onPress: () => handleDeleteFriend(friend) },
      { text: "Batal", style: "cancel" },
    ]);
  };

  const s = styles(colors);

  const renderFriend = ({ item }: { item: Friend }) => (
    <Pressable
      style={s.card}
      onPress={() => router.push(`/chat/${item.id}?nama=${encodeURIComponent(item.nama)}`)}
      onLongPress={() => handleFriendLongPress(item)}
    >
      <Pressable onPress={() => setProfileUserId(item.id)}>
        <Avatar name={item.nama} color={item.avatar_warna} size={46} online={item.online} />
      </Pressable>
      <View style={{ flex: 1 }}>
        <Text style={s.cardName}>{item.nama}</Text>
        <Text style={s.cardSub}>{item.kode} · {item.online ? "Online" : "Offline"}</Text>
      </View>
      <Feather name="message-circle" size={20} color={colors.mutedForeground} />
    </Pressable>
  );

  const renderRequest = ({ item }: { item: FriendRequest }) => (
    <View style={[s.card, { gap: 10 }]}>
      <Avatar name={item.dari_nama} color={item.dari_avatar_warna} size={44} />
      <View style={{ flex: 1 }}>
        <Text style={s.cardName}>{item.dari_nama}</Text>
        <Text style={s.cardSub}>{item.dari_kode}</Text>
      </View>
      <Pressable style={s.acceptBtn} onPress={() => handleAccept(item.id)}>
        <Feather name="check" size={16} color={colors.primaryForeground} />
      </Pressable>
      <Pressable style={s.rejectBtn} onPress={() => handleReject(item.id)}>
        <Feather name="x" size={16} color="#ef4444" />
      </Pressable>
    </View>
  );

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
        <Text style={s.title}>Teman</Text>
        <Pressable style={s.addBtn} onPress={() => setShowAdd(!showAdd)}>
          <Feather name={showAdd ? "x" : "user-plus"} size={20} color={colors.primary} />
        </Pressable>
      </View>

      {showAdd && (
        <View style={s.addBox}>
          <View style={s.addInputWrap}>
            <TextInput
              style={s.addInput}
              value={addCode}
              onChangeText={setAddCode}
              placeholder="Masukkan kode teman (#XXXXXX)"
              placeholderTextColor={colors.mutedForeground}
              autoCapitalize="characters"
              onSubmitEditing={handleAdd}
            />
          </View>
          <Pressable style={[s.addConfirmBtn, addLoading && { opacity: 0.6 }]} onPress={handleAdd} disabled={addLoading}>
            {addLoading ? <ActivityIndicator color={colors.primaryForeground} size="small" /> : <Text style={s.addConfirmText}>Tambah</Text>}
          </Pressable>
        </View>
      )}

      <FlatList
        data={friends}
        keyExtractor={(i) => String(i.id)}
        renderItem={renderFriend}
        ListHeaderComponent={
          requests.length > 0 ? (
            <View>
              <Text style={s.sectionLabel}>Permintaan Teman ({requests.length})</Text>
              {requests.map((r) => renderRequest({ item: r }))}
              <Text style={s.sectionLabel}>Teman ({friends.length})</Text>
            </View>
          ) : friends.length === 0 ? null : (
            <Text style={s.sectionLabel}>Teman ({friends.length})</Text>
          )
        }
        ListEmptyComponent={
          requests.length === 0 ? (
            <View style={s.empty}>
              <Feather name="users" size={40} color={colors.mutedForeground} />
              <Text style={s.emptyText}>Belum ada teman</Text>
              <Text style={s.emptySub}>Tambah teman menggunakan kode unik mereka</Text>
            </View>
          ) : null
        }
        contentContainerStyle={{ paddingBottom: insets.bottom + 80 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.primary} />}
        scrollEnabled={friends.length > 0 || requests.length > 0}
      />

      <UserProfileModal
        userId={profileUserId}
        visible={profileUserId !== null}
        onClose={() => setProfileUserId(null)}
        onChat={(user) => router.push(`/chat/${user.id}?nama=${encodeURIComponent(user.nama)}`)}
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
    addBox: { marginHorizontal: 16, marginBottom: 12, flexDirection: "row", gap: 8 },
    addInputWrap: { flex: 1, backgroundColor: colors.card, borderRadius: 12, borderWidth: 1, borderColor: colors.border },
    addInput: { height: 44, paddingHorizontal: 14, fontSize: 14, fontFamily: "Inter_400Regular", color: colors.foreground },
    addConfirmBtn: { backgroundColor: colors.primary, borderRadius: 12, paddingHorizontal: 18, justifyContent: "center" },
    addConfirmText: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: colors.primaryForeground },
    sectionLabel: { fontSize: 12, fontFamily: "Inter_600SemiBold", color: colors.mutedForeground, paddingHorizontal: 20, paddingTop: 16, paddingBottom: 6, textTransform: "uppercase", letterSpacing: 0.8 },
    card: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 20, paddingVertical: 12 },
    cardName: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: colors.foreground },
    cardSub: { fontSize: 12, fontFamily: "Inter_400Regular", color: colors.mutedForeground, marginTop: 2 },
    acceptBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" },
    rejectBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: "#ef444420", alignItems: "center", justifyContent: "center" },
    empty: { alignItems: "center", justifyContent: "center", paddingTop: 80, gap: 12 },
    emptyText: { fontSize: 16, fontFamily: "Inter_600SemiBold", color: colors.foreground },
    emptySub: { fontSize: 13, fontFamily: "Inter_400Regular", color: colors.mutedForeground, textAlign: "center", paddingHorizontal: 40 },
  });
