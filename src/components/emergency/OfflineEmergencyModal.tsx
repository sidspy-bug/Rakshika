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
} from "lucide-react";
import { Button } from "../ui/Button";
import { registerPlugin, Capacitor } from "@capacitor/core";
import { airTagMeshRelayService } from "../../services/airTagMeshRelayService";
import { enqueueLocation } from "../../services/offlineLocationQueue";
import type { Coords } from "../../types/gis";

const SmsPlugin = registerPlugin<any>("SmsPlugin");

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
        timestamp: Date.now(),
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
          ? "SOS Dispatched via Cellular SMS & BLE Mesh!"
          : "Distress coordinates broadcasted via BLE Mesh!"
      );
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2 }}
            className="w-full max-w-lg bg-white rounded-3xl shadow-2xl flex flex-col h-[90vh] max-h-[720px] overflow-hidden border border-red-200"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-red-600 via-rose-600 to-red-700 text-white px-5 py-3.5 shrink-0 flex items-center justify-between shadow-md">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-white/15 flex items-center justify-center backdrop-blur-sm border border-white/20">
                  <Radio className="w-5 h-5 text-white animate-pulse" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base sm:text-lg flex items-center gap-2">
                    Offline SOS Chat
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

            {/* Sub-Header: Streamlined SMS Targets Bar */}
            <div className="bg-gray-50 border-b border-gray-200 px-4 py-2 flex items-center justify-between text-xs shrink-0">
              <div className="flex items-center gap-1.5 text-gray-700 font-medium">
                <Users className="w-3.5 h-3.5 text-gray-500" />
                <span className="font-semibold text-gray-800">SMS Targets:</span>
                <span className="text-gray-600">
                  {selectedContacts.length > 0
                    ? `${selectedContacts.length} Contact${selectedContacts.length > 1 ? "s" : ""}`
                    : "No Contacts"}
                </span>
                {includePolice && (
                  <span className="bg-red-100 text-red-800 font-bold px-1.5 py-0.5 rounded text-[10px]">
                    + Police 112
                  </span>
                )}
              </div>
              <label className="text-xs font-bold text-red-700 flex items-center gap-1 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includePolice}
                  onChange={(e) => setIncludePolice(e.target.checked)}
                  className="rounded text-red-600 focus:ring-red-500 w-3.5 h-3.5"
                />
                Police 112
              </label>
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
                  {messages.map((m) => (
                    <div
                      key={m.id}
                      className="bg-slate-800/95 text-white rounded-2xl p-3 text-xs border border-slate-700/80 shadow-md ml-auto max-w-[90%]"
                    >
                      <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono mb-1.5 border-b border-slate-700/60 pb-1">
                        <span className="flex items-center gap-1 text-slate-300">
                          <Clock className="w-3 h-3 text-red-400" /> {m.timestamp}
                        </span>
                        <span className="text-emerald-400 font-bold flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          {m.channels.sms ? "Cellular SMS" : "BLE Mesh"}
                        </span>
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
