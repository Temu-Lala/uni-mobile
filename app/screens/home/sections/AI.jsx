import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import axios from 'axios';

const ChatScreen = () => {
  const [recommendedUniversities, setRecommendedUniversities] = useState([]);
  const [message, setMessage] = useState('');
  const [chatHistory, setChatHistory] = useState([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const response = await axios.get('http://10.18.51.16:8000/recommendation/');
      setRecommendedUniversities(response.data.recommended_universities);
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  const sendMessage = () => {
    setChatHistory([...chatHistory, { text: message, sender: 'user' }]);
    setMessage('');
    // Optionally, send message to backend for further processing
  };

  const renderChatHistory = () => {
    return chatHistory.map((item, index) => (
      <View key={index} style={[styles.chatBubble, item.sender === 'user' ? styles.userBubble : styles.botBubble]}>
        <Text style={styles.chatText}>{item.text}</Text>
      </View>
    ));
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.chatContainer} contentContainerStyle={styles.chatContent}>
        {renderChatHistory()}
      </ScrollView>
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Type your message..."
          value={message}
          onChangeText={setMessage}
        />
        <TouchableOpacity style={styles.sendButton} onPress={sendMessage}>
          <Text style={styles.sendButtonText}>Send</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  chatContainer: {
    flex: 1,
  },
  chatContent: {
    paddingVertical: 8,
  },
  chatBubble: {
    maxWidth: '70%',
    padding: 12,
    marginBottom: 8,
    borderRadius: 8,
  },
  userBubble: {
    alignSelf: 'flex-end',
    backgroundColor: '#007bff',
  },
  botBubble: {
    alignSelf: 'flex-start',
    backgroundColor: '#28a745',
  },
  chatText: {
    color: '#fff',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginRight: 8,
  },
  sendButton: {
    backgroundColor: '#007bff',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
});

export default ChatScreen;
