import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Linking } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafetyCard } from '../components/SafetyCard';
import { SOSButton } from '../components/SOSButton';
import { useSOS } from '../contexts/SOSContext';
import { useShakeDetection } from '../hooks/useShakeDetection';

export const HomeScreen = () => {
  const { activeEmergency, triggerSOS, cancelSOS } = useSOS();
  const [contacts, setContacts] = useState<any[]>([]);

  // Load contacts whenever screen mounts or SOS state changes
  useEffect(() => {
    loadLocalContacts();
  }, [activeEmergency]);

  const loadLocalContacts = async () => {
    try {
      const stored = await AsyncStorage.getItem('emergency_contacts');
      if (stored) {
        setContacts(JSON.parse(stored));
      }
    } catch (e) {
      console.warn("Failed to load local contacts", e);
    }
  };

  const handleCallContact = (phone: string) => {
    const cleanPhone = phone.replace(/[^0-9+]/g, ''); // sanitize phone number
    Linking.openURL(`tel:${cleanPhone}`).catch((err) => {
      console.warn("Could not initiate call", err);
      alert(`Demo Dialing: ${phone}`);
    });
  };

  // Activate shake triggers in background
  useShakeDetection({
    onShake: () => {
      if (!activeEmergency) {
        triggerSOS('shake');
      }
    },
    sensitivity: 2.5,
    enabled: !activeEmergency,
  });

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Rakshika Dashboard</Text>
      
      <SafetyCard status={activeEmergency ? 'active_sos' : 'safe'} />

      {!activeEmergency ? (
        <View style={styles.buttonContainer}>
          <SOSButton
            onTrigger={() => triggerSOS('tap')}
            isLoading={false}
          />
        </View>
      ) : (
        <View style={styles.activeSosActions}>
          <Text style={styles.actionTitle}>Quick Actions</Text>
          
          {contacts.length > 0 ? (
            <View style={styles.contactsCallSection}>
              <Text style={styles.subActionTitle}>Call Emergency Contacts:</Text>
              {contacts.map((contact) => (
                <TouchableOpacity
                  key={contact.id}
                  style={styles.callCard}
                  onPress={() => handleCallContact(contact.phone)}
                >
                  <View style={styles.contactDetails}>
                    <Text style={styles.contactName}>{contact.name}</Text>
                    <Text style={styles.contactRelation}>{contact.relationshipType}</Text>
                  </View>
                  <View style={styles.callBadge}>
                    <Text style={styles.callText}>CALL</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <Text style={styles.noContactsText}>
              No emergency contacts added yet. Update your Profile to add contacts you can dial.
            </Text>
          )}

          <TouchableOpacity 
            style={styles.cancelBtn} 
            onPress={() => cancelSOS('Resolved by user')}
          >
            <Text style={styles.cancelBtnText}>CANCEL SOS EMERGENCY</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.infoCard}>
        <Text style={styles.infoTitle}>Tips for Emergencies</Text>
        <Text style={styles.infoText}>• Shake the phone vigorously to trigger silent SOS.</Text>
        <Text style={styles.infoText}>• Audio recordings and live location updates sync instantly.</Text>
        <Text style={styles.infoText}>• Nearby responders will be notified to guide/help.</Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: '#ffffff',
    padding: 24,
    paddingTop: 60,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 16,
  },
  buttonContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 40,
  },
  activeSosActions: {
    marginVertical: 20,
    backgroundColor: '#fef2f2',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  actionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#991b1b',
    marginBottom: 12,
  },
  contactsCallSection: {
    marginBottom: 16,
  },
  subActionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#7f1d1d',
    marginBottom: 8,
  },
  callCard: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#fee2e2',
    marginBottom: 8,
    elevation: 1,
  },
  contactDetails: {
    flex: 1,
  },
  contactName: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#111827',
  },
  contactRelation: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  callBadge: {
    backgroundColor: '#22c55e',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  callText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 12,
  },
  noContactsText: {
    fontSize: 14,
    color: '#991b1b',
    textAlign: 'center',
    marginVertical: 12,
  },
  cancelBtn: {
    height: 48,
    backgroundColor: '#dc2626',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  cancelBtnText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  infoCard: {
    backgroundColor: '#f9fafb',
    padding: 16,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#f3f4f6',
    marginTop: 20,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#374151',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 13,
    color: '#6b7280',
    lineHeight: 18,
    marginVertical: 2,
  },
});
