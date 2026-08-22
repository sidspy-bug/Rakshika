/**
 * Auth Store
 *
 * Unified authentication context wrapping Firebase auth.
 * Provides role-aware auth state across the entire application.
 * Integrates with existing firebaseAuth.ts service.
 */

import {
  createContext,
  useContext,
  useReducer,
  useEffect,
  type ReactNode,
} from "react";
import type { AppRole } from "../types/volunteer";

// ─── State ───────────────────────────────────────────────

interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  token: string | null;
  role: AppRole;
  userProfile: Record<string, unknown> | null;
}

const initialState: AuthState = {
  isAuthenticated: false,
  isLoading: true,
  token: null,
  role: null,
  userProfile: null,
};

// ─── Actions ─────────────────────────────────────────────

type AuthAction =
  | { type: "SET_AUTHENTICATED"; token: string; profile: Record<string, unknown> }
  | { type: "SET_ROLE"; role: AppRole }
  | { type: "SET_LOADING"; isLoading: boolean }
  | { type: "LOGOUT" };

function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case "SET_AUTHENTICATED":
      return {
        ...state,
        isAuthenticated: true,
        isLoading: false,
        token: action.token,
        userProfile: action.profile,
      };
    case "SET_ROLE":
      return { ...state, role: action.role };
    case "SET_LOADING":
      return { ...state, isLoading: action.isLoading };
    case "LOGOUT":
      return { ...initialState, isLoading: false };
    default:
      return state;
  }
}

// ─── Context ─────────────────────────────────────────────

interface AuthContextValue extends AuthState {
  setAuthenticated: (token: string, profile: Record<string, unknown>) => void;
  setRole: (role: AppRole) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

// ─── Provider ────────────────────────────────────────────

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Hydrate from localStorage on mount
  useEffect(() => {
    const token = localStorage.getItem("access_token");
    const profileRaw = localStorage.getItem("user_profile");
    const role = localStorage.getItem("rakshika_role") as AppRole;

    if (token) {
      const profile = profileRaw ? JSON.parse(profileRaw) : {};
      dispatch({ type: "SET_AUTHENTICATED", token, profile });
      if (role) {
        dispatch({ type: "SET_ROLE", role });
      }
    } else {
      dispatch({ type: "SET_LOADING", isLoading: false });
    }
  }, []);

  const setAuthenticated = (token: string, profile: Record<string, unknown>) => {
    dispatch({ type: "SET_AUTHENTICATED", token, profile });
  };

  const setRole = (role: AppRole) => {
    localStorage.setItem("rakshika_role", role ?? "");
    dispatch({ type: "SET_ROLE", role });
  };

  const logout = () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("user_profile");
    localStorage.removeItem("rakshika_role");
    localStorage.removeItem("rakshika_volunteer_profile");
    dispatch({ type: "LOGOUT" });
  };

  return (
    <AuthContext.Provider
      value={{ ...state, setAuthenticated, setRole, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// ─── Hook ────────────────────────────────────────────────

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
