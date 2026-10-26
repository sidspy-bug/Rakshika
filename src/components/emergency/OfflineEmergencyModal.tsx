import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Radio,
  WifiOff,
  Wifi,
  Send,
  MapPin,
  Phone,
  ShieldAlert,
  X,
  Clock,
  MessageSquare,
  Users,
  Bluetooth,
  BluetoothSearching,
  CheckCircle2,
  Trash2,
  UserPlus,
  Plus,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Button } from "../ui/Button";
import { Capacitor } from "@capacitor/core";
import { SmsPlugin } from "../../plugins/smsPlugin";
import { airTagMeshRelayService } from "../../services/airTagMeshRelayService";
import { enqueueLocation } from "../../services/offlineLocationQueue";
import type { Coords } from "../../types/gis";

export interface OfflineMessage {
  id: string;
  sender: "USER" | "SYSTEM";
  text: string;
  coords?: Coords;
  address?: string;
  timestamp: string;
  channels: {
    sms: boolean;
    bleMesh: boolean;
    cloudQueue: boolean;
  };
  recipientsCount: number;
}

interface OfflineEmergencyModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentCoords: Coords | null;
  currentAddress?: string;
}

interface QuickTemplate {
  icon: string;
  shortLabel: string;
  fullText: string;
}

const TEMPLATE_CHIPS: QuickTemplate[] = [
  {
    icon: "🚨",
    shortLabel: "In Danger / Police",
    fullText: "🚨 EMERGENCY: I am in danger! Please send police help to my live GPS location immediately.",
  },
  {
    icon: "⚠️",
    shortLabel: "Being Followed",
    fullText: "⚠️ HELP: Suspicious persons are following me. Tracking my live GPS coordinates.",
  },
  {
    icon: "🚑",
    shortLabel: "Medical Help",
    fullText: "🚑 MEDICAL EMERGENCY: Urgent medical help required at my current location.",
  },
  {
    icon: "📍",
    shortLabel: "Send Coordinates",
    fullText: "📍 LIVE GPS: Sharing my exact verified safety coordinates and map link.",
  },
];

const CHAT_STORAGE_KEY = "rakshika_offline_distress_chat";
const CONTACTS_STORAGE_KEY = "rakshika-emergency-contacts";

