# 🛡️ Rakshika — Full Project Understanding

> This document is the AI assistant's deep-dive reference for the Rakshika project.
> Every folder, every file, every design decision is captured here for accurate development assistance.

---

## 🎯 WHAT IS RAKSHIKA?

**Rakshika** is a **women's safety emergency response platform** built for India. It is NOT just an SOS app — it is a full ecosystem combining:

- A **React Native mobile app** (Expo SDK 57, TypeScript)
- A **Python microservices backend** (FastAPI, SQLAlchemy 2.0)
- **AI safety assistance** (Google Gemini API)
- **Push notifications** (Firebase Cloud Messaging)
- **GPS live tracking** during emergencies
- **Encrypted evidence collection** (audio/video)
- **Community responder network** (nearby helpers)
- **Docker + Nginx** for deployment

The target users are women in India who need an instant, reliable emergency system.

---

## 🏗️ HIGH-LEVEL ARCHITECTURE

```
Internet
    │
    ▼
NGINX (Port 80) ← Reverse proxy, CORS, rate limiting
    │
    ▼
API Gateway (Port 8000) ← FastAPI, JWT validation, request routing to microservices
    │
    ├── Auth Service      (Port 8001)
    ├── User Service      (Port 8002)
    ├── Emergency Service (Port 8003)
    ├── Community Service (Port 8004)
    ├── Location Service  (Port 8005)
    ├── Notification Svc  (Port 8006)
    ├── Evidence Service  (Port 8007)
    └── AI Service        (Port 8008)
         │
    PostgreSQL 15 (Primary DB) + Redis 7 (Cache/Blacklist)
```

Mobile App (Expo/React Native) connects to Gateway at localhost:8000/api/v1

---

## 📁 COMPLETE FILE STRUCTURE & PURPOSE

