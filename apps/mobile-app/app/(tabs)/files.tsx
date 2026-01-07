import { filesService } from '@/services/api';
import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as DocumentPicker from 'expo-document-picker';
import { useState } from 'react';
import {
    Alert,
    FlatList,
    RefreshControl,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

interface FileItem {
  id: string;
  name: string;
  type: string;
  size: number;
  createdAt: string;
}

export default function FilesScreen() {
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);

  const { data: files, isLoading, refetch } = useQuery({
    queryKey: ['files'],
    queryFn: async () => {
      const response = await filesService.getFiles();
      return response.data.files || [];
    },
  });

  const uploadMutation = useMutation({
    mutationFn: async (file: any) => {
      const formData = new FormData();
      formData.append('file', {
        uri: file.uri,
        name: file.name,
        type: file.mimeType,
      } as any);
      return filesService.uploadFile(formData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['files'] });
      Alert.alert('Success', 'File uploaded successfully');
    },
    onError: (error: any) => {
      Alert.alert('Error', error.message || 'Failed to upload file');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => filesService.deleteFile(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['files'] });
    },
  });

  const handleUpload = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'text/*', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets[0]) {
        uploadMutation.mutate(result.assets[0]);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to pick document');
    }
  };

  const handleDelete = (id: string, name: string) => {
    Alert.alert('Delete File', `Are you sure you want to delete "${name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => deleteMutation.mutate(id),
      },
    ]);
  };

  const getFileIcon = (type: string) => {
    if (type.includes('pdf')) return 'document';
    if (type.includes('word') || type.includes('doc')) return 'document-text';
    if (type.includes('text')) return 'reader';
    return 'document-outline';
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const renderFile = ({ item }: { item: FileItem }) => (
    <TouchableOpacity
      className="flex-row items-center bg-white dark:bg-neutral-800 rounded-xl p-4 mb-3"
      onLongPress={() => handleDelete(item.id, item.name)}
    >
      <View className="h-12 w-12 rounded-xl bg-primary-100 dark:bg-primary-900/30 items-center justify-center">
        <Ionicons name={getFileIcon(item.type) as any} size={24} color="#319795" />
      </View>
      <View className="flex-1 ml-3">
        <Text className="font-medium text-neutral-900 dark:text-white" numberOfLines={1}>
          {item.name}
        </Text>
        <Text className="text-sm text-neutral-500">
          {formatSize(item.size)} • {new Date(item.createdAt).toLocaleDateString()}
        </Text>
      </View>
      <TouchableOpacity className="p-2">
        <Ionicons name="ellipsis-vertical" size={20} color="#737373" />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  return (
    <View className="flex-1 bg-neutral-50 dark:bg-neutral-950 px-4 pt-4">
      {/* Upload Button */}
      <TouchableOpacity
        className="flex-row items-center justify-center bg-primary-500 rounded-xl py-4 mb-4"
        onPress={handleUpload}
        disabled={uploadMutation.isPending}
      >
        <Ionicons name="cloud-upload" size={20} color="white" />
        <Text className="text-white font-semibold ml-2">
          {uploadMutation.isPending ? 'Uploading...' : 'Upload Document'}
        </Text>
      </TouchableOpacity>

      {/* Files List */}
      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <Text className="text-neutral-500">Loading files...</Text>
        </View>
      ) : files?.length === 0 ? (
        <View className="flex-1 items-center justify-center">
          <View className="h-20 w-20 rounded-full bg-neutral-200 dark:bg-neutral-800 items-center justify-center mb-4">
            <Ionicons name="folder-open" size={40} color="#737373" />
          </View>
          <Text className="text-lg font-medium text-neutral-900 dark:text-white mb-2">
            No files yet
          </Text>
          <Text className="text-neutral-500 text-center">
            Upload legal documents to get started
          </Text>
        </View>
      ) : (
        <FlatList
          data={files}
          renderItem={renderFile}
          keyExtractor={(item) => item.id}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={async () => {
                setRefreshing(true);
                await refetch();
                setRefreshing(false);
              }}
            />
          }
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}
