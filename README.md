# Rakshika 🛡️

**India's Most Intelligent Women Safety Ecosystem**

Rakshika is a state-of-the-art, cross-platform mobile and web application designed to provide real-time protection, geolocation safety mapping, and an intelligent AI guardian for women. Built with modern web technologies and packaged for Android using Capacitor.

---

## 🌟 Key Features

* **Real-time SOS Alerting:** One-tap emergency trigger that instantly broadcasts your live location to emergency contacts and nearby verified volunteers via SMS and Firebase.
* **Safe Walk Maps (GIS):** Powered by OpenStreetMap Nominatim and Overpass API, providing real-time pedestrian routing that actively avoids unlit streets and prioritizes paths with nearby police stations and hospitals.
* **Rakshika AI Guardian:** An intelligent, empathetic AI companion powered by Llama/Gemma models that anchors to your live GPS coordinates to provide immediate, actionable safety advice based on your surroundings.
* **Offline Mode:** Download map tiles and local safe zones within a 50km radius using Service Workers and Cache Storage for use without internet.
* **Fake Call Simulator:** Discreetly trigger a realistic incoming phone call to deter harassment or uncomfortable situations.

## 🛠️ Tech Stack

* **Frontend:** React 19, TypeScript, Vite
* **Styling:** TailwindCSS 4, Lucide React Icons
* **Mapping:** Leaflet, OpenStreetMap
* **Backend / Services:** Firebase (Auth, Firestore), OpenRouter AI API
* **Mobile Packaging:** Capacitor (Android)

---

## 🚀 Quick Start (Web Development)

### Prerequisites
- Node.js (v18+)
- Git

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/sidspy-bug/Rakshika.git
   cd Rakshika
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure Environment Variables**
   - Copy `.env.example` to `.env`
   - Fill in your Firebase and OpenRouter API credentials:
   ```bash
   cp .env.example .env
   ```

4. **Start the Development Server**
   ```bash
   npm run dev
   ```
   Open `http://localhost:5173` in your browser.

---

## 📱 Android Build Instructions

Rakshika uses Capacitor to build a native Android app from the React web bundle.
For a comprehensive step-by-step guide to opening the project in Android Studio, compiling the APK, and running it on an emulator or physical device, please refer to our **[Android Setup Guide](docs/ANDROID_SETUP.md)**.

**Quick Commands:**
```bash
npm run build         # Build the web bundle
npm run android:sync  # Sync web assets to the Android project
npm run android:open  # Open Android Studio
```

---

## 🤝 Contributing

We welcome contributions to make Rakshika better! Please read our [CONTRIBUTING.md](CONTRIBUTING.md) for details on our code of conduct, branching strategy, and the process for submitting pull requests.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
