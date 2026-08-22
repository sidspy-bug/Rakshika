/**
 * VolunteerProfileScreen
 *
 * Displays the volunteer's profile, statistics, and settings.
 */

import { useNavigate } from "react-router-dom";
import { ChevronLeft, User, Mail, Phone, ShieldCheck, LogOut, Settings, Bell, HelpCircle } from "lucide-react";
import { Button } from "../../components/ui/Button";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { useVolunteer } from "../../store/volunteerStore";
import { useAuth } from "../../store/authStore";
import { firebaseAuthService } from "../../services/firebaseAuth";

export function VolunteerProfileScreen() {
  const navigate = useNavigate();
  const { profile } = useVolunteer();
  const { logout: authLogout } = useAuth();

  const handleLogout = async () => {
    await firebaseAuthService.logout();
    authLogout();
    navigate("/role-select", { replace: true });
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col max-w-[600px] mx-auto border-x border-gray-200">
      
      {/* Header */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10 pt-safe-top">
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center hover:bg-gray-100 transition-colors"
            >
              <ChevronLeft className="w-5 h-5 text-gray-700" />
            </button>
            <h1 className="font-bold text-gray-900 text-lg">My Profile</h1>
          </div>
          <button className="w-10 h-10 rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-50">
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 overflow-y-auto pb-safe-bottom">
        {/* Profile Card */}
        <div className="bg-white px-6 py-8 border-b border-gray-100 mb-2">
          <div className="flex flex-col items-center text-center">
            <div className="w-24 h-24 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-[2rem] flex items-center justify-center mb-4 shadow-xl shadow-emerald-500/20">
              <span className="text-3xl font-bold text-white">
                {profile?.fullName?.charAt(0).toUpperCase() ?? "V"}
              </span>
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-1">{profile?.fullName ?? "Volunteer User"}</h2>
            <p className="text-sm font-medium text-emerald-600 mb-3">{profile?.organization ?? "Rakshika Network"}</p>
            
            <StatusBadge
              status={profile?.verificationStatus ?? "PENDING"}
              variant="verification"
              size="default"
            />
          </div>
        </div>

        {/* Stats */}
        <div className="px-4 py-4 grid grid-cols-2 gap-3 mb-2">
          <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm text-center">
            <div className="w-8 h-8 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-2">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <p className="text-2xl font-black text-gray-900">{profile?.responseCount ?? 0}</p>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mt-1">Total Responses</p>
          </div>
          <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm text-center">
            <div className="w-8 h-8 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-2">
              <User className="w-4 h-4" />
            </div>
            <p className="text-2xl font-black text-gray-900">
              {profile?.volunteerType?.split("_").map(w => w.charAt(0)).join("") ?? "V"}
            </p>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mt-1">Role Type</p>
          </div>
        </div>

        {/* Details List */}
        <div className="bg-white border-y border-gray-100 mb-6">
          <div className="px-4 py-4 border-b border-gray-50 flex items-center gap-4">
            <div className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center shrink-0">
              <Mail className="w-5 h-5 text-gray-500" />
            </div>
            <div>
              <p className="text-xs text-gray-500 font-semibold mb-0.5">Email Address</p>
              <p className="text-sm font-bold text-gray-900">{profile?.email ?? "Not set"}</p>
            </div>
          </div>
          <div className="px-4 py-4 border-b border-gray-50 flex items-center gap-4">
            <div className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center shrink-0">
              <Phone className="w-5 h-5 text-gray-500" />
            </div>
            <div>
              <p className="text-xs text-gray-500 font-semibold mb-0.5">Phone Number</p>
              <p className="text-sm font-bold text-gray-900">{profile?.phone ?? "Not set"}</p>
            </div>
          </div>
        </div>

        {/* Settings Links */}
        <div className="bg-white border-y border-gray-100 mb-6 px-4 py-2">
          <button className="w-full py-3 flex items-center justify-between text-left group border-b border-gray-50 last:border-0">
            <div className="flex items-center gap-3">
              <Bell className="w-5 h-5 text-gray-400 group-hover:text-gray-900 transition-colors" />
              <span className="font-semibold text-gray-700 group-hover:text-gray-900 transition-colors text-sm">Notification Settings</span>
            </div>
            <ChevronLeft className="w-5 h-5 text-gray-300 rotate-180" />
          </button>
          <button className="w-full py-3 flex items-center justify-between text-left group border-b border-gray-50 last:border-0" onClick={() => navigate("/volunteer/safety")}>
            <div className="flex items-center gap-3">
              <ShieldCheck className="w-5 h-5 text-gray-400 group-hover:text-gray-900 transition-colors" />
              <span className="font-semibold text-gray-700 group-hover:text-gray-900 transition-colors text-sm">Safety Guidelines</span>
            </div>
            <ChevronLeft className="w-5 h-5 text-gray-300 rotate-180" />
          </button>
          <button className="w-full py-3 flex items-center justify-between text-left group border-b border-gray-50 last:border-0">
            <div className="flex items-center gap-3">
              <HelpCircle className="w-5 h-5 text-gray-400 group-hover:text-gray-900 transition-colors" />
              <span className="font-semibold text-gray-700 group-hover:text-gray-900 transition-colors text-sm">Support & Feedback</span>
            </div>
            <ChevronLeft className="w-5 h-5 text-gray-300 rotate-180" />
          </button>
        </div>

        {/* Logout */}
        <div className="px-4 pb-8">
          <Button
            variant="ghost"
            className="w-full h-12 text-red-600 bg-red-50 hover:bg-red-100 rounded-xl font-bold"
            onClick={handleLogout}
          >
            <LogOut className="w-5 h-5 mr-2" /> Sign Out
          </Button>
        </div>
      </main>
    </div>
  );
}
