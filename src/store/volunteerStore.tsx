/**
 * Volunteer Store
 *
 * Centralized volunteer state using React Context + useReducer.
 * Persists volunteer profile to localStorage.
 * Manages verification, availability, and profile state.
 */

import {
  createContext,
  useContext,
  useReducer,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import type {
  VolunteerProfile,
  AvailabilityStatus,
  VerificationStatus,
} from "../types/volunteer";

// ─── Constants ───────────────────────────────────────────

const STORAGE_KEY = "rakshika_volunteer_profile";

// ─── State ───────────────────────────────────────────────

interface VolunteerStoreState {
  profile: VolunteerProfile | null;
  isLoading: boolean;
  error: string | null;
}

const initialState: VolunteerStoreState = {
  profile: null,
  isLoading: true,
  error: null,
};

// ─── Actions ─────────────────────────────────────────────

type VolunteerAction =
  | { type: "SET_PROFILE"; profile: VolunteerProfile }
  | { type: "SET_VERIFICATION"; status: VerificationStatus }
  | { type: "SET_AVAILABILITY"; status: AvailabilityStatus }
  | { type: "SET_GUIDELINES_ACK"; acknowledged: boolean }
  | { type: "INCREMENT_RESPONSE_COUNT" }
  | { type: "SET_LOADING"; isLoading: boolean }
  | { type: "SET_ERROR"; error: string | null }
  | { type: "CLEAR_PROFILE" };

function volunteerReducer(
  state: VolunteerStoreState,
  action: VolunteerAction
): VolunteerStoreState {
  switch (action.type) {
    case "SET_PROFILE":
      return { ...state, profile: action.profile, isLoading: false, error: null };
    case "SET_VERIFICATION":
      if (!state.profile) return state;
      return {
        ...state,
        profile: { ...state.profile, verificationStatus: action.status },
      };
    case "SET_AVAILABILITY":
      if (!state.profile) return state;
      return {
        ...state,
        profile: { ...state.profile, availability: action.status },
      };
    case "SET_GUIDELINES_ACK":
      if (!state.profile) return state;
      return {
        ...state,
        profile: { ...state.profile, guidelinesAcknowledged: action.acknowledged },
      };
    case "INCREMENT_RESPONSE_COUNT":
      if (!state.profile) return state;
      return {
        ...state,
        profile: { ...state.profile, responseCount: state.profile.responseCount + 1 },
      };
    case "SET_LOADING":
      return { ...state, isLoading: action.isLoading };
    case "SET_ERROR":
      return { ...state, error: action.error, isLoading: false };
    case "CLEAR_PROFILE":
      return { ...initialState, isLoading: false };
    default:
      return state;
  }
}

// ─── Context ─────────────────────────────────────────────

interface VolunteerContextValue extends VolunteerStoreState {
  setProfile: (profile: VolunteerProfile) => void;
  setVerification: (status: VerificationStatus) => void;
  setAvailability: (status: AvailabilityStatus) => void;
  setGuidelinesAck: (acknowledged: boolean) => void;
  incrementResponseCount: () => void;
  clearProfile: () => void;
  isVerified: boolean;
  isAvailable: boolean;
  isPending: boolean;
}

const VolunteerContext = createContext<VolunteerContextValue | null>(null);

// ─── Provider ────────────────────────────────────────────

export function VolunteerProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(volunteerReducer, initialState);

  // Hydrate from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const profile = JSON.parse(stored) as VolunteerProfile;
        dispatch({ type: "SET_PROFILE", profile });
      } else {
        dispatch({ type: "SET_LOADING", isLoading: false });
      }
    } catch {
      dispatch({ type: "SET_LOADING", isLoading: false });
    }
  }, []);

  // Persist to localStorage whenever profile changes
  useEffect(() => {
    if (state.profile) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state.profile));
    }
  }, [state.profile]);

  const setProfile = useCallback((profile: VolunteerProfile) => {
    dispatch({ type: "SET_PROFILE", profile });
  }, []);

  const setVerification = useCallback((status: VerificationStatus) => {
    dispatch({ type: "SET_VERIFICATION", status });
  }, []);

  const setAvailability = useCallback((status: AvailabilityStatus) => {
    dispatch({ type: "SET_AVAILABILITY", status });
  }, []);

  const setGuidelinesAck = useCallback((acknowledged: boolean) => {
    dispatch({ type: "SET_GUIDELINES_ACK", acknowledged });
  }, []);

  const incrementResponseCount = useCallback(() => {
    dispatch({ type: "INCREMENT_RESPONSE_COUNT" });
  }, []);

  const clearProfile = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    dispatch({ type: "CLEAR_PROFILE" });
  }, []);

  const isVerified = state.profile?.verificationStatus === "VERIFIED";
  const isAvailable = state.profile?.availability === "AVAILABLE";
  const isPending = state.profile?.verificationStatus === "PENDING";

  return (
    <VolunteerContext.Provider
      value={{
        ...state,
        setProfile,
        setVerification,
        setAvailability,
        setGuidelinesAck,
        incrementResponseCount,
        clearProfile,
        isVerified,
        isAvailable,
        isPending,
      }}
    >
      {children}
    </VolunteerContext.Provider>
  );
}

// ─── Hook ────────────────────────────────────────────────

export function useVolunteer(): VolunteerContextValue {
  const context = useContext(VolunteerContext);
  if (!context) {
    throw new Error("useVolunteer must be used within a VolunteerProvider");
  }
  return context;
}
