import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

const PRIVATE_KEY_PREFIX = "kripchat.private-key.v1";
const DEVICE_ID_KEY = "kripchat.device-id.v1";

async function setSecret(key: string, value: string) {
  if (Platform.OS === "web") {
    await AsyncStorage.setItem(key, value);
    return;
  }
  await SecureStore.setItemAsync(key, value);
}

async function getSecret(key: string) {
  if (Platform.OS === "web") return AsyncStorage.getItem(key);
  return SecureStore.getItemAsync(key);
}

async function deleteSecret(key: string) {
  if (Platform.OS === "web") {
    await AsyncStorage.removeItem(key);
    return;
  }
  await SecureStore.deleteItemAsync(key);
}

export async function savePrivateKey(scope: string, privateKey: string) {
  await setSecret(`${PRIVATE_KEY_PREFIX}:${scope}`, privateKey);
}

export async function getPrivateKey(scope: string) {
  return getSecret(`${PRIVATE_KEY_PREFIX}:${scope}`);
}

export async function deletePrivateKey(scope: string) {
  await deleteSecret(`${PRIVATE_KEY_PREFIX}:${scope}`);
}

export async function saveDeviceId(deviceId: string) {
  await setSecret(DEVICE_ID_KEY, deviceId);
}

export async function getDeviceId() {
  return getSecret(DEVICE_ID_KEY);
}

export async function clearSecureStorage(scope?: string) {
  if (scope) await deletePrivateKey(scope);
  await deleteSecret(DEVICE_ID_KEY);
}
