import { useState } from "react";
import { User, ShieldCheck, HeartPulse, History, Settings2, LogOut, ChevronRight, Bell, Smartphone } from "lucide-react";
import { GlassCard } from "../components/ui/GlassCard";
import { useNavigate } from "react-router-dom";
import { firebaseAuthService } from "../services/firebaseAuth";
import { Input } from "../components/ui/Input";
import { Button } from "../components/ui/Button";

export function ProfileScreen() {
  const navigate = useNavigate();

  const [user, setUser] = useState(() => {
    const profileRaw = localStorage.getItem("user_profile");
    return profileRaw ? JSON.parse(profileRaw) : null;
  });
  
  const [showContacts, setShowContacts] = useState(false);
  const [contactsForm, setContactsForm] = useState({
    primaryContactName: user?.primaryContactName || "",
    primaryContactPhone: user?.primaryContactPhone || "",
    secondaryContactName: user?.secondaryContactName || "",
    secondaryContactPhone: user?.secondaryContactPhone || "",
  });
  const [isSaving, setIsSaving] = useState(false);

  const fullName = user?.fullName || "Jane Doe";

  const handleSaveContacts = () => {
    setIsSaving(true);
    const updatedUser = { ...user, ...contactsForm };
    localStorage.setItem("user_profile", JSON.stringify(updatedUser));
    setUser(updatedUser);
    
    // If we wanted to save to Firebase, we would do it here using setDoc
    
    setTimeout(() => {
      setIsSaving(false);
      setShowContacts(false);
    }, 500);
  };

  const menuItems = [
    { icon: ShieldCheck, title: "Emergency Contacts", subtitle: "Manage primary and secondary contacts" },
    { icon: HeartPulse, title: "Medical Profile", subtitle: "Blood group, conditions, allergies" },
    { icon: History, title: "Emergency History", subtitle: "View past SOS logs and incident reports" },
    { icon: Smartphone, title: "Trusted Devices", subtitle: "Manage active sessions and wearables" },
    { icon: Bell, title: "Notification Preferences", subtitle: "Alerts, broadcasts, and sounds" },
    { icon: Settings2, title: "Permissions", subtitle: "Location, microphone, and camera access" },
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
            <p className="text-xs text-white/80 font-medium">Profile completeness</p>
            <div className="w-24 h-2 bg-white/20 rounded-full mt-2 overflow-hidden">
              <div className="w-[94%] h-full bg-green-400 rounded-full"></div>
            </div>
          </div>
        </div>
      </GlassCard>

      <div className="space-y-3">
        {menuItems.map((item, idx) => (
          <div key={idx} className="flex flex-col">
            <div 
              className="flex items-center gap-4 p-4 bg-white rounded-2xl border border-gray-100 shadow-sm cursor-pointer hover:bg-gray-50 transition-colors"
              onClick={() => {
                if (item.title === "Emergency Contacts") {
                  setShowContacts(!showContacts);
                }
              }}
            >
              <div className="w-10 h-10 bg-gray-50 rounded-full flex items-center justify-center shrink-0">
                <item.icon className="w-5 h-5 text-gray-600" />
              </div>
              <div className="flex-1">
                <h4 className="font-bold text-sm text-gray-900">{item.title}</h4>
                <p className="text-xs text-gray-500 mt-0.5">{item.subtitle}</p>
              </div>
              <ChevronRight className={`w-4 h-4 text-gray-400 transition-transform ${showContacts && item.title === "Emergency Contacts" ? "rotate-90" : ""}`} />
            </div>
            
            {item.title === "Emergency Contacts" && showContacts && (
              <div className="mt-2 p-4 bg-white rounded-2xl border border-gray-100 shadow-sm space-y-4 animate-in slide-in-from-top-2">
                <div className="space-y-3">
                  <h5 className="text-sm font-bold text-gray-700">Primary Contact</h5>
                  <Input 
                    type="text" 
                    placeholder="Name" 
                    value={contactsForm.primaryContactName}
                    onChange={(e) => setContactsForm({...contactsForm, primaryContactName: e.target.value})}
                  />
                  <Input 
                    type="tel" 
                    placeholder="Phone" 
                    value={contactsForm.primaryContactPhone}
                    onChange={(e) => setContactsForm({...contactsForm, primaryContactPhone: e.target.value})}
                  />
                </div>
                <div className="space-y-3 pt-2">
                  <h5 className="text-sm font-bold text-gray-700">Secondary Contact</h5>
                  <Input 
                    type="text" 
                    placeholder="Name" 
                    value={contactsForm.secondaryContactName}
                    onChange={(e) => setContactsForm({...contactsForm, secondaryContactName: e.target.value})}
                  />
                  <Input 
                    type="tel" 
                    placeholder="Phone" 
                    value={contactsForm.secondaryContactPhone}
                    onChange={(e) => setContactsForm({...contactsForm, secondaryContactPhone: e.target.value})}
                  />
                </div>
                <Button className="w-full mt-2" onClick={handleSaveContacts} disabled={isSaving}>
                  {isSaving ? "Saving..." : "Save Contacts"}
                </Button>
              </div>
            )}
          </div>
        ))}
      </div>

      <button 
        onClick={async () => {
          await firebaseAuthService.logout();
          navigate("/login");
        }}
        className="w-full p-4 flex items-center justify-center gap-2 text-[#D32F2F] font-bold bg-red-50 hover:bg-red-100 rounded-2xl transition-colors"
      >
        <LogOut className="w-4 h-4" /> Sign Out
      </button>

      <button 
        onClick={async () => {
          if (window.confirm("Are you sure you want to permanently delete your account? This action cannot be undone and will delete all your emergency data.")) {
            try {
              await firebaseAuthService.deleteAccount();
              navigate("/login");
            } catch (err) {
              alert("Failed to delete account. You may need to sign in again to perform this action.");
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
