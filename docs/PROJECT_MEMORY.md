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

### 2.6 SOS Blackbox & Offline Diagnostic Logging Engine (`sosAuditLogger.ts`)
- **Persistent Disk Audit Logging:** Records every millisecond event during an SOS trigger directly to device storage at `Documents/Rakshika/logs/sos_<id>_diagnostic.json` and `Documents/Rakshika/logs/rakshika_blackbox.log`.
- **Airplane Mode / Radio-Off Handling:** When cellular modem is offline or in airplane mode, logs failure reason (`Radio Off / No Signal`), queues emergency SMS for auto-redelivery upon reconnection, and preserves local 3-second SHA-256 WebM evidence chunks to device Documents folder.
- **Clean ASCII SMS Standard:** Replaced emojis with GSM 7-bit standard ASCII characters (`EMERGENCY SOS: I need help immediately. Live Location: https://maps.google.com/?q=lat,lng [ID: xxx]`) to prevent carrier 70-character UCS-2 encoding truncation.

### 2.7 Forensic Evidence Vault & Police Dossier Engine (`evidencePlaybackService.ts`, `EvidenceVaultScreen.tsx`)
- **Single Master Video Assembly (`master_evidence.webm`):** Captures in fail-safe 3-second slices during an active SOS, and as soon as SOS stops, automatically stitches all slices into ONE single, continuous master video timeline with standard scrubber and full playback controls.
- **High-Contrast Professional Theme:** Designed with crystal-clear slate/indigo containers and high-contrast typography for legibility under all lighting conditions.
- **Instant Timeline Deletion & Cache Clearance:** Completely purges both device storage files (`Documents/Rakshika/evidence/`) and `localStorage` records with real-time UI synchronization (no orphaned or phantom data).
- **100% Real Data Guarantee:** Exclusively shows genuine recorded contacts and GPS data from the actual incident.
- **Section 65B Indian Evidence Act Certificate Export:** One-tap export to print/save an official, legally compliant electronic evidence certificate for police and judicial authorities.

### 2.8 Battery & Storage Optimization Engine (`evidenceStreamingService.ts`, `AppLayout.tsx`)
- **Lightweight 360p @ 15fps Dynamic Compression:** Configured `MediaRecorder` with 180 kbps video / 32 kbps audio bitrate, reducing chunk sizes from 260KB to ~40KB (80% disk & battery savings).
- **Incident Quota Safety Ceiling:** Caps video recording at 30 chunks (~90s / 8MB) per incident to prevent storage overflow if user forgets to cancel.
- **Global Sticky Active SOS Indicator (`AppLayout.tsx`):** Displays a persistent pulsing red top banner across all app screens whenever an SOS is active, showing incident ID and 1-tap **"Stop SOS"** and **"Open SOS"** buttons.
- **Storage Cleanup Utility (`EvidenceVaultScreen.tsx`):** Provides 1-tap "Free Space" and "Delete Evidence" buttons to reclaim device storage.

### 2.9 Android Hardware & Gesture Back Button Subsystem (`useHardwareBackButton.ts`, `@capacitor/app`)
- **App Exit Prevention:** Intercepts Android hardware back button and swipe navigation gestures via `@capacitor/app`.
- **Double-Tap to Exit Guard:** When on the Home screen or Volunteer Dashboard, requires a double-tap within 2 seconds to exit, preventing accidental exits.

### 2.10 AirTag BLE Mesh Diagnostic Hub & Live Simulator (`SosScreen.tsx`, `airTagMeshRelayService.ts`)
- **Interactive Mesh Diagnostics:** On-screen telemetry displaying BLE advertising status, background passive scanner state, local store-and-forward relay buffer packet count, and total relayed beacon count.
- **1-Tap Live Bystander Relay Simulation:** Provides a direct interactive button on `SosScreen.tsx` (`BLE Mesh`) to simulate a passing bystander's device intercepting an offline 25-byte distress beacon, caching it in the relay buffer, stepping into network coverage, and forwarding it to the emergency contacts with instant blackbox log verification.

### 2.11 Native Hardware BLE Mesh Radio Subsystem (`BleMeshPlugin.java`, `airTagMeshRelayService.ts`)
- **Native Android Hardware Peripheral (`BluetoothLeAdvertiser`):** Enables raw physical radio broadcasting of the encrypted 25-byte distress beacon over standard Bluetooth Low Energy (FD6F Service UUID & `0x0952` Manufacturer ID) without requiring cellular network or Wi-Fi.
- **Native Android Hardware Central Scanner (`BluetoothLeScanner`):** Continuously scans for nearby peer distress beacons in the background with `ScanFilter`, capturing raw RSSI signal strength and payload bytes over the air between physical devices.
- **Airplane Mode Operation Guideline:** Bluetooth must be toggled ON (which Android natively supports while in Airplane Mode) on both the victim and bystander devices for over-the-air BLE radio packet transmission.

### 2.12 Dual-Mode Cloud Sync vs. On-Device Vault Architecture (`cloudAuthService.ts`, `cloudSyncManager.ts`)
- **Zero-Cloud Demo / Guest Mode Isolation:** When unauthenticated or in Demo Mode, all Firebase Firestore and Storage operations are 100% bypassed. Eliminates all `User not authenticated`, `CORS`, and `5000ms timeout` errors. Operations run completely on-device (`Documents/Rakshika/`), cellular modem SMS, and hardware BLE mesh.
- **Authenticated Cloud Mode:** When logged in with valid Firebase credentials, automatically synchronizes the live SOS incident document to Firestore, streams real-time GPS breadcrumbs, uploads chunked audio/video evidence, and upon incident completion, stitches and uploads the unified `master_evidence.webm` to Firebase Cloud Storage (`sos_evidence/{uid}/{incidentId}/master_evidence.webm`).
- **Resilient Store-and-Forward Reconciler (`cloudSyncManager.ts`):** Automatically buffers un-uploaded incidents and media when connectivity drops, listening for network restoration to flush pending items with exponential backoff.
- **Dead Code Purge:** Cleaned up 7 legacy/abandoned files (`smsFallbackService.ts`, `bleRelayService.ts`, `types/ble.ts`, `useBleRelay.ts`, `SOSBanner.tsx`, `EmptyState.tsx`, `App.css`) and consolidated `BleStatusCard.tsx` directly onto the native `useAirTagMesh` hardware engine.

---

## 3. Master Reference File

For complete details on all 65+ files, state hooks, types, native Android plugins, and offline algorithms, please refer directly to:
👉 **[`PROJECT_KNOWLEDGE_BASE.md`](file:///Users/ritesh/Documents/Rakshika/Rakshika/PROJECT_KNOWLEDGE_BASE.md)**


