import { Ionicons } from "@expo/vector-icons";
import type { ComponentProps } from "react";
import { colors } from "@/lib/theme";
import type { MessageStatus as Status } from "@/features/chat/types";

const ICONS: Record<Status | "read", ComponentProps<typeof Ionicons>["name"]> = {
  sending: "time-outline",
  sent: "checkmark",
  delivered: "checkmark-done",
  read: "checkmark-done",
  failed: "alert-circle-outline"
};

export function MessageStatus({ status }: { status: Status | "read" }) {
  return <Ionicons name={ICONS[status]} size={14} color={status === "read" ? colors.blue : colors.muted} />;
}

export default MessageStatus;
