import { useState, useRef, useEffect } from "react";
import { Send, Shield, Loader2, Sparkles, MapPin, Phone, AlertTriangle, PhoneCall, Navigation, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useUserLocation } from "../hooks/useUserLocation";
import { useGisData } from "../hooks/useGisData";
import { reverseGeocode } from "../services/gisService";
import { queryAiGuardian, type AiMessage, type MessageAction } from "../services/aiGuardianService";

const CHAT_STORAGE_KEY = "rakshika_ai_chat_messages";
const ADDRESS_STORAGE_KEY = "rakshika_user_last_address";

const INITIAL_WELCOME: AiMessage = {
  id: "1",
  role: "ai",
  content: "Hello sister. I am Rakshika, your personal safety guardian. I am actively monitoring your location grid to keep you protected 24/7. Are you feeling safe right now or do you need emergency guidance?",
  actions: [
    { type: "sos", label: "🚨 Press SOS" },
    { type: "call_police", label: "📞 Call 112", phone: "112" },
    { type: "call_women_helpline", label: "📞 181 Women Helpline", phone: "181" },
  ],
};

function getStoredMessages(): AiMessage[] {
  try {
    const saved = localStorage.getItem(CHAT_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (err) {
    console.warn("Failed to load chat history:", err);
  }
  return [INITIAL_WELCOME];
}

function getStoredAddress(): string {
  try {
    return localStorage.getItem(ADDRESS_STORAGE_KEY) || "Locating your current address...";
  } catch {
    return "Locating your current address...";
  }
}

export function AiChatScreen() {
  const navigate = useNavigate();
  const { location: userLocation } = useUserLocation();
  const { helpCenters, incidents } = useGisData({ userLocation, destination: null });

  const [messages, setMessages] = useState<AiMessage[]>(getStoredMessages);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [currentAddress, setCurrentAddress] = useState<string>(getStoredAddress);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  // Save chat history on message change
  useEffect(() => {
    try {
      localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(messages));
    } catch (err) {
      console.warn("Failed to save chat history:", err);
    }
  }, [messages]);

  // Reverse geocode user location on load/change & store address
  useEffect(() => {
    if (userLocation) {
      reverseGeocode(userLocation).then((addr) => {
        if (addr) {
          setCurrentAddress(addr);
          try {
            localStorage.setItem(ADDRESS_STORAGE_KEY, addr);
          } catch {}
        }
      });
    }
  }, [userLocation]);

  const handleClearChat = () => {
    setMessages([INITIAL_WELCOME]);
    try {
      localStorage.removeItem(CHAT_STORAGE_KEY);
    } catch {}
  };

  const handleSend = async (overrideText?: string) => {
    const userTextInput = (overrideText || input).trim();
    if (!userTextInput) return;

    const userMessage: AiMessage = {
      id: Date.now().toString(),
      role: "user",
      content: userTextInput,
    };

    setMessages((prev) => [...prev, userMessage]);
    if (!overrideText) setInput("");
    setIsLoading(true);

    try {
      const history = messages.map((m) => ({ role: m.role, content: m.content }));
      const response = await queryAiGuardian(
        userTextInput,
        history,
        currentAddress,
        userLocation,
        helpCenters,
        incidents
      );

      const aiMessage: AiMessage = {
        id: (Date.now() + 1).toString(),
        role: "ai",
        content: response.content,
        actions: response.actions,
      };

      setMessages((prev) => [...prev, aiMessage]);
    } catch (err) {
      console.error("AI Guardian error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleActionClick = (action: MessageAction) => {
    if (action.type === "sos") {
      navigate("/sos");
    } else if (action.type === "fake_call") {
      navigate("/fake-call");
    } else if (action.type === "route_police") {
      if (action.dest) {
        navigate("/map", { state: { destination: action.dest } });
      } else {
        navigate("/map");
      }
    } else if (action.phone) {
      window.location.href = `tel:${action.phone}`;
    }
  };

  const quickReplies = [
    { label: "🚨 Being followed", text: "I think someone is following me on foot. What should I do right now?" },
    { label: "🚗 Suspicious Cab", text: "I am in an auto/cab and the driver is taking a wrong dark route." },
    { label: "🌑 Dark Street", text: "I am stranded in a dark deserted street. Give me safe path advice." },
    { label: "🏥 Medical Help", text: "I need immediate medical emergency assistance." },
    { label: "👮 Nearest Police", text: "Where is the nearest police station or Mahila Thana?" },
  ];

  return (
    <div className="flex flex-col h-full bg-[#0d0d0e] relative text-white font-sans overflow-hidden">
      {/* Top Header */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-gray-800 bg-black/90 backdrop-blur-xl sticky top-0 z-20 shadow-xl">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-2xl bg-rose-600/20 border border-rose-500/40 flex items-center justify-center text-rose-400 shrink-0">
            <Shield className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="font-bold text-sm text-white truncate">Rakshika AI Guardian</h2>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-extrabold border border-emerald-500/30 flex items-center gap-1 shrink-0">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                ACTIVE
              </span>
            </div>
            <p className="text-[11px] text-gray-400 flex items-center gap-1 line-clamp-1 mt-0.5">
              <MapPin className="w-3 h-3 text-rose-400 shrink-0" />
              <span className="truncate">{currentAddress}</span>
            </p>
          </div>
        </div>

        <button
          onClick={handleClearChat}
          className="p-2 text-gray-400 hover:text-rose-400 rounded-xl hover:bg-gray-800 transition-colors shrink-0"
          title="Clear Chat History"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </header>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-36">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"} animate-in fade-in duration-200`}
          >
            <div
              className={`max-w-[88%] rounded-2xl px-4 py-3 ${
                msg.role === "user"
                  ? "bg-gradient-to-r from-rose-600 to-red-700 text-white rounded-tr-sm shadow-lg shadow-rose-950/30"
                  : "bg-gray-900/90 text-gray-100 rounded-tl-sm border border-gray-800 backdrop-blur-md shadow-2xl"
              }`}
            >
              <div className="text-xs leading-relaxed whitespace-pre-wrap font-medium">
                {msg.content}
              </div>

              {/* Interactive Action Shortcuts for Emergency Situations */}
              {msg.actions && msg.actions.length > 0 && (
                <div className="mt-3.5 pt-3 border-t border-gray-800/80 flex flex-wrap items-center gap-2">
                  {msg.actions.map((act, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleActionClick(act)}
                      className={`px-3 py-1.5 rounded-xl text-[11px] font-bold flex items-center gap-1.5 transition-all shadow-md active:scale-95 ${
                        act.type === "sos"
                          ? "bg-rose-600 hover:bg-rose-500 text-white border border-rose-400/50 animate-pulse"
                          : act.type === "fake_call"
                          ? "bg-purple-600 hover:bg-purple-500 text-white border border-purple-400/40"
                          : "bg-gray-800 hover:bg-gray-700 text-emerald-400 border border-gray-700"
                      }`}
                    >
                      {act.type === "sos" && <AlertTriangle className="w-3.5 h-3.5" />}
                      {act.type === "fake_call" && <PhoneCall className="w-3.5 h-3.5" />}
                      {act.type === "call_police" && <Phone className="w-3.5 h-3.5" />}
                      {act.type === "route_police" && <Navigation className="w-3.5 h-3.5" />}
                      <span>{act.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-900/90 text-gray-300 rounded-2xl rounded-tl-sm px-4 py-3 border border-gray-800 flex items-center gap-2.5 backdrop-blur-md shadow-xl">
              <Loader2 className="w-4 h-4 animate-spin text-rose-500" />
              <span className="text-xs font-semibold tracking-wide text-rose-300">
                Analyzing Live GPS Grid & Safety Protocol...
              </span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input & Quick Reply Controls */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black via-black/95 to-transparent pt-6 pb-4 px-3.5 z-20">
        {/* Quick Pinch Scenario Chips */}
        <div className="flex gap-2 overflow-x-auto pb-2.5 mb-1 no-scrollbar">
          {quickReplies.map((qr, idx) => (
            <button
              key={idx}
              onClick={() => handleSend(qr.text)}
              disabled={isLoading}
              className="whitespace-nowrap px-3 py-1.5 rounded-xl bg-gray-900/90 text-gray-200 text-[11px] font-bold border border-gray-800 hover:bg-rose-950/40 hover:text-rose-300 hover:border-rose-800/60 transition-all flex items-center gap-1.5 shrink-0 shadow-md backdrop-blur-md"
            >
              <Sparkles className="w-3 h-3 text-rose-400" />
              <span>{qr.label}</span>
            </button>
          ))}
        </div>

        {/* Input Bar */}
        <div className="flex items-center gap-2 bg-gray-900/90 rounded-2xl border border-gray-800 shadow-2xl p-1.5 pl-3 focus-within:border-rose-500/60 transition-all backdrop-blur-xl">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Describe your situation or emergency..."
            className="flex-1 bg-transparent border-none outline-none text-xs font-medium text-white placeholder-gray-500 py-2"
          />
          <button
            onClick={() => handleSend()}
            disabled={!input.trim() || isLoading}
            className="w-8 h-8 rounded-xl bg-rose-600 hover:bg-rose-500 text-white flex items-center justify-center disabled:opacity-40 disabled:bg-gray-800 transition-all shrink-0 shadow-md active:scale-95"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
