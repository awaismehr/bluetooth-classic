import React, { useState, useEffect } from "react";
import { StyleSheet, Dimensions, View, ScrollView, Text, Button, TextInput, PermissionsAndroid, Platform, TouchableOpacity } from "react-native";
import RNBluetoothClassic, { BluetoothDevice } from "react-native-bluetooth-classic";

const BluetoothClassicTerminal = () => {
  const [devices, setDevices] = useState<any[]>([]);
  const [paired, setPaired] = useState<any[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<BluetoothDevice>();
  const [messageToSend, setMessageToSend] = useState("");
  const [receivedMessage, setReceivedMessage] = useState("");
  const [isConnected, setIsConnected] = useState(false);
  const [intervalId, setIntervalId] = useState<NodeJS.Timer>();

  const checkBluetoothEnabled = async () => {
    try {
      const enabled = await RNBluetoothClassic.isBluetoothEnabled();
      if (!enabled) {
        await RNBluetoothClassic.requestBluetoothEnabled();
      }
    } catch (error) {
      console.error("Bluetooth Classic is not available on this device.");
    }
  };

  const startDeviceDiscovery = async () => {
    console.log("searching for devices...");
    try {
      const paired = await RNBluetoothClassic.getBondedDevices();
      console.log("Bonded peripherals: " + paired.length);
      setPaired(paired);
    } catch (error) {
      console.error("Error bonded devices:", error);
    }

    /*try {
      const devices = await RNBluetoothClassic.startDiscovery();
      this.setState({ devices });
      console.log("Discovered peripherals: " + devices.length);
    } catch (error) {
      console.error('Error discovering devices:', error);
    }*/
  };

  const connectToDevice = async (device: BluetoothDevice) => {
    try {
      console.log("Connecting to device");
      let connection = await device.isConnected();
      if (!connection) {
        console.log("Connecting to device");
        await device.connect({
          connectorType: "rfcomm",
          DELIMITER: "\n",
          DEVICE_CHARSET: Platform.OS === "ios" ? 1536 : "utf-8",
        });
      }
      setSelectedDevice(device);
      setIsConnected(true);
      console.log("is connected : ", isConnected);
      //device.onDataReceived((data) => this.readData());
      //const intervalId = setInterval(() => {readData();}, 100);
      //setIntervalId(intervalId);
    } catch (error) {
      console.error("Error connecting to device:", error);
    }
  };

  /*async onReceivedData() {
  const { selectedDevice, receivedMessage } = this.state;
  //console.log("event : recived message", event);
  try{
    //const message = await selectedDevice.read();
    console.log("reieved msg from", selectedDevice.name);
    const messages = await selectedDevice.available();
  if (messages.length > 0) {
    console.log("msg waiting : ", messages.length);
  }
    //this.setState({ receivedMessage: message.data });
  } catch (error) {
    console.error('Error receiving data:', error);
  }
}*/

  const sendMessage = async () => {
    if (selectedDevice && isConnected) {
      console.log("isConnected in message", isConnected);
      try {
        await selectedDevice.write(messageToSend);
      } catch (error) {
        console.error("Error sending message:", error);
      }
    }
  };

  const readData = async () => {
    if (selectedDevice && isConnected) {
      try {
        //const available = await selectedDevice.available();
        //if (available>1){
        let message = await selectedDevice.read();
        if (message) {
          message = message.trim();
          if (message !== "" && message !== " ") {
            if (receivedMessage.length > 300) {
              setReceivedMessage("");
            }
            setReceivedMessage((receivedMessage) => receivedMessage + message + "\n");
          }
        }
        //  }
      } catch (error) {
        //console.log("isConnected",isConnected);
        //console.log("selectedDevice",selectedDevice);
        console.error("Error reading message:", error);
      }
    }
  };

  useEffect(() => {
    let intervalId: string | number | NodeJS.Timer | undefined;
    if (selectedDevice && isConnected) {
      intervalId = setInterval(() => readData(), 100);
    }
    return () => {
      clearInterval(intervalId);
    };
  }, [isConnected, selectedDevice]);

  const disconnect = () => {
    //need to reset esp32 at disconnect
    if (selectedDevice && isConnected) {
      try {
        clearInterval(intervalId);
        setIntervalId(undefined);

        selectedDevice.clear().then(() => {
          console.log("BT buffer cleared");
        });

        selectedDevice.disconnect().then(() => {
          setSelectedDevice(undefined);
          setIsConnected(false);
          setReceivedMessage("");
          console.log("Disconnected from device");
        });
      } catch (error) {
        console.error("Error disconnecting:", error);
      }
    }
  };
  useEffect(() => {
    async function requestBluetoothPermission() {
      try {
        const grantedScan = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN, {
          title: "Bluetooth Scan Permission",
          message: "This app needs Bluetooth Scan permission to discover devices.",
          buttonPositive: "OK",
          buttonNegative: "Cancel",
        });

        const grantedConnect = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT, {
          title: "Bluetooth Connect Permission",
          message: "This app needs Bluetooth Connect permission to connect to devices.",
          buttonPositive: "OK",
          buttonNegative: "Cancel",
        });

        const grantedLocation = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION, {
          title: "Fine Location Permission",
          message: "This app needs to know location of device.",
          buttonPositive: "OK",
          buttonNegative: "Cancel",
        });

        if (
          grantedScan === PermissionsAndroid.RESULTS.GRANTED &&
          grantedConnect === PermissionsAndroid.RESULTS.GRANTED &&
          grantedLocation === PermissionsAndroid.RESULTS.GRANTED
        ) {
          console.log("Bluetooth permissions granted");
          // Vous pouvez maintenant commencer la découverte et la connexion Bluetooth ici.
        } else {
          console.log("Bluetooth permissions denied");
        }
      } catch (err) {
        console.warn(err);
      }
    }

    checkBluetoothEnabled();

    requestBluetoothPermission().then(() => {
      startDeviceDiscovery();
    });
  }, []);

  return (
    <View>
      <Text
        style={{
          fontSize: 30,
          textAlign: "center",
          borderBottomWidth: 1,
        }}
      >
        AC Bluetooth Terminal
      </Text>
      <ScrollView>
        {!isConnected && (
          <>
            <TouchableOpacity onPress={() => startDeviceDiscovery()} style={[styles.deviceButton]}>
              <Text style={[styles.scanButtonText]}>SCAN</Text>
            </TouchableOpacity>
            {/*
          <Text>Available Devices:</Text>
          {devices.map((device) => (
            <Button
              key={device.id}
              title={device.name || 'Unnamed Device'}
              onPress={() => this.connectToDevice(device)}
            />
          ))}
          */}
            <Text>Paired Devices:</Text>
            {paired.map((pair: BluetoothDevice, i) => (
              <View
                key={i}
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  marginBottom: 2,
                }}
              >
                <View style={styles.deviceItem}>
                  <Text style={styles.deviceName}>{pair.name}</Text>
                  <Text style={styles.deviceInfo}>{pair.id}</Text>
                </View>
                <TouchableOpacity onPress={() => (isConnected ? disconnect() : connectToDevice(pair))} style={styles.deviceButton}>
                  <Text style={[styles.scanButtonText, { fontWeight: "bold", fontSize: 12 }]}>{isConnected ? "Disconnect" : "Connect"}</Text>
                </TouchableOpacity>
              </View>
            ))}
          </>
        )}
        {selectedDevice && isConnected && (
          <>
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                margin: 5,
              }}
            >
              <View style={styles.deviceItem}>
                <Text style={styles.deviceName}>{selectedDevice.name}</Text>
                <Text style={styles.deviceInfo}>{selectedDevice.id}</Text>
              </View>
              <TouchableOpacity onPress={() => (isConnected ? disconnect() : connectToDevice(selectedDevice))} style={styles.deviceButton}>
                <Text style={styles.scanButtonText}>{isConnected ? "Disconnect" : "Connect"}</Text>
              </TouchableOpacity>
            </View>

            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                margin: 5,
              }}
            >
              <TextInput
                style={{
                  backgroundColor: "#888888",
                  margin: 2,
                  borderRadius: 15,
                  flex: 3,
                }}
                placeholder="Enter a message"
                value={messageToSend}
                onChangeText={(text) => setMessageToSend(text)}
              />
              <TouchableOpacity onPress={() => sendMessage()} style={[styles.sendButton]}>
                <Text style={[styles.scanButtonText]}>SEND</Text>
              </TouchableOpacity>
            </View>
            <Text>Received Message:</Text>
            <TextInput
              editable={false}
              multiline
              numberOfLines={20}
              maxLength={300}
              style={{
                backgroundColor: "#333333",
                margin: 10,
                borderRadius: 2,
                borderWidth: 1,
                borderColor: "#EEEEEE",
                textAlignVertical: "top",
              }}
            >
              {receivedMessage}
            </TextInput>
          </>
        )}
      </ScrollView>
    </View>
  );
}; //end of component

const windowHeight = Dimensions.get("window").height;
const styles = StyleSheet.create({
  mainBody: {
    flex: 1,
    justifyContent: "center",
    height: windowHeight,
  },

  scanButtonText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 12,
    textAlign: "center",
  },
  noDevicesText: {
    textAlign: "center",
    marginTop: 10,
    fontStyle: "italic",
  },
  deviceItem: {
    marginBottom: 2,
  },
  deviceName: {
    fontSize: 14,
    fontWeight: "bold",
  },
  deviceInfo: {
    fontSize: 8,
  },
  deviceButton: {
    backgroundColor: "#2196F3",
    padding: 10,
    borderRadius: 10,
    margin: 2,
    paddingHorizontal: 20,
  },
  sendButton: {
    backgroundColor: "#2196F3",
    padding: 15,
    borderRadius: 15,
    margin: 2,
    paddingHorizontal: 20,
  },
});

export default BluetoothClassicTerminal;
