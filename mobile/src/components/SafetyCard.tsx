import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

interface SafetyCardProps {
  status: 'safe' | 'active_sos';
}

export const SafetyCard: React.FC<SafetyCardProps> = ({ status }) => {
  const isSafe = status === 'safe';

  return (
    <View style={[styles.card, isSafe ? styles.safeCard : styles.sosCard]}>
      <View style={[styles.indicator, isSafe ? styles.safeIndicator : styles.sosIndicator]} />
      <View style={styles.textContainer}>
        <Text style={styles.title}>{isSafe ? "You are safe" : "SOS Mode Active"}</Text>
        <Text style={styles.subtitle}>
          {isSafe 
            ? "Your community and contacts are on standby." 
            : "Live tracking, audio recording, and alerts active."
          }
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginVertical: 10,
    borderWidth: 1,
    elevation: 2,
  },
  safeCard: {
    backgroundColor: '#f0fdf4',
    borderColor: '#bbf7d0',
  },
  sosCard: {
    backgroundColor: '#fef2f2',
    borderColor: '#fecaca',
  },
  indicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 16,
  },
  safeIndicator: {
    backgroundColor: '#22c55e',
  },
  sosIndicator: {
    backgroundColor: '#ef4444',
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  subtitle: {
    fontSize: 13,
    color: '#4b5563',
    marginTop: 2,
  },
});
