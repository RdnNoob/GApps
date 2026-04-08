import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router, useLocalSearchParams } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { getChatMessages, sendMessage, Message } from "@/api/geonode";
import { Avatar } from "@/components/Avatar";
import { useColors } from "@/hooks/useColors";

export default function ChatScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { friendId, nama } = useLocalSearchParams<{ friendId: string; nama: string }>();
  const fid = Number(friendId);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = useCallback(async () => {
    try {
      const msgs = await getChatMessages(fid);
      setMessages([...msgs].reverse());
    } catch {} finally {
      setLoading(false);
    }
  }, [fid]);

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
      const msg = await sendMessage(fid, trimmed);
      setMessages((prev) => [{ ...msg, is_mine: true }, ...prev]);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {
      setText(trimmed);
    } finally {
      setSending(false);
    }
  };

  const s = styles(colors);
  const namaDisplay = decodeURIComponent(nama ?? "Teman");

  return (
    <KeyboardAvoidingView style={s.container} behavior="padding" keyboardVerticalOffset={0}>
      {/* Header */}
      <View style={[s.header, { paddingTop: insets.top + 12 }]}>
        <Pressable style={s.backBtn} onPress={() => router.back()}>
          <Feather name="arrow-left" size={20} color={colors.foreground} />
        </Pressable>
        <Avatar name={namaDisplay} size={36} />
        <View style={{ flex: 1 }}>
          <Text style={s.headerName}>{namaDisplay}</Text>
          <Text style={s.headerSub}>Pesan langsung</Text>
        </View>
      </View>

      {loading ? (
        <View style={s.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={messages}
          keyExtractor={(m) => String(m.id)}
          inverted
          renderItem={({ item }) => (
            <View style={[s.bubbleWrap, item.is_mine && s.bubbleWrapMine]}>
              <View style={[s.bubble, item.is_mine ? s.bubbleMine : s.bubbleThem]}>
                <Text style={[s.bubbleText, item.is_mine && s.bubbleTextMine]}>{item.content}</Text>
                <Text style={[s.bubbleTime, item.is_mine && s.bubbleTimeMine]}>
                  {new Date(item.created_at).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
                </Text>
              </View>
            </View>
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
    </KeyboardAvoidingView>
  );
}

const styles = (colors: ReturnType<typeof useColors>) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
    backBtn: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
    headerName: { fontSize: 16, fontFamily: "Inter_600SemiBold", color: colors.foreground },
    headerSub: { fontSize: 12, fontFamily: "Inter_400Regular", color: colors.mutedForeground },
    center: { flex: 1, alignItems: "center", justifyContent: "center" },
    emptyCenter: { flex: 1, alignItems: "center", justifyContent: "center", gap: 10, paddingTop: 60 },
    emptyText: { fontSize: 14, fontFamily: "Inter_400Regular", color: colors.mutedForeground },
    bubbleWrap: { marginBottom: 6, alignItems: "flex-start" },
    bubbleWrapMine: { alignItems: "flex-end" },
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
  });
