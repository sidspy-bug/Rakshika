# 🛡️ Rakshika — Setup Guide

This guide walks you through setting up the complete Rakshika development environment from scratch.

---

## Prerequisites

| Tool | Version | Purpose |
|------|---------|---------|
| **Docker Desktop** | v4.0+ | Run all backend services in containers |
| **Node.js** | v18+ | Mobile app development |
| **Python** | 3.11+ | Local backend development & testing |
| **Git** | Latest | Version control |
| **Expo Go** (mobile) | Latest | Test mobile app on physical device |

---

## Step 1: Clone the Repository

```bash
git clone https://github.com/your-username/Rakshika.git
cd Rakshika
```

---

## Step 2: Environment Configuration

```bash
# Copy the environment template
cp .env.example .env
```

Edit `.env` and fill in the required API keys:

### Required Keys
| Key | Where to get it |
|-----|----------------|
| `GEMINI_API_KEY` | [Google AI Studio](https://aistudio.google.com/apikey) |
| `GOOGLE_MAPS_API_KEY` | [Google Cloud Console](https://console.cloud.google.com/apis/credentials) |
| `FCM_SERVER_KEY` | [Firebase Console](https://console.firebase.google.com) → Project Settings → Cloud Messaging |

### Optional Keys (for full functionality)
| Key | Where to get it |
|-----|----------------|
| `TWILIO_ACCOUNT_SID` | [Twilio Console](https://console.twilio.com) |
| `TWILIO_AUTH_TOKEN` | Twilio Console → Account Dashboard |
| SMTP credentials | Your email provider |

> **Note:** The app will run without these optional keys but SMS and email notifications will be disabled.

---

## Step 3: Start the Backend

### Option A: Docker Compose (Recommended)

```bash
# Build and start all services
docker-compose up --build -d

# Check all containers are running
docker-compose ps

# View logs
docker-compose logs -f

# View specific service logs
docker-compose logs -f auth-service
```

This spins up:
- **PostgreSQL 15** on port `5432`
- **Redis 7** on port `6379`
- **9 microservices** (gateway, auth, user, emergency, community, location, notification, evidence, ai)
- **Nginx** on port `80` (reverse proxy)

### Option B: Local Python Development

```bash
# Create virtual environment
python -m venv venv

# Activate it
# Windows:
venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Start individual services (each in a separate terminal):
uvicorn services.gateway.app.main:app --port 8000 --reload
uvicorn services.auth-service.app.main:app --port 8001 --reload
uvicorn services.user-service.app.main:app --port 8002 --reload
# ... and so on for each service
```

> **Note:** For local development you need PostgreSQL and Redis running locally or via Docker:
> ```bash
> docker run -d --name rakshika-pg -p 5432:5432 -e POSTGRES_USER=user -e POSTGRES_PASSWORD=password -e POSTGRES_DB=rakshika_db postgres:15-alpine
> docker run -d --name rakshika-redis -p 6379:6379 redis:7-alpine
> ```

---

## Step 4: Run Database Migrations

```bash
# If using Docker:
docker-compose exec api-gateway alembic upgrade head

# If running locally:
alembic upgrade head
```

This creates all 20 database tables (users, emergencies, community_members, evidence, etc.).

---

## Step 5: Set Up the Mobile App

```bash
cd mobile

# Install dependencies
npm install

# Start the development server
npx expo start
```

### Running on Different Platforms

| Platform | Command | Requirements |
|----------|---------|-------------|
| **Web Browser** | `npx expo start --web` | None |
| **iOS Simulator** | `npx expo start --ios` | Xcode (macOS only) |
| **Android Emulator** | `npx expo start --android` | Android Studio |
| **Physical Device** | Scan QR code with Expo Go app | Expo Go app installed |

### Mobile App Configuration

For Google Maps to work on mobile, add your API key to `mobile/app.json`:

```json
{
  "expo": {
    "android": {
      "config": {
        "googleMaps": {
          "apiKey": "YOUR_GOOGLE_MAPS_API_KEY"
        }
      }
    },
    "ios": {
      "config": {
        "googleMapsApiKey": "YOUR_GOOGLE_MAPS_API_KEY"
      }
    }
  }
}
```

---

## Step 6: Verify Everything Works

### Backend Health Checks

```bash
# Check gateway
curl http://localhost:8000/health

# Check auth service (via nginx)
curl http://localhost/internal/auth/health

# Check all services via docker
docker-compose ps
```

### Swagger API Docs

Open in your browser:
- Gateway: http://localhost:8000/docs
- Auth: http://localhost:8001/docs

### Run Tests

```bash
# Install test dependencies
pip install pytest pytest-asyncio httpx anyio

# Run all tests
pytest tests/ -v
```

---

## Step 7: Development Workflow

### Adding a New API Endpoint

1. Define the **schema** in `services/<service>/app/api/v1/schemas/`
2. Add the **model** in `services/<service>/app/api/v1/models/`
3. Write the **repository** in `services/<service>/app/api/v1/repositories/`
4. Implement the **service logic** in `services/<service>/app/api/v1/services/`
5. Create the **controller** in `services/<service>/app/api/v1/controllers/`
6. Register the **router** in `services/<service>/app/api/v1/routers/`
7. Generate a migration: `alembic revision --autogenerate -m "add_new_table"`
8. Apply: `alembic upgrade head`

### Adding a New Mobile Screen

1. Create the screen in `mobile/src/screens/NewScreen.tsx`
2. Add it to the appropriate navigator in `mobile/src/navigation/`
3. Create any needed API service methods in `mobile/src/services/`

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| White screen on web | Clear Metro cache: `npx expo start --web --clear` |
| Database connection error | Ensure PostgreSQL is running: `docker-compose ps postgres` |
| Port already in use | Kill the process: `npx kill-port 8000` |
| Docker build fails | Clear Docker cache: `docker-compose build --no-cache` |
| Alembic migration error | Check `DATABASE_URL` in `.env` matches running DB |

---

## Useful Commands

```bash
# Stop all services
docker-compose down

# Stop and remove all data
docker-compose down -v

# Rebuild a specific service
docker-compose build auth-service
docker-compose up -d auth-service

# View real-time logs
docker-compose logs -f --tail=100

# Enter a container shell
docker-compose exec auth-service bash

# Reset database
docker-compose exec api-gateway alembic downgrade base
docker-compose exec api-gateway alembic upgrade head
```

---

<p align="center">
  Built with ❤️ for women's safety
</p>
