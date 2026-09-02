# Rakshika — Central Project Memory & Architecture Registry

> **Master Architecture Reference**: See **[`PROJECT_KNOWLEDGE_BASE.md`](file:///Users/ritesh/Documents/Rakshika/Rakshika/PROJECT_KNOWLEDGE_BASE.md)** at root for the complete, exhaustive specification of every file, subsystem, route, state machine, and data model.
>
> *Last Updated:* September 2026

---

## 1. High-Level Architecture & Tech Stack
- **Framework:** React 19 + TypeScript + Vite 8
- **Platform:** Cross-platform Web + Android Native (Capacitor 8)
- **Styling:** TailwindCSS 4 + Framer Motion
- **Map & GIS:** Leaflet + OpenStreetMap + OSRM Pedestrian Routing + Overpass API + Photon Autocomplete + CartoDB Dark Tiles + Cache Storage (Offline tiles)
- **AI Companion:** OpenRouter Multi-Model Cascading Fallback Chain (`nvidia/nemotron-3.5-lightning`, `liquid/lfm-2.5-2.6b`, `llama-3.1-8b`, `gemma-2-9b`, etc.) + Local Deterministic Emergency Rules Engine
- **Authentication & Backend:** Firebase Auth + Firestore + Cloud Storage + Capacitor Native Java SmsPlugin (`android.telephony.SmsManager`)
- **Root Layout:** Monorepo at root with `android/` at root.
- **Actor Personas:** User (Protected Citizen) & Volunteer (Verified Community Responder)

---

## 2. Resilient SOS & Crowdsourced Mesh Architecture (September 2026 Upgrades)

### 2.1 Multi-Channel Dispatch Guarantee Engine (`dispatchEngine.ts`)
1. **Cellular SMS Channel:** Direct native dispatch via `SmsPlugin` (`android.telephony.SmsManager`) to configured emergency contacts (with live Google Maps location link). Works on 2G cellular independently of internet.
2. **Firebase Firestore Channel:** Idempotent incident synchronization with 5-second race timeout and exponential backoff retry queue on reconnection.
3. **Institutional 112 ERSS & Police Channel:** Simulated live telemetry status with live timestamp for judge demos.
4. **181 Women Helpline Channel:** Simulated national helpline broadcast telemetry.
5. **Volunteer Responder Mesh:** Local radius broadcast (2.5 km) to student & campus security volunteers.
6. **AirTag Crowdsourced BLE Mesh:** Real-time encrypted beacon broadcast.

### 2.2 AirTag-Style Crowdsourced BLE Mesh Relay (`airTagMeshRelayService.ts`, `useAirTagMesh.ts`)
- **Blind Asymmetric Encryption (`cryptoMeshService.ts`):** Encrypts distress beacons so abusers with BLE sniffers see only random telemetry noise.
- **Drive-By Store-Carry-Forward Intercept:** Bystanders/vehicles passing within 100m intercept and cache the beacon in 1.5 seconds without needing internet or user interaction.
- **Auto-Cloud Bridge:** Passing devices automatically flush buffered emergency beacons to Firestore (`sos_mesh_relays`) the moment they drive back into cellular/Wi-Fi coverage.

### 2.3 3-Second Chunked Live Evidence Streaming (`evidenceStreamingService.ts`)
- Audio/video is captured in 3-second timeslices via `MediaRecorder`.
- Each chunk is hashed with **SHA-256** using the native Web Crypto API (`crypto.subtle.digest`) upon capture.
- Chunks upload sequentially to Firebase Storage + backup to Capacitor Filesystem.
- **Tamper-Evident Chain-of-Custody:** If the phone is destroyed mid-incident, all previously uploaded chunks and their SHA-256 manifests remain safe in the cloud.

### 2.4 Anti-Abuser & Zero-Connectivity Safeguards
- **Ghost Mode (Covert SOS):** Simulates a dead battery / pitch-black screen with zero audio/vibrations while keeping camera, mic, GPS, and BLE broadcasting active.
- **Pre-Trip Guardian Anchor (`guardianAnchorService.ts`):** Timed safety session before entering dark/remote zones. If the phone goes offline and fails to ping before timer expiry, cloud auto-alerts guardians with last known GPS.
- **Silent Check-In Protocol (`useSilentCheckIn.ts`):** Periodic discrete check-in prompt ("Tap if safe, ignore if under duress"). Timeout automatically elevates incident urgency.
- **Volunteer Dead-Man's Switch (`ActiveResponseScreen.tsx`):** Monitors responder GPS delta over 75 seconds; stationary inactivity auto-escalates to institutional authorities.

### 2.5 National Helpline Modernization
- All legacy references (`1091`) updated across AI Guardian and GIS to official national standards:
  - **112**: Unified Emergency Response Support System (ERSS)
  - **181**: National Women Helpline (24/7)
  - **14490**: NCW 24×7 Women Helpline

---

## 3. Master Reference File

For complete details on all 65+ files, state hooks, types, native Android plugins, and offline algorithms, please refer directly to:
👉 **[`PROJECT_KNOWLEDGE_BASE.md`](file:///Users/ritesh/Documents/Rakshika/Rakshika/PROJECT_KNOWLEDGE_BASE.md)**
