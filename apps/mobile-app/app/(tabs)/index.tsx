import { View, Text, ScrollView, TouchableOpacity, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '@/stores/auth-store';

export default function HomeScreen() {
  const router = useRouter();
  const { user } = useAuthStore();

  const quickActions = [
    { icon: 'chatbubbles', label: 'Legal Chat', route: '/(tabs)/chat', color: '#319795' },
    { icon: 'folder', label: 'My Files', route: '/(tabs)/files', color: '#3B82F6' },
    { icon: 'document-text', label: 'Notes', route: '/(tabs)/notes', color: '#8B5CF6' },
    { icon: 'search', label: 'Case Search', route: '/modal', color: '#F59E0B' },
  ];

  const recentItems = [
    { type: 'chat', title: 'IPC Section 420 Analysis', time: '2 hours ago' },
    { type: 'file', title: 'Employment Contract.pdf', time: '5 hours ago' },
    { type: 'note', title: 'Case Brief - Smith vs. Jones', time: 'Yesterday' },
  ];

  return (
    <ScrollView className="flex-1 bg-neutral-50 dark:bg-neutral-950">
      {/* Header */}
      <View className="bg-primary-500 px-6 pt-16 pb-8 rounded-b-3xl">
        <View className="flex-row items-center justify-between mb-6">
          <View>
            <Text className="text-white/80 text-base">Welcome back,</Text>
            <Text className="text-white text-2xl font-bold">
              {user?.name || 'Legal Professional'}
            </Text>
          </View>
          <TouchableOpacity
            className="h-12 w-12 rounded-full bg-white/20 items-center justify-center"
            onPress={() => router.push('/(tabs)/profile')}
          >
            {user?.image ? (
              <Image
                source={{ uri: user.image }}
                className="h-12 w-12 rounded-full"
              />
            ) : (
              <Ionicons name="person" size={24} color="white" />
            )}
          </TouchableOpacity>
        </View>

        {/* Search Bar */}
        <TouchableOpacity
          className="flex-row items-center bg-white/20 rounded-xl px-4 py-3"
          onPress={() => router.push('/modal')}
        >
          <Ionicons name="search" size={20} color="white" />
          <Text className="text-white/80 ml-3 flex-1">
            Search cases, laws, documents...
          </Text>
          <Ionicons name="mic" size={20} color="white" />
        </TouchableOpacity>
      </View>

      {/* Quick Actions */}
      <View className="px-6 py-6">
        <Text className="text-lg font-semibold text-neutral-900 dark:text-white mb-4">
          Quick Actions
        </Text>
        <View className="flex-row flex-wrap justify-between">
          {quickActions.map((action, index) => (
            <TouchableOpacity
              key={index}
              className="w-[48%] bg-white dark:bg-neutral-800 rounded-2xl p-4 mb-4 shadow-sm"
              onPress={() => router.push(action.route as any)}
            >
              <View
                className="h-12 w-12 rounded-xl items-center justify-center mb-3"
                style={{ backgroundColor: `${action.color}20` }}
              >
                <Ionicons
                  name={action.icon as any}
                  size={24}
                  color={action.color}
                />
              </View>
              <Text className="font-medium text-neutral-900 dark:text-white">
                {action.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Recent Activity */}
      <View className="px-6 pb-8">
        <View className="flex-row items-center justify-between mb-4">
          <Text className="text-lg font-semibold text-neutral-900 dark:text-white">
            Recent Activity
          </Text>
          <TouchableOpacity>
            <Text className="text-primary-500 font-medium">See All</Text>
          </TouchableOpacity>
        </View>
        <View className="bg-white dark:bg-neutral-800 rounded-2xl overflow-hidden shadow-sm">
          {recentItems.map((item, index) => (
            <TouchableOpacity
              key={index}
              className={`flex-row items-center p-4 ${
                index < recentItems.length - 1
                  ? 'border-b border-neutral-100 dark:border-neutral-700'
                  : ''
              }`}
            >
              <View className="h-10 w-10 rounded-full bg-primary-100 dark:bg-primary-900/30 items-center justify-center">
                <Ionicons
                  name={
                    item.type === 'chat'
                      ? 'chatbubble'
                      : item.type === 'file'
                      ? 'document'
                      : 'create'
                  }
                  size={18}
                  color="#319795"
                />
              </View>
              <View className="flex-1 ml-3">
                <Text className="font-medium text-neutral-900 dark:text-white">
                  {item.title}
                </Text>
                <Text className="text-sm text-neutral-500">{item.time}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#A3A3A3" />
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* AI Assistant Card */}
      <View className="px-6 pb-8">
        <TouchableOpacity
          className="bg-gradient-to-r from-primary-500 to-teal-400 rounded-2xl p-5 flex-row items-center"
          style={{ backgroundColor: '#319795' }}
          onPress={() => router.push('/(tabs)/chat')}
        >
          <View className="flex-1">
            <Text className="text-white text-lg font-semibold mb-1">
              Ask LawSphere AI
            </Text>
            <Text className="text-white/80 text-sm">
              Get instant legal assistance powered by AI
            </Text>
          </View>
          <View className="h-14 w-14 rounded-full bg-white/20 items-center justify-center">
            <Ionicons name="sparkles" size={28} color="white" />
          </View>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}
