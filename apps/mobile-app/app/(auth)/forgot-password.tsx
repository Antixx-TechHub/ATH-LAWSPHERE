import { authService } from '@/services/api';
import { Ionicons } from '@expo/vector-icons';
import { Link, useRouter } from 'expo-router';
import { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const router = useRouter();

  const handleResetPassword = async () => {
    if (!email) {
      Alert.alert('Error', 'Please enter your email');
      return;
    }

    setLoading(true);
    try {
      await authService.forgotPassword(email);
      setSent(true);
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to send reset email');
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <View className="flex-1 bg-white dark:bg-neutral-950 px-6 justify-center items-center">
        <View className="h-20 w-20 rounded-full bg-green-100 dark:bg-green-900/30 items-center justify-center mb-6">
          <Ionicons name="checkmark" size={40} color="#22c55e" />
        </View>
        <Text className="text-2xl font-bold text-neutral-900 dark:text-white text-center">
          Check Your Email
        </Text>
        <Text className="text-neutral-500 dark:text-neutral-400 text-center mt-4 px-4">
          We've sent a password reset link to{'\n'}
          <Text className="font-semibold text-neutral-700 dark:text-neutral-300">
            {email}
          </Text>
        </Text>
        <Link href="/(auth)/login" asChild>
          <TouchableOpacity className="bg-primary-500 rounded-xl py-4 px-8 mt-8">
            <Text className="text-white font-semibold text-lg">Back to Login</Text>
          </TouchableOpacity>
        </Link>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1 bg-white dark:bg-neutral-950"
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
      >
        <View className="flex-1 px-6 pt-16 pb-10">
          {/* Back Button */}
          <TouchableOpacity
            onPress={() => router.back()}
            className="flex-row items-center mb-8"
          >
            <Ionicons name="arrow-back" size={24} color="#737373" />
            <Text className="text-neutral-500 ml-2">Back</Text>
          </TouchableOpacity>

          {/* Header */}
          <View className="mb-8">
            <Text className="text-3xl font-bold text-neutral-900 dark:text-white">
              Forgot Password?
            </Text>
            <Text className="text-neutral-500 dark:text-neutral-400 mt-2">
              Enter your email and we'll send you a reset link
            </Text>
          </View>

          {/* Form */}
          <View className="space-y-4">
            <View>
              <Text className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                Email
              </Text>
              <View className="flex-row items-center bg-neutral-100 dark:bg-neutral-800 rounded-xl px-4 py-3">
                <Ionicons
                  name="mail-outline"
                  size={20}
                  color="#737373"
                  style={{ marginRight: 10 }}
                />
                <TextInput
                  className="flex-1 text-neutral-900 dark:text-white"
                  placeholder="Enter your email"
                  placeholderTextColor="#737373"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                />
              </View>
            </View>

            <TouchableOpacity
              className="bg-primary-500 rounded-xl py-4 items-center mt-6"
              onPress={handleResetPassword}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text className="text-white font-semibold text-lg">
                  Send Reset Link
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
