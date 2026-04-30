export type Profile = {
  id: string;
  username: string;
  avatar_url: string | null;
  push_token: string | null;
  e2ee_public_key: string | null;
  online_at: string | null;
  created_at: string;
};

export type Conversation = {
  id: string;
  type: "direct";
  created_at: string;
  updated_at: string;
  auto_destroy_seconds?: number | null;
  auto_destroy_at?: string | null;
  high_risk_enabled?: boolean | null;
  crypto_epoch?: number | null;
  crypto_destroyed_at?: string | null;
};

export type MessageStatus = "sending" | "sent" | "delivered" | "failed";
export type MessageKind = "text" | "image" | "video" | "audio" | "document" | "location";

export type Message = {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string;
  encrypted_body?: string | null;
  client_id: string | null;
  status: MessageStatus;
  kind: MessageKind;
  attachment_path: string | null;
  attachment_name: string | null;
  attachment_mime: string | null;
  attachment_size: number | null;
  location_lat: number | null;
  location_lng: number | null;
  location_label: string | null;
  encrypted_location_label?: string | null;
  created_at: string;
};

export type ChatPreview = {
  conversation: Conversation;
  peer: Profile | null;
  peerOnline: boolean;
  lastMessage: Message | null;
  typing?: boolean;
};

export type ChatRequest = {
  id: string;
  direction: "inbound" | "outbound";
  status: "pending" | "accepted" | "rejected";
  conversation_id: string | null;
  created_at: string;
  responded_at: string | null;
  peer: Profile;
  peerOnline: boolean;
};
