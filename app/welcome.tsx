import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useEffect, useRef } from "react";
import {
  Animated,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";

const FEATURES = [
  {
    icon: "map-pin" as const,
    title: "Lacak Lokasi",
    desc: "Lihat posisi teman-temanmu secara real-time di peta",
  },
  {
    icon: "users" as const,
    title: "Terhubung",
    desc: "Tambah teman dan buat grup untuk tetap terhubung",
  },
  {
    icon: "message-circle" as const,
    title: "Chat",
    desc: "Kirim pesan langsung ke teman atau dalam grup",
  },
  {
    icon: "shield" as const,
    title: "Privasi Aman",
    desc: "Kontrol penuh siapa yang bisa melihat lokasimu",
  },
];

export default function WelcomeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const featureAnims = useRef(
    FEATURES.map(() => ({
      opacity: new Animated.Value(0),
      translateY: new Animated.Value(20),
    }))
  ).current;
  const buttonAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();

    featureAnims.forEach((anim, i) => {
      Animated.parallel([
        Animated.timing(anim.opacity, {
          toValue: 1,
          duration: 400,
          delay: 400 + i * 120,
          useNativeDriver: true,
        }),
        Animated.timing(anim.translateY, {
          toValue: 0,
          duration: 400,
          delay: 400 + i * 120,
          useNativeDriver: true,
        }),
      ]).start();
    });

    Animated.timing(buttonAnim, {
      toValue: 1,
      duration: 500,
      delay: 900,
      useNativeDriver: true,
    }).start();
  }, []);

  const handleStart = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    router.push("/login");
  };

  const s = getStyles(colors);

  return (
    <View style={[s.container, { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 20 }]}>
      <Animated.View
        style={[
          s.heroSection,
          { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
        ]}
      >
        <View style={s.logoCircle}>
          <Feather name="navigation" size={32} color="#fff" />
        </View>

        <Text style={s.appName}>GeoNode</Text>
        <Text style={s.tagline}>Tetap terhubung, di mana pun kamu berada</Text>

        <View style={s.versionBadge}>
          <View style={s.versionDot} />
          <Text style={s.versionText}>v2.0</Text>
        </View>
      </Animated.View>

      <View style={s.featuresSection}>
        {FEATURES.map((feature, i) => (
          <Animated.View
            key={feature.title}
            style={[
              s.featureCard,
              {
                opacity: featureAnims[i].opacity,
                transform: [{ translateY: featureAnims[i].translateY }],
              },
            ]}
          >
            <View style={s.featureIconWrap}>
              <Feather name={feature.icon} size={20} color={colors.primary} />
            </View>
            <View style={s.featureTextWrap}>
              <Text style={s.featureTitle}>{feature.title}</Text>
              <Text style={s.featureDesc}>{feature.desc}</Text>
            </View>
          </Animated.View>
        ))}
      </View>

      <Animated.View style={[s.bottomSection, { opacity: buttonAnim }]}>
        <Pressable
          style={({ pressed }) => [s.startBtn, pressed && s.startBtnPressed]}
          onPress={handleStart}
        >
          <Text style={s.startBtnText}>Mulai</Text>
          <Feather name="arrow-right" size={18} color="#0f172a" />
        </Pressable>

        <Text style={s.footerText}>
          Dengan melanjutkan, kamu menyetujui ketentuan penggunaan kami
        </Text>
      </Animated.View>
    </View>
  );
}

const getStyles = (colors: ReturnType<typeof useColors>) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
      paddingHorizontal: 24,
      justifyContent: "space-between",
    },
    heroSection: {
      alignItems: "center",
      paddingTop: 40,
    },
    logoCircle: {
      width: 72,
      height: 72,
      borderRadius: 36,
      backgroundColor: colors.primary,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 20,
      shadowColor: "#22c55e",
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.3,
      shadowRadius: 16,
      elevation: 12,
    },
    appName: {
      fontSize: 34,
      fontFamily: "Inter_700Bold",
      color: colors.foreground,
      letterSpacing: -0.5,
    },
    tagline: {
      fontSize: 15,
      fontFamily: "Inter_400Regular",
      color: colors.mutedForeground,
      marginTop: 8,
      textAlign: "center",
    },
    versionBadge: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      marginTop: 14,
      backgroundColor: colors.card,
      paddingHorizontal: 12,
      paddingVertical: 5,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: colors.border,
    },
    versionDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: colors.primary,
    },
    versionText: {
      fontSize: 12,
      fontFamily: "Inter_500Medium",
      color: colors.mutedForeground,
    },
    featuresSection: {
      gap: 12,
    },
    featureCard: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.card,
      borderRadius: 14,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.border,
      gap: 14,
    },
    featureIconWrap: {
      width: 44,
      height: 44,
      borderRadius: 12,
      backgroundColor: "rgba(34, 197, 94, 0.1)",
      alignItems: "center",
      justifyContent: "center",
    },
    featureTextWrap: {
      flex: 1,
    },
    featureTitle: {
      fontSize: 15,
      fontFamily: "Inter_600SemiBold",
      color: colors.foreground,
      marginBottom: 2,
    },
    featureDesc: {
      fontSize: 13,
      fontFamily: "Inter_400Regular",
      color: colors.mutedForeground,
      lineHeight: 18,
    },
    bottomSection: {
      alignItems: "center",
      paddingBottom: 8,
    },
    startBtn: {
      width: "100%",
      borderRadius: 14,
      backgroundColor: colors.primary,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      height: 54,
      gap: 8,
    },
    startBtnPressed: {
      opacity: 0.85,
      transform: [{ scale: 0.98 }],
    },
    startBtnText: {
      fontSize: 17,
      fontFamily: "Inter_700Bold",
      color: "#0f172a",
    },
    footerText: {
      fontSize: 12,
      fontFamily: "Inter_400Regular",
      color: colors.mutedForeground,
      textAlign: "center",
      marginTop: 16,
      paddingHorizontal: 20,
    },
  });
