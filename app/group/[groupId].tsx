import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router, useLocalSearchParams } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  addGroupMember, getGroupMembers, getGroupMessages, sendGroupMessage,
  deleteGroupMessage, kickMember, changeMemberRole, renameGroup, deleteGroup,
  Message, GroupMember,
} from "@/api/geonode";
import { Avatar } from "@/components/Avatar";
import { UserProfileModal } from "@/components/UserProfileModal";
import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";

export default function GroupScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { groupId, nama } = useLocalSearchParams<{ groupId: string; nama: string }>();
  const gid = Number(groupId);
  const [groupNama, setGroupNama] = useState(decodeURIComponent(nama ?? "Grup"));
  const [messages, setMessages] = useState<Message[]>([]);
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showAddMember, setShowAddMember] = useState(false);
  const [addCode, setAddCode] = useState("");
  const [addLoading, setAddLoading] = useState(false);
  const [renameText, setRenameText] = useState("");
  const [renaming, setRenaming] = useState(false);
  const [profileUserId, setProfileUserId] = useState<number | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const myMember = members.find((m) => m.user_id === user?.id);
  const isAdmin = myMember?.role === "admin";

  const load = useCallback(async () => {
    try {
      const [msgs, mems] = await Promise.all([getGroupMessages(gid), getGroupMembers(gid)]);
      setMessages([...msgs].reverse());
      setMembers(mems);
    } catch {} finally {
      setLoading(false);
    }
  }, [gid]);

  useEffect(() => {
    load();
    pollRef.current = setInterval(load, 3000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [load]);

  const handleSend = async () => {
    const trimmed = text.trim();
    if (!trimmed || sending) return;
    setSending(true);
    setText("");
    try {
      const msg = await sendGroupMessage(gid, trimmed);
      setMessages((prev) => [{ ...msg, is_mine: true }, ...prev]);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {
      setText(trimmed);
    } finally {
      setSending(false);
    }
  };

  const handleLongPressMsg = (item: Message) => {
    if (!item.is_mine && !isAdmin) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert("Hapus Pesan", "Hapus pesan ini?", [
      { text: "Batal", style: "cancel" },
      {
        text: "Hapus", style: "destructive",
        onPress: async () => {
          try {
            await deleteGroupMessage(gid, item.id);
            setMessages((prev) => prev.filter((m) => m.id !== item.id));
          } catch { Alert.alert("Gagal", "Tidak bisa menghapus pesan"); }
        },
      },
    ]);
  };

  const handleAddMember = async () => {
    if (!addCode.trim()) return;
    setAddLoading(true);
    try {
      await addGroupMember(gid, addCode.trim());
      setAddCode("");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      load();
    } catch {
      Alert.alert("Gagal", "Kode tidak ditemukan atau sudah anggota");
    } finally {
      setAddLoading(false);
    }
  };

  const handleRename = async () => {
    if (!renameText.trim()) return;
    setRenaming(true);
    try {
      await renameGroup(gid, renameText.trim());
      setGroupNama(renameText.trim());
      setRenameText("");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      Alert.alert("Gagal", "Tidak bisa mengubah nama grup");
    } finally {
      setRenaming(false);
    }
  };

  const handleKick = (member: GroupMember) => {
    Alert.alert("Keluarkan Anggota", `Keluarkan ${member.nama} dari grup?`, [
      { text: "Batal", style: "cancel" },
      {
        text: "Keluarkan", style: "destructive",
        onPress: async () => {
          try {
            await kickMember(gid, member.user_id);
            setMembers((prev) => prev.filter((m) => m.user_id !== member.user_id));
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          } catch { Alert.alert("Gagal", "Tidak bisa mengeluarkan anggota"); }
        },
      },
    ]);
  };

  const handleChangeRole = (member: GroupMember) => {
    const newRole = member.role === "admin" ? "member" : "admin";
    Alert.alert(
      "Ubah Role",
      `Jadikan ${member.nama} sebagai ${newRole === "admin" ? "Admin" : "Member"}?`,
      [
        { text: "Batal", style: "cancel" },
        {
          text: "Ubah",
          onPress: async () => {
            try {
              await changeMemberRole(gid, member.user_id, newRole);
              setMembers((prev) => prev.map((m) => m.user_id === member.user_id ? { ...m, role: newRole } : m));
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            } catch { Alert.alert("Gagal", "Tidak bisa mengubah role"); }
          },
        },
      ]
    );
  };

  const handleDeleteGroup = () => {
    Alert.alert("Hapus Grup", `Hapus grup "${groupNama}"? Semua pesan akan hilang.`, [
      { text: "Batal", style: "cancel" },
      {
        text: "Hapus", style: "destructive",
        onPress: async () => {
          try {
            await deleteGroup(gid);
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            router.replace("/(tabs)/groups");
          } catch { Alert.alert("Gagal", "Tidak bisa menghapus grup"); }
        },
      },
    ]);
  };

  const handleMemberPress = (member: GroupMember) => {
    if (member.user_id === user?.id) return;
    const actions: any[] = [
      { text: "Lihat Profil", onPress: () => setProfileUserId(member.user_id) },
    ];
    if (isAdmin) {
      actions.push({ text: member.role === "admin" ? "Jadikan Member" : "Jadikan Admin", onPress: () => handleChangeRole(member) });
      actions.push({ text: "Keluarkan dari Grup", style: "destructive", onPress: () => handleKick(member) });
    }
    actions.push({ text: "Batal", style: "cancel" });
    Alert.alert(member.nama, member.role === "admin" ? "Admin Grup" : "Anggota", actions);
  };

  const s = styles(colors);

  return (
    <KeyboardAvoidingView style={s.container} behavior="padding" keyboardVerticalOffset={0}>
      {/* Header */}
      <View style={[s.header, { paddingTop: insets.top + 12 }]}>
        <Pressable style={s.backBtn} onPress={() => router.back()}>
          <Feather name="arrow-left" size={20} color={colors.foreground} />
        </Pressable>
        <View style={[s.groupIconSmall, { backgroundColor: "#6366f133" }]}>
          <Feather name="users" size={18} color="#6366f1" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.headerName}>{groupNama}</Text>
          <Text style={s.headerSub}>{members.length} anggota</Text>
        </View>
        <Pressable style={s.settingsBtn} onPress={() => setShowSettings(true)}>
          <Feather name="settings" size={20} color={colors.mutedForeground} />
        </Pressable>
      </View>

      {loading ? (
        <View style={s.center}><ActivityIndicator color={colors.primary} /></View>
      ) : (
        <FlatList
          data={messages}
          keyExtractor={(m) => String(m.id)}
          inverted
          renderItem={({ item }) => (
            <Pressable
              style={[s.bubbleWrap, item.is_mine && s.bubbleWrapMine]}
              onLongPress={() => handleLongPressMsg(item)}
              delayLongPress={350}
            >
              {!item.is_mine && item.from_nama && (
                <Text style={s.senderName}>{item.from_nama}</Text>
              )}
              <View style={[s.bubble, item.is_mine ? s.bubbleMine : s.bubbleThem]}>
                <Text style={[s.bubbleText, item.is_mine && s.bubbleTextMine]}>{item.content}</Text>
                <Text style={[s.bubbleTime, item.is_mine && s.bubbleTimeMine]}>
                  {new Date(item.created_at).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
                </Text>
              </View>
            </Pressable>
          )}
          ListEmptyComponent={
            <View style={s.emptyCenter}>
              <Feather name="message-circle" size={36} color={colors.mutedForeground} />
              <Text style={s.emptyText}>Belum ada pesan</Text>
            </View>
          }
          contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 12 }}
          scrollEnabled={messages.length > 0}
        />
      )}

      {/* Input */}
      <View style={[s.inputRow, { paddingBottom: insets.bottom + 8 }]}>
        <TextInput
          style={s.input}
          value={text}
          onChangeText={setText}
          placeholder="Ketik pesan..."
          placeholderTextColor={colors.mutedForeground}
          multiline
          onSubmitEditing={handleSend}
        />
        <Pressable
          style={[s.sendBtn, (!text.trim() || sending) && s.sendDisabled]}
          onPress={handleSend}
          disabled={!text.trim() || sending}
        >
          {sending ? <ActivityIndicator color={colors.primaryForeground} size="small" /> : <Feather name="send" size={18} color={colors.primaryForeground} />}
        </Pressable>
      </View>

      {/* Settings Modal */}
      <Modal visible={showSettings} animationType="slide" transparent onRequestClose={() => setShowSettings(false)}>
        <Pressable style={s.modalOverlay} onPress={() => setShowSettings(false)}>
          <Pressable style={[s.modalSheet, { paddingBottom: insets.bottom + 16 }]} onPress={() => {}}>
            <View style={s.modalHandle} />
            <Text style={s.modalTitle}>Pengaturan Grup</Text>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Rename group (admin only) */}
              {isAdmin && (
                <View style={s.section}>
                  <Text style={s.sectionTitle}>Ubah Nama Grup</Text>
                  <View style={s.renameRow}>
                    <TextInput
                      style={s.renameInput}
                      value={renameText}
                      onChangeText={setRenameText}
                      placeholder={groupNama}
                      placeholderTextColor={colors.mutedForeground}
                    />
                    <Pressable
                      style={[s.renameBtn, renaming && { opacity: 0.6 }]}
                      onPress={handleRename}
                      disabled={renaming}
                    >
                      {renaming ? <ActivityIndicator color="#fff" size="small" /> : <Text style={s.renameBtnText}>Simpan</Text>}
                    </Pressable>
                  </View>
                </View>
              )}

              {/* Add member */}
              <View style={s.section}>
                <Pressable style={s.addMemberHeader} onPress={() => setShowAddMember(!showAddMember)}>
                  <Text style={s.sectionTitle}>Tambah Anggota</Text>
                  <Feather name={showAddMember ? "chevron-up" : "chevron-down"} size={16} color={colors.mutedForeground} />
                </Pressable>
                {showAddMember && (
                  <View style={s.renameRow}>
                    <TextInput
                      style={s.renameInput}
                      value={addCode}
                      onChangeText={setAddCode}
                      placeholder="Kode pengguna (#XXXXXX)"
                      placeholderTextColor={colors.mutedForeground}
                      autoCapitalize="characters"
                    />
                    <Pressable
                      style={[s.renameBtn, addLoading && { opacity: 0.6 }]}
                      onPress={handleAddMember}
                      disabled={addLoading}
                    >
                      {addLoading ? <ActivityIndicator color="#fff" size="small" /> : <Text style={s.renameBtnText}>Tambah</Text>}
                    </Pressable>
                  </View>
                )}
              </View>

              {/* Members list */}
              <View style={s.section}>
                <Text style={s.sectionTitle}>Anggota ({members.length})</Text>
                {members.map((m) => (
                  <Pressable key={m.user_id} style={s.memberRow} onPress={() => handleMemberPress(m)}>
                    <Avatar name={m.nama} color={m.avatar_warna} size={40} online={m.is_online} />
                    <View style={{ flex: 1 }}>
                      <Text style={s.memberName}>
                        {m.nama}{m.user_id === user?.id ? " (Kamu)" : ""}
                      </Text>
                      <Text style={s.memberSub}>{m.kode}</Text>
                    </View>
                    <View style={[s.roleBadge, m.role === "admin" && s.roleBadgeAdmin]}>
                      <Text style={[s.roleText, m.role === "admin" && s.roleTextAdmin]}>
                        {m.role === "admin" ? "Admin" : "Member"}
                      </Text>
                    </View>
                    {isAdmin && m.user_id !== user?.id && (
                      <Feather name="more-vertical" size={16} color={colors.mutedForeground} style={{ marginLeft: 4 }} />
                    )}
                  </Pressable>
                ))}
              </View>

              {/* Danger zone */}
              {isAdmin && (
                <View style={s.section}>
                  <Text style={[s.sectionTitle, { color: "#ef4444" }]}>Zona Bahaya</Text>
                  <Pressable style={s.deleteGroupBtn} onPress={() => { setShowSettings(false); setTimeout(handleDeleteGroup, 300); }}>
                    <Feather name="trash-2" size={16} color="#ef4444" />
                    <Text style={s.deleteGroupText}>Hapus Grup</Text>
                  </Pressable>
                </View>
              )}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      <UserProfileModal
        userId={profileUserId}
        visible={profileUserId !== null}
        onClose={() => setProfileUserId(null)}
      />
    </KeyboardAvoidingView>
  );
}

