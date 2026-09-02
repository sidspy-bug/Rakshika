import axios from "axios";
import type { Coords, HelpCenter, Incident } from "../types/gis";

export type MessageAction = {
  type: "sos" | "call_police" | "call_women_helpline" | "fake_call" | "route_police";
  label: string;
  phone?: string;
  dest?: { lat: number; lng: number; name: string };
};

export type AiMessage = {
  id: string;
  role: "user" | "ai";
  content: string;
  actions?: MessageAction[];
};

// Priority list of models on OpenRouter (Cascading Fallback)
const MODEL_FALLBACK_CHAIN = [
  "nvidia/nemotron-3.5-lightning:free",
  "liquid/lfm-2.5-2.6b:free",
  "meta-llama/llama-3.1-8b-instruct",
  "meta-llama/llama-3.3-70b-instruct",
  "google/gemma-2-9b-it:free",
  "mistralai/mistral-7b-instruct:free",
  "openai/gpt-3.5-turbo",
];

/**
 * System Prompt grounded in real-world Women's Safety & Pinch-Situation Protocol
 */
export function buildSafetySystemPrompt(
  currentAddress: string,
  userLocation: Coords | null,
  helpCenters: HelpCenter[],
  incidents: Incident[]
): string {
  const nearestSafeSpots = helpCenters
    .slice(0, 5)
    .map(
      (c) =>
        `- **${c.name}** (${c.type.replace("_", " ")}) ~${Math.round(c.distance || 0)}m away ${
          c.phone ? `[Phone: ${c.phone}]` : ""
        }`
    )
    .join("\n");

  const localDangerZones = incidents
    .slice(0, 3)
    .map((i) => `- **${i.title}**: ${i.description}`)
    .join("\n");

  return `You are Rakshika AI, a high-priority emergency protective guardian for women. Your primary goal is to guide women safely out of high-stress or dangerous ("pinch") situations with clear, immediate, tactical, and location-anchored instructions.

MANDATORY WOMEN SAFETY PINCH-SITUATION PROTOCOL:
1. LOCATION ANCHOR: Always start by acknowledging her live location (${currentAddress}). She must know you have her exact coordinates locked in.
2. CONCISE & ACTIONABLE: In high-stress or pinch situations, victims need clear 1-2-3 action steps with **bold key phrases**. Never write long vague paragraphs.
3. DIRECT POI GUIDANCE: Reference her nearest verified police station, hospital, or volunteer from the live list below with exact distance.
4. THREAT ACTION (If she mentions being followed, dark street, harassment, cab threat, or danger):
   - Step 1: Immediate physical movement (e.g. "Walk directly into nearest lit shop/cafe", "Change direction to verify intent").
   - Step 2: Communication/Deterrence (e.g. "Trigger SOS button immediately", "Call 112 or 181", "Start Fake Call").
   - Step 3: Head to nearest police/safe haven listed below.
5. NATIONAL HELPLINES TO REMEMBER: National Emergency PCR (112), Women Helpline (181), NCW 24x7 (14490), Medical (102 / 108).

LIVE GEOLOCATION & SURROUNDINGS DATA:
- Address: ${currentAddress}
- Coordinates: ${userLocation ? `${userLocation.lat.toFixed(4)}, ${userLocation.lng.toFixed(4)}` : "GPS Locked"}
- Nearest Verified Safe Havens & Police Posts:
${nearestSafeSpots || "- Search active: Checking live OpenStreetMap database near current location..."}
- Local Safety Advisories & Risk Zones:
${localDangerZones || "- No unlit street risk alerts reported nearby."}`;
}

/**
 * Intelligent Local Emergency AI Safety Engine (Offline & API Fallback)
 * Formats high-priority safety responses tailored for women in pinch situations.
 */