```
Rakshika/                              ← ROOT
├── README.md                          ← Public-facing docs (setup, services, env vars)
├── PROJECT_UNDERSTANDING.md           ← This AI reference file
├── docker-compose.yml                 ← Orchestrates ALL services
├── requirements.txt                   ← Root Python deps (used by all services)
├── alembic.ini                        ← Alembic DB migration config
├── pytest.ini                         ← Test runner config
├── develop                            ← Empty marker file (1 byte, branch artifact)
│
├── services/                          ← ALL backend microservices
│   ├── shared/                        ← SHARED Python package (imported by all services)
│   │   ├── __init__.py                ← Exports: AppSettings, Base, JWTTokenService, etc.
│   │   ├── config/                    ← AppSettings base class (pydantic-settings)
│   │   ├── constants/                 ← Platform-wide constants
│   │   ├── database/base.py           ← Base, UUIDPrimaryKeyMixin, TimestampMixin, SoftDeleteMixin
│   │   ├── dependencies/              ← FastAPI DI helpers
│   │   ├── exceptions/                ← Custom exceptions + FastAPI handlers
│   │   ├── logging/                   ← Structured JSON logging, RequestContext
│   │   ├── middleware/                ← RequestContextMiddleware, SecurityHeadersMiddleware
│   │   ├── schemas/                   ← Shared Pydantic schemas
│   │   ├── security/                  ← JWTTokenService, JWTTokenPair, Principal, Permission
│   │   └── utils/                     ← now_utc(), add_days(), etc.
│   │
│   ├── gateway/                       ← API GATEWAY (single entry point)
│   │   └── app/
│   │       ├── main.py                ← FastAPI + CORS + GZip + TrustedHost + SecurityHeaders middleware
│   │       ├── core/config.py         ← GatewaySettings (rate limit, CORS, routing table)
│   │       ├── core/rate_limiter.py   ← Redis-backed rate limiter
│   │       ├── core/security.py       ← GatewaySecurityGuard (JWT validation)
│   │       └── api/v1/
│   │           ├── routers/health.py  ← GET /health
│   │           ├── routers/proxy.py   ← Proxy routes to downstream services
│   │           └── services/gateway_service.py ← auth check + proxy forwarding
│   │
│   ├── auth-service/                  ← AUTHENTICATION SERVICE (FULLY IMPLEMENTED)
│   │   └── app/
│   │       ├── core/config.py         ← Session TTL 30d, password min 8, OTP len 6, max 5 sessions/user
│   │       ├── core/security.py       ← bcrypt hash/verify, issue_token_pair, decode tokens
│   │       └── api/v1/
│   │           ├── models/auth.py     ← ORM: User, Role, user_roles, Device, Session, RefreshToken, AuditLog
│   │           ├── schemas/auth.py    ← Pydantic: RegisterRequest, LoginRequest, AuthResponse, DeviceContext
│   │           ├── repositories/auth_repository.py ← DB queries
│   │           ├── services/auth_service.py ← register, login, refresh, logout, me
│   │           └── routers/auth.py    ← POST /signup, /login, /refresh, /logout, GET /me
│   │
│   ├── user-service/                  ← USER PROFILES (STUB - 29 byte Dockerfile)
│   ├── emergency-service/             ← SOS MANAGEMENT (PARTIALLY IMPLEMENTED)
│   ├── community-service/             ← NEARBY RESPONDERS (STUB)
│   ├── location-service/              ← GPS BREADCRUMBS (STUB)
│   ├── notification-service/          ← FCM PUSH + SMS (STUB, needs firebase-credentials.json)
│   ├── evidence-service/              ← ENCRYPTED FILE UPLOAD (STUB)
│   └── ai-service/                    ← GEMINI CHAT (STUB, needs GEMINI_API_KEY)
│
├── mobile/                            ← REACT NATIVE EXPO APP
│   ├── App.tsx                        ← Root: AuthProvider > LocationProvider > SOSProvider > AppNavigator
│   ├── app.json                       ← Expo config (name: Rakshika, permissions)
│   ├── google-services.json           ← Firebase Android FCM config
│   ├── package.json                   ← npm dependencies
│   └── src/
│       ├── contexts/
│       │   ├── AuthContext.tsx        ← user, isAuthenticated, login(), signup(), logout()
│       │   │                             On mount: reads token from AsyncStorage → getProfile()
│       │   ├── LocationContext.tsx    ← GPS coords, isTracking, startTracking(emergencyId), stopTracking()
│       │   │                             Updates every 5s/10m; fallback = Delhi (28.6139, 77.2090)
│       │   └── SOSContext.tsx         ← activeEmergency, triggerSOS(type), cancelSOS(reason)
│       │                                 Calls sosService; starts/stops location tracking
│       ├── screens/
│       │   ├── LoginScreen.tsx        ← Email + password → authService.login()
│       │   ├── RegisterScreen.tsx     ← Name + email + phone + password → authService.signup()
│       │   ├── HomeScreen.tsx         ← SafetyCard + SOSButton + contacts list (callable during SOS)
│       │   │                             useShakeDetection runs here (sensitivity 2.5G)
│       │   ├── SOSScreen.tsx          ← Active SOS: trigger type, start time, recording indicator, Cancel
│       │   ├── MapScreen.tsx          ← Google Maps (react-native-maps)
│       │   ├── MapScreen.web.tsx      ← Web fallback for map
│       │   ├── AIChatScreen.tsx       ← Chat UI → POST /ai/chat → Gemini response
│       │   └── ProfileScreen.tsx      ← User info + emergency contacts CRUD + settings + logout
│       ├── components/
│       │   ├── SOSButton.tsx          ← Large red panic button with animation
│       │   ├── SafetyCard.tsx         ← SAFE (green) or SOS ACTIVE (red) status card
│       │   ├── ContactCard.tsx        ← Contact name/phone/relationship + delete button
│       │   └── ChatBubble.tsx         ← Chat message (user=right, ai=left)
│       ├── services/                  ← API clients (ALL have offline mock fallbacks)
│       │   ├── api.ts                 ← Axios: baseURL=localhost:8000/api/v1, 15s timeout
│       │   │                             Interceptor: attaches Bearer token; auto-refreshes on 401
│       │   ├── authService.ts         ← signup, login, logout, getProfile, getPreferences
│       │   ├── sosService.ts          ← triggerSos, getEmergency, cancelEmergency, updateStatus, getHistory
│       │   ├── locationService.ts     ← sendLocationUpdate() → POST /locations/update
│       │   └── evidenceService.ts     ← uploadEvidence() → multipart upload
│       ├── hooks/
│       │   ├── useAuth.ts             ← Re-export of useAuth from AuthContext
│       │   ├── useLocation.ts         ← Re-export of useLocation from LocationContext
│       │   └── useShakeDetection.ts   ← Expo Accelerometer, 100ms poll, 2.5G threshold, disabled on web
│       └── navigation/
│           ├── AppNavigator.tsx       ← If authenticated → MainTabs, else → AuthStack
│           ├── AuthStack.tsx          ← Stack: Login → Register
│           └── MainTabs.tsx           ← Bottom tabs: Home | Map | SOS | AI Chat | Profile
│
├── alembic/                           ← DATABASE MIGRATIONS
│   ├── env.py                         ← Reads DATABASE_URL
│   └── versions/                      ← Single large initial migration (all 20 tables)
│
├── architecture/                      ← 15 DESIGN DOCUMENTS
│   ├── 01-System-Overview.md
│   ├── 02-Functional-Requirements.md
│   ├── 03-Non-Functional-Requirements.md
│   ├── 04-User-Roles.md
│   ├── 05-Use-Cases.md
│   ├── 06-System-Architecture.md
│   ├── 07-Mobile-Architecture.md
│   ├── 08-Backend-Architecture.md
│   ├── 09-Database-Architecture.md
│   ├── 10-API-Architecture.md
│   ├── 11-Security-Architecture.md
│   ├── 12-SOS-Workflow.md             ← CRITICAL: durable first, async fan-out, idempotent
│   ├── 13-Community-Workflow.md
│   └── 14-AI-Workflow.md
│
├── infrastructure/
│   ├── docker/                        ← gateway.Dockerfile, auth.Dockerfile, etc.
│   ├── nginx/nginx.conf               ← Routes /api/v1/* to correct service
│   ├── kubernetes/                    ← FUTURE (empty)
│   ├── monitoring/                    ← FUTURE (empty)
│   └── terraform/                     ← FUTURE (empty)
│
├── openapi/                           ← OpenAPI YAML specs for all 9 services
├── tests/                             ← pytest integration tests
│   ├── test_auth_service.py
│   ├── test_gateway.py
│   └── test_services.py
└── docs/                              ← SETUP_GUIDE.md, API.md, DATABASE.md, ROADMAP.md
```

