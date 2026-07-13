import React, { useState } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, FlatList } from 'react-native';
import { ChatBubble } from '../components/ChatBubble';
import api from '../services/api';

interface Message {
  id: string;
  sender: 'user' | 'ai';
  text: string;
}

export const AIChatScreen = () => {
  const [messages, setMessages] = useState<Message[]>([
    { id: '1', sender: 'ai', text: 'Hello! I am your AI Safety Assistant. How can I help you stay safe today?' },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage: Message = {
      id: String(Date.now()),
      sender: 'user',
      text: input,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const response = await api.post('/ai/chat', { message: userMessage.text });
      const aiMessage: Message = {
        id: String(Date.now() + 1),
        sender: 'ai',
        text: response.data.reply || "I am processing your safety query. Please stay in a well-lit area.",
      };
      setMessages((prev) => [...prev, aiMessage]);
    } catch (e) {
      const errorMsg: Message = {
        id: String(Date.now() + 1),
        sender: 'ai',
        text: "Sorry, I am having trouble connecting to the safety servers. Please call emergency contacts directly if you feel unsafe.",
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>AI Safety Assistant</Text>

      <FlatList
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <ChatBubble sender={item.sender} text={item.text} />}
        contentContainerStyle={styles.messageList}
      />

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.textInput}
          placeholder="Ask about safe routes, advice, etc..."
          value={input}
          onChangeText={setInput}
        />
        <TouchableOpacity style={styles.sendBtn} onPress={handleSend} disabled={loading}>
          <Text style={styles.sendBtnText}>Send</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
  messageList: {
    flexGrow: 1,
    justifyContent: 'flex-end',
    paddingBottom: 16,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 30,
    paddingHorizontal: 16,
    height: 52,
    backgroundColor: '#f9fafb',
  },
  textInput: {
    flex: 1,
    height: '100%',
    color: '#1f2937',
    fontSize: 14,
  },
  sendBtn: {
    marginLeft: 12,
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: '#ef4444',
    borderRadius: 20,
  },
  sendBtnText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 13,
  },
});
