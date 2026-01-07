import { notesService } from '@/services/api';
import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import {
    Alert,
    FlatList,
    Modal,
    RefreshControl,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

interface Note {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

export default function NotesScreen() {
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');

  const { data: notes, isLoading, refetch } = useQuery({
    queryKey: ['notes'],
    queryFn: async () => {
      const response = await notesService.getNotes();
      return response.data.notes || [];
    },
  });

  const createMutation = useMutation({
    mutationFn: ({ title, content }: { title: string; content: string }) =>
      notesService.createNote(title, content),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notes'] });
      closeModal();
    },
    onError: (error: any) => {
      Alert.alert('Error', error.message || 'Failed to create note');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, title, content }: { id: string; title: string; content: string }) =>
      notesService.updateNote(id, title, content),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notes'] });
      closeModal();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => notesService.deleteNote(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notes'] });
    },
  });

  const openModal = (note?: Note) => {
    if (note) {
      setEditingNote(note);
      setTitle(note.title);
      setContent(note.content);
    } else {
      setEditingNote(null);
      setTitle('');
      setContent('');
    }
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
    setEditingNote(null);
    setTitle('');
    setContent('');
  };

  const handleSave = () => {
    if (!title.trim()) {
      Alert.alert('Error', 'Please enter a title');
      return;
    }

    if (editingNote) {
      updateMutation.mutate({ id: editingNote.id, title, content });
    } else {
      createMutation.mutate({ title, content });
    }
  };

  const handleDelete = (id: string, noteTitle: string) => {
    Alert.alert('Delete Note', `Are you sure you want to delete "${noteTitle}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => deleteMutation.mutate(id),
      },
    ]);
  };

  const renderNote = ({ item }: { item: Note }) => (
    <TouchableOpacity
      className="bg-white dark:bg-neutral-800 rounded-xl p-4 mb-3"
      onPress={() => openModal(item)}
      onLongPress={() => handleDelete(item.id, item.title)}
    >
      <Text className="font-semibold text-neutral-900 dark:text-white text-lg mb-1">
        {item.title}
      </Text>
      <Text className="text-neutral-600 dark:text-neutral-400 mb-2" numberOfLines={2}>
        {item.content || 'No content'}
      </Text>
      <Text className="text-sm text-neutral-400">
        {new Date(item.updatedAt).toLocaleDateString()}
      </Text>
    </TouchableOpacity>
  );

  return (
    <View className="flex-1 bg-neutral-50 dark:bg-neutral-950 px-4 pt-4">
      {/* Create Button */}
      <TouchableOpacity
        className="flex-row items-center justify-center bg-primary-500 rounded-xl py-4 mb-4"
        onPress={() => openModal()}
      >
        <Ionicons name="add" size={20} color="white" />
        <Text className="text-white font-semibold ml-2">New Note</Text>
      </TouchableOpacity>

      {/* Notes List */}
      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <Text className="text-neutral-500">Loading notes...</Text>
        </View>
      ) : notes?.length === 0 ? (
        <View className="flex-1 items-center justify-center">
          <View className="h-20 w-20 rounded-full bg-neutral-200 dark:bg-neutral-800 items-center justify-center mb-4">
            <Ionicons name="document-text" size={40} color="#737373" />
          </View>
          <Text className="text-lg font-medium text-neutral-900 dark:text-white mb-2">
            No notes yet
          </Text>
          <Text className="text-neutral-500 text-center">
            Create notes for your legal research
          </Text>
        </View>
      ) : (
        <FlatList
          data={notes}
          renderItem={renderNote}
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

      {/* Note Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={closeModal}
      >
        <View className="flex-1 bg-white dark:bg-neutral-900">
          {/* Header */}
          <View className="flex-row items-center justify-between px-4 py-4 border-b border-neutral-200 dark:border-neutral-800">
            <TouchableOpacity onPress={closeModal}>
              <Text className="text-primary-500 text-base">Cancel</Text>
            </TouchableOpacity>
            <Text className="text-lg font-semibold text-neutral-900 dark:text-white">
              {editingNote ? 'Edit Note' : 'New Note'}
            </Text>
            <TouchableOpacity onPress={handleSave}>
              <Text className="text-primary-500 text-base font-semibold">Save</Text>
            </TouchableOpacity>
          </View>

          {/* Form */}
          <View className="flex-1 p-4">
            <TextInput
              className="text-xl font-semibold text-neutral-900 dark:text-white mb-4"
              placeholder="Note title"
              placeholderTextColor="#737373"
              value={title}
              onChangeText={setTitle}
            />
            <TextInput
              className="flex-1 text-base text-neutral-700 dark:text-neutral-300"
              placeholder="Start typing..."
              placeholderTextColor="#737373"
              value={content}
              onChangeText={setContent}
              multiline
              textAlignVertical="top"
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}
