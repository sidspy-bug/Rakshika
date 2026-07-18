import { ShieldAlert, MapPin, PhoneCall, Mic, Siren } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "../components/ui/Button";
import { GlassCard } from "../components/ui/GlassCard";

export function Home() {
  const navigate = useNavigate();

  return (
    <div className="min-h-full p-6 flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <header className="flex justify-between items-center mt-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Stay Safe, <span className="text-[#D32F2F]">Rakshika</span></h1>
          <p className="text-sm text-gray-500 font-medium flex items-center gap-1 mt-1">
            <MapPin className="w-4 h-4 text-green-500" /> Connecting to location...
          </p>
        </div>
        <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center border-2 border-green-500 shadow-sm">
          <span className="text-green-700 font-bold text-sm">98%</span>
        </div>
      </header>

      {/* Main SOS Action */}
      <section className="flex flex-col items-center justify-center py-8">
        <div className="relative group cursor-pointer" onClick={() => navigate('/sos')}>
          <div className="absolute inset-0 bg-red-500 rounded-full blur-xl opacity-20 group-hover:opacity-40 transition-opacity duration-500 animate-pulse"></div>
          <button className="relative w-48 h-48 bg-gradient-to-b from-[#ff4b4b] to-[#b71c1c] rounded-full shadow-[0_10px_40px_rgba(211,47,47,0.4)] flex flex-col items-center justify-center border-4 border-white/20 transition-transform active:scale-95 duration-200">
            <ShieldAlert className="w-16 h-16 text-white mb-2" strokeWidth={1.5} />
            <span className="text-white text-3xl font-bold tracking-widest">SOS</span>
          </button>
        </div>
        <p className="mt-6 text-sm text-gray-500 font-medium tracking-wide uppercase">Press for Emergency Help</p>
      </section>

      {/* Quick Actions Grid */}
      <section className="grid grid-cols-2 gap-4">
        <GlassCard className="flex flex-col items-center justify-center p-4 gap-3 cursor-pointer hover:bg-gray-50 transition-colors border-2 border-transparent hover:border-gray-200" onClick={() => navigate('/fake-call')}>
          <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
            <PhoneCall className="w-6 h-6" />
          </div>
          <span className="font-semibold text-sm text-gray-800">Fake Call</span>
        </GlassCard>

        <GlassCard className="flex flex-col items-center justify-center p-4 gap-3 cursor-pointer hover:bg-gray-50 transition-colors border-2 border-transparent hover:border-gray-200">
          <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center text-orange-600">
            <Siren className="w-6 h-6" />
          </div>
          <span className="font-semibold text-sm text-gray-800">Siren</span>
        </GlassCard>
        
        <GlassCard className="flex flex-col items-center justify-center p-4 gap-3 cursor-pointer hover:bg-gray-50 transition-colors border-2 border-transparent hover:border-gray-200">
          <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center text-purple-600">
            <Mic className="w-6 h-6" />
          </div>
          <span className="font-semibold text-sm text-gray-800">Record</span>
        </GlassCard>

        <GlassCard className="flex flex-col items-center justify-center p-4 gap-3 cursor-pointer hover:bg-gray-50 transition-colors border-2 border-transparent hover:border-gray-200" onClick={() => navigate('/ai')}>
          <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <span className="font-semibold text-sm text-gray-800">AI Advice</span>
        </GlassCard>
      </section>
      
      {/* Current Status */}
      <section className="mt-4">
        <div className="bg-gradient-to-r from-gray-900 to-gray-800 rounded-2xl p-5 text-white flex items-center justify-between shadow-lg">
          <div>
            <h3 className="font-bold text-lg">Guardian Mode</h3>
            <p className="text-gray-300 text-sm mt-1">Live location hidden.</p>
          </div>
          <Button variant="secondary" size="sm" className="bg-white/10 border-white/20 text-white hover:bg-white/20">
            Enable
          </Button>
        </div>
      </section>
    </div>
  );
}
