import { useEffect } from "react";
import { View, Text, StyleSheet, Platform, Linking } from "react-native";
import { getApiUrl } from "@/lib/query-client";

export default function AdminRedirect() {
  useEffect(() => {
    const adminUrl = `${getApiUrl()}/admin`;

    if (Platform.OS === "web") {
      window.location.href = adminUrl;
    } else {
      Linking.openURL(adminUrl);
    }
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.text}>Redirecting to admin panel...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#1B4965",
  },
  text: {
    color: "#ffffff",
    fontSize: 16,
  },
});
