import { aiApi } from '@/services/api';
import { useChatStore } from '@/stores/chat-store';
import { Ionicons } from '@expo/vector-icons';
import { useRef, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    KeyboardAvoidingView,
    Platform,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export default function ChatScreen() {
  const [input, setInput] = useState('');
  const { messages, addMessage, isLoading, setLoading, sessionId, setSessionId } = useChatStore();
  const flatListRef = useRef<FlatList>(null);

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    };

    addMessage(userMessage);
    setInput('');
    setLoading(true);

    try {
      // Use the trust chat endpoint for privacy-first AI with free Groq models
      const response = await aiApi.post('/api/chat/trust/completions', {
        messages: [{ role: 'user', content: userMessage.content }],
        session_id: sessionId,
        force_local: true,  // Use free open-source models
      });

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response.data.message?.content || response.data.response || 'No response',
        timestamp: new Date(),
      };

      addMessage(assistantMessage);

      if (response.data.session_id) {
        setSessionId(response.data.session_id);
      }
    } catch (error: any) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date(),
      };
      addMessage(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const isUser = item.role === 'user';

    return (
      <View
        className={`flex-row mb-4 ${isUser ? 'justify-end' : 'justify-start'}`}
      >
        {!isUser && (
          <View className="h-8 w-8 rounded-full bg-primary-500 items-center justify-center mr-2">
            <Ionicons name="sparkles" size={16} color="white" />
          </View>
        )}
        <View
          className={`max-w-[80%] rounded-2xl px-4 py-3 ${
            isUser
              ? 'bg-primary-500 rounded-br-md'
              : 'bg-white dark:bg-neutral-800 rounded-bl-md'
          }`}
        >
          <Text
            className={`${
              isUser ? 'text-white' : 'text-neutral-900 dark:text-white'
            }`}
          >
            {item.content}
          </Text>
        </View>
      </View>
    );
  };

  const suggestedQuestions = [
    'What is IPC Section 420?',
    'Explain contract law basics',
    'How to file a PIL in India?',
    'GDPR compliance checklist',
  ];

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1 bg-neutral-50 dark:bg-neutral-950"
      keyboardVerticalOffset={90}
    >
      {messages.length === 0 ? (
        <View className="flex-1 px-6 pt-8">
          <View className="items-center mb-8">
            <View className="h-16 w-16 rounded-2xl bg-primary-500 items-center justify-center mb-4">
              <Ionicons name="sparkles" size={32} color="white" />
            </View>
            <Text className="text-xl font-bold text-neutral-900 dark:text-white">
              LawSphere AI
            </Text>
            <Text className="text-neutral-500 text-center mt-2">
              Your AI-powered legal assistant.{'\n'}Ask me anything about law!
            </Text>
          </View>

          <Text className="text-sm font-medium text-neutral-500 mb-3">
            Suggested Questions
          </Text>
          {suggestedQuestions.map((question, index) => (
            <TouchableOpacity
              key={index}
              className="bg-white dark:bg-neutral-800 rounded-xl px-4 py-3 mb-2 border border-neutral-200 dark:border-neutral-700"
              onPress={() => {
                setInput(question);
              }}
            >
              <Text className="text-neutral-700 dark:text-neutral-300">
                {question}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16 }}
          onContentSizeChange={() =>
            flatListRef.current?.scrollToEnd({ animated: true })
          }
        />
      )}

      {/* Input Area */}
      <View className="px-4 py-3 border-t border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
        <View className="flex-row items-end">
          <View className="flex-1 bg-neutral-100 dark:bg-neutral-800 rounded-2xl px-4 py-2 mr-3">
            <TextInput
              className="text-neutral-900 dark:text-white min-h-[40px] max-h-[120px]"
              placeholder="Ask a legal question..."
              placeholderTextColor="#737373"
              value={input}
              onChangeText={setInput}
              multiline
              onSubmitEditing={sendMessage}
            />
          </View>
          <TouchableOpacity
            className={`h-12 w-12 rounded-full items-center justify-center ${
              input.trim() && !isLoading
                ? 'bg-primary-500'
                : 'bg-neutral-300 dark:bg-neutral-700'
            }`}
            onPress={sendMessage}
            disabled={!input.trim() || isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="white" size="small" />
            ) : (
              <Ionicons name="send" size={20} color="white" />
            )}
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
