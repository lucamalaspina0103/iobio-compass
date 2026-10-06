import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, Pressable, TextInput, ActivityIndicator, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { getIdea, getIdeaTitle } from '../lib/taskInteraction';
import { IdeaKind, IdeaAction } from '../lib/ideaLibrary';
import { taskText as translateTask } from '../lib/taskText';
import { useI18n } from '../i18n';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

interface ResourceSuggestionModalProps {
  visible: boolean;
  taskText: string;
  area: string;
  kind: IdeaKind;
  seed: number; // per far variare l'idea nel piano di 30 giorni
  onComplete: () => void; // segna il task come fatto
  onClose: () => void;
  onSaveToDiary: (text: string) => void;
}

type Stage = 'choice' | 'suggestion' | 'custom';

// Testo della domanda e segnaposto del campo libero, per tipo di idea (chiavi nei cataloghi)
const CUSTOM_KEYS: { [k in IdeaKind]: { question: string; placeholder: string } } = {
  read: { question: 'ideas.topicQ', placeholder: 'ideas.ph.read' },
  listen: { question: 'ideas.topicQ', placeholder: 'ideas.ph.listen' },
  try: { question: 'ideas.kindQ', placeholder: 'ideas.ph.try' },
};

const ICONS: { [k in IdeaKind]: string } = {
  read: 'book-outline',
  listen: 'headset-outline',
  try: 'bulb-outline',
};

