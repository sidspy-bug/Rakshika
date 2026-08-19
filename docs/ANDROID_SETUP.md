# Android Studio Setup Guide

Rakshika is built using web technologies (React/Vite) and packaged as a native Android application using **Capacitor**. This guide will walk you through compiling the app and running it on an Android device or emulator.

## 1. Prerequisites

Before you begin, ensure you have the following installed on your system:
- **Node.js** (v18 or higher)
- **Android Studio** (Latest version recommended)
- **Java Development Kit (JDK)** (Version 17 is standard for modern Android development)

## 2. Initial Setup

1. Open your terminal at the root of the Rakshika repository.
2. Install the Node dependencies:
   ```bash
   npm install
   ```

## 3. Build & Sync

Every time you modify the React web code (`src/` folder), you need to compile it and copy those compiled assets into the Android native project.

1. **Build the web assets:**
   ```bash
   npm run build
   ```
   *This compiles the React code into the `dist/` folder.*

2. **Sync with Android:**
   ```bash
   npm run android:sync
   ```
   *Capacitor will copy the contents of `dist/` into `android/app/src/main/assets/public/`.*

## 4. Open in Android Studio

Once the project is built and synced, you can launch Android Studio directly from the terminal:

```bash
npm run android:open
```
*(Alternatively, you can manually open the `android/` folder from the Android Studio welcome screen).*

## 5. Running the App

1. Wait for Android Studio to finish **Gradle Sync** (this might take a few minutes the first time).
2. Connect a physical Android device via USB (ensure USB Debugging is enabled in Developer Options) OR create a virtual device (AVD) using the Device Manager.
3. Select your device from the dropdown in the top toolbar.
4. Click the green **Run** button (or press `Shift + F10`).

Android Studio will compile the APK and launch Rakshika on your device!

## 6. Common Issues

- **"google-services.json is missing"**: If you are using Firebase features like push notifications, you need to download your `google-services.json` from the Firebase Console and place it in the `android/app/` directory.
- **Gradle Build Failures**: Ensure you have installed the correct Android SDK platforms via the SDK Manager in Android Studio.
- **White Screen on Launch**: Ensure you ran `npm run build` and `npm run android:sync` before running the app in Android Studio.
