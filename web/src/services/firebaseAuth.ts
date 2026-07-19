import { auth, db } from "./firebase";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from "firebase/auth";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { api } from "./api";

const IS_MOCK = !import.meta.env.VITE_FIREBASE_API_KEY || import.meta.env.VITE_FIREBASE_API_KEY === "mock-api-key-replace-me";

export const firebaseAuthService = {
  /**
   * Firebase Login Flow with Local Docker Backend prioritization
   */
  async login(email: string, password: string): Promise<string> {
    // 1. Try local Docker backend first if running
    try {
      const response = await api.post("/auth/login", { email, password });
      const accessToken = response.data?.tokens?.accessToken;
      if (accessToken) {
        localStorage.setItem("access_token", accessToken);
        localStorage.setItem("user_profile", JSON.stringify(response.data.user));
        return accessToken;
      }
    } catch (err: any) {
      // If it is a real password/credentials rejection, throw immediately
      if (err.response && err.response.status !== 502 && err.response.status !== 504 && err.code !== "ERR_NETWORK") {
        throw new Error(err.response.data?.message || "Invalid email or password");
      }
      console.warn("Local Docker backend refused or timed out. Checking Firebase/Simulation.");
    }

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
   * Firebase Registration Flow - Saves user details to Firestore Database upon creation
   */
  async register(email: string, password: string, fullName: string, phone: string): Promise<string> {
    // 1. Try local Docker backend first if running
    try {
      const response = await api.post("/auth/signup", { email, password, fullName, phone });
      const accessToken = response.data?.tokens?.accessToken;
      if (accessToken) {
        localStorage.setItem("access_token", accessToken);
        localStorage.setItem("user_profile", JSON.stringify(response.data.user));
        return accessToken;
      }
    } catch (err: any) {
      // If it is a real duplicate validation/rejection, throw immediately
      if (err.response && err.response.status !== 502 && err.response.status !== 504 && err.code !== "ERR_NETWORK") {
        throw new Error(err.response.data?.message || "Registration failed. Email/phone might already exist.");
      }
      console.warn("Local Docker backend refused or timed out. Checking Firebase/Simulation.");
    }

    if (IS_MOCK) {
      console.warn("Running in Hybrid Simulation mode. Bypassing Firebase signup.");
      const usersRaw = localStorage.getItem("rakshika-mock-users");
      const users = usersRaw ? JSON.parse(usersRaw) : {};
      
      if (users[email.toLowerCase()]) {
        throw new Error("Email address already registered");
      }
      
      users[email.toLowerCase()] = { email, password, fullName, phone };
      localStorage.setItem("rakshika-mock-users", JSON.stringify(users));
      
      localStorage.setItem("access_token", `mock-token-${email}`);
      localStorage.setItem("user_profile", JSON.stringify({ email, fullName, phone }));
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
      status: "active"
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
  }
};
export default firebaseAuthService;
