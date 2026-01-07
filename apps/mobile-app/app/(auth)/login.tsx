import { useAuthStore } from '@/stores/auth-store';
import { Ionicons } from '@expo/vector-icons';
import { Link, useRouter } from 'expo-router';
import { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Image,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { login } = useAuthStore();
  const router = useRouter();

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    setLoading(true);
    try {
      await login(email, password);
      router.replace('/(tabs)');
    } catch (error: any) {
      Alert.alert('Login Failed', error.message);
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
        <View className="flex-1 px-6 pt-20 pb-10">
          {/* Logo */}
          <View className="items-center mb-10">
            <View className="h-24 w-24 rounded-2xl bg-gradient-to-br from-cyan-400 to-teal-500 items-center justify-center mb-4 shadow-lg">
              <Image
                source={require('@/assets/images/icon.png')}
                className="h-20 w-20"
                resizeMode="contain"
              />
            </View>
            <Text className="text-3xl font-bold text-neutral-900 dark:text-white">
              LawSphere
            </Text>
            <Text className="text-neutral-500 dark:text-neutral-400 mt-2">
              Your AI Legal Assistant
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
                  placeholder="Enter your password"
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

            <Link href="/(auth)/forgot-password" asChild>
              <TouchableOpacity className="self-end">
                <Text className="text-primary-500 text-sm font-medium">
                  Forgot Password?
                </Text>
              </TouchableOpacity>
            </Link>

            <TouchableOpacity
              className="bg-primary-500 rounded-xl py-4 items-center mt-4"
              onPress={handleLogin}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text className="text-white font-semibold text-lg">Login</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Register Link */}
          <View className="flex-row justify-center mt-8">
            <Text className="text-neutral-500 dark:text-neutral-400">
              Don't have an account?{' '}
            </Text>
            <Link href="/(auth)/register" asChild>
              <TouchableOpacity>
                <Text className="text-primary-500 font-semibold">Sign Up</Text>
              </TouchableOpacity>
            </Link>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
