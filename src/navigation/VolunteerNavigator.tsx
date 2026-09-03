/**
 * VolunteerNavigator
 *
 * Volunteer-specific route definitions and guards.
 * Only verified volunteers can access the dashboard routes.
 * Pending/rejected/suspended volunteers are redirected to the
 * appropriate status screen.
 */

import { Navigate, useLocation } from "react-router-dom";
import type { ReactNode } from "react";

/**
 * Guard that ensures the user is authenticated.
 * Redirects to role selection if no token exists.
 */
export function AuthGuard({ children }: { children: ReactNode }) {
  const token = localStorage.getItem("access_token");
  const location = useLocation();

  if (!token) {
    return <Navigate to="/role-select" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}

/**
 * Guard that ensures the volunteer is verified.
 * Redirects to verification pending if not verified.
 */
export function VolunteerVerifiedGuard({ children }: { children: ReactNode }) {
  const token = localStorage.getItem("access_token");
  const location = useLocation();

  if (!token) {
    return <Navigate to="/role-select" state={{ from: location }} replace />;
  }

  const volunteerRaw = localStorage.getItem("rakshika_volunteer_profile");
  if (!volunteerRaw) {
    return <Navigate to="/volunteer/verification-pending" replace />;
  }

  try {
    const volunteer = JSON.parse(volunteerRaw);
    if (volunteer.verificationStatus !== "VERIFIED") {
      return <Navigate to="/volunteer/verification-pending" replace />;
    }
  } catch {
    return <Navigate to="/volunteer/verification-pending" replace />;
  }

  return <>{children}</>;
}
