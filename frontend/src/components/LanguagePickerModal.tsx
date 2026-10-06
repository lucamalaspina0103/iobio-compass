import React from 'react';
import { Modal, View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LANGUAGES, useI18n } from '../i18n';

// Finestra per cambiare lingua in qualsiasi momento (Profilo)
export default function LanguagePickerModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { language, setLanguage, t } = useI18n();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.card} onPress={() => {}}>
          <Text style={styles.title}>{t('language.title')}</Text>
          {LANGUAGES.map(l => {
            const selected = l.code === language;
            return (
              <Pressable
                key={l.code}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                style={[styles.option, selected && styles.optionSelected]}
                onPress={async () => {
                  await setLanguage(l.code);
                  onClose();
                }}
              >
                <Text style={[styles.optionText, selected && styles.optionTextSelected]}>{l.name}</Text>
                {selected && <Ionicons name="checkmark-circle" size={22} color="#557A6D" />}
              </Pressable>
            );
          })}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  card: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 20, width: '100%', maxWidth: 380 },
  title: { fontSize: 18, fontWeight: 'bold', color: '#4A4A4A', textAlign: 'center', marginBottom: 14 },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E0E0E0',
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  optionSelected: { borderColor: '#557A6D', backgroundColor: '#EEF4F1' },
  optionText: { fontSize: 16, color: '#4A4A4A' },
  optionTextSelected: { fontWeight: '600', color: '#3F5E52' },
});
