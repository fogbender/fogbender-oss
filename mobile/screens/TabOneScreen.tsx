import { Auth } from "aws-amplify";
import * as React from "react";
import { ScrollView, StyleSheet, TouchableOpacity } from "react-native";

import { Text, View } from "../components/Themed";
import { useFogbender } from "../context/fogbender";

export default function TabOneScreen() {
  const { agent } = useFogbender();

  const [userInfo, setUserInfo] = React.useState<any>();

  const fetchUserInfo = React.useCallback(async () => {
    setUserInfo(await Auth.currentUserInfo());
  }, []);

  React.useEffect(() => {
    fetchUserInfo();
  }, [fetchUserInfo]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Hello {userInfo?.attributes?.name}</Text>
      <View style={styles.separator} lightColor="#eee" darkColor="rgba(255,255,255,0.1)" />
      <ScrollView>
        {userInfo && (
          <View style={{ flex: 1, marginBottom: 30 }}>
            <Text style={{ fontWeight: "700" }}>Cognito info</Text>
            <Text style={styles.info}>{JSON.stringify(userInfo, undefined, 2)}</Text>
          </View>
        )}
        {agent && (
          <View style={{ flex: 1 }}>
            <Text style={{ fontWeight: "700" }}>Fogbender info</Text>
            <Text style={styles.info}>{JSON.stringify(agent, undefined, 2)}</Text>
          </View>
        )}
      </ScrollView>
      <TouchableOpacity onPress={() => Auth.signOut()} style={{ paddingVertical: 30 }}>
        <Text style={styles.title}>Sign Out</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
  },
  separator: {
    marginVertical: 10,
    height: 1,
    width: "80%",
  },
  info: {
    fontFamily: "space-mono",
  },
});
