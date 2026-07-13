import { useState, useEffect, useRef } from 'react';
import { Accelerometer } from 'expo-sensors';
import { Platform } from 'react-native';

interface UseShakeDetectionProps {
  onShake: () => void;
  sensitivity?: number; // threshold G-force (typically 1.5 - 3.0)
  enabled?: boolean;
}

export const useShakeDetection = ({ onShake, sensitivity = 2.2, enabled = true }: UseShakeDetectionProps) => {
  const [data, setData] = useState({ x: 0, y: 0, z: 0 });
  const subscriptionRef = useRef<any>(null);

  useEffect(() => {
    let active = true;

    const startSensor = async () => {
      try {
        const isAvailable = await Accelerometer.isAvailableAsync();
        if (!isAvailable || !active) return;

        Accelerometer.setUpdateInterval(100);
        
        subscriptionRef.current = Accelerometer.addListener((accelerometerData) => {
          setData(accelerometerData);
          
          const { x, y, z } = accelerometerData;
          // Calculate total G force (excluding gravity approximately)
          const acceleration = Math.sqrt(x * x + y * y + z * z);
          
          if (acceleration > sensitivity) {
            onShake();
          }
        });
      } catch (error) {
        console.warn("Accelerometer sensor not supported on this platform/device", error);
      }
    };

    if (enabled && Platform.OS !== 'web') {
      startSensor();
    }

    return () => {
      active = false;
      if (subscriptionRef.current) {
        subscriptionRef.current.remove();
        subscriptionRef.current = null;
      }
    };
  }, [enabled, sensitivity, onShake]);

  return data;
};
