import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ShieldAlert, X, Phone, MapPin, Video, CheckCircle2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "../components/ui/Button";
import { registerPlugin } from "@capacitor/core";
import { storage, db, auth } from "../services/firebase";
import { ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage";
import { collection, addDoc } from "firebase/firestore";

const SmsPlugin = registerPlugin<any>("SmsPlugin");

function Toast({ message }: { message: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -50 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -50 }}
      className="absolute top-10 left-1/2 -translate-x-1/2 bg-green-500 text-white px-4 py-2 rounded-full font-bold text-sm shadow-xl z-[200] flex items-center gap-2"
    >
      <CheckCircle2 className="w-4 h-4" /> {message}
    </motion.div>
  );
}

export function SosScreen() {
  const navigate = useNavigate();
  const [isPressing, setIsPressing] = useState(false);
  const [activated, setActivated] = useState(false);
  const [countdown, setCountdown] = useState(3);
  const [holdProgress, setHoldProgress] = useState(0);
  const [showToast, setShowToast] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const watchIdRef = useRef<number | null>(null);
  const smsSentRef = useRef<boolean>(false);
  const locationHistoryRef = useRef<{lat: number; lng: number; timestamp: string}[]>([]);

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

  // SOS Activated countdown & triggers
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (activated && countdown > 0) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    } else if (activated && countdown === 0) {
      // Trigger actual SOS actions
      triggerSosActions();
    }
    return () => clearTimeout(timer);
  }, [activated, countdown]);

  const triggerSosActions = async () => {
    setShowToast(true);
    setTimeout(() => setShowToast(false), 4000);

    // 1. Start Live Tracking & Send SMS
    smsSentRef.current = false;
    
    if (navigator.geolocation) {
      watchIdRef.current = navigator.geolocation.watchPosition(
        async (pos) => {
          console.log("SOS Tracking: ", pos.coords.latitude, pos.coords.longitude);
          
          locationHistoryRef.current.push({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            timestamp: new Date().toISOString()
          });
          
          if (!smsSentRef.current) {
            smsSentRef.current = true;
            try {
              const locationUrl = `https://www.google.com/maps/search/?api=1&query=${pos.coords.latitude},${pos.coords.longitude}`;
              const message = `EMERGENCY SOS! I need help immediately. My live location: ${locationUrl}`;
              // Send SMS to registered emergency contacts
              const profileRaw = localStorage.getItem("user_profile");
              if (profileRaw) {
                try {
                  const user = JSON.parse(profileRaw);
                  let smsSent = false;
                  
                  if (user.primaryContactPhone) {
                    await SmsPlugin.sendSms({ phone: user.primaryContactPhone, message });
                    console.log(`Emergency SMS sent to primary contact: ${user.primaryContactPhone}`);
                    smsSent = true;
                  }
                  if (user.secondaryContactPhone) {
                    await SmsPlugin.sendSms({ phone: user.secondaryContactPhone, message });
                    console.log(`Emergency SMS sent to secondary contact: ${user.secondaryContactPhone}`);
                    smsSent = true;
                  }
                  
                  if (!smsSent) {
                    console.warn("No emergency contacts found in user profile.");
                  }
                } catch (e) {
                  console.error("Error parsing user profile for SMS", e);
                }
              } else {
                console.warn("No user profile found, cannot send SMS to emergency contacts.");
              }
            } catch (err) {
              console.error("Failed to send emergency SMS:", err);
            }
          }
        },
        (err) => console.warn(err),
        { enableHighAccuracy: true }
      );
    }

    // 2. Start Secure Evidence Collection
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      
      const chunks: BlobPart[] = [];
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };
      
      mediaRecorder.onstop = async () => {
        const blob = new Blob(chunks, { type: "video/webm" });
        console.log("Evidence collected: ", blob.size, "bytes");
        const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
        const fileName = `SOS_Evidence_${timestamp}.webm`;
        
        let cloudDownloadUrl = "";

        // 1. Upload to Firebase Storage
        /*
        try {
          const user = auth.currentUser;
          const userId = user ? user.uid : "anonymous";
          const evidenceRef = storageRef(storage, `sos_evidence/${userId}/${fileName}`);
          
          console.log("Uploading evidence to Firebase Storage...");
          const snapshot = await uploadBytes(evidenceRef, blob);
          cloudDownloadUrl = await getDownloadURL(snapshot.ref);
          console.log("Evidence uploaded to Cloud:", cloudDownloadUrl);
        } catch (uploadErr) {
          console.error("Cloud evidence upload failed:", uploadErr);
        }
        */

        // 2. Save Location History to Firestore
        /*
        try {
          const user = auth.currentUser;
          const userId = user ? user.uid : "anonymous";
          const profileRaw = localStorage.getItem("user_profile");
          const profile = profileRaw ? JSON.parse(profileRaw) : {};

          await addDoc(collection(db, "sos_records"), {
            userId,
            userEmail: profile.email || "unknown",
            userPhone: profile.phone || "unknown",
            timestamp: new Date().toISOString(),
            evidenceUrl: cloudDownloadUrl,
            locationHistory: locationHistoryRef.current
          });
          console.log("SOS Incident saved to Firestore successfully.");
        } catch (dbErr) {
          console.error("Failed to save SOS record to Firestore:", dbErr);
        }
        */
        
        // 3. Save to phone's local storage as backup
        try {
          const { Filesystem, Directory } = await import("@capacitor/filesystem");
          
          // Convert blob to base64
          const reader = new FileReader();
          reader.onloadend = async () => {
            try {
              const base64Data = (reader.result as string).split(",")[1];
              
              await Filesystem.writeFile({
                path: `Rakshika/${fileName}`,
                data: base64Data,
                directory: Directory.Documents,
                recursive: true,
              });
              
              console.log(`Evidence saved to Documents/Rakshika/${fileName}`);
              alert(`Video saved locally as ${fileName} in Documents/Rakshika`);
            } catch (innerErr) {
              console.error("Failed to write file inside onloadend:", innerErr);
              alert("Failed to save video to local storage.");
            }
          };
          reader.readAsDataURL(blob);
        } catch (fsErr) {
          console.error("Could not setup file reader for local storage:", fsErr);
        }
        
        stream.getTracks().forEach(track => track.stop());
      };
      
      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.warn("Could not start media recording for evidence collection:", err);
    }
  };

  const cancelSos = () => {
    setActivated(false);
    setCountdown(3);
    setHoldProgress(0);
    setIsPressing(false);
    setShowToast(false);
    
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
    }
    
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(t => t.stop());
      setIsRecording(false);
    }
    
    navigate(-1);
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black text-white flex flex-col items-center justify-center overflow-hidden">
      <AnimatePresence>
        {showToast && <Toast message="Emergency Contacts Notified via SMS" />}
      </AnimatePresence>
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
                      <p className="text-xs text-white/60">{isRecording ? "Audio & Video streaming" : "Awaiting permissions..."}</p>
                    </div>
                    {isRecording ? (
                      <div className="w-2 h-2 rounded-full bg-red-400 animate-pulse"></div>
                    ) : (
                      <div className="w-2 h-2 rounded-full bg-gray-500"></div>
                    )}
                  </div>
                </div>

                <p className="mt-8 text-sm text-white/50 text-center">Do not close this app.<br/>Authorities are tracking your location.</p>

                <Button
                  size="lg"
                  variant="secondary"
                  className="w-full max-w-xs text-red-600 font-bold mt-6"
                  onClick={cancelSos}
                >
                  <X className="w-5 h-5 mr-2" /> Stop SOS
                </Button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
