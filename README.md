# 🛡️ Rakshika — India's Most Intelligent Women Safety Ecosystem

<p align="center">
  <strong>AI-Powered Emergency Response Platform</strong><br/>
  Combining Artificial Intelligence, Bluetooth Mesh Networking, Real-Time Community Response, and Secure Digital Evidence Collection.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Python-3.11+-3776AB?style=for-the-badge&logo=python&logoColor=white" alt="Python"/>
  <img src="https://img.shields.io/badge/FastAPI-0.115+-009688?style=for-the-badge&logo=fastapi&logoColor=white" alt="FastAPI"/>
  <img src="https://img.shields.io/badge/React_Native-0.86-61DAFB?style=for-the-badge&logo=react&logoColor=black" alt="React Native"/>
  <img src="https://img.shields.io/badge/Expo-SDK_57-000020?style=for-the-badge&logo=expo&logoColor=white" alt="Expo"/>
  <img src="https://img.shields.io/badge/PostgreSQL-15-4169E1?style=for-the-badge&logo=postgresql&logoColor=white" alt="PostgreSQL"/>
  <img src="https://img.shields.io/badge/Redis-7-DC382D?style=for-the-badge&logo=redis&logoColor=white" alt="Redis"/>
  <img src="https://img.shields.io/badge/Docker-Compose-2496ED?style=for-the-badge&logo=docker&logoColor=white" alt="Docker"/>
  <img src="https://img.shields.io/badge/License-MIT-green?style=for-the-badge" alt="License"/>
</p>

---

## 📋 Table of Contents

