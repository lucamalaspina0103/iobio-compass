import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, Pressable, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface DiaryEntryModalProps {
  visible: boolean;
  prompt?: string; // testo del task che ha chiesto di scrivere; assente = scrittura libera
  initialText?: string; // per modificare una voce gia' esistente
  onSave: (text: string) => void;
  onCancel: () => void;
  onDelete?: () => void; // presente solo quando si modifica una voce dal Diario
}

// Finestra di scrittura rapida: soddisfa subito i task che chiedono di scrivere ("Scrivi
// 3 cose positive", "...annota...") senza uscire dall'app, e serve anche per la scrittura
// libera e per modificare una voce esistente dal Diario.
export default function DiaryEntryModal({
  visible,
  prompt,
  initialText = '',
  onSave,
  onCancel,
  onDelete,
}: DiaryEntryModalProps) {
  const [text, setText] = useState(initialText);

  useEffect(() => {
    if (visible) setText(initialText);
  }, [visible, initialText]);

  const handleSave = () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    onSave(trimmed);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onCancel}>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.card}>
          <View style={styles.header}>
            <Ionicons name="book" size={22} color="#7CB342" />
            <Text style={styles.headerTitle}>{prompt ? 'Scrivi' : 'Il tuo diario'}</Text>
            <Pressable onPress={onCancel} hitSlop={8}>
              <Ionicons name="close" size={24} color="#999" />
            </Pressable>
          </View>

          {prompt && <Text style={styles.prompt}>{prompt}</Text>}

          <TextInput
            style={styles.input}
            multiline
            autoFocus
            placeholder="Scrivi qui..."
            value={text}
            onChangeText={setText}
            textAlignVertical="top"
          />

          <View style={styles.actions}>
            {onDelete && (
              <Pressable style={styles.deleteButton} onPress={onDelete}>
                <Ionicons name="trash-outline" size={20} color="#EF5350" />
              </Pressable>
            )}
            <Pressable style={[styles.saveButton, !text.trim() && styles.saveButtonDisabled]} onPress={handleSave} disabled={!text.trim()}>
              <Text style={styles.saveButtonText}>Salva</Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  card: {
    backgroundColor: '#FFFBF0',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 28,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: '700', color: '#4A4A4A' },
  prompt: { fontSize: 15, color: '#666', marginBottom: 12, fontStyle: 'italic' },
  input: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    fontSize: 16,
    color: '#4A4A4A',
    minHeight: 140,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 16 },
  deleteButton: {
    width: 48,
    height: 48,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#FFCDD2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButton: { flex: 1, backgroundColor: '#7CB342', borderRadius: 12, padding: 16, alignItems: 'center' },
  saveButtonDisabled: { opacity: 0.5 },
  saveButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
});
