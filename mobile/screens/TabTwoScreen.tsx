import { Ionicons } from "@expo/vector-icons";
import { useRoster } from "fogbender-proto";
import * as React from "react";
import { ScrollView, StyleSheet, TouchableOpacity } from "react-native";
import RNPickerSelect from "react-native-picker-select";

import EditScreenInfo from "../components/EditScreenInfo";
import { Text, View } from "../components/Themed";
import { useFogbender } from "../context/fogbender";

export default function TabTwoScreen() {
  const { agent, vendorId, workspaceId, vendors, workspaces, setVendorId, setWorkspaceId } =
    useFogbender();

  const { filteredRoster, badges } = useRoster({ userId: agent?.id, workspaceId });

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Your roster</Text>
      <View style={styles.separator} lightColor="#eee" darkColor="rgba(255,255,255,0.1)" />
      <View style={{ display: "flex", flexDirection: "row", marginVertical: 20 }}>
        <RNPickerSelect
          placeholder={{ label: "Select vendor...", value: null }}
          items={vendors.map(vendor => ({ label: vendor.name, value: vendor.id }))}
          value={vendorId || null}
          onValueChange={id => setVendorId(id || undefined)}
          Icon={() => <Ionicons name="caret-down-circle-outline" size={16} />}
          style={{ inputAndroid: { color: "#333" }, viewContainer: styles.pickerViewContainer }}
        />
        {vendorId && (
          <>
            <View style={{ width: 20 }} />
            <RNPickerSelect
              placeholder={{ label: "Select workspace...", value: null }}
              items={workspaces.map(workspace => ({
                label: workspace.name,
                value: workspace.id,
              }))}
              value={workspaceId || null}
              onValueChange={id => setWorkspaceId(id || undefined)}
              Icon={() => <Ionicons name="caret-down-circle-outline" size={16} />}
              style={{ inputAndroid: { color: "#333" }, viewContainer: styles.pickerViewContainer }}
            />
          </>
        )}
      </View>
      <ScrollView>
        {(!vendorId || !workspaceId) && <Text>Please select vendor and organization</Text>}
        {filteredRoster.map(room => {
          const badge = badges[room.id];
          const lastRoomMessage = badge?.lastRoomMessage;
          return (
            <TouchableOpacity key={room.id}>
              <View style={{ paddingVertical: 5, borderBottomWidth: 1, borderBottomColor: "gray" }}>
                <Text style={{ marginBottom: 3, fontSize: 16, fontWeight: "600" }}>
                  <Text>{room.counterpart?.name || room.name}</Text>
                  {badge?.count > 0 && (
                    <View
                      style={{
                        backgroundColor: "green",
                        alignItems: "center",
                        justifyContent: "center",
                        width: 20,
                        height: 20,
                        borderRadius: 1000,
                      }}
                    >
                      <Text style={{ fontSize: 10, color: "white" }}>{badge.count}</Text>
                    </View>
                  )}
                </Text>
                <Text style={{ color: "gray" }}>{room.customerName}</Text>
                {lastRoomMessage && (
                  <>
                    <Text>
                      <Text style={{ fontWeight: "600" }}>{lastRoomMessage.fromName}</Text>:{" "}
                      {lastRoomMessage.text}
                    </Text>
                    <Text>{new Date(lastRoomMessage.createdTs / 1000).toTimeString()}</Text>
                    <Text>{new Date(lastRoomMessage.createdTs / 1000).toDateString()}</Text>
                  </>
                )}
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
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
  pickerViewContainer: {
    flex: 1,
    padding: 4,
    borderWidth: 1,
    borderColor: "gray",
    borderRadius: 4,
  },
});
