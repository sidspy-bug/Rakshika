/**
 * smsFallbackService
 *
 * Provides a fallback mechanism to send SMS when internet connectivity
 * is unavailable for critical volunteer actions.
 */

export const smsFallbackService = {
  /**
   * Formats a fallback SMS message for emergency responses
   */
  formatResponseSMS(sosId: string, action: string, volunteerId: string, lat?: number, lng?: number): string {
    const coords = lat && lng ? ` Loc: ${lat.toFixed(4)},${lng.toFixed(4)}` : "";
    return `RAKSHIKA SOS | Action: ${action} | SOS: ${sosId} | Vol: ${volunteerId}${coords}`;
  },

  /**
   * Mocks sending an SMS. In a real Capacitor app, this would use the
   * SMS plugin or intent.
   */
  async sendFallbackSMS(message: string, recipient: string = "EMERGENCY_GATEWAY_NUM"): Promise<boolean> {
    console.log(`[SMS Fallback] Attempting to send SMS to ${recipient}`);
    console.log(`[SMS Fallback] Message: ${message}`);
    
    // Simulate delay
    await new Promise((resolve) => setTimeout(resolve, 1000));
    
    // For MVP, we pretend it always succeeds
    console.log("[SMS Fallback] SMS sent successfully");
    return true;
  }
};
