import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import { Platform } from "react-native";
import { updateLocation } from "@/api/geonode";
import { useAuth } from "./AuthContext";

interface LocationContextType {
  myLat: number | null;
  myLng: number | null;
  locationError: string | null;
}

const LocationContext = createContext<LocationContextType>({
  myLat: null,
  myLng: null,
  locationError: null,
});

export function LocationProvider({ children }: { children: React.ReactNode }) {
  const { token } = useAuth();
  const [myLat, setMyLat] = useState<number | null>(null);
  const [myLng, setMyLng] = useState<number | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const watchRef = useRef<number | null>(null);

  useEffect(() => {
    if (!token) return;

    if (Platform.OS === "web") {
      if (!navigator.geolocation) {
        setLocationError("GPS tidak didukung di browser ini");
        return;
      }
      watchRef.current = navigator.geolocation.watchPosition(
        (pos) => {
          const { latitude, longitude } = pos.coords;
          setMyLat(latitude);
          setMyLng(longitude);
          setLocationError(null);
          updateLocation(latitude, longitude).catch(() => {});
        },
        () => setLocationError("Izin lokasi ditolak"),
        { enableHighAccuracy: true, maximumAge: 15000 }
      );
      return () => {
        if (watchRef.current !== null) {
          navigator.geolocation.clearWatch(watchRef.current);
        }
      };
    }

    // Native: use expo-location dynamically to avoid web crash
    let stopped = false;
    (async () => {
      try {
        const ExpoLocation = await import("expo-location");
        const { status } = await ExpoLocation.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          setLocationError("Izin lokasi ditolak");
          return;
        }
        const sub = await ExpoLocation.watchPositionAsync(
          {
            accuracy: ExpoLocation.Accuracy.High,
            timeInterval: 15000,
            distanceInterval: 20,
          },
          (loc) => {
            if (stopped) return;
            const { latitude, longitude } = loc.coords;
            setMyLat(latitude);
            setMyLng(longitude);
            setLocationError(null);
            updateLocation(latitude, longitude).catch(() => {});
          }
        );
        intervalRef.current = null;
        return () => { stopped = true; sub.remove(); };
      } catch {
        setLocationError("Gagal memuat lokasi");
      }
    })();

    return () => { stopped = true; };
  }, [token]);

  return (
    <LocationContext.Provider value={{ myLat, myLng, locationError }}>
      {children}
    </LocationContext.Provider>
  );
}

export function useLocation() {
  return useContext(LocationContext);
}