export function generateLocalEmergencyResponse(
  userInput: string,
  currentAddress: string,
  userLocation: Coords | null,
  helpCenters: HelpCenter[],
  incidents: Incident[]
): { content: string; actions: MessageAction[] } {
  const query = userInput.toLowerCase();
  const nearestPolice = helpCenters.find(
    (c) => c.type === "police" || c.type === "women_police"
  );
  const nearestHospital = helpCenters.find((c) => c.type === "hospital");

  const policeDist = nearestPolice?.distance
    ? `~${Math.round(nearestPolice.distance)}m away`
    : "nearby";
  const policeName = nearestPolice?.name || "Nearest Police Station / Mahila Thana";

  const defaultActions: MessageAction[] = [
    { type: "sos", label: "🚨 Trigger SOS" },
    { type: "call_police", label: "📞 Call 112 Police", phone: "112" },
    { type: "call_women_helpline", label: "📞 Women Helpline 181", phone: "181" },
  ];

  if (nearestPolice) {
    defaultActions.unshift({
      type: "route_police",
      label: `🗺️ Auto-Route to ${nearestPolice.name.slice(0, 18)}...`,
      dest: { lat: nearestPolice.lat, lng: nearestPolice.lng, name: nearestPolice.name },
    });
  }

  // 1. Being followed / Stalking / Dark Street / Stranded Threat
  if (
    query.includes("follow") ||
    query.includes("stalk") ||
    query.includes("scared") ||
    query.includes("dark") ||
    query.includes("alone") ||
    query.includes("behind") ||
    query.includes("threat") ||
    query.includes("chase")
  ) {
    return {
      content: `⚠️ **PINCH SITUATION ALERT — STAY CALM & ACT FAST**

📍 **Location Lock:** You are currently at **${currentAddress}**.

🛡️ **IMMEDIATE SAFETY DIRECTIVES:**
1. **DO NOT Walk Home Directly:** Cross the street or turn into a brightly lit commercial area (shop, 24/7 petrol pump, hotel lobby, or metro station).
2. **Create Instant Deterrence:** Make a loud phone call or tap the **Fake Call** button below. Speak loudly: *"I am at ${currentAddress}, meet me outside in 2 minutes."*
3. **Head to Safe Haven:** Walk toward **${policeName}** (${policeDist}).

🚨 *If you are being actively confronted, press the red SOS button immediately or dial 112.*`,
      actions: [
        { type: "sos", label: "🚨 Press SOS Now" },
        { type: "fake_call", label: "📱 Trigger Fake Call" },
        { type: "call_police", label: "📞 Call 112 PCR", phone: "112" },
        { type: "call_women_helpline", label: "📞 Call 181 Women Helpline", phone: "181" },
      ],
    };
  }

  // 2. Suspicious Cab / Auto / Taxi
  if (
    query.includes("cab") ||
    query.includes("auto") ||
    query.includes("taxi") ||
    query.includes("uber") ||
    query.includes("ola") ||
    query.includes("driver")
  ) {
    return {
      content: `🚗 **SUSPICIOUS VEHICLE / RIDE SAFETY PROTOCOL**

📍 **Location Track:** Currently passing **${currentAddress}**.

🛡️ **ACTIONS TO TAKE RIGHT NOW:**
1. **Share Ride Details Loudly:** Speak on the phone (or fake call) reading out loud: *"I am in cab near ${currentAddress}, tracking live location."*
2. **Keep Doors Unlocked & Hand Ready:** Ensure child-lock is off and keep your hand near the door latch.
3. **Request Stop at Public Spot:** Tell the driver to pull over at a well-lit petrol pump or metro station if he strays from the GPS route.

📞 *If driver refuses to stop or locks doors, press SOS immediately or dial 112.*`,
      actions: [
        { type: "sos", label: "🚨 Trigger SOS" },
        { type: "call_police", label: "📞 Call 112 Police", phone: "112" },
        { type: "fake_call", label: "📱 Fake Incoming Call" },
      ],
    };
  }

  // 3. Medical Emergency / First Aid
  if (
    query.includes("medical") ||
    query.includes("hospital") ||
    query.includes("hurt") ||
    query.includes("doctor") ||
    query.includes("ambulance") ||
    query.includes("pain") ||
    query.includes("injury")
  ) {
    const hospName = nearestHospital?.name || "Nearest Emergency Hospital";
    const hospDist = nearestHospital?.distance
      ? `~${Math.round(nearestHospital.distance)}m away`
      : "nearby";

    return {
      content: `🏥 **MEDICAL EMERGENCY DIRECTIVE**

📍 **Location:** **${currentAddress}**.

🩺 **IMMEDIATE STEPS:**
1. **Nearest Hospital:** Head to **${hospName}** (${hospDist}).
2. **Ambulance Dispatch:** Call **102** (Ambulance) or **108** (Emergency Services) immediately.
3. **Stay in Public View:** Sit in a safe, visible area while help arrives.`,
      actions: [
        { type: "call_police", label: "🚑 Call 102 Ambulance", phone: "102" },
        { type: "call_police", label: "📞 Call 112 Emergency", phone: "112" },
        { type: "sos", label: "🚨 Alert Emergency Contacts" },
      ],
    };
  }

  // 4. Safe Route / Map Guidance
  if (
    query.includes("route") ||
    query.includes("map") ||
    query.includes("path") ||
    query.includes("walk") ||
    query.includes("home")
  ) {
    return {
      content: `📍 **SAFE ROUTE NAVIGATION — ${currentAddress}**

🛡️ **RECOMMENDED WALKING STRATEGY:**
1. Use **Rakshika Safe Walk Grid** on the Map Screen for lit-street navigation.
2. **Nearest Mahila / Police Post:** **${policeName}** (${policeDist}).
3. Avoid dark shortcuts or unlit alleyways. Stick to primary roads with CCTV coverage.`,
      actions: defaultActions,
    };
  }

  // 5. Default General Safety Advisory
  return {
    content: `🛡️ **RAKSHIKA SAFETY GUARDIAN ACTIVE**

📍 **Current Location:** **${currentAddress}**.
👮 **Nearest Help Center:** **${policeName}** (${policeDist}).

I am actively monitoring your safety grid. If you feel uncomfortable or sense danger:
- **Press SOS** to notify your trusted contacts and local responders instantly.
- **Dial 112** for emergency police dispatch or **181** for National Women's Helpline (24/7).
- Head toward lit public spaces (petrol pumps, 24/7 stores, metro stations).`,
    actions: defaultActions,
  };
}

