import { useAuthStore } from '@/stores/auth-store';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Alert, Image, ScrollView, Text, TouchableOpacity, View } from 'react-native';

export default function ProfileScreen() {
  const router = useRouter();
  const { user, logout } = useAuthStore();

  const menuItems = [
    { icon: 'person-outline', label: 'Edit Profile', action: () => {} },
    { icon: 'notifications-outline', label: 'Notifications', action: () => {} },
    { icon: 'shield-checkmark-outline', label: 'Privacy & Security', action: () => {} },
    { icon: 'color-palette-outline', label: 'Appearance', action: () => {} },
    { icon: 'help-circle-outline', label: 'Help & Support', action: () => {} },
    { icon: 'information-circle-outline', label: 'About', action: () => {} },
  ];

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          await logout();
          router.replace('/(auth)/login');
        },
      },
    ]);
  };

  return (
    <ScrollView className="flex-1 bg-neutral-50 dark:bg-neutral-950">
      {/* Profile Header */}
      <View className="items-center pt-8 pb-6 bg-white dark:bg-neutral-900">
        <View className="h-24 w-24 rounded-full bg-primary-100 dark:bg-primary-900/30 items-center justify-center mb-4">
          {user?.image ? (
            <Image
              source={{ uri: user.image }}
              className="h-24 w-24 rounded-full"
            />
          ) : (
            <Ionicons name="person" size={48} color="#319795" />
          )}
        </View>
        <Text className="text-xl font-bold text-neutral-900 dark:text-white">
          {user?.name || 'User'}
        </Text>
        <Text className="text-neutral-500 mt-1">{user?.email}</Text>
      </View>

      {/* Stats */}
      <View className="flex-row bg-white dark:bg-neutral-900 mt-2 py-4">
        <View className="flex-1 items-center border-r border-neutral-200 dark:border-neutral-800">
          <Text className="text-2xl font-bold text-primary-500">12</Text>
          <Text className="text-sm text-neutral-500">Documents</Text>
        </View>
        <View className="flex-1 items-center border-r border-neutral-200 dark:border-neutral-800">
          <Text className="text-2xl font-bold text-primary-500">48</Text>
          <Text className="text-sm text-neutral-500">Chat Sessions</Text>
        </View>
        <View className="flex-1 items-center">
          <Text className="text-2xl font-bold text-primary-500">8</Text>
          <Text className="text-sm text-neutral-500">Notes</Text>
        </View>
      </View>

      {/* Menu Items */}
      <View className="mt-4 bg-white dark:bg-neutral-900">
        {menuItems.map((item, index) => (
          <TouchableOpacity
            key={index}
            className={`flex-row items-center px-4 py-4 ${
              index < menuItems.length - 1
                ? 'border-b border-neutral-100 dark:border-neutral-800'
                : ''
            }`}
            onPress={item.action}
          >
            <View className="h-10 w-10 rounded-full bg-neutral-100 dark:bg-neutral-800 items-center justify-center">
              <Ionicons name={item.icon as any} size={20} color="#737373" />
            </View>
            <Text className="flex-1 ml-3 text-neutral-900 dark:text-white font-medium">
              {item.label}
            </Text>
            <Ionicons name="chevron-forward" size={20} color="#A3A3A3" />
          </TouchableOpacity>
        ))}
      </View>

      {/* Logout Button */}
      <TouchableOpacity
        className="mx-4 mt-6 mb-8 bg-red-50 dark:bg-red-900/20 rounded-xl py-4 flex-row items-center justify-center"
        onPress={handleLogout}
      >
        <Ionicons name="log-out-outline" size={20} color="#EF4444" />
        <Text className="text-red-500 font-semibold ml-2">Logout</Text>
      </TouchableOpacity>

      {/* App Version */}
      <Text className="text-center text-neutral-400 text-sm mb-8">
        LawSphere v1.0.0
      </Text>
    </ScrollView>
  );
}