- [Vision](#-vision)
- [Architecture](#-architecture)
- [Tech Stack](#-tech-stack)
- [Project Structure](#-project-structure)
- [Quick Start](#-quick-start)
- [Services Overview](#-services-overview)
- [Mobile App](#-mobile-app)
- [Mesh Networking](#-mesh-networking--offline-sos-relay)
- [SOS Workflow](#-sos-workflow)
- [API Documentation](#-api-documentation)
- [Database Schema](#-database-schema--migrations)
- [Testing](#-testing)
- [Deployment](#-deployment)
- [Environment Variables](#-environment-variables)
- [Roadmap](#-roadmap)
- [Contributing](#-contributing)
- [License](#-license)

---

## 🎯 Vision

Rakshika is designed as a **complete emergency response platform** — not just an SOS app — capable of scaling to universities, residential societies, enterprises, smart cities, and future government integration.

### Mission

Provide every woman with immediate access to help through:

- ⚡ **Intelligent SOS Activation** — Manual, shake-to-trigger (2.5G accelerometer), and AI-detected emergencies
- 🤖 **AI-Powered Safety Assistant** — Gemini-powered real-time safety guidance, route risk analysis, and incident summarization
- 👥 **Community-Based Emergency Response** — Nearby verified responders get instant alerts via Haversine proximity search
- 📹 **Secure Evidence Collection** — SHA-256 hashed audio/video with tamper-proof storage
- 📡 **Hybrid Communication** — Works with limited or no internet via SMS fallback and **BLE Mesh Networking**
- 📧 **Smart Notifications** — Email alerts with Google Maps links + live evidence feed URLs sent to emergency contacts
- 🔗 **Bluetooth Mesh Network** — Offline SOS relay between Rakshika users when there's no internet connectivity

---

## 🏗️ Architecture

```
                              Internet
                                 │
                                 ▼
                    ┌────────────────────────────┐
                    │   NGINX (Port 80)          │
                    │   Reverse Proxy + CORS     │
                    └──────────┬─────────────────┘
                               │
                    ┌──────────▼─────────────────┐
                    │   API GATEWAY (Port 8000)   │
                    │   FastAPI + JWT Validation  │
                    │   Rate Limiting (Redis)     │
                    └──────────┬─────────────────┘
                               │
      ┌────────────────────────┼────────────────────────┐
      │                        │                        │
┌─────▼──────┐  ┌──────────────▼───────────────┐  ┌─────▼──────┐
│ Auth Svc   │  │ Emergency → Redis Pub/Sub    │  │ AI Service │
│ (8001)     │  │ (8003)     Fan-Out           │  │ (8008)     │
└────────────┘  └──────┬───────────┬───────────┘  └────────────┘
                       │           │
              ┌────────▼───┐ ┌─────▼──────────┐
              │ Notify Svc │ │ Community Svc  │
              │ (8006)     │ │ (8004)         │
              │ Email+FCM  │ │ Haversine      │
              └────────────┘ └────────────────┘

   ┌──────────┐ ┌──────────┐ ┌──────────┐
   │ User Svc │ │ Loc Svc  │ │ Evidence │
   │ (8002)   │ │ (8005)   │ │ (8007)   │
   └──────────┘ └──────────┘ └──────────┘

               DATA LAYER
  ┌──────────────┐  ┌──────────────┐
  │ PostgreSQL   │  │    Redis     │
  │ (20 Tables)  │  │ (Cache +     │
  │              │  │  Pub/Sub +   │
  │              │  │  Blacklist)  │
  └──────────────┘  └──────────────┘
```

**Mobile App** (Expo/React Native) connects through Nginx → Gateway at `/api/v1/*`

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Backend** | Python 3.11, FastAPI ≥0.115, SQLAlchemy 2.0 (async), Alembic, Pydantic v2 |
| **Database** | PostgreSQL 15, Redis 7 |
| **Mobile** | React Native 0.86 (Expo SDK 57), TypeScript 6.0, React 19.2 |
| **AI** | Google Gemini via OpenRouter API (`gemini-2.0-flash-001`) |
| **Mesh Networking** | Bluetooth Low Energy via `react-native-ble-plx` |
| **Notifications** | SMTP Email + Firebase Cloud Messaging (FCM) + SMS (planned) |
| **Infrastructure** | Docker Compose, Nginx, Kubernetes (planned) |
| **Testing** | Pytest, HTTPX |

---

## 📁 Project Structure

```
Rakshika/
├── services/                          # ALL backend microservices
│   ├── shared/                        # Shared Python package (DB base, JWT, security, logging)
│   ├── gateway/                       # API Gateway — routing, JWT validation, rate limiting
│   ├── auth-service/                  # Authentication — JWT, bcrypt, sessions, devices, audit
│   ├── user-service/                  # User profiles, contacts, preferences
│   ├── emergency-service/             # SOS triggers + Redis Pub/Sub fan-out
│   ├── community-service/             # Nearby responders (Haversine) + event listener
│   ├── location-service/              # Real-time GPS breadcrumbs & safe routes
│   ├── notification-service/          # Email alerts + FCM push + SMS fallback
│   ├── evidence-service/              # File upload with SHA-256 hashing
│   └── ai-service/                    # Gemini AI safety assistant (OpenRouter)
│
├── mobile/                            # React Native Expo app
│   ├── App.tsx                        # Root: AuthProvider > LocationProvider > SOSProvider
│   └── src/
│       ├── screens/                   # Login, Register, Home, SOS, Map, AI Chat, Profile
│       ├── contexts/                  # Auth, Location, SOS state management
│       ├── mesh/                      # 🆕 BLE Mesh Networking (offline SOS relay)
│       │   ├── MeshContext.tsx        # React context for mesh state
│       │   ├── ble/                   # BLE scanning & advertising
│       │   ├── engine/                # Mesh routing engine
│       │   ├── protocol/              # Message framing & protocol
│       │   ├── storage/               # Local SQLite persistence
│       │   ├── sync/                  # Cloud sync when connectivity restores
│       │   └── logging/               # Mesh event logging
│       ├── services/                  # API clients (all have offline mock fallbacks)
│       ├── hooks/                     # useShakeDetection (2.5G, 100ms poll)
│       ├── components/                # SOSButton, SafetyCard, ContactCard, ChatBubble
│       └── navigation/               # AuthStack + MainTabs (bottom tabs)
│
├── architecture/                      # 14 design documents (system, security, workflows)
├── infrastructure/
│   ├── docker/                        # Per-service Dockerfiles
│   ├── nginx/                         # Reverse proxy config
│   └── kubernetes/                    # K8s manifests (planned)
├── alembic/                           # Database migrations (20 tables)
├── tests/                             # Pytest integration tests
├── docs/                              # Setup guide, API docs, DB docs, roadmap
├── openapi/                           # OpenAPI YAML specs for all 9 services
├── docker-compose.yml                 # Full-stack orchestration (11 containers)
├── requirements.txt                   # Python dependencies
└── .env.example                       # Environment variable template
```

---

## 🚀 Quick Start

### Prerequisites

- **Docker & Docker Compose** (v2.0+)
- **Node.js** (v18+) and **npm**
- **Python** (3.11+) for local development
- **Expo CLI** (`npm install -g expo-cli`)

### 1. Clone & Configure

```bash
git clone https://github.com/sidspy-bug/Rakshika.git
cd Rakshika

# Create your environment file
cp .env.example .env
# Edit .env with your API keys (see Environment Variables section)
```

### 2. Start Backend (Docker)

```bash
# Spin up all 11 containers (9 services + PostgreSQL + Redis + Nginx)
docker-compose up --build -d

# Verify everything is running
docker-compose ps

# Run database migrations (creates all 20 tables)
docker-compose exec api-gateway alembic upgrade head
```

All services are accessible through Nginx at `http://localhost:80` and directly via the Gateway at `http://localhost:8000`.

### 3. Start Mobile App

```bash
cd mobile
npm install

# Start Expo development server
npx expo start

# Platform-specific
npx expo start --web       # Web preview
npx expo start --ios       # iOS simulator
npx expo start --android   # Android emulator
```

### 4. Run Tests

```bash
pip install pytest pytest-asyncio httpx anyio

pytest tests/ -v
```

---

## 📡 Services Overview

| Service | Port | Status | Description |
|---------|------|--------|-------------|
| **API Gateway** | 8000 | ✅ Implemented | Central routing, JWT validation, Redis rate limiting |
| **Auth Service** | 8001 | ✅ Production-Ready | Register, login, refresh (token rotation), logout, `/me`, bcrypt, Redis blacklist, audit logs, device tracking |
| **Emergency Service** | 8003 | ⚡ Partial | SOS trigger/cancel/resolve, Redis Pub/Sub event fan-out |
| **Notification Service** | 8006 | ⚡ Partial | Redis event listener → SMTP email alerts with Google Maps links, FCM push (needs credentials) |
| **Community Service** | 8004 | ⚡ Partial | Redis event listener → Haversine nearby responder broadcast |
| **Evidence Service** | 8007 | ⚡ Partial | Local file storage, SHA-256 hashing, live feed URLs |
| **AI Service** | 8008 | ⚡ Partial | OpenRouter/Gemini — safety advice, route risk analysis, incident summaries |
| **User Service** | 8002 | 🔲 Stub | Profile CRUD (needs implementation) |
| **Location Service** | 8005 | 🔲 Stub | GPS breadcrumbs (needs implementation) |

---

## 📱 Mobile App

The Expo React Native app provides **8 screens** with full offline demo capability:

| Screen | Features |
|--------|----------|
| **Login** | Email + password → JWT authentication |
| **Register** | Name + email + phone + password |
| **Home Dashboard** | Safety score, SOS button, emergency contacts (callable during SOS) |
| **SOS Active** | Trigger type, timer, recording indicator, cancel button |
| **Live Map** | Google Maps with safe places & responder locations |
| **AI Chat** | Real-time safety advice powered by Gemini |
| **Profile** | Emergency contacts CRUD, medical info, preferences, logout |

### Key Mobile Features

| Feature | Details |
|---------|---------|
| 📳 **Shake Detection** | Accelerometer-based silent SOS (2.5G threshold, 100ms polling) |
| 📍 **Background Location** | Continuous GPS tracking during emergencies (5s/10m intervals) |
| 📹 **Evidence Recording** | Camera/audio capture with auto-upload |
| 🔔 **Push Notifications** | Real-time alerts via FCM |
| 🔗 **Mesh Networking** | BLE-based offline SOS relay between nearby users |
| 📴 **Offline Mode** | Every API call has mock fallback for demo without backend |

---

## 🔗 Mesh Networking — Offline SOS Relay

A standout feature in the `develop` branch: when a user has **no internet**, their SOS signal can hop between nearby Rakshika users' phones via **Bluetooth Low Energy (BLE)** until it reaches a device with connectivity.

```
📱 Victim (No Internet)
  │ BLE broadcast
  ▼
📱 Nearby User A (No Internet)
  │ BLE relay
  ▼
📱 Nearby User B (Has Internet)
  │ Cloud sync
  ▼
☁️ Backend → Emergency Created → Fan-out to responders
```

**Architecture:**
- `ble/` — BLE scanning & advertising layer
- `engine/` — Mesh routing engine (handles multi-hop relay)
- `protocol/` — Message framing & binary protocol
- `storage/` — SQLite persistence for queued messages
- `sync/` — Cloud synchronization when connectivity restores
- `logging/` — Mesh event audit trail

---

## 🚨 SOS Workflow

```
User shakes phone (2.5G threshold) OR taps SOS button
         ↓
SOSContext.triggerSOS('shake' | 'tap')
         ↓
Gets GPS coordinates from LocationContext
(fallback: Delhi 28.6139, 77.2090)
         ↓
POST /api/v1/emergencies/sos [Bearer JWT]
         ↓
Emergency saved to PostgreSQL database
         ↓
Redis Pub/Sub fan-out (async, non-blocking):
  ├── Notification Service → Email to emergency contacts
  │   (HTML email with Google Maps link + live evidence URL)
  ├── Community Service → Haversine search → broadcast to nearby responders
  └── (Future) AI Service → risk assessment
         ↓
Location tracking starts (updates every 5s during SOS)
         ↓
If offline → BLE Mesh relay to nearby Rakshika users
         ↓
Cancel: POST /emergencies/{id}/cancel → "All Clear" emails sent
```

---

## 📖 API Documentation

Once services are running, Swagger UI is available at:

| Service | URL |
|---------|-----|
| **Gateway** | `http://localhost:8000/docs` |
| **Auth** | `http://localhost:8001/docs` |
| **User** | `http://localhost:8002/docs` |
| **Emergency** | `http://localhost:8003/docs` |

All services expose a `GET /health` endpoint for monitoring.

### API Route Mapping

| Mobile calls | Gateway routes to |
|-------------|-------------------|
| `/api/v1/auth/*` | Auth Service (8001) |
| `/api/v1/users/*` | User Service (8002) |
| `/api/v1/emergencies/*` | Emergency Service (8003) |
| `/api/v1/community/*` | Community Service (8004) |
| `/api/v1/locations/*` | Location Service (8005) |
| `/api/v1/notifications/*` | Notification Service (8006) |
| `/api/v1/evidence/*` | Evidence Service (8007) |
| `/api/v1/ai/*` | AI Service (8008) |

---

## 🗄️ Database Schema & Migrations

Rakshika uses **Alembic** for schema management. The initial migration creates **20 tables** across 6 domains:

| Domain | Tables |
|--------|--------|
| **Auth** | `users`, `roles`, `user_roles`, `devices`, `sessions`, `refresh_tokens`, `audit_logs` |
| **User** | `user_profiles`, `emergency_contacts`, `user_preferences` |
| **Emergency** | `emergencies`, `emergency_status_history`, `emergency_responses` |
| **Community** | `community_members`, `emergency_broadcasts`, `responder_actions` |
| **Location** | `location_updates`, `safe_routes` |
| **Evidence & Notification** | Evidence records, notification logs |

### Migration Commands

```bash
# Generate a new migration
alembic revision --autogenerate -m "description"

# Apply all migrations
alembic upgrade head

# Rollback one step
alembic downgrade -1
```

---

## 🧪 Testing

```bash
# Run all tests
pytest tests/ -v

# Run specific test file
pytest tests/test_auth_service.py -v

# Run with coverage
pytest tests/ --cov=services --cov-report=html
```

**Test files:**
- `test_auth_service.py` — Auth health check, login validation
- `test_gateway.py` — Gateway health, docs endpoint
- `test_services.py` — User, Emergency, Community service integration tests

---

## 🚢 Deployment

### Docker Compose (Development / Staging)

```bash
docker-compose up --build -d
```

This spins up **11 containers**: 9 microservices + PostgreSQL + Redis, fronted by Nginx.

### Production Checklist

- [ ] Change all secrets in `.env` (`JWT_SECRET`, DB passwords)
- [ ] Enable HTTPS in Nginx configuration
- [ ] Configure proper CORS origins (replace `*` with your domain)
- [ ] Add real SMTP credentials for email notifications
- [ ] Add Firebase `firebase-credentials.json` for push notifications
- [ ] Set up database backups
- [ ] Enable per-user rate limiting
- [ ] Configure log aggregation
- [ ] Set up health check monitoring
- [ ] Integrate SMS provider (Twilio / MSG91)

---

## 🔐 Environment Variables

Create a `.env` file from `.env.example`. Key variables:

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | ✅ | PostgreSQL connection string |
| `REDIS_URL` | ✅ | Redis connection string |
| `JWT_SECRET` | ✅ | Secret key for JWT token signing (change in production!) |
| `JWT_ALGORITHM` | ✅ | Token algorithm (default: `HS256`) |
| `ENVIRONMENT` | ✅ | `development` or `production` |
| `GEMINI_API_KEY` | ⚡ | Google Gemini API key (for AI service) |
| `OPENROUTER_API_KEY` | ⚡ | OpenRouter API key (alternative AI provider) |
| `SMTP_HOST` | ⚡ | SMTP server for email notifications |
| `SMTP_PORT` | ⚡ | SMTP port (default: 587) |
| `SMTP_USER` | ⚡ | SMTP username |
| `SMTP_PASSWORD` | ⚡ | SMTP password |
| `FIREBASE_CREDENTIALS_PATH` | ⚡ | Path to Firebase JSON (for FCM push) |
| `GOOGLE_MAPS_API_KEY` | ⚡ | Google Maps API key (mobile app) |

---

## 🗺️ Roadmap

### Completed ✅
- [x] Auth Service — full JWT lifecycle, bcrypt, Redis blacklist, audit logs
- [x] Mobile App — 8 screens with offline fallback
- [x] Shake detection — accelerometer-based silent SOS
- [x] Docker Compose — full-stack orchestration
- [x] Redis Pub/Sub — async SOS event fan-out
- [x] Email notifications — HTML emails to emergency contacts
- [x] BLE Mesh Networking — offline SOS relay (develop branch)

### In Progress ⚡
- [ ] Complete User Service — profile CRUD, `/users/me/contacts`
- [ ] Complete Location Service — GPS breadcrumb endpoints
- [ ] Firebase push notifications — needs `firebase-credentials.json`
- [ ] SMS alerts — integrate Twilio / MSG91

### Planned 🔲
- [ ] Admin Dashboard — incident monitoring, user management, analytics
- [ ] Kubernetes deployment manifests
- [ ] Terraform infrastructure-as-code
- [ ] Monitoring & alerting (Prometheus, Grafana)
- [ ] PostGIS geospatial queries (replace Haversine for scale)
- [ ] Government emergency services integration

---

## 👥 User Roles

| Role | Capabilities |
|------|-------------|
| **user** (default) | Register, trigger SOS, manage contacts, use AI, record evidence |
| **responder** | Receive broadcast alerts, accept/decline emergencies, navigate to incidents |
| **admin** | Monitor all incidents, manage users, view analytics |

Roles are stored in the `roles` table and assigned via the `user_roles` pivot table. JWT tokens carry `roles[]` and `permissions[]` claims.

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Coding Pattern for New Services

When adding a new microservice, mirror the `auth-service` pattern:

```
services/<service-name>/
└── app/
    ├── main.py                  # FastAPI app with lifespan context manager
    ├── core/
    │   ├── config.py            # <ServiceName>Settings extends AppSettings
    │   ├── database.py          # get_db_session dependency
    │   └── dependencies.py      # DI wiring
    └── api/v1/
        ├── models/<name>.py     # SQLAlchemy ORM (Base, UUIDPrimaryKeyMixin)
        ├── schemas/<name>.py    # Pydantic request/response models
        ├── repositories/        # DB queries only — no business logic
        ├── services/            # Business logic only
        ├── controllers/         # HTTP orchestration
        └── routers/
            ├── <name>.py        # Route definitions
            └── health.py        # GET /health
```

> **Always** import from `services.shared.*` — never reimplement JWT, bcrypt, or DB base classes.

---

## 📄 License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.

---

<p align="center">
  Made with ❤️ for women's safety in India 🇮🇳
</p>
