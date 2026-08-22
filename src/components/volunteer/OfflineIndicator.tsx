/**
 * OfflineIndicator
 *
 * A banner that appears when the volunteer's app loses internet connection.
 * Shows SMS fallback capability.
 */

import { WifiOff, MessageSquare } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useConnectivity } from "../../hooks/useConnectivity";

export function OfflineIndicator() {
  const { isOnline, canSendSMS } = useConnectivity();

  return (
    <AnimatePresence>
      {!isOnline && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          className="bg-red-500 overflow-hidden"
        >
          <div className="px-4 py-2 flex items-center justify-between">
            <div className="flex items-center gap-2 text-white">
              <WifiOff className="w-4 h-4" />
              <span className="text-xs font-bold uppercase tracking-wider">
                Offline Mode
              </span>
            </div>
            {canSendSMS && (
              <div className="flex items-center gap-1.5 bg-black/20 px-2 py-1 rounded-md text-white">
                <MessageSquare className="w-3.5 h-3.5" />
                <span className="text-[10px] font-bold">SMS Fallback Ready</span>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
