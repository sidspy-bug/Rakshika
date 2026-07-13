import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';

interface ContactCardProps {
  name: string;
  phone: string;
  relationship?: string;
  onDelete?: () => void;
}

export const ContactCard: React.FC<ContactCardProps> = ({ name, phone, relationship, onDelete }) => {
  return (
    <View style={styles.card}>
      <View style={styles.info}>
        <Text style={styles.name}>{name}</Text>
        <Text style={styles.relationship}>{relationship || 'Family'}</Text>
        <Text style={styles.phone}>{phone}</Text>
      </View>
      {onDelete && (
        <TouchableOpacity style={styles.deleteBtn} onPress={onDelete}>
          <Text style={styles.deleteText}>Delete</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 10,
    marginVertical: 6,
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  info: {
    flex: 1,
  },
  name: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  relationship: {
    fontSize: 12,
    color: '#ef4444',
    fontWeight: '600',
    marginVertical: 2,
  },
  phone: {
    fontSize: 14,
    color: '#4b5563',
  },
  deleteBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: '#fee2e2',
    borderRadius: 6,
  },
  deleteText: {
    color: '#ef4444',
    fontWeight: 'bold',
    fontSize: 12,
  },
});
