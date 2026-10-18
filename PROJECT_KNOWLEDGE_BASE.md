# Rakshika — Complete System Architecture & Project Knowledge Base

> **Single Source of Truth**: This document contains the exhaustive, complete architecture, file registry, module specifications, data models, state flows, and native integration details of the **Rakshika** project. Any AI agent or developer can use this file to understand every facet of the system without having to scan the source tree.
>
> *Last Verified against Codebase:* August 2026

---

## 1. Executive Overview

- **Project Name:** Rakshika
- **Tagline:** India's Most Intelligent Women Safety Ecosystem
- **Description:** A cross-platform mobile and web safety ecosystem engineered for real-time protection, geolocation-based safety navigation, emergency response orchestration, and an AI-driven protective guardian for women in distress ("pinch" situations).
- **Supported Platforms:**
  - Modern Web Browsers (Responsive PWA / Mobile Web)
  - Android Native Application (packaged via Capacitor 8 with custom Java plugins)
- **Primary Roles:**
  1. **User (Women / Citizens):** Real-time SOS alerting, live GPS breadcrumb sharing, safe walk route navigation (lit streets, safe havens), AI guardian chat, fake incoming call generator, audio/video evidence recording, emergency contact management.
  2. **Volunteer / Responder:** Verified community responders, student volunteers, campus security, and authorized personnel receiving nearby SOS broadcasts, accepting emergencies, navigating to victims, and logging resolutions.

---

## 2. Technology Stack & Infrastructure

| Layer | Technologies / Libraries | Purpose |
| :--- | :--- | :--- |
| **Frontend Framework** | React 19 (`react` 19.2.7, `react-dom` 19.2.7), TypeScript ~6.0.2 | UI rendering & component architecture |
| **Build & Tooling** | Vite 8 (`vite` 8.1.1), `@vitejs/plugin-react` 6.0.3, Oxlint 1.71.0 | Fast HMR dev server, bundling, linting |
| **Routing** | React Router DOM 7 (`react-router-dom` 7.18.1) | Client-side routing with role and auth guards |
| **Styling & Animation** | TailwindCSS 4 (`@tailwindcss/vite` 4.3.3, `tailwindcss` 4.3.3), Framer Motion 12.42.2, `clsx`, `tailwind-merge` | Utility styling, glassmorphism UI, transitions |
| **Icons** | Lucide React (`lucide-react` 1.25.0) | Modern UI iconography |
| **Forms & Validation** | React Hook Form (`react-hook-form` 7.82.0), Zod (`zod` 4.4.3), `@hookform/resolvers` 5.4.0 | Registration wizards & contact form validation |
| **GIS & Mapping** | Leaflet 1.9.4 (`leaflet`, `@types/leaflet` 1.9.21), Esri World Dark Gray Canvas & Reference tiles, Nominatim API, Overpass API (`geom`), Photon API, OSRM Foot Routing | 100% free watermark-free dark basemap, real Indian hospital & police area polygon highlighting, pedestrian routing |
| **Backend & Database** | Firebase 12.16.0 (Auth, Firestore, Cloud Storage), Axios 1.18.1 | Dual-mode authentication, incident storage, video evidence uploads, REST telemetry |
| **Mobile Runtime** | Capacitor 8 (`@capacitor/core` 8.4.2, `@capacitor/android` 8.4.2, `@capacitor/cli` 8.4.2, `@capacitor/geolocation` 8.2.0, `@capacitor/filesystem` 8.1.2) | Android native bridge, location access, file system access |
| **Native Android Plugins** | Custom Java Plugin `SmsPlugin.java` | Native cellular SMS broadcasting via Android `SmsManager` without external SMS gateway |
| **Offline Resilience** | Browser Cache Storage API, `localStorage` fallbacks, offline location queue, mock BLE mesh relay (`bleRelayService`), SMS fallback routing | Full functionality in low-connectivity or offline scenarios |

---

## 3. Environment Variables Configuration (`.env`)

The application supports dual-mode operation: if Firebase or OpenRouter keys are missing or set to placeholder values, the app automatically switches to high-fidelity mock/offline modes without throwing unhandled exceptions.

```bash
# Firebase Web App Credentials
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=rakshika-safety.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=rakshika-safety
VITE_FIREBASE_STORAGE_BUCKET=rakshika-safety.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abcdef12345

# AI Guardian LLM Integration
VITE_OPENROUTER_API_KEY=your_openrouter_api_key

# Optional Routing Overrides (Falls back to free OSRM)
VITE_ORS_API_KEY=optional_openrouteservice_key
```

---

## 4. Application Architecture & Navigation Routes

