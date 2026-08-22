# Rakshika — Central Project Memory & Architecture Registry

> **Purpose:** This file serves as the single source of truth for the entire Rakshika codebase. Agents should consult this file first to understand project architecture, file registry, services, and state without scanning the entire source tree on every prompt.

*Last Updated:* August 21, 2026

---

## 1. High-Level Architecture & Tech Stack
- **Framework:** React 19 + TypeScript + Vite 8
- **Platform:** Cross-platform Web + Android (Capacitor 8)
- **Styling:** TailwindCSS 4 + Framer Motion
- **Map & GIS:** Leaflet + OpenStreetMap + OSRM + Overpass API + Cache Storage (Offline tiles)
- **AI Companion:** OpenRouter API (`google/gemma-4-31b-it:free`) with GPS anchor & live POI injection
- **Authentication & Backend:** Firebase Auth + Firestore + Capacitor SmsPlugin (native Android SMS)
- **Root Layout:** Monorepo at root (no `web/` folder). Android project located at `android/`.

---

## 2. Environment Variables (`.env`)
- `VITE_FIREBASE_API_KEY`: Firebase web API key
- `VITE_FIREBASE_AUTH_DOMAIN`: Firebase auth domain
- `VITE_FIREBASE_PROJECT_ID`: Firebase project ID
- `VITE_FIREBASE_STORAGE_BUCKET`: Firebase storage bucket
- `VITE_FIREBASE_MESSAGING_SENDER_ID`: FCM sender ID
- `VITE_FIREBASE_APP_ID`: Firebase App ID
- `VITE_OPENROUTER_API_KEY`: OpenRouter API key for Rakshika AI Guardian
- `VITE_ORS_API_KEY`: Optional OpenRouteService key (falls back to OSRM)

---

## 3. Directory & File Registry

### 3.1 App Shell & Config
- `index.html`: Entry HTML with viewport and title
- `src/main.tsx`: React DOM mount
- `src/App.tsx`: React Router DOM routing (`/`, `/welcome`, `/login`, `/register`, `/sos`, `/map`, `/ai`, `/community`, `/profile`, `/fake-call`)
- `src/index.css`: Global styles & Tailwind 4 imports
- `capacitor.config.ts`: Capacitor configuration (`appId: com.rakshika.safety`, `webDir: dist`)

### 3.2 Pages (`src/pages/`)
- `LandingPage.tsx`: Welcome splash with 3D feature cards, redirects to `/register` or `/login`.
- `LoginScreen.tsx`: Firebase email/password auth + demo bypass mode.
- `RegisterScreen.tsx`: 4-step registration wizard (personal, medical, locations, emergency contacts).
- `Home.tsx`: Dashboard with animated SOS button, siren (Web Audio), video/audio record, fake call shortcut, and Guardian mode toggle.
- `SosScreen.tsx`: Press-and-hold (1.5s) SOS trigger, 3s countdown, native SMS dispatch via `SmsPlugin`, live geolocation watch, video evidence recording to device & Firebase Storage, incident logging to Firestore.
- `MapScreen.tsx`: Safe walk map with Nominatim address search, OSRM routing, safe zone POIs (police, safe colleges, safe gathering spots, volunteers), unlit street alerts, offline map manager, trip simulator.
- `AiChatScreen.tsx`: Rakshika AI safety advisor with mandatory geolocation anchoring, reverse geocoded street name, 5 nearest safe havens, and emergency action instructions.
- `CommunityScreen.tsx`: Nearby verified volunteers with simulated dynamic proximity and area broadcast alert.
- `ProfileScreen.tsx`: User profile, safety score, expandable emergency contacts editor, permissions section, logout & delete account.
- `FakeCallScreen.tsx`: iOS-style fake incoming call simulator with vibration pattern and call timer.

