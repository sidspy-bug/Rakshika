import { useState, useRef, useEffect } from "react";
import { Send, Shield, Loader2, Sparkles } from "lucide-react";
import { useUserLocation } from "../hooks/useUserLocation";
import { useGisData } from "../hooks/useGisData";
import { reverseGeocode } from "../services/gisService";
import axios from "axios";

type Message = {
  id: string;
  role: "user" | "ai";
  content: string;
};

export function AiChatScreen() {
  const { location: userLocation } = useUserLocation();
  const { helpCenters, incidents } = useGisData({ userLocation, destination: null });
  
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      role: "ai",
      content: "Hello sister. I am Rakshika, your personal safety companion. I am actively monitoring your location to keep you safe. How can I help you right now?",
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [currentAddress, setCurrentAddress] = useState<string>("Locating your current address...");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Reverse geocode user location on load/change
  useEffect(() => {
    if (userLocation) {
      reverseGeocode(userLocation).then((addr) => {
        setCurrentAddress(addr);
      });
    }
  }, [userLocation]);

  const handleSend = async () => {
    const userTextInput = input.trim();
    if (!userTextInput) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: userTextInput,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    const apiKey = import.meta.env.VITE_OPENROUTER_API_KEY;

    if (!apiKey || apiKey === "mock-key") {
      console.warn("VITE_OPENROUTER_API_KEY not found or is mock. Falling back to local simulator.");
      setTimeout(() => {
        let reply = `I am tracking your location near ${currentAddress}. If you feel unsafe, please press the red SOS button immediately or head to the nearest lit area.`;
        const lowerInput = userTextInput.toLowerCase();
        
        if (lowerInput.includes("safe route") || lowerInput.includes("home")) {
          reply = `📍 **Location Check:** You are at ${currentAddress}.\n\nI recommend using the **Safe Walk Mode** on the Map screen. It will steer you clear of unlit streets and guide you through well-lit safe zones.`;
        } else if (lowerInput.includes("emergency") || lowerInput.includes("contact")) {
          reply = `🚨 **Emergency Mode:** I have your coordinates at ${currentAddress}. Your emergency contacts will receive your live tracking link instantly if you trigger the **SOS button**.`;
        } else if (lowerInput.includes("follow") || lowerInput.includes("stalk") || lowerInput.includes("scared")) {
          reply = `⚠️ **STAY CALM & ACT FAST:**\n1. Do NOT head straight home.\n2. Walk immediately into a brightly lit public place (shop, cafe, hospital).\n3. Use the **Fake Call** button on the home screen or press **SOS** if threatened.`;
        }

        const aiMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: "ai",
          content: reply,
        };

        setMessages((prev) => [...prev, aiMessage]);
        setIsLoading(false);
      }, 1200);
      return;
    }

    try {
      // Build detailed location & surroundings context
      const nearestSafeSpots = helpCenters
        .slice(0, 5)
        .map((c) => `- **${c.name}** (${c.type.replace("_", " ")}) ~${Math.round(c.distance || 0)}m away ${c.phone ? `[Call: ${c.phone}]` : ""}`)
        .join("\n");

      const localDangerZones = incidents
        .slice(0, 3)
        .map((i) => `- **${i.title}**: ${i.description}`)
        .join("\n");

      const systemPrompt = `You are Rakshika, a real-time personal safety companion and protective guardian for women. Your highest priority is the user's physical safety and peace of mind.

MANDATORY GEOLOCATION PROTOCOL:
1. ALWAYS anchor your response with her current location first. Acknowledge her area (${currentAddress}) upfront so she knows you have her location locked in.
2. Directly recommend the SPECIFIC safe havens, police stations, or volunteers listed below with their distances when giving directions or help.
3. Warn her about any unlit streets or danger alerts in her immediate vicinity.

LIVE GEOLOCATION DATA:
- Address: ${currentAddress}
- GPS Coordinates: ${userLocation ? `${userLocation.lat}, ${userLocation.lng}` : "Acquiring lock..."}
- Verified Nearby Safe Havens & Police Stations:
${nearestSafeSpots || "Searching live OpenStreetMap database..."}
- Local Safety Alerts / Unlit Streets:
${localDangerZones || "No unlit street warnings reported."}

RESPONSE STYLES & TONALITY:
- Be protective, calm, sharp, empathetic, and scannable. Use **bold formatting** for key locations, distances, and actions.
- Emergency/Threat (being followed, feeling scared, dark street): 
  - Immediately advise pressing the RED SOS button or calling 112 / emergency services.
  - Give 2 concise physical actions (e.g. "Enter the nearest open store", "Do not isolate yourself").
  - Name the exact closest safe spot from the list above.
- Non-Emergency / General Advice:
  - Provide practical self-defense or safe navigation steps grounded in her current location.
  - End with a caring, protective follow-up question (e.g. "Are you walking alone right now? Would you like me to highlight the path to the nearest police station?").`;

      const chatHistory = messages.map((msg) => ({
        role: msg.role === "ai" ? "assistant" : "user",
        content: msg.content,
      }));

      const payload = {
        model: "google/gemma-4-31b-it:free",
        messages: [
          { role: "system", content: systemPrompt },
          ...chatHistory,
          { role: "user", content: userTextInput },
        ],
      };

      const response = await axios.post("https://openrouter.ai/api/v1/chat/completions", payload, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
          "HTTP-Referer": window.location.origin,
          "X-Title": "Rakshika Safety Web",
        },
      });

      const aiReply = response.data?.choices?.[0]?.message?.content || "I'm having trouble analyzing the safety risk right now. If you are in danger, please trigger SOS.";

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "ai",
        content: aiReply,
      };

      setMessages((prev) => [...prev, aiMessage]);
    } catch (err) {
      console.error("OpenRouter request failed:", err);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "ai",
        content: "I couldn't reach the AI server. Please make sure your network is active, or trigger SOS if you are in immediate danger.",
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const quickReplies = [
    "Safe route home",
    "Emergency contacts",
    "Self-defense tips",
  ];

  return (
    <div className="flex flex-col h-full bg-white relative">
      {/* Header */}
      <header className="flex items-center gap-3 p-4 border-b border-gray-100 bg-white/80 backdrop-blur-md sticky top-0 z-10">
        <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
          <Shield className="w-5 h-5 text-[#D32F2F]" />
        </div>
        <div>
          <h2 className="font-bold text-gray-900">Rakshika AI</h2>
          <p className="text-xs text-green-600 font-medium flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
            Online
          </p>
        </div>
      </header>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-32">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[85%] rounded-2xl px-5 py-3 ${
                msg.role === "user"
                  ? "bg-[#D32F2F] text-white rounded-tr-sm"
                  : "bg-gray-100 text-gray-900 rounded-tl-sm border border-gray-200"
              }`}
            >
              <p className="text-[15px] leading-relaxed">{msg.content}</p>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 text-gray-500 rounded-2xl rounded-tl-sm px-5 py-3 border border-gray-200 flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-sm font-medium">Analyzing risk...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-white via-white to-transparent pt-6 pb-4 px-4">
        {/* Quick Replies */}
        <div className="flex gap-2 overflow-x-auto pb-3 mb-1 no-scrollbar">
          {quickReplies.map((reply) => (
            <button
              key={reply}
              onClick={() => setInput(reply)}
              className="whitespace-nowrap px-4 py-2 rounded-full bg-red-50 text-[#D32F2F] text-xs font-semibold border border-red-100 hover:bg-red-100 transition-colors flex items-center gap-1"
            >
              <Sparkles className="w-3 h-3" />
              {reply}
            </button>
          ))}
        </div>

        <div className="flex items-end gap-2 bg-white rounded-3xl border border-gray-200 shadow-sm p-1 pr-2 focus-within:ring-2 focus-within:ring-red-100 transition-shadow">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Ask for safety advice..."
            className="flex-1 max-h-32 bg-transparent border-none focus:ring-0 resize-none py-3 px-4 text-[15px] text-gray-900 placeholder:text-gray-400 min-h-[48px]"
            rows={1}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className="w-10 h-10 mb-1 rounded-full bg-[#D32F2F] text-white flex items-center justify-center disabled:opacity-50 disabled:bg-gray-300 transition-colors shrink-0"
          >
            <Send className="w-5 h-5 ml-0.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
