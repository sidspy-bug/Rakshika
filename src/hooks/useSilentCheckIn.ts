/**
 * useSilentCheckIn Hook
 *
 * Implements a periodic victim safety check-in protocol (Review Item 12):
 * - Prompts the victim discretely during an active emergency:
 *   "Tap once if you are safe. Ignore if you cannot safely respond."
 * - 15-second response window.
 * - An unanswered prompt automatically increments the unanswered counter
 *   and elevates the incident's urgency level.
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { recordSilentCheckIn, type SilentCheckInRecord } from "../services/sosService";

export function useSilentCheckIn(isActive: boolean, incidentId: string | null) {
  const [showPrompt, setShowPrompt] = useState(false);
  const [promptCountdown, setPromptCountdown] = useState(15);
  const [unansweredCount, setUnansweredCount] = useState(0);
  const [history, setHistory] = useState<SilentCheckInRecord[]>([]);

  const promptTimerRef = useRef<NodeJS.Timeout | null>(null);
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const checkInCountRef = useRef(0);

  // Starts the next check-in cycle (25s initial delay, then 30s intervals)
  const scheduleNextPrompt = useCallback((delayMs: number) => {
    if (promptTimerRef.current) clearTimeout(promptTimerRef.current);

    promptTimerRef.current = setTimeout(() => {
      // Show prompt and start 15s countdown
      setShowPrompt(true);
      setPromptCountdown(15);
      checkInCountRef.current++;

      const record: SilentCheckInRecord = {
        promptedAt: new Date().toISOString(),
        responded: false,
        status: "PENDING",
      };
      setHistory((prev) => [record, ...prev]);

      // Count down 15s
      countdownIntervalRef.current = setInterval(() => {
        setPromptCountdown((prev) => {
          if (prev <= 1) {
            // Unanswered timeout!
            clearInterval(countdownIntervalRef.current!);
            setShowPrompt(false);
            setUnansweredCount((c) => c + 1);

            // Record unanswered check-in to local SOS state
            recordSilentCheckIn(false);
            console.log("[SilentCheckIn] ⚠️ Check-in timed out (Unanswered). Elevating urgency.");

            // Schedule next check-in in 30s
            scheduleNextPrompt(30000);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }, delayMs);
  }, []);

  useEffect(() => {
    if (isActive && incidentId) {
      // First prompt after 25s
      scheduleNextPrompt(25000);
    } else {
      setShowPrompt(false);
      if (promptTimerRef.current) clearTimeout(promptTimerRef.current);
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    }

    return () => {
      if (promptTimerRef.current) clearTimeout(promptTimerRef.current);
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    };
  }, [isActive, incidentId, scheduleNextPrompt]);

  // User explicitly tapped "I am safe"
  const respondSafe = useCallback(() => {
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    setShowPrompt(false);

    recordSilentCheckIn(true);
    console.log("[SilentCheckIn] ✅ User responded: SAFE.");

    // Schedule next prompt in 45s
    scheduleNextPrompt(45000);
  }, [scheduleNextPrompt]);

  return {
    showPrompt,
    promptCountdown,
    unansweredCount,
    history,
    respondSafe,
  };
}
