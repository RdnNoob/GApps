import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { router } from "expo-router";
import React, { createContext, useContext, useEffect, useRef } from "react";
import { Platform } from "react-native";
import { savePushToken } from "@/api/geonode";
import { useAuth } from "@/context/AuthContext";

const PROJECT_ID = "5ec94f92-9e29-4462-bf06-bb5fa64a4988";

// Konfigurasi tampilan notifikasi di foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

const NotificationContext = createContext({});

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const notifListener = useRef<Notifications.EventSubscription | null>(null);
  const responseListener = useRef<Notifications.EventSubscription | null>(null);

  useEffect(() => {
    if (!user) return;
    registerPushToken();

    // Notifikasi diterima saat app di foreground
    notifListener.current = Notifications.addNotificationReceivedListener((_notif) => {
      // Banner otomatis tampil karena setNotificationHandler
    });

    // User tap notifikasi → navigasi
    responseListener.current = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data as any;
      if (!data) return;
      if (data.type === "message" && data.friendId) {
        router.push(`/chat/${data.friendId}`);
      } else if (data.type === "group_message" && data.groupId) {
        router.push(`/group/${data.groupId}`);
      } else if (data.type === "friend_request" || data.type === "friend_accept") {
        router.push("/(tabs)/friends");
      }
    });

    return () => {
      notifListener.current?.remove();
      responseListener.current?.remove();
    };
  }, [user]);

  return (
    <NotificationContext.Provider value={{}}>
      {children}
    </NotificationContext.Provider>
  );
}

async function registerPushToken() {
  try {
    if (!Device.isDevice) return; // Tidak bisa di emulator

    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("default", {
        name: "GeoNode",
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: "#6366f1",
        sound: "default",
      });
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== "granted") return;

    const tokenData = await Notifications.getExpoPushTokenAsync({ projectId: PROJECT_ID });
    const pushToken = tokenData.data;
    await savePushToken(pushToken);
  } catch (e) {
    console.log("Push token error:", e);
  }
}

export function useNotifications() {
  return useContext(NotificationContext);
}
