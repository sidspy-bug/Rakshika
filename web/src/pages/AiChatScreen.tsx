import { useState, useRef, useEffect } from "react";
import { Send, Shield, Loader2, Sparkles } from "lucide-react";
import { api } from "../services/api";

type Message = {
  id: string;
  role: "user" | "ai";
  content: string;
};

export function AiChatScreen() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      role: "ai",
      content: "Hello. I am Rakshika AI, your safety assistant. How can I help you stay safe today?",
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input.trim(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    // Simulate network delay
    setTimeout(() => {
      let reply = "I'm here to help. If you feel unsafe, please press the SOS button immediately or navigate to a safe zone on the map.";
      const lowerInput = userMessage.content.toLowerCase();
      
      if (lowerInput.includes("safe route") || lowerInput.includes("home")) {
        reply = "I recommend using the Safe Walk Mode on the Map screen. It will guide you through well-lit areas and show nearby police stations and hospitals.";
      } else if (lowerInput.includes("emergency") || lowerInput.includes("contact")) {
        reply = "You can manage your emergency contacts in the Profile screen. They will automatically receive an SMS with your live location if you trigger SOS.";
      } else if (lowerInput.includes("self-defense") || lowerInput.includes("tips")) {
        reply = "Stay aware of your surroundings, keep your phone easily accessible, and trust your instincts. If someone approaches aggressively, make noise to attract attention and look for an escape route.";
      } else if (lowerInput.includes("follow") || lowerInput.includes("stalk")) {
        reply = "If you think you are being followed: Do NOT go home. Walk to a public, well-lit place like a store or cafe. Call a friend or the police, and use the 'Fake Call' feature from the home screen to deter them.";
      }

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "ai",
        content: reply,
      };

      setMessages((prev) => [...prev, aiMessage]);
      setIsLoading(false);
    }, 1500);
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
