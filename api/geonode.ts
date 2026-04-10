import AsyncStorage from "@react-native-async-storage/async-storage";

const DEFAULT_URL = "https://gapps-production.up.railway.app";
const SERVER_URL_KEY = "gl_server_url";

let cachedBaseUrl: string = DEFAULT_URL;

export async function loadServerUrl(): Promise<string> {
  try {
    const stored = await AsyncStorage.getItem(SERVER_URL_KEY);
    if (stored && stored.trim()) {
      cachedBaseUrl = stored.trim();
    } else {
      cachedBaseUrl = DEFAULT_URL;
    }
  } catch {
    cachedBaseUrl = DEFAULT_URL;
  }
  return cachedBaseUrl;
}

export function getServerUrl(): string {
  return cachedBaseUrl;
}

export async function saveServerUrl(url: string): Promise<void> {
  const cleaned = url.trim().replace(/\/$/, "");
  await AsyncStorage.setItem(SERVER_URL_KEY, cleaned);
  cachedBaseUrl = cleaned;
}

export async function resetServerUrl(): Promise<void> {
  await AsyncStorage.removeItem(SERVER_URL_KEY);
  cachedBaseUrl = DEFAULT_URL;
}

let authToken: string | null = null;

export function setToken(token: string | null) {
  authToken = token;
}

export function getToken() {
  return authToken;
}

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const BASE_URL = cachedBaseUrl;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (authToken) {
    headers["Authorization"] = `Bearer ${authToken}`;
  }
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `HTTP ${res.status}`);
  }
  return res.json();
}

