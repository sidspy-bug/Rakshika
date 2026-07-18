import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ShieldAlert, X, Phone, MapPin, Video, CheckCircle2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "../components/ui/Button";

export function SosScreen() {
  const navigate = useNavigate();
  const [isPressing, setIsPressing] = useState(false);
  const [activated, setActivated] = useState(false);
  const [countdown, setCountdown] = useState(3);
  const [holdProgress, setHoldProgress] = useState(0);

  // Press and hold logic
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isPressing && !activated) {
      timer = setInterval(() => {
        setHoldProgress((prev) => {
          if (prev >= 100) {
            setActivated(true);
            if (navigator.vibrate) navigator.vibrate([200, 100, 200, 100, 500]);
            return 100;
          }
          return prev + 2; // ~1.5 seconds to fill
        });
      }, 30);
    } else {
      setHoldProgress(0);
    }
    return () => clearInterval(timer);
  }, [isPressing, activated]);

  // SOS Activated countdown
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (activated && countdown > 0) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [activated, countdown]);

  const cancelSos = () => {
    setActivated(false);
    setCountdown(3);
    setHoldProgress(0);
    setIsPressing(false);
    navigate(-1);
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black text-white flex flex-col items-center justify-center overflow-hidden">
      <AnimatePresence mode="wait">
        {!activated ? (
          <motion.div
            key="pre-sos"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.1, filter: "blur(10px)" }}
            className="flex flex-col items-center justify-center w-full h-full"
          >
            <h1 className="text-3xl font-bold text-[#F44336] mb-2 uppercase tracking-widest">Emergency SOS</h1>
            <p className="text-gray-400 mb-12">Press and hold to activate</p>

            <div className="relative flex items-center justify-center w-64 h-64">
              {/* Background Ripples */}
              <motion.div
                animate={{ scale: [1, 1.5, 2], opacity: [0.5, 0.2, 0] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeOut" }}
                className="absolute inset-0 bg-red-600 rounded-full"
              />
              <motion.div
                animate={{ scale: [1, 1.3, 1.8], opacity: [0.6, 0.3, 0] }}
                transition={{ duration: 2, delay: 0.5, repeat: Infinity, ease: "easeOut" }}
                className="absolute inset-0 bg-red-500 rounded-full"
              />

              {/* Progress Ring */}
              <svg className="absolute inset-0 w-full h-full transform -rotate-90">
                <circle
                  cx="128"
                  cy="128"
                  r="120"
                  stroke="rgba(255,255,255,0.1)"
                  strokeWidth="8"
                  fill="none"
                />
                <circle
                  cx="128"
                  cy="128"
                  r="120"
                  stroke="#F44336"
                  strokeWidth="8"
                  fill="none"
                  strokeDasharray="754" // 2 * PI * 120
                  strokeDashoffset={754 - (754 * holdProgress) / 100}
                  className="transition-all duration-75 ease-linear"
                />
              </svg>

              {/* Main Button */}
              <button
                onPointerDown={() => setIsPressing(true)}
                onPointerUp={() => setIsPressing(false)}
                onPointerLeave={() => setIsPressing(false)}
                className="absolute z-10 w-52 h-52 bg-gradient-to-b from-red-500 to-red-700 rounded-full flex flex-col items-center justify-center shadow-[0_0_50px_rgba(244,67,54,0.6)] active:scale-95 transition-transform select-none touch-none"
              >
                <ShieldAlert className="w-20 h-20 text-white mb-2" />
                <span className="text-4xl font-black tracking-widest">SOS</span>
              </button>
            </div>

            <Button
              variant="ghost"
              className="mt-16 text-gray-400 hover:text-white"
              onClick={cancelSos}
            >
              Cancel
            </Button>
          </motion.div>
        ) : (
          <motion.div
            key="active-sos"
            initial={{ opacity: 0, backgroundColor: "#000" }}
            animate={{ opacity: 1, backgroundColor: "#b71c1c" }}
            className="absolute inset-0 flex flex-col items-center justify-start p-8 pt-20"
          >
            {countdown > 0 ? (
              <div className="flex flex-col items-center justify-center h-full w-full">
                <motion.h2
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 1, repeat: Infinity }}
                  className="text-8xl font-black mb-8"
                >
                  {countdown}
                </motion.h2>
                <p className="text-xl text-white/80 uppercase tracking-wider font-bold mb-12">Dispatching Help in...</p>
                <Button size="lg" variant="secondary" className="w-full max-w-xs text-red-600 font-bold" onClick={cancelSos}>
                  <X className="w-5 h-5 mr-2" /> Cancel SOS
                </Button>
              </div>
            ) : (
              <div className="w-full max-w-md flex flex-col items-center">
                <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center mb-6 shadow-2xl">
                  <ShieldAlert className="w-12 h-12 text-red-600" />
                </div>
                <h2 className="text-3xl font-bold uppercase tracking-wider mb-2">SOS Active</h2>
                <p className="text-white/80 text-center mb-8">Help is on the way. Keep your phone with you.</p>

                <div className="w-full bg-black/30 rounded-2xl p-6 flex flex-col gap-6 backdrop-blur-md">
                  <div className="flex items-center gap-4 text-white">
                    <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center border border-green-500/50">
                      <Phone className="w-5 h-5 text-green-400" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-bold">Police Notified</h4>
                      <p className="text-xs text-white/60">Unit dispatched</p>
                    </div>
                    <CheckCircle2 className="w-6 h-6 text-green-400" />
                  </div>

                  <div className="flex items-center gap-4 text-white">
                    <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center border border-blue-500/50">
                      <MapPin className="w-5 h-5 text-blue-400" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-bold">Live Location Shared</h4>
                      <p className="text-xs text-white/60">Tracking active</p>
                    </div>
                    <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse"></div>
                  </div>

                  <div className="flex items-center gap-4 text-white">
                    <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center border border-purple-500/50">
                      <Video className="w-5 h-5 text-purple-400" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-bold">Recording Evidence</h4>
                      <p className="text-xs text-white/60">Audio & Video streaming</p>
                    </div>
                    <div className="w-2 h-2 rounded-full bg-red-400 animate-pulse"></div>
                  </div>
                </div>

                <p className="mt-8 text-sm text-white/50 text-center">Do not close this app.<br/>Authorities are tracking your location.</p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