const styles = (colors: ReturnType<typeof useColors>) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
    backBtn: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
    groupIconSmall: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
    headerName: { fontSize: 16, fontFamily: "Inter_600SemiBold", color: colors.foreground },
    headerSub: { fontSize: 12, fontFamily: "Inter_400Regular", color: colors.mutedForeground },
    settingsBtn: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
    center: { flex: 1, alignItems: "center", justifyContent: "center" },
    emptyCenter: { flex: 1, alignItems: "center", justifyContent: "center", gap: 10, paddingTop: 60 },
    emptyText: { fontSize: 14, fontFamily: "Inter_400Regular", color: colors.mutedForeground },
    bubbleWrap: { marginBottom: 6, alignItems: "flex-start" },
    bubbleWrapMine: { alignItems: "flex-end" },
    senderName: { fontSize: 11, fontFamily: "Inter_600SemiBold", color: "#6366f1", marginBottom: 2, marginLeft: 4 },
    bubble: { maxWidth: "78%", borderRadius: 16, padding: 10, paddingHorizontal: 14 },
    bubbleMine: { backgroundColor: colors.primary, borderBottomRightRadius: 4 },
    bubbleThem: { backgroundColor: colors.card, borderBottomLeftRadius: 4 },
    bubbleText: { fontSize: 15, fontFamily: "Inter_400Regular", color: colors.foreground, lineHeight: 20 },
    bubbleTextMine: { color: colors.primaryForeground },
    bubbleTime: { fontSize: 10, fontFamily: "Inter_400Regular", color: colors.mutedForeground, marginTop: 4, alignSelf: "flex-end" },
    bubbleTimeMine: { color: "#0f172a80" },
    inputRow: { flexDirection: "row", alignItems: "flex-end", gap: 10, paddingHorizontal: 16, paddingTop: 10, borderTopWidth: 1, borderTopColor: colors.border },
    input: { flex: 1, backgroundColor: colors.card, borderRadius: 20, paddingHorizontal: 16, paddingTop: 10, paddingBottom: 10, fontSize: 15, fontFamily: "Inter_400Regular", color: colors.foreground, maxHeight: 100 },
    sendBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" },
    sendDisabled: { opacity: 0.4 },
    // Settings modal
    modalOverlay: { flex: 1, backgroundColor: "#00000070", justifyContent: "flex-end" },
    modalSheet: { backgroundColor: colors.background, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 20, paddingTop: 12, maxHeight: "85%" },
    modalHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border, alignSelf: "center", marginBottom: 16 },
    modalTitle: { fontSize: 18, fontFamily: "Inter_700Bold", color: colors.foreground, marginBottom: 16 },
    section: { marginBottom: 20 },
    sectionTitle: { fontSize: 12, fontFamily: "Inter_600SemiBold", color: colors.mutedForeground, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 10 },
    renameRow: { flexDirection: "row", gap: 8 },
    renameInput: { flex: 1, backgroundColor: colors.card, borderRadius: 12, paddingHorizontal: 14, height: 44, fontSize: 14, fontFamily: "Inter_400Regular", color: colors.foreground, borderWidth: 1, borderColor: colors.border },
    renameBtn: { backgroundColor: colors.primary, borderRadius: 12, paddingHorizontal: 16, alignItems: "center", justifyContent: "center" },
    renameBtnText: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: colors.primaryForeground },
    addMemberHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 },
    memberRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 8 },
    memberName: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: colors.foreground },
    memberSub: { fontSize: 12, fontFamily: "Inter_400Regular", color: colors.mutedForeground },
    roleBadge: { backgroundColor: colors.card, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: colors.border },
    roleBadgeAdmin: { backgroundColor: "#6366f120", borderColor: "#6366f140" },
    roleText: { fontSize: 11, fontFamily: "Inter_600SemiBold", color: colors.mutedForeground },
    roleTextAdmin: { color: "#6366f1" },
    deleteGroupBtn: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#ef444415", borderRadius: 12, padding: 14, borderWidth: 1, borderColor: "#ef444430" },
    deleteGroupText: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: "#ef4444" },
  });