async function adminRequest<T>(
  path: string,
  adminToken: string,
  options: RequestInit = {}
): Promise<T> {
  const BASE_URL = cachedBaseUrl;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${adminToken}`,
    ...(options.headers as Record<string, string>),
  };
  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `HTTP ${res.status}`);
  }
  return res.json();
}

export interface User {
  id: number;
  nama: string;
  email: string;
  kode: string;
  avatar_warna?: string;
}

export interface Friend {
  id: number;
  nama: string;
  kode: string;
  avatar_warna?: string;
  online?: boolean;
  last_seen?: string;
  lat?: number;
  lng?: number;
  status?: string;
}

export interface FriendRequest {
  id: number;
  dari_id: number;
  ke_id: number;
  dari_nama: string;
  dari_kode: string;
  dari_avatar_warna?: string;
  created_at: string;
}

export interface Message {
  id: number;
  content: string;
  is_mine: boolean;
  from_nama?: string;
  created_at: string;
}

export interface Group {
  id: number;
  nama: string;
  kode: string;
  role: string;
  member_count: number;
  created_at: string;
}

export interface GroupMember {
  user_id: number;
  nama: string;
  kode: string;
  role: string;
  avatar_warna?: string;
}

export interface GroupMapMember {
  user_id: number;
  nama: string;
  kode: string;
  role: string;
  avatar_warna?: string;
  lat?: number;
  lng?: number;
  last_seen?: string;
}

export interface AdminStats {
  total_pengguna: number;
  pengguna_online: number;
  total_grup: number;
  total_pesan: number;
}

export interface AdminUser {
  id: number;
  nama: string;
  email: string;
  kode: string;
  is_online: boolean;
  last_seen: string;
  created_at: string;
}

export interface PollingEvent {
  type: string;
  data: unknown;
}

// Auth
export const login = (kode: string, password: string) =>
  request<{ token: string; user: User }>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ kode, password }),
  });

export const register = (nama: string, email: string, password: string) =>
  request<{ token: string; user: User }>("/api/auth/register", {
    method: "POST",
    body: JSON.stringify({ nama, email, password }),
  });

export const logout = () =>
  request<{ message: string }>("/api/auth/logout", { method: "POST" });

export const getMe = () => request<User>("/api/auth/me");

// Friends
export const getFriends = () => request<Friend[]>("/api/friends");

export const addFriend = (kode: string) =>
  request<{ message: string }>("/api/friends/request", {
    method: "POST",
    body: JSON.stringify({ kode }),
  });

export const acceptFriend = (requestId: number) =>
  request<{ message: string }>(`/api/friends/request/${requestId}/accept`, {
    method: "POST",
  });

export const rejectFriend = (requestId: number) =>
  request<{ message: string }>(`/api/friends/request/${requestId}/reject`, {
    method: "POST",
  });

export const getFriendRequests = () =>
  request<FriendRequest[]>("/api/friends/requests");

export const removeFriend = (friendId: number) =>
  request<{ message: string }>(`/api/friends/${friendId}`, {
    method: "DELETE",
  });

// Messages
export const getMessages = (friendId: number, before?: number) => {
  const url = `/api/messages/${friendId}${before ? `?before=${before}` : ""}`;
  return request<Message[]>(url);
};

export const sendMessage = (toId: number, content: string) =>
  request<Message>("/api/messages", {
    method: "POST",
    body: JSON.stringify({ to_id: toId, content }),
  });

// Groups
export const getGroups = () => request<Group[]>("/api/groups");

export const createGroup = (nama: string) =>
  request<Group>("/api/groups", {
    method: "POST",
    body: JSON.stringify({ nama }),
  });

export const joinGroup = (kode: string) =>
  request<{ message: string }>("/api/groups/join", {
    method: "POST",
    body: JSON.stringify({ kode }),
  });

export const getGroupMembers = (groupId: number) =>
  request<GroupMember[]>(`/api/groups/${groupId}/members`);

export const getGroupMapMembers = (groupId: number) =>
  request<GroupMapMember[]>(`/api/groups/${groupId}/map`);

export const leaveGroup = (groupId: number) =>
  request<{ message: string }>(`/api/groups/${groupId}/leave`, {
    method: "POST",
  });

// Location
export const updateLocation = (lat: number, lng: number) =>
  request<{ message: string }>("/api/location", {
    method: "POST",
    body: JSON.stringify({ lat, lng }),
  });

// Maintenance
export const checkMaintenance = () =>
  request<{ maintenance: boolean }>("/api/maintenance");

// Polling
export const pollEvents = (lastTimestamp?: string) => {
  const url = lastTimestamp
    ? `/api/poll?since=${encodeURIComponent(lastTimestamp)}`
    : "/api/poll";
  return request<{ events: PollingEvent[]; timestamp: string }>(url).catch(
    () => ({ events: [] as PollingEvent[], timestamp: new Date().toISOString() })
  );
};

// Keys (E2E encryption)
export const savePublicKey = (public_key: string) =>
  request<{ message: string }>("/api/keys/save", {
    method: "POST",
    body: JSON.stringify({ public_key }),
  });

export const getPublicKey = (userId: number) =>
  request<{ public_key: string }>(`/api/keys/${userId}`);

// Admin
export const adminLogin = (username: string, kata_sandi: string) =>
  fetch(`${cachedBaseUrl}/api/admin/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, kata_sandi }),
  }).then((r) => {
    if (!r.ok)
      return r.json().then((d) =>
        Promise.reject(new Error((d as { error?: string }).error || "Login gagal"))
      );
    return r.json() as Promise<{ token: string; username: string }>;
  });

export const adminGetStats = (adminToken: string) =>
  adminRequest<AdminStats>("/api/admin/stats", adminToken);

export const adminGetUsers = (adminToken: string) =>
  adminRequest<AdminUser[]>("/api/admin/users", adminToken);

export const adminToggleMaintenance = (adminToken: string, aktif: boolean) =>
  adminRequest<{ maintenance: boolean; message: string }>(
    "/api/admin/maintenance",
    adminToken,
    { method: "POST", body: JSON.stringify({ aktif }) }
  );

export const adminForceLogout = (adminToken: string, userId: number) =>
  adminRequest<{ message: string }>(
    `/api/admin/force-logout/${userId}`,
    adminToken,
    { method: "POST" }
  );

export const adminDeleteUser = (adminToken: string, userId: number) =>
  adminRequest<{ message: string }>(`/api/admin/users/${userId}`, adminToken, {
    method: "DELETE",
  });
