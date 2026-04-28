import Constants from "expo-constants";
import { Platform } from "react-native";

type NotificationModule = typeof import("expo-notifications");
type NotificationSubscription = { remove: () => void };

let notificationsConfigured = false;

async function loadNotifications() {
  if (Platform.OS === "web") return null;

  const Notifications = await import("expo-notifications");
  if (!notificationsConfigured) {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldPlaySound: false,
        shouldSetBadge: true,
        shouldShowBanner: true,
        shouldShowList: true
      })
    });
    notificationsConfigured = true;
  }

  return Notifications;
}

export async function registerForPushNotifications() {
  const Notifications = await loadNotifications();
  if (!Notifications) return null;

  const current = await Notifications.getPermissionsAsync();
  let granted = current.granted;

  if (!granted) {
    const requested = await Notifications.requestPermissionsAsync();
    granted = requested.granted;
  }

  if (!granted) return null;

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("messages", {
      name: "Messages",
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 160, 120, 160],
      lightColor: "#42ffb6"
    });
  }

  const projectId = Constants.expoConfig?.extra?.eas?.projectId;
  const token =
    typeof projectId === "string" && projectId && projectId !== "replace-with-eas-project-id"
      ? await Notifications.getExpoPushTokenAsync({ projectId })
      : await Notifications.getExpoPushTokenAsync();
  return token.data;
}

export function isBrowserNotificationSupported() {
  return Platform.OS === "web" && typeof window !== "undefined" && "Notification" in window;
}

export async function requestBrowserNotificationPermission() {
  if (!isBrowserNotificationSupported()) return null;

  if (Notification.permission === "granted") return "granted";
  if (Notification.permission === "denied") return "denied";

  return Notification.requestPermission();
}

export function getBrowserNotificationPermission() {
  if (!isBrowserNotificationSupported()) return "unsupported";
  return Notification.permission;
}

export function showBrowserMessageNotification(input: { title: string; body: string; conversationId: string }) {
  if (!isBrowserNotificationSupported() || Notification.permission !== "granted") return;

  const notification = new Notification(input.title, {
    body: input.body,
    tag: `kripchat:${input.conversationId}`,
    data: { conversationId: input.conversationId },
    requireInteraction: false
  });

  notification.onclick = () => {
    window.focus();
    window.location.assign(`/chat/${input.conversationId}`);
  };
}

export function listenForNotificationResponses(onOpenConversation: (conversationId: string) => void) {
  if (Platform.OS === "web") return { remove: () => undefined };

  let active = true;
  let subscription: NotificationSubscription | null = null;

  loadNotifications()
    .then((Notifications: NotificationModule | null) => {
      if (!active || !Notifications) return;
      subscription = Notifications.addNotificationResponseReceivedListener((response) => {
        const conversationId = response.notification.request.content.data?.conversationId;
        if (typeof conversationId === "string" && conversationId) {
          onOpenConversation(conversationId);
        }
      });
    })
    .catch(() => undefined);

  return {
    remove: () => {
      active = false;
      subscription?.remove();
    }
  };
}

export async function sendExpoPushNotification(input: {
  to: string | null | undefined;
  title: string;
  body: string;
  conversationId: string;
}) {
  if (!input.to?.startsWith("ExponentPushToken[")) return;

  const response = await fetch("https://exp.host/--/api/v2/push/send", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Accept-Encoding": "gzip, deflate",
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      to: input.to,
      title: input.title,
      body: input.body,
      sound: "default",
      channelId: "messages",
      priority: "high",
      data: {
        conversationId: input.conversationId
      }
    })
  });

  if (!response.ok) {
    throw new Error(`Expo push failed with ${response.status}`);
  }
}