### 3.3 Components (`src/components/`)
- `layout/AppLayout.tsx`: Bottom navigation tab bar wrapper with active route highlighting.
- `ui/Button.tsx`: Customizable button with variants (`default`, `secondary`, `danger`, `ghost`, `outline`).
- `ui/GlassCard.tsx`: Glassmorphism container.
- `ui/Input.tsx`: Styled text/number input with icons and error labels.
- `map/InteractiveMap.tsx`: Leaflet map component with dark CartoDB tiles, user location pulse marker, waypoint markers, POI icons, and offline tile cache interceptor.
- `map/NavigationPanel.tsx`: Route summary panel with duration, distance, safe-walk profile switch, and waypoint list.
- `map/OfflineManager.tsx`: Offline map downloader for 40-50km bounding boxes with progress tracking and Cache Storage storage estimator.
- `emergency/EmergencyContactsSection.tsx`: Contact manager with verification badges, primary contact toggle, and add/edit/delete modals.
- `emergency/AddContactModal.tsx`: Modal form for adding/editing emergency contacts with phone validation.
- `emergency/ContactCard.tsx`: Contact display item with call button, priority rank, and delete action.
- `emergency/PermissionBanner.tsx`: Permission warning banner when SMS/Location permissions are denied.
- `settings/PermissionsSection.tsx`: Permission status toggles (Location, Camera, Microphone, SMS).