---

## 🔑 KEY TECHNICAL DETAILS

### Authentication Flow (FULLY IMPLEMENTED)

```
Register → POST /auth/signup
  - Validates password length (min 8)
  - Checks unique email + phone
  - bcrypt hashes password
  - Creates User + assigns "user" role
  - Creates Device record (if device context provided)
  - Creates Session (30-day TTL)
  - Issues JWT access token + refresh token (stored in DB with hash)
  - Writes AuditLog
  - Returns: { user, tokens: { accessToken, refreshToken }, session }

Login → POST /auth/login
  - Fetches user by email
  - bcrypt verify password
  - Checks user.status == "active" and not deleted
  - Creates new Session + issues new token pair
  - Updates last_login_at, resets failed_login_attempts

Refresh → POST /auth/refresh
  - Parses refresh token claims
  - Looks up stored RefreshToken by jti (JWT ID)
  - Validates not revoked, session not expired
  - Revokes old refresh token (with replaced_by_jti)
  - Issues new token pair (token rotation implemented)

Logout → POST /auth/logout
  - Blacklists access token in Redis (key: auth:blacklist:access:{session_id}:{user_id})
  - Revokes Session (revoked_at = now)
  - Revokes RefreshToken

GET /auth/me
  - Decodes access token → Principal (user_id, session_id, roles, permissions)
  - Returns user + session info
```

### Database Models Summary

| Table | Key Fields |
|-------|-----------|
| users | id, full_name, email, phone, password_hash, status, is_email_verified, failed_login_attempts, locked_until, deleted_at |
| roles | id, name, description, is_system |
| user_roles | user_id, role_id (pivot table) |
| devices | id, user_id, device_fingerprint, name, platform, model, push_token, trusted_at |
| sessions | id, user_id, device_id, session_jti, expires_at, ip_address, revoked_at |
| refresh_tokens | id, user_id, session_id, jti, token_hash, token_family, replaced_by_jti, revoked_at |
| audit_logs | id, user_id, session_id, action, resource_type, status, ip_address, metadata |
| user_profiles | (user service) extended profile info |
| emergency_contacts | (user service) name, phone, relationship, notifyOnSos |
| emergencies | user_id, trigger_type, status, severity, latitude, longitude, started_at |
| location_updates | emergency_id, latitude, longitude, accuracy, speed, heading |

### Mobile Context Tree

```
AuthProvider (isAuthenticated, user, login, signup, logout)
  └── LocationProvider (location coords, isTracking, startTracking, stopTracking)
        └── SOSProvider (activeEmergency, triggerSOS, cancelSOS)
              └── AppNavigator
                    ├── AuthStack (Login, Register)         ← when !isAuthenticated
                    └── MainTabs (Home, Map, SOS, AI, Profile) ← when isAuthenticated
```

