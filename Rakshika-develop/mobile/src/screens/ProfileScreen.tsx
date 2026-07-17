import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, TextInput, TouchableOpacity, Switch, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../hooks/useAuth';
import { ContactCard } from '../components/ContactCard';
import api from '../services/api';

export const ProfileScreen = () => {
  const { user, logout } = useAuth();
  const [contacts, setContacts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Form fields for adding emergency contact
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [relationship, setRelationship] = useState('');

  // Preference fields
  const [notifications, setNotifications] = useState(true);
  const [smsFallback, setSmsFallback] = useState(true);

  useEffect(() => {
    loadProfileData();
  }, []);

  const loadProfileData = async () => {
    setLoading(true);
    try {
      const contactsRes = await api.get('/users/me/contacts');
      setContacts(contactsRes.data);
      await AsyncStorage.setItem('emergency_contacts', JSON.stringify(contactsRes.data));
    } catch (e) {
      console.warn("Failed to load contacts from backend, reading locally", e);
      const localContacts = await AsyncStorage.getItem('emergency_contacts');
      if (localContacts) {
        setContacts(JSON.parse(localContacts));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAddContact = async () => {
    if (!name || !phone) return;
    const newContact = {
      id: `local-contact-${Date.now()}`,
      name,
      phone,
      relationshipType: relationship || 'Family',
      notifyOnSos: true,
    };
    try {
      const response = await api.post('/users/me/contacts', {
        name,
        phone,
        relationshipType: relationship || 'Family',
        notifyOnSos: true,
      });
      setContacts((prev) => [...prev, response.data]);
      const updated = [...contacts, response.data];
      await AsyncStorage.setItem('emergency_contacts', JSON.stringify(updated));
      setName('');
      setPhone('');
      setRelationship('');
    } catch (e) {
      console.warn("Failed to add contact to backend, saving locally", e);
      const updated = [...contacts, newContact];
      setContacts(updated);
      await AsyncStorage.setItem('emergency_contacts', JSON.stringify(updated));
      setName('');
      setPhone('');
      setRelationship('');
    }
  };

  const handleDeleteContact = async (contactId: string) => {
    try {
      await api.delete(`/users/me/contacts/${contactId}`);
      const updated = contacts.filter((c) => c.id !== contactId);
      setContacts(updated);
      await AsyncStorage.setItem('emergency_contacts', JSON.stringify(updated));
    } catch (e) {
      console.warn("Failed to delete contact from backend, removing locally", e);
      const updated = contacts.filter((c) => c.id !== contactId);
      setContacts(updated);
      await AsyncStorage.setItem('emergency_contacts', JSON.stringify(updated));
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Safety Profile</Text>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Medical & Account Info</Text>
        <View style={styles.card}>
          <Text style={styles.infoText}>Name: {user?.fullName}</Text>
          <Text style={styles.infoText}>Phone: {user?.phone}</Text>
          <Text style={styles.infoText}>Email: {user?.email}</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Emergency Contacts</Text>
        
        {loading ? <ActivityIndicator size="small" color="#ef4444" /> : null}
        
        {contacts.map((c) => (
          <ContactCard
            key={c.id}
            name={c.name}
            phone={c.phone}
            relationship={c.relationshipType}
            onDelete={() => handleDeleteContact(c.id)}
          />
        ))}

        <View style={styles.addContactForm}>
          <Text style={styles.formTitle}>Add Contact</Text>
          <TextInput
            style={styles.input}
            placeholder="Name"
            value={name}
            onChangeText={setName}
          />
          <TextInput
            style={styles.input}
            placeholder="Phone"
            keyboardType="phone-pad"
            value={phone}
            onChangeText={setPhone}
          />
          <TextInput
            style={styles.input}
            placeholder="Relationship (e.g. Mother, Spouse)"
            value={relationship}
            onChangeText={setRelationship}
          />
          <TouchableOpacity style={styles.addBtn} onPress={handleAddContact}>
            <Text style={styles.addBtnText}>Save Contact</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Trigger & Safety Settings</Text>
        <View style={styles.card}>
          <View style={styles.row}>
            <Text style={styles.settingLabel}>Notifications Enabled</Text>
            <Switch value={notifications} onValueChange={setNotifications} />
          </View>
          <View style={styles.row}>
            <Text style={styles.settingLabel}>SMS Fallback Alerts</Text>
            <Switch value={smsFallback} onValueChange={setSmsFallback} />
          </View>
        </View>
      </View>

      <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
        <Text style={styles.logoutBtnText}>Log Out</Text>
      </TouchableOpacity>
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
    marginBottom: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#374151',
    marginBottom: 10,
  },
  card: {
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    padding: 16,
  },
  infoText: {
    fontSize: 14,
    color: '#4b5563',
    marginVertical: 4,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 8,
  },
  settingLabel: {
    fontSize: 14,
    color: '#374151',
  },
  addContactForm: {
    marginTop: 16,
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    padding: 16,
  },
  formTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#374151',
    marginBottom: 12,
  },
  input: {
    height: 44,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 6,
    paddingHorizontal: 12,
    backgroundColor: '#ffffff',
    marginBottom: 12,
    fontSize: 14,
  },
  addBtn: {
    height: 44,
    backgroundColor: '#ef4444',
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  logoutBtn: {
    height: 52,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 20,
  },
  logoutBtnText: {
    color: '#ef4444',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
