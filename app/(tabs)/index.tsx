import { Feather } from "@expo/vector-icons";
import React, { useEffect, useRef, useState } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { getFriendLocations, Friend } from "@/api/geonode";
import { Avatar } from "@/components/Avatar";
import { useAuth } from "@/context/AuthContext";
import { useLocation } from "@/context/LocationContext";
import { useColors } from "@/hooks/useColors";

// Web fallback - shows list of friends with locations (no native map)
export default function MapScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { myLat, myLng, locationError } = useLocation();
  const [friends, setFriends] = useState<Friend[]>([]);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await getFriendLocations();
        setFriends(data.filter((f) => f.lat != null && f.lng != null));
      } catch {}
    };
    load();
    const t = setInterval(load, 20000);
    return () => clearInterval(t);
  }, []);

  const s = styles(colors);

  return (
    <View style={[s.container, { paddingTop: insets.top + 67 }]}>
      <View style={s.header}>
        <View style={s.logoRow}>
          <View style={s.greenDot} />
          <Text style={s.title}>GeoNode</Text>
        </View>
        {myLat && myLng && (
          <View style={s.coordBadge}>
            <Feather name="navigation" size={12} color={colors.primary} />
            <Text style={s.coordText}>{myLat.toFixed(4)}, {myLng.toFixed(4)}</Text>
          </View>
        )}
      </View>

      {locationError && (
        <View style={s.errorBox}>
          <Feather name="alert-circle" size={14} color="#f59e0b" />
          <Text style={s.errorText}>{locationError}</Text>
        </View>
      )}

      <Text style={s.sectionLabel}>TEMAN AKTIF ({friends.length})</Text>

      {friends.length === 0 ? (
        <View style={s.empty}>
          <Feather name="map-pin" size={36} color={colors.mutedForeground} />
          <Text style={s.emptyText}>Belum ada teman yang aktif</Text>
          <Text style={s.emptySub}>Tambah teman dan minta mereka membagikan lokasi</Text>
        </View>
      ) : (
        friends.map((f) => (
          <View key={f.id} style={s.card}>
            <Avatar name={f.nama} color={f.avatar_warna} size={42} online={f.online} />
            <View style={{ flex: 1 }}>
              <Text style={s.cardName}>{f.nama}</Text>
              <Text style={s.cardCoord}>{f.lat?.toFixed(4)}, {f.lng?.toFixed(4)}</Text>
            </View>
            <View style={[s.onlineDot, { backgroundColor: f.online ? colors.primary : colors.mutedForeground }]} />
          </View>
        ))
      )}
    </View>
  );
}

const styles = (colors: ReturnType<typeof useColors>) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background, paddingHorizontal: 20 },
    header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 16 },
    logoRow: { flexDirection: "row", alignItems: "center", gap: 8 },
    greenDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.primary },
    title: { fontSize: 22, fontFamily: "Inter_700Bold", color: colors.foreground },
    coordBadge: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: colors.card, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 },
    coordText: { fontSize: 11, fontFamily: "Inter_500Medium", color: colors.mutedForeground },
    errorBox: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#f59e0b20", borderRadius: 10, padding: 10, marginBottom: 12 },
    errorText: { fontSize: 12, fontFamily: "Inter_400Regular", color: "#f59e0b" },
    sectionLabel: { fontSize: 11, fontFamily: "Inter_600SemiBold", color: colors.mutedForeground, marginBottom: 10, letterSpacing: 0.8 },
    card: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: colors.card, borderRadius: 14, padding: 14, marginBottom: 10 },
    cardName: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: colors.foreground },
    cardCoord: { fontSize: 11, fontFamily: "Inter_400Regular", color: colors.mutedForeground, marginTop: 2 },
    onlineDot: { width: 10, height: 10, borderRadius: 5 },
    empty: { flex: 1, alignItems: "center", justifyContent: "center", gap: 10, paddingTop: 60 },
    emptyText: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: colors.foreground },
    emptySub: { fontSize: 13, fontFamily: "Inter_400Regular", color: colors.mutedForeground, textAlign: "center", paddingHorizontal: 20 },
  });
