const BASE_URL = "https://mari-selesai--chastabil.replit.app";

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

export interface AdminStats {
  total_pengguna: number;
  pengguna_online: number;
  total_pertemanan: number;
  total_pesan: number;
  pendaftaran_hari_ini: number;
  recent_users: AdminUser[];
  recent_logs: ActivityLog[];
}

export interface AdminUser {
  id: number;
  nama: string;
  email: string;
  kode: string;
  avatar_warna?: string;
  is_online?: boolean;
  last_seen?: string;
  created_at: string;
}

export interface ActivityLog {
  id: number;
  user_id: number;
  aksi: string;
  detail?: string;
  nama?: string;
  created_at: string;
}

// Auth
export const login = (kode_atau_email: string, password: string) =>
  request<{ token: string; user: User }>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ kode_atau_email, password }),
  });

export const register = (nama: string, email: string, password: string) =>
  request<{ token: string; user: User }>("/api/auth/register", {
    method: "POST",
    body: JSON.stringify({ nama, email, password }),
  });

export const getMe = () => request<User>("/api/auth/me");

export const logout = () =>
  request<{ message: string }>("/api/auth/logout", { method: "POST" });

// Maintenance
export const checkMaintenance = () =>
  fetch(`${BASE_URL}/api/admin/check-maintenance`)
    .then(r => r.json())
    .catch(() => ({ maintenance: false }));

// Friends
export const getFriends = () => request<Friend[]>("/api/friends");

export const addFriend = (kode: string) =>
  request<{ message: string }>("/api/friends", {
    method: "POST",
    body: JSON.stringify({ kode }),
  });

export const getFriendRequests = () =>
  request<FriendRequest[]>("/api/friends/requests").catch(() => [] as FriendRequest[]);

export const acceptFriend = (id: number) =>
  request<{ message: string }>(`/api/friends/requests/${id}/accept`, {
    method: "POST",
  });

export const rejectFriend = (id: number) =>
  request<{ message: string }>(`/api/friends/requests/${id}/reject`, {
    method: "POST",
  });

// Location
export const updateLocation = (lat: number, lng: number) =>
  request<{ message: string }>("/api/location/update", {
    method: "POST",
    body: JSON.stringify({ lat, lng }),
  });

export const getFriendLocations = () =>
  request<Friend[]>("/api/location/friends").catch(() => [] as Friend[]);

// Chat
export const getChatMessages = (friend_id: number) =>
  request<Message[]>(`/api/chat/messages?friend_id=${friend_id}`);

export const sendMessage = (friend_id: number, content: string) =>
  request<Message>("/api/chat/messages", {
    method: "POST",
    body: JSON.stringify({ friend_id, content }),
  });

// Groups
export const getGroups = () => request<Group[]>("/api/groups");

export const createGroup = (nama: string) =>
  request<Group>("/api/groups", {
    method: "POST",
    body: JSON.stringify({ nama }),
  });

export const getGroupMessages = (group_id: number) =>
  request<Message[]>(`/api/groups/${group_id}/messages`);

export const sendGroupMessage = (group_id: number, content: string) =>
  request<Message>(`/api/groups/${group_id}/messages`, {
    method: "POST",
    body: JSON.stringify({ content }),
  });

export const getGroupMembers = (group_id: number) =>
  request<GroupMember[]>(`/api/groups/${group_id}/members`);

export const addGroupMember = (group_id: number, kode: string) =>
  request<{ message: string }>(`/api/groups/${group_id}/members`, {
    method: "POST",
    body: JSON.stringify({ kode }),
  });

export const getGroupMaps = (group_id: number) =>
  request<Friend[]>(`/api/groups/${group_id}/maps`).catch(() => [] as Friend[]);

// Polling events
export const pollEvents = (since: string, friend_id?: number, group_id?: number) => {
  let url = `/api/ws?since=${encodeURIComponent(since)}&_t=${Date.now()}`;
  if (friend_id) url += `&friend_id=${friend_id}`;
  if (group_id) url += `&group_id=${group_id}`;
  return request<{ events: unknown[] }>(url).catch(() => ({ events: [] }));
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
  fetch(`${BASE_URL}/api/admin/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, kata_sandi }),
  }).then(r => {
    if (!r.ok) return r.json().then(d => Promise.reject(new Error(d.error || "Login gagal")));
    return r.json() as Promise<{ token: string; username: string }>;
  });

export const adminGetStats = (adminToken: string) =>
  adminRequest<AdminStats>("/api/admin/stats", adminToken);

export const adminGetUsers = (adminToken: string) =>
  adminRequest<AdminUser[]>("/api/admin/users", adminToken);

export const adminToggleMaintenance = (adminToken: string, aktif: boolean) =>
  adminRequest<{ maintenance: boolean; message: string }>("/api/admin/maintenance", adminToken, {
    method: "POST",
    body: JSON.stringify({ aktif }),
  });

export const adminForceLogout = (adminToken: string, userId: number) =>
  adminRequest<{ message: string }>(`/api/admin/force-logout/${userId}`, adminToken, {
    method: "POST",
  });

export const adminDeleteUser = (adminToken: string, userId: number) =>
  adminRequest<{ message: string }>(`/api/admin/users/${userId}`, adminToken, {
    method: "DELETE",
  });
