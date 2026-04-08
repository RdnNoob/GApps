import { Feather } from "@expo/vector-icons";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import MapView, { Marker } from "react-native-maps";
import { getFriendLocations, Friend } from "@/api/geonode";
import { Avatar } from "@/components/Avatar";
import { useAuth } from "@/context/AuthContext";
import { useLocation } from "@/context/LocationContext";
import { useColors } from "@/hooks/useColors";

export default function MapScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { myLat, myLng, locationError } = useLocation();
  const [friends, setFriends] = useState<Friend[]>([]);
  const [selected, setSelected] = useState<Friend | null>(null);
  const mapRef = useRef<MapView>(null);

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

  const goToMe = () => {
    if (myLat && myLng && mapRef.current) {
      mapRef.current.animateToRegion({
        latitude: myLat,
        longitude: myLng,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      }, 600);
    }
  };

  const initialRegion = {
    latitude: myLat ?? -6.2,
    longitude: myLng ?? 106.8,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
  };

  return (
    <View style={styles.container}>
      {locationError ? (
        <View style={[styles.errorCenter, { paddingTop: insets.top + 80 }]}>
          <Feather name="map-pin" size={40} color={colors.mutedForeground} />
          <Text style={[styles.errorText, { color: colors.mutedForeground }]}>{locationError}</Text>
        </View>
      ) : (
        <MapView
          ref={mapRef}
          style={StyleSheet.absoluteFillObject}
          initialRegion={initialRegion}
          showsUserLocation={false}
          onPress={() => setSelected(null)}
        >
          {myLat && myLng && user && (
            <Marker
              coordinate={{ latitude: myLat, longitude: myLng }}
              onPress={() => setSelected(null)}
            >
              <View style={styles.myMarker}>
                <View style={[styles.myDot, { backgroundColor: colors.primary }]} />
              </View>
            </Marker>
          )}

          {friends.map((f) => (
            <Marker
              key={f.id}
              coordinate={{ latitude: f.lat!, longitude: f.lng! }}
              onPress={() => setSelected(f)}
            >
              <View style={[styles.friendMarker, { borderColor: f.online ? colors.primary : colors.mutedForeground }]}>
                <Avatar name={f.nama} color={f.avatar_warna} size={32} />
              </View>
            </Marker>
          ))}
        </MapView>
      )}

      {/* Header overlay */}
      <View style={[styles.header, { paddingTop: insets.top + 12, backgroundColor: "transparent" }]}>
        <View style={styles.headerPill}>
          <View style={styles.greenDot} />
          <Text style={styles.headerTitle}>GeoNode</Text>
        </View>
        <View style={styles.headerRight}>
          <View style={[styles.badge, { backgroundColor: "#1e293bcc" }]}>
            <View style={[styles.dotSmall, { backgroundColor: colors.primary }]} />
            <Text style={styles.badgeText}>{friends.length} teman</Text>
          </View>
        </View>
      </View>

      {/* Locate me button */}
      {myLat && myLng && (
        <Pressable
          style={[styles.locateBtn, { bottom: insets.bottom + 100, backgroundColor: "#1e293b" }]}
          onPress={goToMe}
        >
          <Feather name="crosshair" size={20} color={colors.primary} />
        </Pressable>
      )}

      {/* Loading */}
      {!myLat && !locationError && (
        <View style={[styles.loadingOverlay, { paddingTop: insets.top + 80 }]}>
          <ActivityIndicator color={colors.primary} size="large" />
          <Text style={[styles.loadingText, { color: colors.mutedForeground }]}>Mendapatkan lokasi...</Text>
        </View>
      )}

      {/* Selected friend info */}
      {selected && (
        <View style={[styles.friendInfo, { bottom: insets.bottom + 100 }]}>
          <Avatar name={selected.nama} color={selected.avatar_warna} size={44} online={selected.online} />
          <View style={{ flex: 1 }}>
            <Text style={styles.friendInfoName}>{selected.nama}</Text>
            <Text style={styles.friendInfoCode}>{selected.kode}</Text>
          </View>
          <Pressable onPress={() => setSelected(null)}>
            <Feather name="x" size={18} color="#64748b" />
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0f172a" },
  errorCenter: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  errorText: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", paddingHorizontal: 32 },
  header: { position: "absolute", top: 0, left: 0, right: 0, paddingHorizontal: 16, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  headerPill: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#0f172aee", borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8 },
  greenDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#22c55e" },
  headerTitle: { fontSize: 15, fontFamily: "Inter_700Bold", color: "#f1f5f9" },
  headerRight: { flexDirection: "row", gap: 8 },
  badge: { flexDirection: "row", alignItems: "center", gap: 6, borderRadius: 16, paddingHorizontal: 12, paddingVertical: 6 },
  dotSmall: { width: 6, height: 6, borderRadius: 3 },
  badgeText: { fontSize: 12, fontFamily: "Inter_500Medium", color: "#f1f5f9" },
  myMarker: { width: 24, height: 24, borderRadius: 12, backgroundColor: "#22c55e30", alignItems: "center", justifyContent: "center" },
  myDot: { width: 12, height: 12, borderRadius: 6 },
  friendMarker: { width: 40, height: 40, borderRadius: 20, borderWidth: 2, overflow: "hidden", alignItems: "center", justifyContent: "center" },
  locateBtn: { position: "absolute", right: 16, width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center", elevation: 4, shadowColor: "#000", shadowOpacity: 0.3, shadowRadius: 8, shadowOffset: { width: 0, height: 2 } },
  loadingOverlay: { position: "absolute", top: 0, left: 0, right: 0, alignItems: "center", gap: 12 },
  loadingText: { fontSize: 13, fontFamily: "Inter_400Regular" },
  friendInfo: { position: "absolute", left: 16, right: 16, backgroundColor: "#1e293b", borderRadius: 16, padding: 14, flexDirection: "row", alignItems: "center", gap: 12, elevation: 4, shadowColor: "#000", shadowOpacity: 0.3, shadowRadius: 8, shadowOffset: { width: 0, height: 2 } },
  friendInfoName: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: "#f1f5f9" },
  friendInfoCode: { fontSize: 12, fontFamily: "Inter_400Regular", color: "#64748b", marginTop: 2 },
});