// Si apre quando si tocca un task in cui la persona potrebbe non sapere cosa fare ("Leggi
// qualcosa di ispirazionale", "Prova una nuova ricetta", "Ascolta musica rilassante"...):
// offre subito un'idea pronta e pertinente (archivio curato, nessuna attesa), con "un'altra
// idea" per cambiare, e chiede all'IA solo se la persona vuole qualcosa di diverso.
export default function ResourceSuggestionModal({
  visible,
  taskText,
  area,
  kind,
  seed,
  onComplete,
  onClose,
  onSaveToDiary,
}: ResourceSuggestionModalProps) {
  const { t, language } = useI18n();
  const [stage, setStage] = useState<Stage>('choice');
  const [offset, setOffset] = useState(0);
  const router = useRouter();
  const [suggestion, setSuggestion] = useState<{ text: string; pointer?: string; action?: IdeaAction; fromAI: boolean } | null>(null);
  const [customTopic, setCustomTopic] = useState('');
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (visible) {
      setStage('choice');
      setOffset(0);
      setSuggestion(null);
      setCustomTopic('');
      setSaved(false);
    }
  }, [visible]);

  const showCurated = (nextOffset: number) => {
    const idea = getIdea(taskText, area, seed + nextOffset);
    setOffset(nextOffset);
    setSuggestion({ text: idea.text, pointer: idea.pointer, action: idea.action, fromAI: false });
    setSaved(false);
    setStage('suggestion');
  };

  const askCustom = async () => {
    const topic = customTopic.trim();
    if (!topic) return;
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/suggest-resource`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic, kind, task: taskText, language }),
      });
      const data = await response.json();
      setSuggestion({ text: data.suggestion, fromAI: true });
    } catch (error) {
      setSuggestion({ text: t('ideas.offline'), fromAI: true });
    } finally {
      setSaved(false);
      setStage('suggestion');
      setLoading(false);
    }
  };

  const handleSaveToDiary = () => {
    if (!suggestion) return;
    onSaveToDiary(suggestion.pointer ? `${suggestion.text} (${suggestion.pointer})` : suggestion.text);
    setSaved(true);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <ScrollView style={styles.card} contentContainerStyle={styles.cardContent} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <Ionicons name={ICONS[kind] as any} size={22} color="#557A6D" />
            <Text style={styles.headerTitle}>{translateTask(taskText)}</Text>
            <Pressable onPress={onClose} hitSlop={8}>
              <Ionicons name="close" size={24} color="#999" />
            </Pressable>
          </View>

          {stage === 'choice' && (
            <>
              <Text style={styles.question}>{t('ideas.haveIdea')}</Text>
              <Pressable style={styles.primaryButton} onPress={() => showCurated(0)}>
                <Ionicons name="bulb" size={18} color="#FFFFFF" />
                <Text style={styles.primaryButtonText}>{t('ideas.giveIdea')}</Text>
              </Pressable>
              <Pressable style={styles.secondaryButton} onPress={() => { onComplete(); onClose(); }}>
                <Text style={styles.secondaryButtonText}>{t('ideas.knowAlready')}</Text>
              </Pressable>
            </>
          )}

          {stage === 'suggestion' && suggestion && (
            <>
              {suggestion.fromAI ? (
                <View style={styles.aiTag}>
                  <Ionicons name="sparkles" size={14} color="#557A6D" />
                  <Text style={styles.aiTagText}>{t('ideas.tailored')}</Text>
                </View>
              ) : (
                <Text style={styles.ideaTitle}>{getIdeaTitle(taskText)}</Text>
              )}
              <Text style={styles.suggestionText}>{suggestion.text}</Text>
              {suggestion.pointer && (
                <View style={styles.pointerRow}>
                  <Ionicons name="pricetag-outline" size={14} color="#557A6D" />
                  <Text style={styles.pointerText}>{suggestion.pointer}</Text>
                </View>
              )}

              {suggestion.action && (
                <Pressable
                  style={styles.primaryButton}
                  onPress={() => {
                    const action = suggestion.action!;
                    onClose();
                    router.push({ pathname: action.route as any, params: action.params });
                  }}
                >
                  <Ionicons name="headset" size={18} color="#FFFFFF" />
                  <Text style={styles.primaryButtonText}>{suggestion.action.labelKey ? t(suggestion.action.labelKey) : suggestion.action.label}</Text>
                </Pressable>
              )}
              <Pressable
                style={suggestion.action ? styles.outlineButton : styles.primaryButton}
                onPress={() => { onComplete(); onClose(); }}
              >
                <Ionicons name="checkmark-circle" size={18} color={suggestion.action ? '#557A6D' : '#FFFFFF'} />
                <Text style={suggestion.action ? styles.outlineButtonText : styles.primaryButtonText}>
                  {suggestion.action
                    ? (suggestion.action.doneLabelKey ? t(suggestion.action.doneLabelKey) : suggestion.action.doneLabel || t('ideas.doneListened'))
                    : t('ideas.markDone')}
                </Text>
              </Pressable>
              {!suggestion.fromAI && (
                <Pressable style={styles.secondaryButton} onPress={() => showCurated(offset + 1)}>
                  <Text style={styles.secondaryButtonText}>{t('ideas.another')}</Text>
                </Pressable>
              )}
              <Pressable style={styles.secondaryButton} onPress={handleSaveToDiary} disabled={saved}>
                <Text style={styles.secondaryButtonText}>{saved ? t('ideas.saved') : t('ideas.saveDiary')}</Text>
              </Pressable>
              {/* Per la musica restiamo sempre sulle sessioni binaurali dell'app, niente musica esterna */}
              {!suggestion.action && (
                <Pressable onPress={() => setStage('custom')}>
                  <Text style={styles.linkText}>{t('ideas.askDifferent')}</Text>
                </Pressable>
              )}
            </>
          )}

          {stage === 'custom' && (
            <>
              <Text style={styles.question}>{t(CUSTOM_KEYS[kind].question)}</Text>
              <TextInput
                style={styles.input}
                placeholder={t(CUSTOM_KEYS[kind].placeholder)}
                value={customTopic}
                onChangeText={setCustomTopic}
                autoFocus
              />
              <Pressable
                style={[styles.primaryButton, (!customTopic.trim() || loading) && styles.buttonDisabled]}
                onPress={askCustom}
                disabled={!customTopic.trim() || loading}
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <>
                    <Ionicons name="sparkles" size={18} color="#FFFFFF" />
                    <Text style={styles.primaryButtonText}>{t('ideas.suggestMe')}</Text>
                  </>
                )}
              </Pressable>
              <Pressable onPress={() => setStage('choice')}>
                <Text style={styles.linkText}>{t('ideas.back')}</Text>
              </Pressable>
            </>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  card: {
    backgroundColor: '#FFFBF0',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
  },
  cardContent: { padding: 20, paddingBottom: 28 },
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 16 },
  headerTitle: { flex: 1, fontSize: 16, fontWeight: '700', color: '#4A4A4A' },
  question: { fontSize: 15, color: '#666', marginBottom: 16 },
  ideaTitle: { fontSize: 12, fontWeight: '700', color: '#557A6D', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  suggestionText: { fontSize: 16, color: '#4A4A4A', lineHeight: 24, marginBottom: 12 },
  pointerRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 20 },
  pointerText: { flex: 1, fontSize: 13, color: '#557A6D', fontWeight: '600' },
  aiTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    backgroundColor: '#E4EEEA',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginBottom: 10,
  },
  aiTagText: { fontSize: 12, color: '#557A6D', fontWeight: '600' },
  input: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    marginBottom: 16,
  },
  primaryButton: {
    flexDirection: 'row',
    backgroundColor: '#557A6D',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 10,
  },
  buttonDisabled: { opacity: 0.5 },
  primaryButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  outlineButton: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 10,
    borderWidth: 1.5,
    borderColor: '#557A6D',
  },
  outlineButtonText: { color: '#557A6D', fontSize: 15, fontWeight: '600' },
  secondaryButton: { padding: 12, alignItems: 'center', marginBottom: 2 },
  secondaryButtonText: { color: '#557A6D', fontSize: 15, fontWeight: '500' },
  linkText: { color: '#999', fontSize: 14, textAlign: 'center', textDecorationLine: 'underline', marginTop: 4 },
});
