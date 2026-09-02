import { auth, db } from "./firebase";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, deleteUser, sendPasswordResetEmail } from "firebase/auth";
import { doc, setDoc, getDoc, deleteDoc } from "firebase/firestore";
import { api } from "./api";

const IS_MOCK = !import.meta.env.VITE_FIREBASE_API_KEY || import.meta.env.VITE_FIREBASE_API_KEY === "mock-api-key-replace-me";

export const firebaseAuthService = {
  /**
   * Firebase Login Flow with Local Docker Backend prioritization
   */
  async login(email: string, password: string): Promise<string> {
    if (IS_MOCK) {
      console.warn("Running in Hybrid Simulation mode. Bypassing Firebase network calls.");
      const usersRaw = localStorage.getItem("rakshika-mock-users");
      const users = usersRaw ? JSON.parse(usersRaw) : {};
      
      const user = users[email.toLowerCase()];
      if (!user || user.password !== password) {
        throw new Error("Invalid email or password");
      }
      
      localStorage.setItem("access_token", `mock-token-${email}`);
      localStorage.setItem("user_profile", JSON.stringify({ email, fullName: user.fullName, phone: user.phone }));
      return `mock-token-${email}`;
    }

    // Real Firebase Authentication signin
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const idToken = await userCredential.user.getIdToken();
    localStorage.setItem("access_token", idToken);
    
    // Fetch profile data from Firestore Database
    try {
      const userDoc = await getDoc(doc(db, "users", userCredential.user.uid));
      if (userDoc.exists()) {
        localStorage.setItem("user_profile", JSON.stringify(userDoc.data()));
      }
    } catch (err) {
      console.warn("Failed to fetch user profile from Firestore:", err);
    }
    
    return idToken;
  },

  /**
   * Sends a password reset email
   */
  async resetPassword(email: string): Promise<void> {
    if (IS_MOCK) {
      console.warn("Running in Hybrid Simulation mode. Password reset mocked.");
      return;
    }
    await sendPasswordResetEmail(auth, email);
  },

  /**
   * Firebase Registration Flow - Saves user details to Firestore Database upon creation
   */
  async register(email: string, password: string, fullName: string, phone: string, extraProfileData: Record<string, any> = {}): Promise<string> {
    if (IS_MOCK) {
      console.warn("Running in Hybrid Simulation mode. Bypassing Firebase signup.");
      const usersRaw = localStorage.getItem("rakshika-mock-users");
      const users = usersRaw ? JSON.parse(usersRaw) : {};
      
      if (users[email.toLowerCase()]) {
        throw new Error("Email address already registered");
      }
      
      users[email.toLowerCase()] = { email, password, fullName, phone, ...extraProfileData };
      localStorage.setItem("rakshika-mock-users", JSON.stringify(users));
      
      const userProfile = { email, fullName, phone, ...extraProfileData };
      localStorage.setItem("access_token", `mock-token-${email}`);
      localStorage.setItem("user_profile", JSON.stringify(userProfile));
      return `mock-token-${email}`;
    }

    // Real Firebase Authentication registration
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const idToken = await userCredential.user.getIdToken();
    localStorage.setItem("access_token", idToken);

    // Save profile record to hosted Firestore database
    const profile = {
      uid: userCredential.user.uid,
      fullName,
      email,
      phone,
      createdAt: new Date().toISOString(),
      status: "active",
      ...extraProfileData
    };

    await setDoc(doc(db, "users", userCredential.user.uid), profile);
    localStorage.setItem("user_profile", JSON.stringify(profile));

    return idToken;
  },

  /**
   * Logs out the user
   */
  async logout(): Promise<void> {
    localStorage.removeItem("access_token");
    localStorage.removeItem("user_profile");
    if (!IS_MOCK) {
      await signOut(auth);
    }
  },

  /**
   * Deletes the user account permanently
   */
  async deleteAccount(): Promise<void> {
    if (IS_MOCK) {
      const usersRaw = localStorage.getItem("rakshika-mock-users");
      const users = usersRaw ? JSON.parse(usersRaw) : {};
      const profileRaw = localStorage.getItem("user_profile");
      if (profileRaw) {
        const email = JSON.parse(profileRaw).email;
        delete users[email.toLowerCase()];
        localStorage.setItem("rakshika-mock-users", JSON.stringify(users));
      }
      localStorage.removeItem("access_token");
      localStorage.removeItem("user_profile");
      return;
    }

    const user = auth.currentUser;
    if (user) {
      // 1. Delete user document from Firestore
      try {
        await deleteDoc(doc(db, "users", user.uid));
      } catch (e) {
        console.warn("Could not delete user document:", e);
      }
      // 2. Delete the user from Auth
      await deleteUser(user);
    }
    
    // 3. Clear local storage
    localStorage.removeItem("access_token");
    localStorage.removeItem("user_profile");
  }
};
export default firebaseAuthService;