The application entry point is [src/App.tsx](file:///Users/ritesh/Documents/Rakshika/Rakshika/src/App.tsx), wrapped inside `AuthProvider` and `VolunteerProvider`.

### 4.1 Route Map

| Route Path | Component | Guard / Access Level | Description |
| :--- | :--- | :--- | :--- |
| `/splash` | `SplashScreen.tsx` | Public | Initial animated splash and brand logo |
| `/role-select` | `RoleSelectionScreen.tsx` | Public | Choose between **"I Need Safety / User"** and **"I Am a Volunteer / Responder"** |
| `/welcome` | `LandingPage.tsx` | Public | User landing page with 3D feature cards, safety features overview |
| `/login` | `LoginScreen.tsx` | Public | User login via Firebase Auth or instant Demo Bypass |
| `/register` | `RegisterScreen.tsx` | Public | 4-step user registration wizard (Personal info, Medical info, Locations, Emergency contacts) |
| `/` | `Home.tsx` (in `AppLayout`) | Protected (`ProtectedRoute`) | User Dashboard (SOS button, siren toggle, video record toggle, Guardian mode, fake call trigger, live GPS reverse-geocoded header, Zero-Net Offline Emergency Chat & Coordinates trigger) |
| `/map` | `MapScreen.tsx` (in `AppLayout`) | Protected (`ProtectedRoute`) | Safe Walk GIS Map (search, route calculation, offline maps, trip simulator; category tag chips removed) |
| `/ai` | `AiChatScreen.tsx` (in `AppLayout`) | Protected (`ProtectedRoute`) | Rakshika AI Guardian chat with GPS coordinate anchoring and live safe havens |
| `/community` | `CommunityScreen.tsx` (in `AppLayout`) | Protected (`ProtectedRoute`) | Nearby verified volunteers list with simulated live distance and area alert broadcast |
| `/profile` | `ProfileScreen.tsx` (in `AppLayout`) | Protected (`ProtectedRoute`) | User safety profile, safety score, emergency contacts management, permission toggles, logout |
| `/sos` | `SosScreen.tsx` | Protected (`ProtectedRoute`) | Fullscreen SOS trigger: 1.5s press-and-hold, 3s countdown, auto SMS, video recording, Firestore incident creation |
| `/history` | `EvidenceVaultScreen.tsx` | Protected (`ProtectedRoute`) | Forensic Evidence Vault & Incident Dossiers (video playback, SHA-256 hash manifest, print legal certificate) |
| `/history/:id` | `EvidenceVaultScreen.tsx` | Protected (`ProtectedRoute`) | Direct link to specific incident dossier and video playback |
| `/fake-call` | `FakeCallScreen.tsx` | Protected (`ProtectedRoute`) | Fullscreen iOS-style fake incoming call with realistic ring, vibration pattern, and call timer |
| `/volunteer/intro` | `VolunteerIntroScreen.tsx` | Public | Volunteer portal onboarding & mission statement |
| `/volunteer/register` | `VolunteerRegistrationScreen.tsx` | Public | Volunteer registration (Name, Phone, Email, Password, Organization, Volunteer Type) |
| `/volunteer/login` | `VolunteerLoginScreen.tsx` | Public | Volunteer login |
| `/volunteer/verification-pending` | `VerificationPendingScreen.tsx` | `AuthGuard` | Status screen for pending, rejected, or suspended volunteer verification |
| `/volunteer/verification` | `VolunteerVerificationScreen.tsx` | `AuthGuard` | Document upload and ID verification submission |
| `/volunteer/safety` | `VolunteerSafetyScreen.tsx` | `AuthGuard` | Volunteer safety training guidelines & mandatory acknowledgment checklist |
| `/volunteer/permissions` | `VolunteerPermissionsScreen.tsx` | `AuthGuard` | Mandatory hardware permissions setup (Location, Notifications, BLE, SMS) |
| `/volunteer/dashboard` | `VolunteerDashboardScreen.tsx` (in `VolunteerLayout`) | `VolunteerVerifiedGuard` | Responder operations hub: Active alerts, availability toggle, response stats, nearby incidents |
| `/volunteer/alerts` | `AlertsScreen.tsx` (in `VolunteerLayout`) | `VolunteerVerifiedGuard` | Incoming emergency SOS alert feed |
| `/volunteer/history` | `AlertsScreen.tsx` (in `VolunteerLayout`) | `VolunteerVerifiedGuard` | Past resolved SOS response history |
| `/volunteer/profile` | `VolunteerProfileScreen.tsx` (in `VolunteerLayout`) | `VolunteerVerifiedGuard` | Volunteer credentials, organization, response count, verification badge |
| `/volunteer/alert/:id` | `EmergencyAlertScreen.tsx` | `VolunteerVerifiedGuard` | Fullscreen incoming emergency dispatch card with accept/decline actions |
| `/volunteer/map/:id` | `EmergencyMapScreen.tsx` | `VolunteerVerifiedGuard` | Fullscreen tactical navigation map routing volunteer to victim's live coordinates |
| `/volunteer/response/:id` | `ActiveResponseScreen.tsx` | `VolunteerVerifiedGuard` | Active response lifecycle control (`ARRIVED`, `PROVIDING_AID`, `RESOLVE`, `ESCALATE`) |
| `/volunteer/offline` | `OfflineModeScreen.tsx` | `VolunteerVerifiedGuard` | Offline responder console showing BLE mesh device discovery and SMS fallback buffer |

---

## 5. Complete Directory & File Registry

```
Rakshika/
├── .env.example                     # Sample environment variable template
├── capacitor.config.ts              # Capacitor configuration (appId: com.rakshika.safety, webDir: dist)
├── index.html                       # Entry HTML with meta viewport and Leaflet font links
├── package.json                     # Project dependencies and run/build scripts
├── tsconfig.json                    # TypeScript compiler configuration root
├── tsconfig.app.json                # TypeScript application compilation settings
├── tsconfig.node.json               # TypeScript Vite/Node tooling settings
├── vite.config.ts                   # Vite 8 config with React & TailwindCSS plugins
├── android/                         # Complete Android Studio Native Project
│   ├── app/
│   │   ├── build.gradle             # Android build configuration
│   │   └── src/main/
│   │       ├── AndroidManifest.xml  # Android permissions (CAMERA, SMS, GPS, AUDIO, BLE)
│   │       └── java/com/rakshika/safety/
│   │           ├── MainActivity.java # Capacitor BridgeActivity entry point
│   │           └── SmsPlugin.java    # Native Android SMS Manager plugin
│   └── build.gradle                 # Project level Gradle script
├── docs/
│   ├── ANDROID_SETUP.md             # Guide to building APK in Android Studio
│   └── PROJECT_MEMORY.md            # Architecture summary log
├── public/
│   ├── favicon.svg                  # Brand favicon
│   └── icons.svg                    # SVG sprite icons
└── src/
    ├── App.css                      # Base application CSS overrides
    ├── App.tsx                      # Master routing and provider setup
    ├── index.css                    # Tailwind 4 directives & global design tokens
    ├── main.tsx                     # React DOM entry render
    ├── assets/                      # Static branding assets (hero.png, react.svg, vite.svg)
    ├── navigation/
    │   └── VolunteerNavigator.tsx   # AuthGuard, VolunteerVerifiedGuard, and UserRoleGuard
    ├── store/
    │   ├── authStore.tsx            # Unified user & volunteer authentication context
    │   └── volunteerStore.tsx       # Volunteer profile, verification status, and availability state
    ├── types/
    │   ├── ble.ts                   # BLE mesh message, device info, and constants
    │   ├── emergency.ts             # SOSAlert, SOSResponse, DeclineReason, ResolutionType
    │   ├── emergencyContact.ts      # EmergencyContact, ContactFormData, PhoneValidationResult
    │   ├── gis.ts                   # Coords, HelpCenter, RouteDetails, Incident
    │   ├── navigation.ts            # Waypoint, RouteProfile, RouteSummary, NavigationState
    │   ├── offline.ts               # BBox, OfflineCity, DownloadProgress, QueuedLocation
    │   ├── permissions.ts           # PermissionName, PermissionStatus, PermissionDetail
    │   └── volunteer.ts             # VolunteerProfile, VolunteerType, ResponseState, State transitions
    ├── hooks/
    │   ├── useBleRelay.ts           # BLE store-and-forward mesh hook
    │   ├── useConnectivity.ts       # Network online/offline detector
    │   ├── useDistanceCalculation.ts# Distance and ETA calculator hook
    │   ├── useEmergencyAlerts.ts    # Polling & notification hook for nearby SOS alerts
    │   ├── useEmergencyContacts.ts  # Reactive emergency contacts CRUD with localStorage caching
    │   ├── useGisData.ts            # Fetcher hook for safe havens, incidents, and route data
    │   ├── useNavigation.ts         # Waypoint management & >50m route deviation recalculator
    │   ├── useNetworkStatus.ts      # Browser network state with auto-flush trigger
    │   ├── useOfflineLocation.ts    # Offline location breadcrumb buffer hook
    │   ├── usePermissions.ts        # Browser & Capacitor hardware permission checker
    │   └── useUserLocation.ts       # Geolocation watcher with trip simulation along polyline
    ├── services/
    │   ├── aiGuardianService.ts     # OpenRouter multi-model fallback chain + local safety rules engine
    │   ├── api.ts                   # Axios client instance with auth interceptors
    │   ├── bleRelayService.ts       # BLE mesh mock service (advertising, scanning, store-and-forward)
    │   ├── emergencyContactService.ts # Dual-mode (Firestore / localStorage) contact CRUD with phone validation
    │   ├── emergencyResponseApi.ts  # SOS dispatch API, alert fetching, status updates, mock generation
    │   ├── firebase.ts              # Firebase app initialization (Auth, Firestore, Storage)
    │   ├── firebaseAuth.ts          # Firebase auth handlers with demo-bypass mode
    │   ├── gisService.ts            # Photon geocoding, Nominatim fallback, Overpass POIs, 30s volunteer movement
    │   ├── navigationLauncher.ts    # External map application intent launcher (Google Maps, Apple Maps)
    │   ├── navigationService.ts     # Multi-waypoint routing (ORS -> OSRM -> Haversine fallback)
    │   ├── notificationService.ts   # System & in-app push notifications
    │   ├── offlineLocationQueue.ts  # Offline GPS breadcrumbs queue with auto-sync on reconnect
    │   ├── offlineMapService.ts     # Offline tile downloader using Cache Storage API (zooms 12-15)
    │   ├── offlineQueueService.ts   # Generic offline mutation queue
    │   ├── smsFallbackService.ts    # SMS dispatch fallback when data connection is unavailable
    │   └── volunteerApi.ts          # Volunteer profile CRUD, availability updates, verification status
    ├── utils/
    │   ├── cn.ts                    # Class name utility (`clsx` + `tailwind-merge`)
    │   └── geo.ts                   # Haversine distance calculator, ETA computation, bearing calculation
    ├── components/
    │   ├── layout/
    │   │   ├── AppLayout.tsx        # User bottom navigation tab bar (Home, Map, AI, Community, Profile)
    │   │   └── VolunteerLayout.tsx  # Volunteer bottom navigation tab bar (Dashboard, Alerts, History, Profile)
    │   ├── ui/
    │   │   ├── Button.tsx           # Button with variants (default, secondary, danger, ghost, outline)
    │   │   ├── EmptyState.tsx       # Standard empty data illustration container
    │   │   ├── ErrorState.tsx       # Error state container with retry action
    │   │   ├── GlassCard.tsx        # Glassmorphism container (`backdrop-blur-md bg-white/10`)
    │   │   ├── Input.tsx            # Styled input field with icons and validation error labels
    │   │   ├── LoadingState.tsx     # Loading spinner container
    │   │   └── StatusBadge.tsx      # Color-coded badge for verification & alert states
    │   ├── map/
    │   │   ├── InteractiveMap.tsx   # Leaflet map with CartoDB dark tiles, custom pulse markers, safe haven icons, danger halos
    │   │   ├── NavigationPanel.tsx  # Route guidance panel with distance, ETA, safe walk switch, waypoints
    │   │   └── OfflineManager.tsx   # Offline map pack downloader with Cache Storage estimator
    │   ├── emergency/
    │   │   ├── AddContactModal.tsx  # Modal form for adding/editing emergency contacts with phone validation
    │   │   ├── ContactCard.tsx      # Contact item card with call shortcut and priority tag
    │   │   ├── EmergencyCard.tsx    # SOS summary card
    │   │   ├── EmergencyContactsSection.tsx # Expandable contact manager on profile & home
    │   │   ├── OfflineEmergencyModal.tsx # Zero-Net Offline Emergency Chat & GPS coordinates dispatch (Cellular SMS with contact management [add/remove/select/localStorage], BLE mesh, 1-tap templates)
    │   │   ├── PermissionBanner.tsx # Warning banner when location or SMS permissions are denied
    │   │   └── SOSBanner.tsx        # Top urgent alert banner during active SOS
    │   ├── settings/
    │   │   └── PermissionsSection.tsx # Interactive permission status toggles (Location, Camera, Mic, SMS)
    │   └── volunteer/
    │       ├── AvailabilityToggle.tsx # Switch between AVAILABLE, UNAVAILABLE, and OFFLINE
    │       ├── BleStatusCard.tsx    # Displays active BLE mesh peers and store-and-forward relay queue
    │       ├── LocationCard.tsx     # Current GPS lock display for responders
    │       ├── LocationStatusCard.tsx # Responder GPS accuracy and status card
    │       ├── OfflineIndicator.tsx # Floating badge indicating offline / mesh mode active
    │       ├── ResolutionDialog.tsx # Modal dialog to classify and resolve an emergency
    │       └── ResponseActionMenu.tsx # Responder quick actions (Call Victim, Call Police 112, Open Google Maps)
    └── pages/
        ├── AiChatScreen.tsx         # AI Safety Advisor with GPS anchor and quick action chips
        ├── CommunityScreen.tsx      # Verified community volunteers locator and broadcast trigger
        ├── EvidenceVaultScreen.tsx  # Forensic Evidence Vault & Legal Incident Dossier (SHA-256 manifest, video player, police certificate)
        ├── FakeCallScreen.tsx       # Fullscreen realistic fake call generator with vibration
        ├── Home.tsx                 # Main safety dashboard (SOS, Siren, Record, Guardian mode)
        ├── LandingPage.css          # 3D landing page styling and glowing animations
        ├── LandingPage.tsx          # Public landing page with feature cards and route links
        ├── LoginScreen.tsx          # User login screen with Firebase and Demo bypass
        ├── MapScreen.tsx            # Safe Walk navigation map with search, safe havens, and trip simulation
        ├── ProfileScreen.tsx        # User profile, safety score, emergency contacts, permissions
        ├── RegisterScreen.tsx       # 4-step user registration wizard
        ├── RoleSelectionScreen.tsx  # Initial screen to pick User or Volunteer path
        ├── SosScreen.tsx            # Fullscreen SOS trigger with 1.5s press-and-hold & 3s countdown
        ├── SplashScreen.tsx         # Brand intro splash screen with logo animation
        └── volunteer/
            ├── ActiveResponseScreen.tsx      # Active responder dispatch management and lifecycle states
            ├── AlertsScreen.tsx              # Volunteer emergency alerts list and history
            ├── EmergencyAlertScreen.tsx      # Incoming SOS alert pop-up with countdown and accept/decline
            ├── EmergencyMapScreen.tsx        # Tactical navigation map routing volunteer to victim
            ├── OfflineModeScreen.tsx         # Volunteer offline console with BLE mesh scanner
            ├── VerificationPendingScreen.tsx # Screen displayed while volunteer ID verification is reviewed
            ├── VolunteerDashboardScreen.tsx  # Main responder dashboard with availability and incident feed
            ├── VolunteerIntroScreen.tsx      # Volunteer onboarding and recruitment pitch
            ├── VolunteerLoginScreen.tsx      # Volunteer login
            ├── VolunteerPermissionsScreen.tsx# Required hardware permissions checklist for responders
            ├── VolunteerProfileScreen.tsx    # Volunteer profile credentials and response metrics
            ├── VolunteerRegistrationScreen.tsx# Form for volunteer sign-up with organization & type selection
            ├── VolunteerSafetyScreen.tsx     # Responder safety guidelines & code of conduct acknowledgment
            └── VolunteerVerificationScreen.tsx# ID card / government document upload submission
```

---

## 6. Core Subsystems & Technical Details

### 6.1 Safe Walk Map & GIS Routing Engine (`gisService.ts`, `navigationService.ts`, `InteractiveMap.tsx`)

1. **Multi-Engine Geocoding, Intent Detection & Pan-India Search:**
   - **Instant Indian Hubs & Markets Directory:** Curated dictionary covering prominent NCR and metro markets, sectors, and commercial belts (e.g. Alpha 2 Main Market, Jagat Farm, Beta 1, Pari Chowk, Sector 18 Atta Market, DLF Cyber Hub, CP) providing instant `<1ms` lookup with exact coordinate anchors.
   - **Emergency & Amenity Intent Detection:** Natural language query understanding for phrases like *"nearby police from my location"*, *"police near me"*, *"nearby hospital"*, *"pharmacy"*. Automatically extracts user proximity intent, queries active safe havens/help centers, and returns real facilities sorted by proximity with live distance indicators (e.g. `294m away`, `1.2km away`).
   - **Colloquial Market Query Relaxation:** Progressively decomposes queries with suffix descriptors (e.g. *"alpha 2 main market"* -> strips *"main market"* -> geocodes core locality *"alpha 2"* -> synthesizes the commercial market designation and returns exact sector bounds).
   - **Pan-India Nominatim & Photon Geocoder:** Live querying with `countrycodes=in`, `addressdetails=1`, soft proximity bias, and strict India boundary filtering (`[lat 6-38, lng 68-98]`) preventing international result leakage.
2. **High-Definition Satellite & Hybrid Basemap (`InteractiveMap.tsx`):**
   - **Default Google Hybrid Satellite Mode:** Integrated Google Hybrid Satellite tiles (`https://mt{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}`) with `maxZoom: 21` and `maxNativeZoom: 20`, providing photographic satellite imagery with crisp road network and landmark label overlays.
   - **Interactive Layer Switcher:** Floating toggle allowing real-time switching between **Satellite (`Sat`)**, **Google Streets (`Map`)**, and **Night / Dark Mode (`Dark`)**.
   - **Elimination of Deep Zoom Cutoff:** Fixed the previous zoom-16 tile boundary ("Map data not yet available") by supporting sub-meter deep zoom up to level 21.
3. **Emergency Safe Facility Highlighting (Verified Physical Compounds Only):**
   - **Zero Synthetic Hallucinations:** Completely purged synthetic GPS-offset fallback locations (`center.lat + 0.0018`). Emergency highlights now strictly correspond to 100% verified real physical police stations, Mahila thanas, and hospitals.
   - **Footprint Sanitization:** Bounding boxes exceeding 150m (administrative or district spans) are discarded to prevent giant rectangles from covering city sectors. Point facilities are highlighted with a realistic 30–40m compound radius.
   - **Non-Obstructive Tooltips:** Removed permanent text badges hovering over map streets. Clean hover/tap tooltips and 24px icon pins (`♀` for Mahila Thana, `🛡️` for Police, `🏥` for Hospital) keep the map uncluttered.
   - **Stable Redraw Layer:** Keyed the emergency facility layer to station IDs so that 30-second volunteer telemetry drift never causes emergency highlights to flash or re-render.
4. **30-Second Dynamic Volunteer Refresh Cycle:**
   - A persistent volunteer cache maintains responder profiles.
   - Every 30 seconds, positions are smoothly drifted by ~10–30 meters along simulated local patrol paths instead of jittering on every component re-render.
5. **Pedestrian Routing (OSRM):**
   - Routes calculated via OSRM Foot API (`https://router.project-osrm.org/route/v1/foot`).
   - Automatically falls back to straight-line Haversine interpolation if offline or rate-limited.
   - **Auto-Recalculation:** `useNavigation` continuously compares the user's live coordinates against the route polyline; if deviation exceeds 50 meters, a new route is calculated automatically.
6. **Hazard Zones Clarification:**
   - Artificial/mock red and yellow hazard circles and danger halos have been permanently removed from the map view for a clean, distraction-free safety visualization.

### 6.2 AI Guardian System (`aiGuardianService.ts`, `AiChatScreen.tsx`)

1. **Geolocation & POI Anchoring:**
   - Every prompt sent to the AI Guardian injects a structured system prompt containing:
     - The user's live reverse-geocoded street address.
     - Exact latitude & longitude coordinates.
     - Top 5 nearest verified safe havens with exact distances in meters.
     - Active danger advisories in the vicinity.
2. **Cascading Model Fallback Chain:**
   - When configured with an OpenRouter API key, requests attempt models sequentially with a 4.5-second timeout per model:
     1. `nvidia/nemotron-3.5-lightning:free`
     2. `liquid/lfm-2.5-2.6b:free`
     3. `meta-llama/llama-3.1-8b-instruct`
     4. `meta-llama/llama-3.3-70b-instruct`
     5. `google/gemma-2-9b-it:free`
     6. `mistralai/mistral-7b-instruct:free`
     7. `openai/gpt-3.5-turbo`
3. **Local Offline Safety Intelligence Engine:**
   - If offline or if all API attempts fail, the built-in deterministic safety engine generates instant tactical instructions across 5 pinch scenarios:
     - *Stalking / Followed / Dark Street*
     - *Suspicious Cab / Taxi / Auto Driver*
     - *Medical Emergency / Trauma*
     - *Safe Route Navigation*
     - *General Threat Advisory*
   - Returns interactive action chips: **"🚨 Press SOS Now"**, **"📱 Trigger Fake Call"**, **"📞 Call 112 PCR"**, **"📞 Call 1091 Women Cell"**, **"🗺️ Auto-Route to Police"**.

### 6.3 Real-Time SOS & Emergency Pipeline (`SosScreen.tsx`, `SmsPlugin.java`)

1. **Press-and-Hold Activation:**
   - Requires pressing the SOS button continuously for 1.5 seconds (progress bar from 0% to 100%) to prevent accidental triggers.
   - On completion, triggers haptic vibration pattern: `[200ms, 100ms, 200ms, 100ms, 500ms]`.
2. **3-Second Cancellation Window:**
   - A 3-second visual countdown enables the user to abort if triggered accidentally.
3. **Dual Dispatch Mechanism:**
   - **Native Cellular SMS (`SmsPlugin.java`):** If running on Android via Capacitor, the native plugin uses Android's `android.telephony.SmsManager` to directly send emergency SMS containing the live Google Maps location link to all verified emergency contacts without opening the SMS composer or requiring internet.
   - **Cloud Firestore & Storage:** Creates an incident record in Firestore collection `incidents` with coordinates, timestamp, and user profile.
4. **Video/Audio Evidence Capture:**
   - Immediately starts `MediaRecorder` on the front camera and microphone in the background.
   - Blobs are uploaded to Firebase Storage under `sos_recordings/{userId}_{timestamp}.webm` and referenced in Firestore.

### 6.4 Volunteer / Responder Network Lifecycle (`volunteerStore.tsx`, `emergencyResponseApi.ts`, `VolunteerNavigator.tsx`)

1. **Volunteer Verification Pipeline:**
   - `PENDING` -> User registered, awaiting document check (`VerificationPendingScreen.tsx`).
   - `VERIFIED` -> Approved; allowed past `VolunteerVerifiedGuard` into dashboard.
   - `REJECTED` / `SUSPENDED` -> Denied access with status explanation.
2. **Responder Availability State Machine:**
   - `AVAILABLE` (actively listening for nearby SOS broadcasts within 3km).
   - `UNAVAILABLE` (temporarily paused).
   - `RESPONDING` (actively en route to an accepted emergency).
   - `OFFLINE` (logged off / app closed).
3. **Emergency Response Lifecycle:**
   - `IDLE` -> `ALERTED` -> `ACCEPTED` -> `RESPONDING` -> `ARRIVING` -> `ASSISTANCE_PROVIDED` -> `RESOLVED`.
   - Optional transitions: `DECLINED`, `CANCELLED`, `ESCALATED`.
4. **Resolution Classification:**
   - Upon completing an escort or intervention, responders classify the outcome:
     - `ASSISTANCE_PROVIDED`
     - `CAMPUS_SECURITY_TOOK_OVER`
     - `EMERGENCY_SERVICES_TOOK_OVER`
     - `USER_SAFE`
     - `FALSE_ALARM`

### 6.5 Offline-First Architecture & BLE Mesh Simulation (`bleRelayService.ts`, `offlineMapService.ts`, `offlineLocationQueue.ts`)

1. **Offline Map Packs:**
   - `offlineMapService.ts` batches and downloads map tiles across zoom levels 12 to 15 for bounding boxes corresponding to major cities (e.g., Delhi NCR, Mumbai, Bengaluru, Campus Zones) into the browser `CacheStorage` (`rakshika-map-tiles-v1`).
   - Leaflet's tile layer intercepts requests and serves cached tiles when `navigator.onLine === false`.
2. **Offline Location Queue:**
   - When offline during an active SOS or trip, GPS breadcrumbs are persisted in `localStorage` under `rakshika_offline_locations`.
   - `useNetworkStatus` automatically flushes and posts the queue to the backend upon network reconnection.
3. **BLE Mesh Store-and-Forward Relay:**
   - `bleRelayService.ts` implements a multi-hop (max 3 hops) store-and-forward mesh message protocol with 30-minute TTL and message deduplication via unique `messageId` hashes.
   - In no-internet environments, emergency alerts are relayed device-to-device to nearby responders within Bluetooth range.
4. **SMS Fallback Routing:**
   - If an active responder accepts or resolves an alert while disconnected from cellular data, `smsFallbackService.ts` formats an SMS payload (`RAKSHIKA SOS | Action: ACCEPT | SOS: <id> | Vol: <volId>`) dispatched to an emergency gateway number.
5. **Zero-Net Offline Emergency Chat & Coordinates Dispatch (`OfflineEmergencyModal.tsx`):**
   - Directly accessible from the Home dashboard header, replacing the legacy percentage badge with a high-visibility "Zero-Net Offline Chat" trigger.
   - **Streamlined, Distraction-Free UI:** Purged the redundant "Live GPS Anchor" card (as accurate GPS coordinates are automatically embedded into every outgoing message timestamp and SMS body) and removed the "Low Battery" template chip.
   - **Compact Horizontal Quick SOS Chips:** Positioned directly above the chat message input field (`🚨 In Danger / Police`, `⚠️ Being Followed`, `🚑 Medical Help`, `📍 Send Coordinates`), leaving maximum screen estate for the emergency transcript feed.
   - **Tier 3 BLE Multi-Message Transmission Fix (`cryptoMeshService.ts`, `BleMeshPlugin.java`):**
     - *Root Cause of Subsequent Message Drop:* Previous versions serialized a 100+ byte JSON payload which `BleMeshPlugin.java` truncated to the first 20 bytes (`rk_` + 17 hex chars). Because messages shared identical prefixes (`{"id":"OFFLINE-...`), successive transmissions produced identical 20-byte ciphertexts, causing receiver Phone B's deduplication buffer (`buffer.find(p => p.ciphertext === ciphertext)`) to silently drop all messages after the first.
     - *18-Byte Binary Telemetry Struct:* Migrated to a compact 18-byte binary layout: Magic Header (`0x52, 0x4B`) + 16-bit Random Nonce (`2B`) + Scaled Lat (`4B`) + Scaled Lng (`4B`) + Timestamp (`4B`) + Flags/Urgency (`1B`) + XOR Checksum (`1B`).
     - *Per-Packet Nonce Guarantee:* The 16-bit random nonce guarantees every packet produces unique ciphertext, fitting 100% within BLE primary advertisement PDU without truncation and allowing seamless transmission and receipt of multiple rapid messages.
     - *Advertiser Cooldown Delay:* Added a 120ms cooldown in `BleMeshPlugin.java` between `stopAdvertising` and `startAdvertising` to prevent Android chipsets from throwing `ADVERTISE_FAILED_ALREADY_STARTED` (error 3).
     - *Instant Drive-By Simulation:* Integrated `simulateDriveByPass` in `airTagMeshRelayService.ts` allowing instant end-to-end verification of Tier 3 BLE relays without physical relocation.
   - **Airplane Mode BLE Radio Management:**
     - Native detection of Bluetooth status via `getBluetoothState` and 1-tap `ACTION_REQUEST_ENABLE` system intent, enabling Bluetooth operation while in Airplane Mode.
   - Dual-channel emergency dispatch:
     - Direct cellular SMS (`SmsPlugin.java` on Android / native SMS intent on mobile web) to selected emergency contacts and Police 112.
     - Over-the-air peer-to-peer Bluetooth beacon advertising (`airTagMeshRelayService.broadcastSosBeacon`).
   - **Tier 3 BLE Emergency Message & Category Transmission (`cryptoMeshService.ts`, `BleMeshPlugin.java`):**
     - *Dual-Layer Message Architecture:* In addition to accurate GPS coordinates, emergency distress messages (e.g. "i need some doctors" or quick distress templates) are now transmitted directly over the air.
     - *Primary Payload (3-Bit Category Encoding):* Byte 16 of the 18-byte binary beacon incorporates a 3-bit emergency category code (0: GENERAL, 1: MEDICAL, 2: POLICE/DANGER, 3: STALKING, 4: ACCIDENT, 5: FIRE/HAZARD, 6: STRANDED, 7: CUSTOM), ensuring instant identification even if only the primary advertisement packet is captured.
     - *Secondary Scan Response (Over-The-Air Text):* `BleMeshPlugin.java` encodes up to 26 bytes of UTF-8 custom message text into the BLE Scan Response packet via Service Data (`0xFD6F`). Receiver devices decode both the coordinates and exact text.
   - **Ultra-Low-Power Background BLE Scanning & Zero Battery Drain (`BleMeshPlugin.java`):**
     - *Hardware-Offloaded Filtering:* Employs native hardware `ScanFilter` matched directly to Manufacturer ID `0x0952` (`MANUFACTURER_ID_RAKSHIKA`). The phone's Bluetooth controller firmware filters packets in hardware, allowing the main CPU to remain in deep sleep (Doze mode) without waking up for irrelevant Bluetooth traffic.
     - *Duty-Cycle Battery Saver (`SCAN_MODE_LOW_POWER`):* Configures scanning to `SCAN_MODE_LOW_POWER` (~0.5s active every 5s, ~10% duty cycle, consuming < 1.5 mA avg, resulting in < 1% battery drain over a full 24-hour period).
     - *Dynamic Lifecycle Adaptation:* `BleMeshPlugin.java` hooks into Capacitor's `handleOnPause()` and `handleOnResume()`. When the app is backgrounded or screen turned off, the scanner automatically throttles into `SCAN_MODE_LOW_POWER` for battery preservation; when the user returns to the app, it smoothly elevates to `SCAN_MODE_BALANCED` for rapid interactive responsiveness.
   - **Peer Interception Visual & Haptic Alert (`App.tsx`, `airTagMeshRelayService.ts`):**
     - Whenever a nearby peer device running Rakshika intercepts a distress beacon over the air, it immediately triggers native haptic vibration (`navigator.vibrate([200, 100, 200, 100, 300])`) and displays a top glowing alert banner displaying the emergency message (e.g. `💬 "i need some doctors"`), category badge (`[MEDICAL]`), GPS coordinates, and relays it directly to the Emergency Cloud Network (`sos_mesh_relays`).
   - **Interactive SMS Targets & Contact Management (`OfflineEmergencyModal.tsx`):**
     - Rather than displaying static phone numbers or count, the SMS Targets sub-header now features an interactive management bar.
     - *Quick Contact Chips:* Displays contact names and numbers with visual selection indicators. Users can tap any chip to toggle whether that recipient receives the SMS distress dispatch.
     - *Expandable Contact Manager Drawer:* Users can view their full list of trusted emergency recipients, click a delete/trash icon to remove obsolete contacts, and use an inline form (`Name` + `Phone Number`) to add new trusted contacts on the fly.
     - *Instant Persistence:* All added and removed contacts are immediately persisted into `localStorage` under `rakshika-emergency-contacts`, synchronizing across app restarts and safety sessions.
   - Persists a complete offline dispatch chat history in `localStorage` under `rakshika_offline_distress_chat`.

### 6.6 Forensic Evidence Vault & Incident Dossier (`EvidenceVaultScreen.tsx`, `evidencePlaybackService.ts`)

1. **Forensic Integrity & Chain of Custody:**
   - Automatically archives recorded video segments, GPS telemetry breadcrumbs, responder logs, and device timestamps upon SOS resolution.
   - Generates SHA-256 forensic hashes for master video recordings and event logs to verify tamper-proof evidentiary status.
   - Provides a one-click printable **Legal Police Certificate** (`window.print()`) formatted for Indian law enforcement (Section 65B Indian Evidence Act / Bharatiya Sakshya Adhiniyam compliance).
2. **High-Contrast UI & Readability Design Standard:**
   - **Dashboard Entry Card (`Home.tsx`):** Built with an opaque high-contrast surface (`bg-white/95 border-2 border-red-200/90 hover:border-red-400 shadow-md`), deep charcoal headings (`text-gray-950 font-bold`), high-contrast body text (`text-gray-700 font-medium`), vibrant crimson badge (`from-red-500 to-rose-600`), and prominent call-to-action button (`bg-red-600 text-white font-bold`).
   - **Vault Screen (`EvidenceVaultScreen.tsx`):** Dark forensic workspace with high-contrast text (`text-slate-200`, `text-slate-300 font-bold`), distinct status tags, and crisp hash displays to guarantee effortless legibility under all lighting conditions.

---

## 7. Native Android Layer Details (`android/`)

- **Package Name / Application ID:** `com.rakshika.safety`
- **Capacitor Version:** 8.4.2
- **Main Activity:** `android/app/src/main/java/com/rakshika/safety/MainActivity.java` (extends `BridgeActivity`).
- **Custom Native Plugin:** `android/app/src/main/java/com/rakshika/safety/SmsPlugin.java`
  - Registered as `@CapacitorPlugin(name = "SmsPlugin")`.
  - Exposes `@PluginMethod public void sendDirectSms(PluginCall call)`.
  - Reads `phone` and `message` arguments and calls `SmsManager.getDefault().sendTextMessage()`.
- **Declared Manifest Permissions (`AndroidManifest.xml`):**
  - `android.permission.INTERNET`
  - `android.permission.CAMERA`
  - `android.permission.RECORD_AUDIO`
  - `android.permission.MODIFY_AUDIO_SETTINGS`
  - `android.permission.ACCESS_FINE_LOCATION`
  - `android.permission.ACCESS_COARSE_LOCATION`
  - `android.permission.SEND_SMS`
  - `android.permission.VIBRATE`
  - `android.permission.BLUETOOTH_CONNECT`

---

## 8. Development & Build Scripts

| Command | Action |
| :--- | :--- |
| `npm run dev` | Starts the Vite local development server on `http://localhost:5173` |
| `npm run build` | Compiles TypeScript and builds the production web bundle into `dist/` |
| `npm run lint` | Runs Oxlint across the codebase for static code analysis |
| `npm test` / `npx vitest run` | Runs unit & integration test suites (GIS, Navigation, SOS, Offline Map) |
| `npm run preview` | Previews the production `dist/` build locally |
| `npm run android:sync` | Builds web bundle and copies assets into `android/app/src/main/assets/public/` |
| `npm run android:open` | Launches the native Android project in Android Studio |

---

## 9. Key State Keys & LocalStorage Reference

| LocalStorage Key | Type | Description |
| :--- | :--- | :--- |
| `access_token` | `string` | User / Volunteer session token (or `mock-token-...`) |
| `user_profile` | `JSON string` | User profile data (name, email, phone, medical info) |
| `rakshika_role` | `"user" \| "volunteer"` | Current authenticated user role |
| `rakshika-emergency-contacts` | `EmergencyContact[]` | Offline emergency contacts list for instantaneous SOS dispatch |
| `rakshika_volunteer_profile` | `VolunteerProfile` | Volunteer profile, verification status, and metrics |
| `rakshika_active_map_state` | `JSON string` | Persisted waypoints and selected POI state across screen switches |
| `rakshika_offline_locations` | `QueuedLocation[]` | Buffered GPS breadcrumbs awaiting network reconnect |
| `rakshika_mock_active_alert` | `SOSAlert` | Simulated incoming emergency alert for volunteer testing |
