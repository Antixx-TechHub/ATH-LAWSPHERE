import { useAuthStore } from '@/stores/auth-store';
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

export default function RegisterScreen() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { register } = useAuthStore();
  const router = useRouter();

  const handleRegister = async () => {
    if (!name || !email || !password || !confirmPassword) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    if (password.length < 8) {
      Alert.alert('Error', 'Password must be at least 8 characters');
      return;
    }

    setLoading(true);
    try {
      await register(email, password, name);
      router.replace('/(tabs)');
    } catch (error: any) {
      Alert.alert('Registration Failed', error.message);
    } finally {
      setLoading(false);
    }
  };

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
          {/* Header */}
          <View className="mb-8">
            <Text className="text-3xl font-bold text-neutral-900 dark:text-white">
              Create Account
            </Text>
            <Text className="text-neutral-500 dark:text-neutral-400 mt-2">
              Join LawSphere for AI-powered legal assistance
            </Text>
          </View>

          {/* Form */}
          <View className="space-y-4">
            <View>
              <Text className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                Full Name
              </Text>
              <View className="flex-row items-center bg-neutral-100 dark:bg-neutral-800 rounded-xl px-4 py-3">
                <Ionicons
                  name="person-outline"
                  size={20}
                  color="#737373"
                  style={{ marginRight: 10 }}
                />
                <TextInput
                  className="flex-1 text-neutral-900 dark:text-white"
                  placeholder="Enter your full name"
                  placeholderTextColor="#737373"
                  value={name}
                  onChangeText={setName}
                  autoCapitalize="words"
                />
              </View>
            </View>

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

            <View>
              <Text className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                Password
              </Text>
              <View className="flex-row items-center bg-neutral-100 dark:bg-neutral-800 rounded-xl px-4 py-3">
                <Ionicons
                  name="lock-closed-outline"
                  size={20}
                  color="#737373"
                  style={{ marginRight: 10 }}
                />
                <TextInput
                  className="flex-1 text-neutral-900 dark:text-white"
                  placeholder="Create a password"
                  placeholderTextColor="#737373"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                  <Ionicons
                    name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={20}
                    color="#737373"
                  />
                </TouchableOpacity>
              </View>
            </View>

            <View>
              <Text className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                Confirm Password
              </Text>
              <View className="flex-row items-center bg-neutral-100 dark:bg-neutral-800 rounded-xl px-4 py-3">
                <Ionicons
                  name="lock-closed-outline"
                  size={20}
                  color="#737373"
                  style={{ marginRight: 10 }}
                />
                <TextInput
                  className="flex-1 text-neutral-900 dark:text-white"
                  placeholder="Confirm your password"
                  placeholderTextColor="#737373"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                />
              </View>
            </View>

            <TouchableOpacity
              className="bg-primary-500 rounded-xl py-4 items-center mt-6"
              onPress={handleRegister}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text className="text-white font-semibold text-lg">
                  Create Account
                </Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Login Link */}
          <View className="flex-row justify-center mt-8">
            <Text className="text-neutral-500 dark:text-neutral-400">
              Already have an account?{' '}
            </Text>
            <Link href="/(auth)/login" asChild>
              <TouchableOpacity>
                <Text className="text-primary-500 font-semibold">Login</Text>
              </TouchableOpacity>
            </Link>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
