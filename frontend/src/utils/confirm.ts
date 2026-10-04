import { Platform, Alert } from "react-native";

// Cross-platform confirm dialog. Resolves true when the user confirms.
export function confirmDelete(message: string, title = "Confirm Delete"): Promise<boolean> {
  if (Platform.OS === "web") {
    const ok = typeof window !== "undefined" ? window.confirm(`${title}\n\n${message}`) : false;
    return Promise.resolve(ok);
  }
  return new Promise((resolve) => {
    Alert.alert(title, message, [
      { text: "Cancel", style: "cancel", onPress: () => resolve(false) },
      { text: "Delete", style: "destructive", onPress: () => resolve(true) },
    ]);
  });
}