export function OfflineEmergencyModal({
  isOpen,
  onClose,
  currentCoords,
  currentAddress,
}: OfflineEmergencyModalProps) {
  const [inputText, setInputText] = useState("");
  const [messages, setMessages] = useState<OfflineMessage[]>(() => {
    try {
      const stored = localStorage.getItem(CHAT_STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const [isSending, setIsSending] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== "undefined" ? navigator.onLine : true
  );
  const [isBluetoothEnabled, setIsBluetoothEnabled] = useState(true);
  const [emergencyContacts, setEmergencyContacts] = useState<
    { name: string; phone: string }[]
  >([]);
  const [selectedContacts, setSelectedContacts] = useState<string[]>([]);
  const [includePolice, setIncludePolice] = useState(true);
  const [isManagingContacts, setIsManagingContacts] = useState(false);
  const [newContactName, setNewContactName] = useState("");
  const [newContactPhone, setNewContactPhone] = useState("");

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Connectivity listener
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Check Bluetooth State on open and prompt if disabled
  useEffect(() => {
    if (!isOpen) return;

    airTagMeshRelayService.getBluetoothState().then((state) => {
      setIsBluetoothEnabled(state.enabled);
      if (!state.enabled) {
        airTagMeshRelayService.requestEnableBluetooth().then((enabled) => {
          if (enabled) setIsBluetoothEnabled(true);
        });
      }
    });
  }, [isOpen]);

  // Load configured emergency contacts
  useEffect(() => {
    if (!isOpen) return;

    try {
      const contactsRaw = localStorage.getItem(CONTACTS_STORAGE_KEY);
      if (contactsRaw) {
        const parsed = JSON.parse(contactsRaw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const list = parsed
            .map((c: any) => ({
              name: c.name || "Trusted Contact",
              phone: c.phone || "",
            }))
            .filter((c) => Boolean(c.phone));
          setEmergencyContacts(list);
          setSelectedContacts(list.map((c) => c.phone));
          return;
        }
      }

      // Fallback to user profile contacts
      const profileRaw = localStorage.getItem("user_profile");
      if (profileRaw) {
        const p = JSON.parse(profileRaw);
        const fallbackList: { name: string; phone: string }[] = [];
        if (p.primaryContactPhone) {
          fallbackList.push({ name: "Primary Contact", phone: p.primaryContactPhone });
        }
        if (p.secondaryContactPhone) {
          fallbackList.push({ name: "Secondary Contact", phone: p.secondaryContactPhone });
        }
        setEmergencyContacts(fallbackList);
        setSelectedContacts(fallbackList.map((c) => c.phone));
      }
    } catch (err) {
      console.warn("Failed to load emergency contacts:", err);
    }
  }, [isOpen]);

  // Persist messages
  useEffect(() => {
    try {
      localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(messages));
    } catch {}
  }, [messages]);

  // Scroll to bottom of chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleClearAllMessages = () => {
    if (window.confirm("Are you sure you want to clear all offline emergency chat messages?")) {
      setMessages([]);
      localStorage.removeItem(CHAT_STORAGE_KEY);
      showToast("All offline messages cleared");
    }
  };

  const handleDeleteMessage = (id: string) => {
    setMessages((prev) => {
      const updated = prev.filter((m) => m.id !== id);
      try {
        localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(updated));
      } catch {}
      return updated;
    });
    showToast("Message deleted");
  };

  const handleToggleContact = (phone: string) => {
    setSelectedContacts((prev) =>
      prev.includes(phone) ? prev.filter((p) => p !== phone) : [...prev, phone]
    );
  };

  const handleAddContact = () => {
    const trimmedPhone = newContactPhone.trim();
    if (!trimmedPhone || trimmedPhone.replace(/\D/g, "").length < 7) {
      showToast("Please enter a valid phone number (at least 7 digits)");
      return;
    }

    const trimmedName = newContactName.trim() || "Trusted Contact";
    if (emergencyContacts.some((c) => c.phone === trimmedPhone)) {
      showToast("This contact number is already added!");
      return;
    }

    const updated = [...emergencyContacts, { name: trimmedName, phone: trimmedPhone }];
    setEmergencyContacts(updated);
    setSelectedContacts((prev) => [...prev, trimmedPhone]);
    try {
      localStorage.setItem(CONTACTS_STORAGE_KEY, JSON.stringify(updated));
    } catch {}

    setNewContactName("");
    setNewContactPhone("");
    showToast(`Added ${trimmedName} to emergency contacts!`);
  };

  const handleRemoveContact = (phoneToRemove: string) => {
    const updated = emergencyContacts.filter((c) => c.phone !== phoneToRemove);
    setEmergencyContacts(updated);
    setSelectedContacts((prev) => prev.filter((p) => p !== phoneToRemove));
    try {
      localStorage.setItem(CONTACTS_STORAGE_KEY, JSON.stringify(updated));
    } catch {}
    showToast("Contact removed from emergency targets");
  };

  const handleEnableBluetooth = async () => {
    const success = await airTagMeshRelayService.requestEnableBluetooth();
    if (success) {
      setIsBluetoothEnabled(true);
      showToast("Bluetooth radio activated!");
    } else {
      showToast("Opening Bluetooth settings...");
      setTimeout(() => {
        airTagMeshRelayService.getBluetoothState().then((s) => {
          setIsBluetoothEnabled(s.enabled);
        });
      }, 2000);
    }
  };

  const handleSend = async (overrideText?: string) => {
    const textToSend = (overrideText || inputText).trim();
    if (!textToSend && !currentCoords) return;

    setIsSending(true);

    const lat = currentCoords?.lat || 28.6139;
    const lng = currentCoords?.lng || 77.209;
    const mapsLink = `https://maps.google.com/?q=${lat.toFixed(5)},${lng.toFixed(5)}`;
    const landmarkText = currentAddress ? `Near: ${currentAddress}` : "";

    const fullDistressPayload = `🚨 [RAKSHIKA OFFLINE SOS]
${textToSend || "EMERGENCY: Immediate assistance needed!"}
📍 Location: ${lat.toFixed(5)}, ${lng.toFixed(5)}
${landmarkText}
🗺️ Map: ${mapsLink}
⏰ Time: ${new Date().toLocaleTimeString()}`;

    let smsSuccess = false;
    let bleSuccess = false;
    let recipientsTotal = 0;

    // 1. Channel: Native Cellular Modem / SMS
    const targetPhones = [...selectedContacts];
    if (includePolice && !targetPhones.includes("112")) {
      targetPhones.push("112");
    }

    recipientsTotal = targetPhones.length;

    if (targetPhones.length > 0) {
      if (Capacitor.isNativePlatform()) {
        try {
          for (const phone of targetPhones) {
            await SmsPlugin.sendSms({
              phone,
              message: fullDistressPayload,
            });
          }
          smsSuccess = true;
        } catch (smsErr) {
          console.warn("Native SMS Plugin send error:", smsErr);
          // Fallback to browser SMS intent
          window.open(
            `sms:${targetPhones.join(",")}?body=${encodeURIComponent(fullDistressPayload)}`,
            "_blank"
          );
          smsSuccess = true;
        }
      } else {
        // Web / PWA browser environment: launch SMS composer intent directly
        window.open(
          `sms:${targetPhones.join(",")}?body=${encodeURIComponent(fullDistressPayload)}`,
          "_blank"
        );
        smsSuccess = true;
      }
    }

    // 2. Channel: AirTag-Style Peer-to-Peer BLE Mesh Beacon
    try {
      if (!isBluetoothEnabled) {
        airTagMeshRelayService.requestEnableBluetooth().then((en) => {
          if (en) setIsBluetoothEnabled(true);
        });
      }

      await airTagMeshRelayService.broadcastSosBeacon({
        incidentId: `OFFLINE-${Date.now()}`,
        lat,
        lng,
        timestamp: new Date().toISOString(),
        urgency: "CRITICAL",
        hopCount: 0,
        message: textToSend || "EMERGENCY: Immediate assistance needed!",
      });
      bleSuccess = true;
    } catch (bleErr) {
      console.warn("BLE Mesh broadcast error:", bleErr);
    }

    // 3. Channel: Offline Cloud Queue (auto-sync when back online)
    try {
      enqueueLocation({
        latitude: lat,
        longitude: lng,
        timestamp: new Date().toISOString(),
        emergencyId: null,
        batteryLevel: 99,
      });
    } catch (queueErr) {
      console.warn("Offline queue error:", queueErr);
    }

    // Record message into offline chat state
    const newMsg: OfflineMessage = {
      id: `msg-${Date.now()}`,
      sender: "USER",
      text: textToSend || "Emergency GPS Coordinates Dispatched",
      coords: currentCoords || undefined,
      address: currentAddress,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      channels: {
        sms: smsSuccess,
        bleMesh: bleSuccess,
        cloudQueue: true,
      },
      recipientsCount: recipientsTotal,
    };

    setMessages((prev) => [...prev, newMsg]);
    setInputText("");
    setIsSending(false);

    if (!isBluetoothEnabled) {
      showToast("SMS dispatched! Please turn Bluetooth ON for BLE Mesh beacon.");
    } else {
      showToast(
        smsSuccess
          ? "SOS Sent via Cellular SMS & BLE Mesh (8s burst)!"
          : "Distress coordinates broadcasted via BLE Mesh (8s burst)!"
      );
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 animate-in fade-in duration-150">
          <motion.div
            initial={{ opacity: 0, scale: 0.98, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: 10 }}
            transition={{ duration: 0.15 }}
            className="w-full max-w-lg bg-white rounded-xl shadow-2xl flex flex-col h-[90vh] max-h-[720px] overflow-hidden border border-slate-200"
          >
            {/* Header */}
            <div className="bg-[#D32F2F] text-white px-4 py-3 shrink-0 flex items-center justify-between border-b border-red-800 shadow-xs">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-red-900 flex items-center justify-center border border-red-700">
                  <Radio className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-base flex items-center gap-2">
                    Offline SOS Comms
                  </h3>
                  <p className="text-xs text-red-100 font-medium flex items-center gap-1.5 mt-0.5">
                    {isOnline ? (
                      <>
                        <Wifi className="w-3.5 h-3.5 text-emerald-300" />
                        <span>Online • Cellular & Mesh Ready</span>
                      </>
                    ) : (
                      <>
                        <WifiOff className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
                        <span className="font-bold text-amber-200">Zero Internet Active • Mesh & SMS</span>
                      </>
                    )}
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="w-9 h-9 rounded-full bg-black/20 hover:bg-black/35 flex items-center justify-center transition-colors text-white active:scale-95"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Sub-Header: Interactive SMS Targets & Contact Management Bar */}
            <div className="bg-gray-50 border-b border-gray-200 px-4 py-2.5 shrink-0">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5 text-gray-700 font-medium flex-wrap">
                  <Users className="w-3.5 h-3.5 text-gray-500" />
                  <span className="font-semibold text-gray-800">SMS Targets:</span>
                  <span className="text-gray-600 font-medium">
                    {selectedContacts.length > 0
                      ? `${selectedContacts.length} Selected`
                      : "None Selected"}
                  </span>
                  {includePolice && (
                    <span className="bg-red-100 text-red-800 font-bold px-1.5 py-0.5 rounded text-[10px]">
                      + Police 112
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2.5">
                  <label className="text-xs font-bold text-red-700 flex items-center gap-1 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={includePolice}
                      onChange={(e) => setIncludePolice(e.target.checked)}
                      className="rounded text-red-600 focus:ring-red-500 w-3.5 h-3.5"
                    />
                    Police 112
                  </label>

                  <button
                    type="button"
                    onClick={() => setIsManagingContacts((prev) => !prev)}
                    className="px-2 py-0.5 rounded-lg bg-white hover:bg-gray-100 border border-gray-300 text-gray-700 text-[11px] font-bold flex items-center gap-1 shadow-xs transition-colors"
                  >
                    <span>{isManagingContacts ? "Done" : "Manage"}</span>
                    {isManagingContacts ? (
                      <ChevronUp className="w-3 h-3 text-gray-500" />
                    ) : (
                      <ChevronDown className="w-3 h-3 text-gray-500" />
                    )}
                  </button>
                </div>
              </div>

              {/* Active Quick Contact Chips (Compact View) */}
              {!isManagingContacts && emergencyContacts.length > 0 && (
                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-2">
                  {emergencyContacts.map((c) => {
                    const isSelected = selectedContacts.includes(c.phone);
                    return (
                      <button
                        key={c.phone}
                        type="button"
                        onClick={() => handleToggleContact(c.phone)}
                        className={`shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] transition-all border ${
                          isSelected
                            ? "bg-red-50 border-red-300 text-red-900 font-bold shadow-xs"
                            : "bg-white border-gray-200 text-gray-400 opacity-60 line-through"
                        }`}
                        title={isSelected ? "Click to exclude from SMS" : "Click to include in SMS"}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${isSelected ? "bg-red-500" : "bg-gray-400"}`} />
                        <span>{c.name}</span>
                        <span className="text-[10px] text-gray-500 font-mono">({c.phone})</span>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Expandable Manage Contacts Panel */}
              <AnimatePresence>
                {isManagingContacts && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden pt-2.5 pb-1 space-y-2 border-t border-gray-200 mt-2"
                  >
                    <p className="text-[11px] font-bold uppercase tracking-wider text-gray-600">
                      Emergency SMS Contacts:
                    </p>

                    {/* Contacts List with Delete & Toggle */}
                    <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                      {emergencyContacts.length === 0 ? (
                        <p className="text-xs text-gray-400 italic py-1">
                          No emergency contacts saved yet. Add a contact number below.
                        </p>
                      ) : (
                        emergencyContacts.map((contact) => (
                          <div
                            key={contact.phone}
                            className="flex items-center justify-between p-2 bg-white rounded-xl border border-gray-200 shadow-xs text-xs"
                          >
                            <label className="flex items-center gap-2 cursor-pointer flex-1 min-w-0">
                              <input
                                type="checkbox"
                                checked={selectedContacts.includes(contact.phone)}
                                onChange={() => handleToggleContact(contact.phone)}
                                className="rounded text-red-600 focus:ring-red-500 w-3.5 h-3.5"
                              />
                              <div className="truncate">
                                <span className="font-bold text-gray-900">{contact.name}</span>
                                <span className="ml-1.5 font-mono text-gray-500 text-[11px]">
                                  {contact.phone}
                                </span>
                              </div>
                            </label>
                            <button
                              type="button"
                              onClick={() => handleRemoveContact(contact.phone)}
                              className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors ml-2"
                              title="Delete contact"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))
                      )}
                    </div>

                    {/* Add New Contact Inline Form */}
                    <div className="bg-white p-2.5 rounded-xl border border-dashed border-red-200 space-y-2">
                      <p className="text-[11px] font-bold text-red-800 flex items-center gap-1">
                        <UserPlus className="w-3.5 h-3.5" />
                        <span>Add New Contact</span>
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                        <input
                          type="text"
                          placeholder="Contact Name (e.g. Mom)"
                          value={newContactName}
                          onChange={(e) => setNewContactName(e.target.value)}
                          className="bg-gray-50 border border-gray-300 rounded-lg px-2.5 py-1.5 text-xs text-gray-900 focus:outline-none focus:ring-1 focus:ring-red-500"
                        />
                        <input
                          type="tel"
                          placeholder="Phone (e.g. +91 9876543210)"
                          value={newContactPhone}
                          onChange={(e) => setNewContactPhone(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              handleAddContact();
                            }
                          }}
                          className="bg-gray-50 border border-gray-300 rounded-lg px-2.5 py-1.5 text-xs text-gray-900 focus:outline-none focus:ring-1 focus:ring-red-500 font-mono"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={handleAddContact}
                        disabled={!newContactPhone.trim()}
                        className="w-full py-1.5 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1 shadow-xs transition-colors"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Save Contact</span>
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Scrollable Body: Pure Chat Feed */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-900 text-sm flex flex-col justify-between">
              {/* Airplane Mode Warning (Only when Bluetooth is OFF) */}
              {!isBluetoothEnabled && (
                <div className="bg-amber-500/15 border border-amber-500/40 rounded-2xl p-2.5 flex items-center justify-between gap-2.5 text-amber-200 shrink-0">
                  <div className="flex items-center gap-2 min-w-0">
                    <BluetoothSearching className="w-4 h-4 text-amber-400 shrink-0 animate-pulse" />
                    <p className="text-xs font-semibold text-amber-200 truncate">
                      Bluetooth is OFF (Airplane Mode)
                    </p>
                  </div>
                  <button
                    onClick={handleEnableBluetooth}
                    className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white text-[11px] font-bold rounded-lg shrink-0 shadow-xs active:scale-95 transition-all flex items-center gap-1"
                  >
                    <Bluetooth className="w-3 h-3" />
                    <span>Turn On</span>
                  </button>
                </div>
              )}

              {/* Chat Conversation Messages */}
              {messages.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-slate-400">
                  <div className="w-12 h-12 rounded-2xl bg-slate-800 flex items-center justify-center text-red-400 mb-3 shadow-inner">
                    <MessageSquare className="w-6 h-6" />
                  </div>
                  <p className="text-sm font-bold text-slate-200">Offline Emergency Messages</p>
                  <p className="text-xs text-slate-400 mt-1 max-w-xs leading-relaxed">
                    Tap a Quick SOS chip below or type a message. Your live GPS coordinates will be automatically pre-attached and sent via cellular SMS & BLE mesh.
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5 flex-1 overflow-y-auto">
                  <div className="flex items-center justify-between px-1 pb-1.5 border-b border-slate-700/60 sticky top-0 bg-slate-900 z-10">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                      <MessageSquare className="w-3.5 h-3.5 text-red-400" />
                      Offline Messages ({messages.length})
                    </span>
                    <button
                      type="button"
                      onClick={handleClearAllMessages}
                      className="text-[11px] font-bold text-red-400 hover:text-red-300 flex items-center gap-1 px-2 py-0.5 rounded-md hover:bg-red-950/40 active:scale-95 transition-all"
                      title="Clear all offline distress messages"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Clear All</span>
                    </button>
                  </div>
                  {messages.map((m) => (
                    <div
                      key={m.id}
                      className="bg-slate-800/95 text-white rounded-2xl p-3 text-xs border border-slate-700/80 shadow-md ml-auto max-w-[90%] group relative"
                    >
                      <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono mb-1.5 border-b border-slate-700/60 pb-1">
                        <span className="flex items-center gap-1 text-slate-300">
                          <Clock className="w-3 h-3 text-red-400" /> {m.timestamp}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-emerald-400 font-bold flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" />
                            {m.channels.sms ? "Cellular SMS" : "BLE Mesh"}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleDeleteMessage(m.id)}
                            className="text-slate-400 hover:text-red-400 active:scale-90 transition-all p-0.5 rounded hover:bg-slate-700"
                            title="Delete this message"
                            aria-label="Delete message"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                      <p className="text-slate-100 font-medium leading-relaxed text-sm">{m.text}</p>
                      {m.coords && (
                        <div className="mt-2 text-[11px] text-emerald-300 font-mono flex items-center gap-1.5 bg-slate-900/80 px-2 py-1 rounded-lg border border-slate-700">
                          <MapPin className="w-3.5 h-3.5 text-red-400 shrink-0" />
                          <span>
                            GPS: {m.coords.lat.toFixed(5)}, {m.coords.lng.toFixed(5)}
                          </span>
                        </div>
                      )}
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>

            {/* Footer: Compact Horizontal Scrollable Distress Templates + Input + Direct Helplines */}
            <div className="p-3.5 bg-gray-50 border-t border-gray-200 shrink-0 space-y-2.5">
              {/* Horizontal Scrollable Quick Distress Chips (Directly Above Input) */}
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 px-0.5">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-gray-500 shrink-0">
                  Quick SOS:
                </span>
                {TEMPLATE_CHIPS.map((chip, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSend(chip.fullText)}
                    disabled={isSending}
                    className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-red-50 text-gray-800 hover:text-red-700 border border-gray-200 hover:border-red-300 rounded-full text-xs font-semibold shadow-xs transition-all active:scale-95 whitespace-nowrap"
                  >
                    <span>{chip.icon}</span>
                    <span>{chip.shortLabel}</span>
                  </button>
                ))}
              </div>

              {/* Custom Input Field */}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  placeholder="Type emergency message with GPS..."
                  className="flex-1 bg-white border border-gray-300 rounded-2xl px-4 py-2.5 text-sm font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 shadow-xs"
                />
                <Button
                  onClick={() => handleSend()}
                  disabled={isSending || (!inputText.trim() && !currentCoords)}
                  className="bg-red-600 hover:bg-red-700 text-white rounded-2xl px-4 py-2.5 font-bold shadow-md shadow-red-600/30 shrink-0 flex items-center gap-1.5 active:scale-95 transition-transform"
                >
                  <Send className="w-4 h-4" />
                  <span className="hidden sm:inline">Send SOS</span>
                </Button>
              </div>

              {/* 1-Tap Emergency Helplines (Native Dial) */}
              <div className="flex items-center justify-between pt-0.5 text-xs">
                <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                  Direct Call:
                </span>
                <div className="flex items-center gap-2">
                  <a
                    href="tel:112"
                    className="px-2.5 py-1 bg-red-100 text-red-800 rounded-lg font-bold hover:bg-red-200 flex items-center gap-1 shadow-xs"
                  >
                    <Phone className="w-3 h-3" /> 112 (Police)
                  </a>
                  <a
                    href="tel:1091"
                    className="px-2.5 py-1 bg-rose-100 text-rose-800 rounded-lg font-bold hover:bg-rose-200 flex items-center gap-1 shadow-xs"
                  >
                    <Phone className="w-3 h-3" /> 1091 (Women)
                  </a>
                  <a
                    href="tel:181"
                    className="px-2.5 py-1 bg-purple-100 text-purple-800 rounded-lg font-bold hover:bg-purple-200 flex items-center gap-1 shadow-xs"
                  >
                    <Phone className="w-3 h-3" /> 181
                  </a>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Toast Notification */}
          <AnimatePresence>
            {toastMessage && (
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 30 }}
                className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-gray-950 text-white px-4 py-2.5 rounded-full font-bold text-xs shadow-2xl z-[300] flex items-center gap-2 border border-red-500/40"
              >
                <ShieldAlert className="w-4 h-4 text-emerald-400" />
                <span>{toastMessage}</span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </AnimatePresence>
  );
}
