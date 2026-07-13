# 🛡️ Rakshika — India's Most Intelligent Women Safety Ecosystem

<p align="center">
  <strong>AI-Powered Emergency Response Platform</strong><br/>
  Combining Artificial Intelligence, hybrid online/offline communication, real-time community response, and secure digital evidence collection.
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
- [API Documentation](#-api-documentation)
- [Database Migrations](#-database-migrations)
- [Testing](#-testing)
- [Deployment](#-deployment)
- [Environment Variables](#-environment-variables)
- [Contributing](#-contributing)
- [License](#-license)

---

## 🎯 Vision

Rakshika is designed as a **complete emergency response platform** — not just an SOS app — capable of scaling to universities, residential societies, enterprises, smart cities, and future government integration.

### Mission
Provide every woman with immediate access to help through:
- ⚡ **Intelligent SOS Activation** — Manual, shake-to-trigger, and AI-detected emergencies
- 🤖 **AI-Powered Safety Assistant** — Gemini-powered real-time safety guidance
- 👥 **Community-Based Emergency Response** — Nearby verified responders get instant alerts
- 📹 **Secure Evidence Collection** — Encrypted audio/video recording with tamper-proof storage
- 📡 **Hybrid Communication** — Works with limited or no internet connectivity via SMS fallback

---

## 🏗️ Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                     NGINX REVERSE PROXY                      │
│                    (Rate Limiting + CORS)                     │
└──────────────┬───────────────────────────────┬───────────────┘
               │                               │
    ┌──────────▼──────────┐         ┌──────────▼──────────┐
    │    API GATEWAY       │         │   MOBILE APP (Expo)  │
    │   (FastAPI + Auth)   │         │  React Native + Maps │
    └──────────┬──────────┘         └──────────────────────┘
               │
    ┌──────────▼──────────────────────────────────────────┐
    │              MICROSERVICES LAYER                     │
    │                                                      │
    │  ┌─────────┐ ┌──────────┐ ┌───────────┐            │
    │  │  Auth   │ │   User   │ │ Emergency │            │
    │  │ Service │ │ Service  │ │  Service  │            │
    │  └─────────┘ └──────────┘ └───────────┘            │
    │                                                      │
    │  ┌──────────┐ ┌──────────┐ ┌────────────┐          │
    │  │Community │ │ Location │ │Notification│          │
    │  │ Service  │ │ Service  │ │  Service   │          │
    │  └──────────┘ └──────────┘ └────────────┘          │
    │                                                      │
    │  ┌──────────┐ ┌──────────┐                          │
    │  │Evidence  │ │    AI    │                          │
    │  │ Service  │ │ Service  │                          │
    │  └──────────┘ └──────────┘                          │
    └──────────────────────┬──────────────────────────────┘
                           │
    ┌──────────────────────▼──────────────────────────────┐
    │           DATA LAYER                                 │
    │  ┌────────────┐  ┌───────┐                          │
    │  │ PostgreSQL │  │ Redis │                          │
    │  │  (Primary) │  │(Cache)│                          │
    │  └────────────┘  └───────┘                          │
    └─────────────────────────────────────────────────────┘
```

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Backend** | Python 3.11, FastAPI, SQLAlchemy 2.0, Alembic |
| **Database** | PostgreSQL 15, Redis 7 |
| **Mobile** | React Native (Expo SDK 57), TypeScript |
| **AI** | Google Gemini API |
| **Notifications** | Firebase Cloud Messaging (FCM) |
| **Infrastructure** | Docker, Nginx, Docker Compose |
| **Testing** | Pytest, HTTPX |

---

## 📁 Project Structure

```
Rakshika/
├── services/
│   ├── gateway/              # API Gateway — request routing & auth
│   ├── auth-service/         # Authentication — JWT, sessions, devices
│   ├── user-service/         # User profiles, contacts, preferences
│   ├── emergency-service/    # SOS triggers, emergency tracking
│   ├── community-service/    # Nearby responder search (Haversine)
│   ├── location-service/     # Real-time GPS breadcrumbs & safe routes
│   ├── notification-service/ # Push notifications via FCM
│   ├── evidence-service/     # Secure file upload & evidence registry
│   ├── ai-service/           # Gemini AI safety assistant
│   └── shared/               # Shared utilities (auth, database, models)
├── mobile/                   # React Native Expo app
│   ├── src/
│   │   ├── contexts/         # Auth, Location, SOS state management
│   │   ├── screens/          # Login, Home, Map, Profile, AI Chat
│   │   ├── services/         # API clients for all backend services
│   │   ├── hooks/            # useShakeDetection, custom hooks
│   │   ├── components/       # SOSButton, SafetyCard, etc.
│   │   └── navigation/       # Stack & Tab navigators
│   └── App.tsx
├── alembic/                  # Database migrations
│   ├── versions/             # Migration scripts
│   └── env.py                # Alembic environment config
├── infrastructure/
│   ├── docker/               # Per-service Dockerfiles
│   ├── nginx/                # Reverse proxy configuration
│   └── kubernetes/           # K8s manifests (future)
├── tests/                    # Unit & integration tests
├── docker-compose.yml        # Full-stack orchestration
├── requirements.txt          # Python dependencies
└── .env.example              # Environment variable template
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
git clone https://github.com/your-username/Rakshika.git
cd Rakshika

# Create your environment file
cp .env.example .env
# Edit .env with your API keys (Gemini, FCM, Maps, etc.)
```

### 2. Start Backend (Docker)

```bash
# Spin up all services + PostgreSQL + Redis + Nginx
docker-compose up --build -d

# Verify everything is running
docker-compose ps

# Run database migrations
docker-compose exec api-gateway alembic upgrade head
```

All services will be accessible through Nginx at `http://localhost:80`.

### 3. Start Mobile App

```bash
cd mobile
npm install

# Start Expo development server
npx expo start

# For web preview
npx expo start --web

# For iOS simulator
npx expo start --ios

# For Android emulator
npx expo start --android
```

### 4. Run Tests

```bash
# Install test dependencies
pip install pytest pytest-asyncio httpx anyio

# Run all tests
pytest tests/ -v
```

---

## 📡 Services Overview

| Service | Port | Description |
|---------|------|-------------|
| **API Gateway** | 8000 | Central routing, JWT validation, header injection |
| **Auth Service** | 8001 | Registration, login, token management, device trust |
| **User Service** | 8002 | Profile CRUD, emergency contacts, preferences |
| **Emergency Service** | 8003 | SOS trigger/cancel/resolve, responder tracking |
| **Community Service** | 8004 | Nearby responder search (Haversine), broadcasts |
| **Location Service** | 8005 | GPS breadcrumbs, safe routes management |
| **Notification Service** | 8006 | FCM push + SMS fallback notifications |
| **Evidence Service** | 8007 | Encrypted file uploads, evidence chain |
| **AI Service** | 8008 | Gemini-powered safety assistant chat |

---

## 📱 Mobile App

The Expo React Native app provides:

- **Login / Register** — JWT-based authentication
- **Home Dashboard** — Safety score, quick SOS, nearby responders count
- **SOS Button** — Large panic button with shake-to-activate
- **Live Map** — Google Maps with safe places, responder locations
- **AI Chat** — Real-time safety advice powered by Gemini
- **Profile** — Emergency contacts, medical info, preferences

### Key Features
- 📳 **Shake Detection** — Accelerometer-based silent SOS trigger
- 📍 **Background Location** — Continuous GPS tracking during emergencies
- 📹 **Evidence Recording** — Camera/audio capture with auto-upload
- 🔔 **Push Notifications** — Real-time alerts via FCM

---

## 📖 API Documentation

Once services are running, access Swagger UI at:

- **Gateway**: `http://localhost:8000/docs`
- **Auth**: `http://localhost:8001/docs`
- **User**: `http://localhost:8002/docs`
- **Emergency**: `http://localhost:8003/docs`

Each service exposes a `/health` endpoint for monitoring.

---

## 🗄️ Database Migrations

Rakshika uses **Alembic** for database schema management. All 20 tables are defined in a single initial migration covering:

- Auth tables (users, roles, sessions, devices, refresh_tokens, audit_logs)
- User tables (user_profiles, emergency_contacts, user_preferences)
- Emergency tables (emergencies, emergency_status_history, emergency_responses)
- Community tables (community_members, emergency_broadcasts, responder_actions)
- Location tables (location_updates, safe_routes)
- Evidence & Notification tables

```bash
# Generate a new migration
alembic revision --autogenerate -m "description"

# Apply migrations
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

Test files:
- `tests/test_auth_service.py` — Auth health check, login validation
- `tests/test_gateway.py` — Gateway health, docs endpoint
- `tests/test_services.py` — User, Emergency, Community service tests

---

## 🚢 Deployment

### Docker Compose (Development/Staging)

```bash
docker-compose up --build -d
```

### Production Checklist
- [ ] Change all secrets in `.env` (JWT_SECRET, DB passwords)
- [ ] Enable HTTPS in Nginx configuration
- [ ] Configure proper CORS origins
- [ ] Set up database backups
- [ ] Enable rate limiting per-user
- [ ] Configure log aggregation
- [ ] Set up health check monitoring

---

## 🔐 Environment Variables

See [`.env.example`](.env.example) for the complete list. Key variables:

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `REDIS_URL` | Redis connection string |
| `JWT_SECRET` | Secret key for JWT token signing |
| `GEMINI_API_KEY` | Google Gemini API key for AI service |
| `FCM_SERVER_KEY` | Firebase Cloud Messaging server key |
| `GOOGLE_MAPS_API_KEY` | Google Maps API key for mobile |

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.

---

<p align="center">
  Made with ❤️ for women's safety in India 🇮🇳
</p>
