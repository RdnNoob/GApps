# GeoNode 📍

Aplikasi mobile untuk melacak lokasi teman secara real-time, chat, dan berbagi lokasi dalam grup.

## Fitur

- **Peta Real-time** — Lihat posisi teman di peta langsung
- **Chat** — Pesan langsung ke teman
- **Grup** — Buat grup dan chat bersama anggota
- **Pertemanan** — Tambah teman via kode unik
- **Lokasi Otomatis** — Lokasi diperbarui otomatis di latar belakang

## Tech Stack

- [Expo](https://expo.dev) SDK 54
- React Native 0.81
- Expo Router (file-based navigation)
- React Query
- TypeScript

## Build APK (GitHub Actions)

Setiap push ke branch `main` akan otomatis men-trigger build APK.

1. Buka tab **Actions** di repo ini
2. Tunggu build selesai (~15–25 menit)
3. Download APK dari bagian **Artifacts** → **GeoNode-APK**

Atau trigger manual: **Actions** → **Build Android APK** → **Run workflow**

## Instalasi APK di HP

1. Download file `app-debug.apk` dari Artifacts
2. Pindahkan ke HP
3. Aktifkan **"Install dari sumber tidak dikenal"** di Pengaturan HP
4. Buka file APK → Install

## Menjalankan Lokal (Development)

```bash
npm install
npx expo start

geonode-app/
├── app/              # Halaman (Expo Router)
│   ├── (tabs)/       # Tab utama (Peta, Teman, Grup, Profil)
│   ├── chat/         # Halaman chat
│   └── group/        # Halaman grup
├── api/              # API client
├── components/       # Komponen reusable
├── context/          # Auth & Location context
├── constants/        # Warna & tema
└── hooks/            # Custom hooks