### SOS Flow (Mobile to Backend)

```
User shakes phone OR taps SOS button
         ↓
useShakeDetection fires onShake() [2.5G threshold, 100ms polling, Accelerometer]
         ↓
triggerSOS('shake' | 'tap') in SOSContext
         ↓
Gets GPS coords from LocationContext (fallback: Delhi 28.6139, 77.2090)
         ↓
sosService.triggerSos({ triggerType, severity: 'high', latitude, longitude })
         ↓
POST /api/v1/emergencies/sos [Bearer token via Axios]
         ↓
Sets activeEmergency state → HomeScreen shows emergency mode
Calls startTracking(emergency.id) → location updates every 5s/10m to backend
         ↓
Cancel: cancelSOS(reason) → POST /emergencies/{id}/cancel → stopTracking()
```

### Offline/Mock Fallback Strategy

Every API call in mobile has a try/catch that falls back to mock data:
- Mock user: `{ id: "d3b07384-d113-4ec6-a5b5-121d5828cf12", fullName: "Jane Doe (Demo Mode)" }`
- Mock SOS: creates local emergency record with Delhi coordinates
- Mock contacts: reads from AsyncStorage
- This lets the app DEMO without any backend running

### API Route Mapping (Gateway to Services)

| Mobile calls | Gateway routes to |
|-------------|------------------|
| /api/v1/auth/* | auth-service (port 8001) |
| /api/v1/users/* | user-service (port 8002) |
| /api/v1/emergencies/* | emergency-service (port 8003) |
| /api/v1/community/* | community-service (port 8004) |
| /api/v1/locations/* | location-service (port 8005) |
| /api/v1/notifications/* | notification-service (port 8006) |
| /api/v1/evidence/* | evidence-service (port 8007) |
| /api/v1/ai/* | ai-service (port 8008) |

---

## 📦 TECH STACK (EXACT VERSIONS)

### Backend Python
- Python 3.11+
- FastAPI >=0.115.0
- SQLAlchemy >=2.0.0 (async)
- Alembic >=1.13.0
- Pydantic >=2.0.0
- pydantic-settings >=2.0.0
- asyncpg >=0.29.0 (PostgreSQL async driver)
- python-jose >=3.3.0 (JWT)
- passlib[bcrypt] >=1.7.0 (password hashing)
- redis >=5.0.0
- httpx >=0.27.0 (gateway proxy client)
- google-generativeai >=0.8.0 (Gemini)
- firebase-admin >=6.0.0 (FCM)
- uvicorn >=0.30.0

### Mobile (React Native)
- React Native 0.86.0
- Expo SDK ~57.0.4
- React 19.2.3
- TypeScript ~6.0.3
- axios ^1.18.1
- expo-location ^57.0.2
- expo-sensors ^57.0.1 (accelerometer for shake)
- expo-camera ^57.0.1
- expo-av ^16.0.8 (audio/video)
- react-native-maps ^1.29.0
- @react-navigation/native ^7.3.8
- @react-navigation/bottom-tabs ^7.18.8
- @react-navigation/native-stack ^7.17.10
- AsyncStorage ^3.1.1

### Infrastructure
- PostgreSQL 15-alpine
- Redis 7-alpine
- Docker Compose v3.8
- Nginx alpine

---

## 🚦 IMPLEMENTATION STATUS

### FULLY IMPLEMENTED
- Auth Service: register, login, refresh, logout, /me, ORM models, JWT, bcrypt, Redis blacklist, audit logs, device tracking
- Mobile: All 7 screens (Login, Register, Home, SOS, Map, AI Chat, Profile)
- Mobile: All 3 contexts (Auth, Location, SOS)
- Mobile: All 5 service clients with offline fallbacks
- Mobile: Shake detection hook
- Mobile: Emergency contacts CRUD
- Mobile: Navigation (AuthStack + MainTabs)
- Docker Compose orchestration
- Gateway: main.py with full middleware stack
- Shared package: database base, JWT/security, logging, middleware, exceptions

### PARTIALLY IMPLEMENTED
- Emergency Service: structure exists, some endpoints may be stubs
- Gateway: proxy routing logic present but may be incomplete

### STUB / PLACEHOLDER (needs work)
- User Service: 29-byte Dockerfile, minimal app code
- Community Service: stub
- Location Service: stub
- Notification Service: stub (needs firebase-credentials.json)
- Evidence Service: stub
- AI Service: stub (needs GEMINI_API_KEY)
- Admin Dashboard: COMPLETELY EMPTY (only .gitkeep)
- Kubernetes, Terraform, Monitoring: all empty

---

## 🔐 ENVIRONMENT VARIABLES

| Variable | Used By | Value |
|----------|---------|-------|
| DATABASE_URL | All backend | postgresql://user:password@postgres:5432/rakshika_db |
| REDIS_URL | Gateway, Auth | redis://redis:6379/0 |
| JWT_SECRET | Gateway, Auth | (CHANGE IN PRODUCTION) |
| JWT_ALGORITHM | Gateway | HS256 |
| ENVIRONMENT | All | development / production |
| GEMINI_API_KEY | AI Service | Google Gemini API key |
| FIREBASE_CREDENTIALS_PATH | Notification | Path to Firebase JSON |
| GOOGLE_MAPS_API_KEY | Mobile | For Google Maps |

---

## 👥 USER ROLES

| Role | What they do |
|------|-------------|
| user (default) | Register, trigger SOS, manage contacts, use AI, record evidence |
| responder | Receive broadcasts, accept/decline emergencies, navigate to incidents |
| admin | Monitor incidents, manage users, view analytics |

- Roles stored in `roles` table, assigned via `user_roles` pivot
- Default role: "user" (set in AuthServiceSettings.default_role_name)
- JWT tokens carry roles[] and permissions[]

---

## 🚨 CRITICAL DESIGN PRINCIPLES

1. SOS must always work — even if 5 of 8 services are down
2. Fan-out is async — notifications/community/AI react after emergency is created
3. Offline-first mobile — every API call has mock fallback for demo mode
4. Security by default — tokens rotate, access tokens blacklisted on logout
5. Soft deletes — users never hard-deleted (deleted_at field via SoftDeleteMixin)
6. Audit everything — AuditLog records every auth event with IP + user agent
7. Idempotent SOS — duplicate triggers must not create multiple emergency records

---

## 📝 CODING PATTERNS TO FOLLOW

When adding a new service, mirror the auth-service pattern exactly:

```
services/<service-name>/
└── app/
    ├── main.py                  ← FastAPI app with lifespan context manager
    ├── core/
    │   ├── config.py            ← <ServiceName>Settings extends AppSettings
    │   ├── database.py          ← get_db_session dependency
    │   └── dependencies.py      ← DI wiring
    └── api/v1/
        ├── models/<name>.py     ← SQLAlchemy ORM (Base, UUIDPrimaryKeyMixin, TimestampMixin)
        ├── schemas/<name>.py    ← Pydantic request/response models
        ├── repositories/<name>_repository.py  ← DB queries only, no business logic
        ├── services/<name>_service.py          ← Business logic only
        ├── controllers/<name>_controller.py    ← HTTP orchestration layer
        └── routers/
            ├── <name>.py        ← Route definitions
            └── health.py        ← GET /health
```

ALWAYS import from services.shared.* — never reimplement JWT, bcrypt, or DB base classes.

---

## 🐛 KNOWN ISSUES & GOTCHAS

1. `develop` file in root — 1-byte git artifact, not code
2. Mock fallback hardcoded UUID — d3b07384-d113-4ec6-a5b5-121d5828cf12 is the demo user ID
3. authService.ts field named `passwordHash` — actually sends raw password; backend hashes it (confusing name)
4. Admin dashboard completely empty — admin-dashboard/ only has .gitkeep
5. Most microservices are stubs — only auth-service is production-ready
6. Firebase credentials not committed — must be added manually before notification service works
7. No .env file exists — must be created manually before running Docker Compose
8. Shake detection disabled on web — Platform.OS !== 'web' guard in useShakeDetection

---

## 🗺️ EXPECTED DEVELOPMENT ROADMAP

1. Complete User Service — profile CRUD, /users/me/contacts endpoint
2. Complete Emergency Service — POST /emergencies/sos, cancel, history
3. Complete Community Service — Haversine-based nearby responder search
4. Complete Location Service — POST /locations/update
5. Integrate AI Service — connect Gemini to /ai/chat
6. Integrate Notification Service — FCM push + SMS fallback
7. Evidence Service — encrypted audio/video upload to Supabase/S3
8. Build Admin Dashboard — monitor incidents (currently zero code)
9. Production readiness — HTTPS Nginx, proper CORS, K8s deployment

---

*Last updated: 2026-07-13 | Rakshika develop branch*
