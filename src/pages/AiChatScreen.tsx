import { useState, useRef, useEffect } from "react";
import { Send, LifeBuoy, Loader2, MapPin, Phone, AlertTriangle, PhoneCall, Navigation, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useUserLocation } from "../hooks/useUserLocation";
import { useGisData } from "../hooks/useGisData";
import { reverseGeocode } from "../services/gisService";
import { queryAiGuardian, type AiMessage, type MessageAction } from "../services/aiGuardianService";
import { FormattedChatMessage } from "../components/chat/FormattedChatMessage";

const CHAT_STORAGE_KEY = "rakshika_ai_chat_messages";
const ADDRESS_STORAGE_KEY = "rakshika_user_last_address";

const INITIAL_WELCOME: AiMessage = {
  id: "1",
  role: "ai",
  content: "Hello sister. I am Rakshika, your safety advisor. I am actively monitoring your location grid to keep you protected. Are you feeling safe right now or do you need emergency guidance?",
  actions: [
    { type: "sos", label: "Trigger Emergency SOS" },
    { type: "call_police", label: "Call Police (112)", phone: "112" },
    { type: "call_women_helpline", label: "Women Helpline (181)", phone: "181" },
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
    { label: "Being followed", text: "I think someone is following me on foot. What should I do right now?" },
    { label: "Suspicious Cab Route", text: "I am in an auto/cab and the driver is taking a wrong dark route." },
    { label: "Dark Street Hazard", text: "I am stranded in a dark deserted street. Give me safe path advice." },
    { label: "Medical Distress", text: "I need immediate medical emergency assistance." },
    { label: "Nearest Police / Thana", text: "Where is the nearest police station or Mahila Thana?" },
  ];

  return (
    <div className="flex flex-col h-full bg-slate-950 relative text-slate-100 font-sans overflow-hidden">
      {/* Top Header */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-slate-800 bg-slate-900 sticky top-0 z-20 shadow-xs">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-lg bg-red-700 text-white flex items-center justify-center shrink-0">
            <LifeBuoy className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="font-bold text-sm text-white truncate">Rakshika Safety Advisor</h2>
              <span className="px-2 py-0.5 rounded-md bg-emerald-950 border border-emerald-800 text-emerald-400 text-[10px] font-bold flex items-center gap-1.5 shrink-0">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                ACTIVE
              </span>
            </div>
            <p className="text-[11px] text-slate-400 flex items-center gap-1 line-clamp-1 mt-0.5">
              <MapPin className="w-3 h-3 text-red-400 shrink-0" />
              <span className="truncate">{currentAddress}</span>
            </p>
          </div>
        </div>

        <button
          onClick={handleClearChat}
          className="p-2 text-slate-400 hover:text-red-400 rounded-lg hover:bg-slate-800 transition-colors shrink-0"
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
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"} animate-in fade-in duration-150`}
          >
            <div
              className={`max-w-[88%] rounded-xl px-4 py-3 ${
                msg.role === "user"
                  ? "bg-[#D32F2F] text-white rounded-tr-xs shadow-xs"
                  : "bg-slate-900 text-slate-100 rounded-tl-xs border border-slate-800 shadow-xs"
              }`}
            >
              <FormattedChatMessage content={msg.content} isUser={msg.role === "user"} />

              {/* Interactive Action Shortcuts for Emergency Situations */}
              {msg.actions && msg.actions.length > 0 && (
                <div className="mt-3.5 pt-3 border-t border-slate-800 flex flex-wrap items-center gap-2">
                  {msg.actions.map((act, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleActionClick(act)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all shadow-xs active:scale-95 ${
                        act.type === "sos"
                          ? "bg-red-700 hover:bg-red-800 text-white border border-red-600"
                          : act.type === "fake_call"
                          ? "bg-purple-700 hover:bg-purple-800 text-white border border-purple-600"
                          : "bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700"
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
            <div className="bg-slate-900 text-slate-300 rounded-xl rounded-tl-xs px-4 py-3 border border-slate-800 flex items-center gap-2.5 shadow-xs">
              <Loader2 className="w-4 h-4 animate-spin text-red-500" />
              <span className="text-xs font-semibold tracking-wide text-slate-300">
                Checking GPS grid and emergency safety directives...
              </span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input & Quick Reply Controls */}
      <div className="absolute bottom-0 left-0 right-0 bg-slate-950 border-t border-slate-800/90 pt-3 pb-3 px-3.5 z-20">
        {/* Quick Pinch Scenario Chips */}
        <div className="flex gap-2 overflow-x-auto pb-2 mb-1.5 no-scrollbar">
          {quickReplies.map((qr, idx) => (
            <button
              key={idx}
              onClick={() => handleSend(qr.text)}
              disabled={isLoading}
              className="whitespace-nowrap px-3 py-1.5 rounded-lg bg-slate-900 text-slate-300 text-xs font-semibold border border-slate-800 hover:bg-slate-800 hover:text-white transition-all flex items-center gap-1.5 shrink-0 shadow-xs active:scale-95"
            >
              <span>{qr.label}</span>
            </button>
          ))}
        </div>

        {/* Input Bar */}
        <div className="flex items-center gap-2 bg-slate-900 rounded-xl border border-slate-800 p-1.5 pl-3 focus-within:border-slate-600 transition-all shadow-xs">
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
            placeholder="Type emergency status or safety question..."
            className="flex-1 bg-transparent border-none outline-none text-xs font-medium text-white placeholder-slate-500 py-2"
          />
          <button
            onClick={() => handleSend()}
            disabled={!input.trim() || isLoading}
            className="w-8 h-8 rounded-lg bg-[#D32F2F] hover:bg-red-700 text-white flex items-center justify-center disabled:opacity-40 disabled:bg-slate-800 transition-all shrink-0 active:scale-95"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