### 3.4 Services (`src/services/`)
- `firebase.ts`: Firebase App initialization (`auth`, `db`, `storage`).
- `firebaseAuth.ts`: Dual-mode (real vs mock) auth service (`login`, `register`, `logout`, `deleteAccount`).
- `emergencyContactService.ts`: CRUD for emergency contacts with offline localStorage sync (`rakshika-emergency-contacts`) and Firestore sync.
- `gisService.ts`: Nominatim address search, reverse geocoding, OSRM pedestrian routing, Overpass API POI fetching (police, women's police, safe colleges, safe gatherings), mock volunteer generator, unlit street incidents.
- `navigationService.ts`: Multi-waypoint route calculation with cascading fallbacks (ORS -> OSRM -> Haversine).
- `offlineMapService.ts`: Tile batch downloader using Cache Storage API, tile URL generator for zoom 12-15, and cache lookup.
- `offlineLocationQueue.ts`: Offline GPS breadcrumb queue with localStorage persistence and auto-flush on reconnect.
- `api.ts`: Axios instance configured for future backend telemetry.

### 3.5 Hooks (`src/hooks/`)
- `useUserLocation.ts`: Geolocation watcher with trip simulation along route polylines.
- `useGisData.ts`: Coordinates data fetcher for help centers, incidents, and routes.
- `useNavigation.ts`: Waypoint management and auto-recalculation when user deviates >50m from route.
- `useNetworkStatus.ts`: Online/offline status watcher with auto-flush trigger.
- `useOfflineLocation.ts`: Location tracking buffered through the offline queue.
- `usePermissions.ts`: Browser & Capacitor permission state checker.
- `useEmergencyContacts.ts`: Reactive state hook for emergency contacts list.

### 3.6 Types & Utils
- `types/gis.ts`: `Coords`, `HelpCenter`, `Incident`, `RouteDetails`.
- `types/navigation.ts`: `Waypoint`, `RouteProfile`, `RouteSummary`, `NavigationState`.
- `types/emergencyContact.ts`: `EmergencyContact`, `ContactFormData`, `PhoneValidationResult`.
- `types/offline.ts`: `BBox`, `OfflineCity`, `DownloadProgress`.
- `types/permissions.ts`: `PermissionState`, `AppPermissions`.
- `utils/geo.ts`: Haversine distance calculator.
- `utils/cn.ts`: Class name merger.

---

## 4. Native Android Layer (`android/`)
- `MainActivity.java`: Capacitor BridgeActivity, registers plugins and requests runtime permissions.
- `SmsPlugin.java`: Custom Capacitor Java plugin sending native SMS via Android `SmsManager`.
- `AndroidManifest.xml`: Declares permissions for CAMERA, RECORD_AUDIO, ACCESS_FINE_LOCATION, SEND_SMS, VIBRATE, INTERNET.

---

## 5. Recent Upgrades & Change Changelog (August 22, 2026)

### 5.1 Map & GIS Overhaul
1. **Search & Geocoding:**
   - Dual-engine geocoding: Fast Photon Autocomplete (location-biased to user GPS) + Nominatim fallback + instant local landmark resolver.
   - Search query triggers from `>= 2` characters with `300ms` debounce and `AbortController` cancellation.
   - Rich address display combining street, locality, district, city, state.
2. **Safe Havens & Emergency Infrastructure:**
   - Overpass API query pulls verified 24/7 Pharmacies (`pharmacy_24h`), Transit/Metro hubs (`transit_station`), Police/Mahila Thana (`women_police`), 24/7 Emergency Hospitals (`hospital`), and Guarded ATMs (`atm_bank`).
   - Dynamic fallbacks ensure emergency nodes are never empty.
3. **Realistic Danger Zones & Risk Warnings:**
   - High, medium, and low severity risk zones with visual halos (`L.circle`) on the map.
   - Detailed safety advisories (e.g. low visibility alley, harassment loitering hotspot, no CCTV) with "Avoid Area" action.
4. **Volunteers 30-Second Refresh Cycle:**
   - Persistent volunteer pool that gently updates its beacon positions every **30 seconds** (instead of jittering on every state render).
5. **Modern Non-Blocking UI Layout:**
   - Replaced static blocking 240px bottom card with sleek non-blocking mini-pill when idle.
   - Floating Recenter button + Zoom controls positioned cleanly on the top-right (`top-36 right-4 z-30`) so they are never covered by navigation bars or cards.
   - Horizontal category filter strip under search bar: `[All Safe] [Police] [Hospitals] [24/7 Meds] [Metro] [Volunteers] [Risk Warnings]`.
   - Tap-anywhere on map to drop pin and view address + "Safe Walk Here" 1-tap route.


### 5.2 Volunteer Portal & BLE Mesh Synchronization
- Successfully integrated 152 remote assets from collaborator (`origin/develop`) without touching or overwriting the safe route mapping engine.
- Added Volunteer portal screens (`ActiveResponseScreen`, `AlertsScreen`, `EmergencyAlertScreen`, `EmergencyMapScreen`, `OfflineModeScreen`, `VerificationPendingScreen`, `VolunteerDashboardScreen`, `VolunteerIntroScreen`, `VolunteerLoginScreen`, `VolunteerPermissionsScreen`, `VolunteerProfileScreen`, `VolunteerRegistrationScreen`, `VolunteerSafetyScreen`, `VolunteerVerificationScreen`).
- Added experimental BLE mesh relay service (`bleRelayService.ts`, `useBleRelay.ts`) and SMS fallback routing (`smsFallbackService.ts`).
- Added `authStore.tsx` and `volunteerStore.tsx` state providers and auth guards.

---

## 6. Change History Log
- **2026-08-18:** Overpass API real POIs integrated, manual 40-50km offline map downloader added, OpenRouter Gemma-4-31b AI Guardian with live geolocation anchoring activated, Nominatim global search bug resolved.
- **2026-08-19:** Repository restructured from nested `web/` folder into a clean root-level monorepo with `android/` at root, documentation created (`README.md`, `docs/ANDROID_SETUP.md`, `CONTRIBUTING.md`, `LICENSE`), force-pushed to `develop`.
- **2026-08-21:** Created `docs/PROJECT_MEMORY.md` to prevent excessive file scans in future sessions. Identified 10 new code/UX bugs. Fixed the 4 critical high-priority bugs: resolved swallowed registration errors, matched local contacts seeding with types, added full geolocation/mic unmount cleanups in SosScreen, and resolved the AudioContext/Oscillator siren memory leaks.
- **2026-08-22:** Map & GIS complete overhaul (Photon instant autocomplete, 30s volunteer movement, real OSM safe havens & danger halos, non-blocking UI controls, auto-closing search suggestions, safe path percentage algorithm). Synced latest volunteer portal & BLE services from `origin/develop` preserving all map systems.
