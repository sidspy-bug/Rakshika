import { useState, useEffect } from "react";
import { Phone, PhoneOff, MessageSquare, Clock } from "lucide-react";
import { useNavigate } from "react-router-dom";

export function FakeCallScreen() {
  const navigate = useNavigate();
  const [callState, setCallState] = useState<"incoming" | "active">("incoming");
  const [timer, setTimer] = useState(0);

  // Play ringing sound (mocked via vibration for now)
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (callState === "incoming") {
      if (navigator.vibrate) {
        interval = setInterval(() => {
          navigator.vibrate([1000, 1000]); // Ring pattern
        }, 2000);
      }
    }
    return () => clearInterval(interval);
  }, [callState]);

  // Call timer
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (callState === "active") {
      interval = setInterval(() => {
        setTimer((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [callState]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, "0");
    const s = (seconds % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  const handleDecline = () => {
    navigate(-1);
  };

  const handleAccept = () => {
    setCallState("active");
    if (navigator.vibrate) navigator.vibrate(0); // Stop vibrating
  };

  return (
    <div className="fixed inset-0 z-[100] bg-[#1C1C1E] text-white flex flex-col justify-between pt-16 pb-20 px-8 font-sans">
      <div className="flex flex-col items-center">
        <h2 className="text-gray-400 text-xl font-medium mb-2">
          {callState === "incoming" ? "incoming call" : formatTime(timer)}
        </h2>
        <h1 className="text-4xl font-normal mb-8">Dad</h1>
      </div>

      {callState === "incoming" ? (
        <div className="flex justify-between items-end w-full px-4 mb-4">
          <div className="flex flex-col items-center gap-2 cursor-pointer" onClick={handleDecline}>
            <div className="w-20 h-20 bg-[#FF3B30] rounded-full flex items-center justify-center animate-pulse shadow-[0_0_20px_rgba(255,59,48,0.4)]">
              <PhoneOff className="w-8 h-8 text-white" />
            </div>
            <span className="text-gray-300">Decline</span>
          </div>

          <div className="flex flex-col items-center gap-2 cursor-pointer" onClick={handleAccept}>
            <div className="w-20 h-20 bg-[#34C759] rounded-full flex items-center justify-center animate-pulse shadow-[0_0_20px_rgba(52,199,89,0.4)]">
              <Phone className="w-8 h-8 text-white fill-white" />
            </div>
            <span className="text-gray-300">Accept</span>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-12 w-full max-w-sm mx-auto mb-4">
          <div className="grid grid-cols-3 gap-y-8 gap-x-4 place-items-center">
            <div className="flex flex-col items-center gap-1 opacity-50">
              <div className="w-16 h-16 rounded-full bg-gray-700 flex items-center justify-center"><MessageSquare className="w-6 h-6" /></div>
              <span className="text-xs">mute</span>
            </div>
            <div className="flex flex-col items-center gap-1 opacity-50">
              <div className="w-16 h-16 rounded-full bg-gray-700 flex items-center justify-center"><Clock className="w-6 h-6" /></div>
              <span className="text-xs">keypad</span>
            </div>
            <div className="flex flex-col items-center gap-1 opacity-50">
              <div className="w-16 h-16 rounded-full bg-gray-700 flex items-center justify-center"><Phone className="w-6 h-6" /></div>
              <span className="text-xs">audio</span>
            </div>
          </div>
          
          <div className="flex justify-center w-full">
            <div className="flex flex-col items-center gap-2 cursor-pointer" onClick={handleDecline}>
              <div className="w-20 h-20 bg-[#FF3B30] rounded-full flex items-center justify-center shadow-[0_0_20px_rgba(255,59,48,0.4)]">
                <PhoneOff className="w-8 h-8 text-white" />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
