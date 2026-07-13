import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, Text, TouchableOpacity, View, Platform } from 'react-native';

interface SOSButtonProps {
  onTrigger: () => void;
  isLoading?: boolean;
}

export const SOSButton: React.FC<SOSButtonProps> = ({ onTrigger, isLoading = false }) => {
  const [countdown, setCountdown] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isActive && countdown > 0) {
      timerRef.current = setTimeout(() => {
        setCountdown((prev) => prev - 1);
      }, 1000);
    } else if (isActive && countdown === 0) {
      onTrigger();
      setIsActive(false);
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [isActive, countdown]);

  const handleTap = () => {
    if (isActive) {
      // Cancel
      setIsActive(false);
      setCountdown(0);
    } else {
      // Start 3-second countdown
      setIsActive(true);
      setCountdown(3);
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        onPress={handleTap}
        activeOpacity={0.7}
        style={[styles.button, isActive ? styles.buttonPressing : null]}
      >
        <View style={[styles.innerCircle, isActive ? styles.innerCircleActive : null]}>
          <Text style={styles.buttonText}>
            {isActive ? `${countdown}` : isLoading ? '...' : 'SOS'}
          </Text>
          {isActive && <Text style={styles.countdownLabel}>TRIGGERING</Text>}
        </View>
      </TouchableOpacity>
      <Text style={styles.helpText}>
        {isActive
          ? 'Tap again to CANCEL'
          : 'Tap to start 3-second SOS countdown'}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  button: {
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      web: {
        cursor: 'pointer',
        boxShadow: '0 10px 30px rgba(239, 68, 68, 0.3)',
      },
      default: {
        elevation: 8,
        shadowColor: '#ef4444',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.4,
        shadowRadius: 15,
      },
    }),
  },
  buttonPressing: {
    backgroundColor: 'rgba(239, 68, 68, 0.4)',
  },
  innerCircle: {
    width: 170,
    height: 170,
    borderRadius: 85,
    backgroundColor: '#ef4444',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: '#ffffff',
  },
  innerCircleActive: {
    backgroundColor: '#dc2626',
    borderColor: '#fca5a5',
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 42,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  countdownLabel: {
    color: '#fecaca',
    fontSize: 12,
    fontWeight: 'bold',
    marginTop: 4,
    letterSpacing: 2,
  },
  helpText: {
    marginTop: 20,
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
  },
});
