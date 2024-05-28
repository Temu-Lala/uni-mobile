import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  Image,
  StyleSheet,
  KeyboardAvoidingView,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { Ionicons } from '@expo/vector-icons';
import jwtDecode from 'jwt-decode';
import { GiftedChat } from 'react-native-gifted-chat';
import { useContact } from '../../../contexts/ContactContext';

const ChatScreen = () => {
  const { selectedContact } = useContact();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [emojiPickerVisible, setEmojiPickerVisible] = useState(false);
  const messagesEndRef = useRef(null);
  const [authToken, setAuthToken] = useState('');
  const [senderId, setSenderId] = useState(null);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [errorMessages, setErrorMessages] = useState(null);

  useEffect(() => {
    const getTokenAndDecode = async () => {
      const token = await AsyncStorage.getItem('token');
      if (token) {
        setAuthToken(token);
        const decodedToken = jwtDecode(token);
        setSenderId(decodedToken.user_id);
      } else {
        setErrorMessages('Failed to retrieve authentication token.');
      }
    };
    getTokenAndDecode();
  }, []);

  const fetchMessages = async (recipientId) => {
    if (!senderId || !recipientId) return;
    setLoadingMessages(true);
    try {
      const response = await axios.get(
        `http://10.18.51.16:8000/messages/user_messages/?recipient_id=${recipientId}&sender_id=${senderId}`,
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${authToken}`,
          },
        }
      );
      setMessages(response.data.map(msg => ({
        _id: msg.id,
        text: msg.content,
        createdAt: new Date(msg.created_at),
        user: {
          _id: msg.sender.id,
          name: msg.sender.username,
        }
      })));
    } catch (error) {
      setErrorMessages('Failed to fetch messages.');
    } finally {
      setLoadingMessages(false);
    }
  };

  const sendMessage = async (newMessages = []) => {
    if (!newMessage.trim() || !selectedContact || !authToken || !senderId) return;

    try {
      await axios.post(
        'http://10.18.51.16:8000/messages/send_message/',
        {
          content: newMessage.trim(),
          recipient_id: selectedContact.id,
          sender_id: senderId,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${authToken}`,
          },
        }
      );

      setMessages(GiftedChat.append(messages, newMessages));
      setNewMessage('');
      messagesEndRef.current?.scrollToEnd({ animated: true });
    } catch (error) {
      setErrorMessages('Failed to send message.');
    }
  };

  useEffect(() => {
    const getStoredContact = async () => {
      const storedContact = await AsyncStorage.getItem('selectedContact');
      if (storedContact) {
        const parsedContact = JSON.parse(storedContact);
        setSelectedContact(parsedContact);
        await fetchMessages(parsedContact.id);
      }
    };
    getStoredContact();
  }, [senderId]);

  useEffect(() => {
    messagesEndRef.current?.scrollToEnd({ animated: true });
  }, [messages]);

  const handleEmojiClick = (emoji) => {
    setNewMessage((prevMessage) => prevMessage + emoji.native);
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior="padding">
      <View style={styles.chatContainer}>
        <View style={styles.chatHeader}>
          <Text style={styles.chatTitle}>{selectedContact?.username}</Text>
          <TouchableOpacity
            onPress={() => setEmojiPickerVisible(!emojiPickerVisible)}
          >
            <Ionicons name="happy-outline" size={24} color="white" />
          </TouchableOpacity>
        </View>
        <ScrollView style={styles.messageContainer} ref={messagesEndRef}>
          {loadingMessages ? (
            <ActivityIndicator size="large" color="#00ff00" />
          ) : errorMessages ? (
            <Text style={styles.errorText}>{errorMessages}</Text>
          ) : messages.length === 0 ? (
            <Text style={styles.noMessagesText}>No messages yet</Text>
          ) : (
            messages.map((message, index) => (
              <View
                key={index}
                style={[
                  styles.messageBubble,
                  message.sender === senderId
                    ? styles.sentMessage
                    : styles.receivedMessage,
                ]}
              >
                <Text style={styles.messageText}>{message.content}</Text>
              </View>
            ))
          )}
        </ScrollView>
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            value={newMessage}
            onChangeText={setNewMessage}
            placeholder="Type a message..."
            placeholderTextColor="#888"
          />
          <TouchableOpacity onPress={sendMessage}>
            <Ionicons name="send" size={24} color="white" />
          </TouchableOpacity>
        </View>
        {emojiPickerVisible && (
          <View style={styles.emojiPicker}>
            {/* Render your emoji picker here */}
            {/* Example: <EmojiPicker onEmojiClick={handleEmojiClick} /> */}
          </View>
        )}
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
  },
  chatContainer: {
    flex: 2,
    backgroundColor: '#222',
  },
  chatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 10,
    borderBottomColor: '#444',
    borderBottomWidth: 1,
  },
  chatTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  messageContainer: {
    flex: 1,
    padding: 10,
  },
  messageBubble: {
    padding: 10,
    borderRadius: 5,
    marginBottom: 5,
    maxWidth: '70%',
  },
  sentMessage: {
    alignSelf: 'flex-end',
    backgroundColor: '#4a4',
  },
  receivedMessage: {
    alignSelf: 'flex-start',
    backgroundColor: '#555',
  },
  messageText: {
    color: 'white',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderTopColor: '#444',
    borderTopWidth: 1,
  },
  input: {
    flex: 1,
    backgroundColor: '#444',
    color: 'white',
    borderRadius: 5,
    padding: 10,
    marginRight: 10,
  },
  emojiPicker: {
    position: 'absolute',
    bottom: 60,
    left: 0,
    right: 0,
    height: 250,
    backgroundColor: '#333',
  },
  noMessagesText: {
    color: '#888',
    textAlign: 'center',
    marginTop: 20,
  },
  errorText: {
    color: 'red',
    textAlign: 'center',
    marginTop: 20,
  },
});

export default ChatScreen;