/**
 * Sends chat prompt to OpenRouter with multi-model fallback chain.
 * Guaranteed to NEVER crash or display "chatbot is offline".
 */
export async function queryAiGuardian(
  userTextInput: string,
  chatHistory: { role: string; content: string }[],
  currentAddress: string,
  userLocation: Coords | null,
  helpCenters: HelpCenter[],
  incidents: Incident[]
): Promise<{ content: string; actions: MessageAction[] }> {
  const apiKey = import.meta.env.VITE_OPENROUTER_API_KEY;
  const systemPrompt = buildSafetySystemPrompt(
    currentAddress,
    userLocation,
    helpCenters,
    incidents
  );

  // If no API key configured or mock key, use local intelligence engine
  if (!apiKey || apiKey === "mock-key") {
    return generateLocalEmergencyResponse(
      userTextInput,
      currentAddress,
      userLocation,
      helpCenters,
      incidents
    );
  }

  const messages = [
    { role: "system", content: systemPrompt },
    ...chatHistory.slice(-6), // keep context window tight & fast
    { role: "user", content: userTextInput },
  ];

  // Try each model in the fallback chain sequentially
  for (const model of MODEL_FALLBACK_CHAIN) {
    try {
      const response = await axios.post(
        "https://openrouter.ai/api/v1/chat/completions",
        {
          model,
          messages,
          temperature: 0.3, // crisp & deterministic safety advice
          max_tokens: 450,
        },
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
            "HTTP-Referer": window.location.origin || "https://rakshika.app",
            "X-Title": "Rakshika Women Safety",
          },
          timeout: 4500, // 4.5s max per model
        }
      );

      const aiReply = response.data?.choices?.[0]?.message?.content;
      if (aiReply && aiReply.trim().length > 10) {
        // Successfully received answer from model
        const fallbackObj = generateLocalEmergencyResponse(
          userTextInput,
          currentAddress,
          userLocation,
          helpCenters,
          incidents
        );
        return {
          content: aiReply,
          actions: fallbackObj.actions,
        };
      }
    } catch (err) {
      console.warn(`OpenRouter model ${model} failed, trying next fallback...`, err);
    }
  }

  // If all OpenRouter model attempts failed, use the Local Emergency Engine
  return generateLocalEmergencyResponse(
    userTextInput,
    currentAddress,
    userLocation,
    helpCenters,
    incidents
  );
}
