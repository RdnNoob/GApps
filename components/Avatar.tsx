import React from "react";
import { StyleSheet, Text, View } from "react-native";

interface AvatarProps {
  name: string;
  color?: string;
  size?: number;
  online?: boolean;
}

export function Avatar({ name, color = "#374151", size = 40, online }: AvatarProps) {
  const initial = (name || "?").charAt(0).toUpperCase();
  const fontSize = size * 0.42;

  return (
    <View style={{ position: "relative", width: size, height: size }}>
      <View
        style={[
          styles.circle,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: color,
          },
        ]}
      >
        <Text style={[styles.initial, { fontSize }]}>{initial}</Text>
      </View>
      {online !== undefined && (
        <View
          style={[
            styles.dot,
            {
              backgroundColor: online ? "#22c55e" : "#475569",
              width: size * 0.28,
              height: size * 0.28,
              borderRadius: size * 0.14,
              bottom: 0,
              right: 0,
            },
          ]}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  circle: {
    alignItems: "center",
    justifyContent: "center",
  },
  initial: {
    color: "#ffffff",
    fontFamily: "Inter_700Bold",
  },
  dot: {
    position: "absolute",
    borderWidth: 2,
    borderColor: "#0f172a",
  },
});
