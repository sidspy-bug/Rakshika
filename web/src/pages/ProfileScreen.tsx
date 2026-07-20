/**
 * ProfileScreen
 *
 * User profile page with safety score, emergency contacts management,
 * settings menu, and account actions (logout, delete).
 *
 * The Emergency Contacts section uses the dedicated EmergencyContactsSection
 * component which replaces the old inline primary/secondary contact form.
 */

import { useState } from "react";
import {
  User,
  ShieldCheck,
  HeartPulse,
  History,
  Settings2,
  LogOut,
  ChevronRight,
  Bell,
  Smartphone,
} from "lucide-react";
import { GlassCard } from "../components/ui/GlassCard";
import { useNavigate } from "react-router-dom";
import { firebaseAuthService } from "../services/firebaseAuth";
import { EmergencyContactsSection } from "../components/emergency/EmergencyContactsSection";
import { PermissionsSection } from "../components/settings/PermissionsSection";

export function ProfileScreen() {
  const navigate = useNavigate();

  const [user] = useState(() => {
    const profileRaw = localStorage.getItem("user_profile");
    return profileRaw ? JSON.parse(profileRaw) : null;
  });

  // Track which expandable section is open (null = none)
  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  const fullName = user?.fullName || "Jane Doe";

  const toggleSection = (title: string) => {
    setExpandedSection((prev) => (prev === title ? null : title));
  };

  const menuItems = [
    {
      icon: ShieldCheck,
      title: "Emergency Contacts",
      subtitle: "Add up to 5 trusted contacts for SOS alerts",
      expandable: true,
    },
    {
      icon: HeartPulse,
      title: "Medical Profile",
      subtitle: "Blood group, conditions, allergies",
      expandable: false,
    },
    {
      icon: History,
      title: "Emergency History",
      subtitle: "View past SOS logs and incident reports",
      expandable: false,
    },
    {
      icon: Smartphone,
      title: "Trusted Devices",
      subtitle: "Manage active sessions and wearables",
      expandable: false,
    },
    {
      icon: Bell,
      title: "Notification Preferences",
      subtitle: "Alerts, broadcasts, and sounds",
      expandable: false,
    },
    {
      icon: Settings2,
      title: "Permissions",
      subtitle: "Location, microphone, and camera access",
      expandable: true,
    },
  ];

  return (
    <div className="p-4 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      <header className="flex items-center gap-4 pt-4 pb-2 border-b border-gray-100">
        <div className="w-16 h-16 bg-gradient-to-br from-red-100 to-red-50 rounded-full border-2 border-white shadow-sm flex items-center justify-center">
          <User className="w-8 h-8 text-[#D32F2F]" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900">{fullName}</h1>
          <p className="text-sm text-green-600 font-semibold flex items-center gap-1 mt-0.5">
            <ShieldCheck className="w-4 h-4" /> Identity Verified
          </p>
        </div>
      </header>

      {/* Safety Score Card */}
      <GlassCard className="bg-gradient-to-r from-[#D32F2F] to-[#b71c1c] text-white border-none p-5">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="font-bold text-white/90">Safety Score</h3>
            <div className="flex items-end gap-1 mt-1">
              <span className="text-3xl font-black">94</span>
              <span className="text-sm text-white/70 mb-1">/100</span>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs text-white/80 font-medium">
              Profile completeness
            </p>
            <div className="w-24 h-2 bg-white/20 rounded-full mt-2 overflow-hidden">
              <div className="w-[94%] h-full bg-green-400 rounded-full"></div>
            </div>
          </div>
        </div>
      </GlassCard>

      {/* Settings Menu */}
      <div className="space-y-3">
        {menuItems.map((item, idx) => (
          <div key={idx} className="flex flex-col">
            <div
              className="flex items-center gap-4 p-4 bg-white rounded-2xl border border-gray-100 shadow-sm cursor-pointer hover:bg-gray-50 transition-colors"
              onClick={() => {
                if (item.expandable) {
                  toggleSection(item.title);
                }
              }}
            >
              <div className="w-10 h-10 bg-gray-50 rounded-full flex items-center justify-center shrink-0">
                <item.icon className="w-5 h-5 text-gray-600" />
              </div>
              <div className="flex-1">
                <h4 className="font-bold text-sm text-gray-900">
                  {item.title}
                </h4>
                <p className="text-xs text-gray-500 mt-0.5">
                  {item.subtitle}
                </p>
              </div>
              <ChevronRight
                className={`w-4 h-4 text-gray-400 transition-transform ${
                  expandedSection === item.title ? "rotate-90" : ""
                }`}
              />
            </div>

            {/* Emergency Contacts Expandable Section */}
            {item.title === "Emergency Contacts" &&
              expandedSection === "Emergency Contacts" && (
                <div className="mt-2 p-4 bg-white rounded-2xl border border-gray-100 shadow-sm">
                  <EmergencyContactsSection />
                </div>
              )}

            {/* Permissions Expandable Section */}
            {item.title === "Permissions" &&
              expandedSection === "Permissions" && (
                <div className="mt-2 p-4 bg-white rounded-2xl border border-gray-100 shadow-sm">
                  <PermissionsSection />
                </div>
              )}
          </div>
        ))}
      </div>

      {/* Sign Out */}
      <button
        onClick={async () => {
          await firebaseAuthService.logout();
          navigate("/login");
        }}
        className="w-full p-4 flex items-center justify-center gap-2 text-[#D32F2F] font-bold bg-red-50 hover:bg-red-100 rounded-2xl transition-colors"
      >
        <LogOut className="w-4 h-4" /> Sign Out
      </button>

      {/* Delete Account */}
      <button
        onClick={async () => {
          if (
            window.confirm(
              "Are you sure you want to permanently delete your account? This action cannot be undone and will delete all your emergency data."
            )
          ) {
            try {
              await firebaseAuthService.deleteAccount();
              navigate("/login");
            } catch (err) {
              alert(
                "Failed to delete account. You may need to sign in again to perform this action."
              );
              console.error(err);
            }
          }
        }}
        className="w-full mt-4 p-4 flex items-center justify-center gap-2 text-white font-bold bg-red-600 hover:bg-red-700 rounded-2xl transition-colors shadow-lg"
      >
        <LogOut className="w-4 h-4" /> Delete Account
      </button>
    </div>
  );
}
