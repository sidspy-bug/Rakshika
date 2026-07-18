import { MapPin, Navigation, Search, Shield, AlertTriangle } from "lucide-react";
import { Button } from "../components/ui/Button";

export function MapScreen() {
  return (
    <div className="relative h-full w-full bg-gray-100 overflow-hidden flex flex-col">
      {/* Search Bar */}
      <div className="absolute top-4 left-4 right-4 z-10 flex gap-2">
        <div className="flex-1 bg-white rounded-full shadow-lg border border-gray-100 flex items-center px-4 py-3">
          <Search className="w-5 h-5 text-gray-400 mr-3" />
          <input 
            type="text" 
            placeholder="Search safe places, hospitals..." 
            className="flex-1 bg-transparent border-none outline-none text-sm font-medium"
          />
        </div>
        <button className="w-12 h-12 bg-white rounded-full shadow-lg flex items-center justify-center border border-gray-100 text-gray-700">
          <Navigation className="w-5 h-5" />
        </button>
      </div>

      {/* Map Placeholder Area (Simulating Google Maps) */}
      <div className="flex-1 w-full bg-[#E8E6E1] relative">
        {/* Decorative Map Pattern to look like a map */}
        <div className="absolute inset-0 opacity-20" style={{
          backgroundImage: 'radial-gradient(#9CA3AF 1px, transparent 1px)',
          backgroundSize: '20px 20px'
        }} />
        
        {/* User Location */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center">
          <div className="relative flex items-center justify-center">
            <div className="absolute w-16 h-16 bg-blue-500/20 rounded-full animate-ping" />
            <div className="w-6 h-6 bg-white rounded-full shadow-md flex items-center justify-center relative z-10">
              <div className="w-4 h-4 bg-blue-500 rounded-full border-2 border-white" />
            </div>
          </div>
        </div>

        {/* Safe Zone Marker */}
        <div className="absolute top-1/3 left-1/4 flex flex-col items-center group cursor-pointer">
          <div className="bg-white px-2 py-1 rounded-md shadow-md mb-1 text-[10px] font-bold text-green-700 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
            Women's Help Desk
          </div>
          <div className="w-8 h-8 bg-green-500 rounded-full border-2 border-white shadow-lg flex items-center justify-center">
            <Shield className="w-4 h-4 text-white" />
          </div>
        </div>

        {/* Danger Zone Marker */}
        <div className="absolute bottom-1/3 right-1/4 flex flex-col items-center group cursor-pointer">
          <div className="bg-white px-2 py-1 rounded-md shadow-md mb-1 text-[10px] font-bold text-red-700 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
            Reported Incident
          </div>
          <div className="w-8 h-8 bg-orange-500 rounded-full border-2 border-white shadow-lg flex items-center justify-center">
            <AlertTriangle className="w-4 h-4 text-white" />
          </div>
        </div>
      </div>

      {/* Bottom Sheet UI Overlay */}
      <div className="absolute bottom-4 left-4 right-4 z-10">
        <div className="bg-white rounded-3xl shadow-xl p-5 border border-gray-100">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h3 className="font-bold text-lg">Safe Walk Mode</h3>
              <p className="text-xs text-gray-500 font-medium mt-0.5">Share live trip with 3 contacts</p>
            </div>
            <div className="w-10 h-10 bg-green-50 text-green-600 rounded-full flex items-center justify-center font-bold text-sm">
              98%
            </div>
          </div>

          <div className="flex gap-3">
            <Button className="flex-1 font-bold">Start Trip</Button>
            <Button variant="secondary" className="flex-1 font-bold">Safe Route</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
