import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, Pressable, TextInput, ActivityIndicator, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { getIdea, getIdeaTitle } from '../lib/taskInteraction';
import { IdeaKind, IdeaAction } from '../lib/ideaLibrary';

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

const CUSTOM_COPY: { [k in IdeaKind]: { question: string; placeholder: string } } = {
  read: { question: 'Su quale argomento ti interessa un consiglio?', placeholder: 'es. ansia da lavoro, motivazione, autostima...' },
  listen: { question: 'Su quale argomento ti interessa un consiglio?', placeholder: 'es. calma, motivazione, concentrazione...' },
  try: { question: 'Che tipo di idea stai cercando?', placeholder: 'es. veloce, economica, da fare in casa...' },
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
        body: JSON.stringify({ topic, kind, task: taskText }),
      });
      const data = await response.json();
      setSuggestion({ text: data.suggestion, fromAI: true });
    } catch (error) {
      setSuggestion({ text: 'Non riesco a collegarmi in questo momento. Riprova tra poco.', fromAI: true });
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
            <Ionicons name={ICONS[kind] as any} size={22} color="#7CB342" />
            <Text style={styles.headerTitle}>{taskText}</Text>
            <Pressable onPress={onClose} hitSlop={8}>
              <Ionicons name="close" size={24} color="#999" />
            </Pressable>
          </View>

          {stage === 'choice' && (
            <>
              <Text style={styles.question}>Hai già in mente cosa fare?</Text>
              <Pressable style={styles.primaryButton} onPress={() => showCurated(0)}>
                <Ionicons name="bulb" size={18} color="#FFFFFF" />
                <Text style={styles.primaryButtonText}>Dammi un'idea</Text>
              </Pressable>
              <Pressable style={styles.secondaryButton} onPress={() => { onComplete(); onClose(); }}>
                <Text style={styles.secondaryButtonText}>So già cosa fare, segna come fatto</Text>
              </Pressable>
            </>
          )}

          {stage === 'suggestion' && suggestion && (
            <>
              {suggestion.fromAI ? (
                <View style={styles.aiTag}>
                  <Ionicons name="sparkles" size={14} color="#7CB342" />
                  <Text style={styles.aiTagText}>Suggerimento su misura</Text>
                </View>
              ) : (
                <Text style={styles.ideaTitle}>{getIdeaTitle(taskText)}</Text>
              )}
              <Text style={styles.suggestionText}>{suggestion.text}</Text>
              {suggestion.pointer && (
                <View style={styles.pointerRow}>
                  <Ionicons name="pricetag-outline" size={14} color="#7CB342" />
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
                  <Text style={styles.primaryButtonText}>{suggestion.action.label}</Text>
                </Pressable>
              )}
              <Pressable
                style={suggestion.action ? styles.outlineButton : styles.primaryButton}
                onPress={() => { onComplete(); onClose(); }}
              >
                <Ionicons name="checkmark-circle" size={18} color={suggestion.action ? '#7CB342' : '#FFFFFF'} />
                <Text style={suggestion.action ? styles.outlineButtonText : styles.primaryButtonText}>
                  {suggestion.action ? 'Ho già ascoltato, segna come fatto' : 'Segna come fatto'}
                </Text>
              </Pressable>
              {!suggestion.fromAI && (
                <Pressable style={styles.secondaryButton} onPress={() => showCurated(offset + 1)}>
                  <Text style={styles.secondaryButtonText}>Un'altra idea</Text>
                </Pressable>
              )}
              <Pressable style={styles.secondaryButton} onPress={handleSaveToDiary} disabled={saved}>
                <Text style={styles.secondaryButtonText}>{saved ? 'Salvato nel diario ✓' : 'Salva nel diario'}</Text>
              </Pressable>
              {/* Per la musica restiamo sempre sulle sessioni binaurali dell'app, niente musica esterna */}
              {!suggestion.action && (
                <Pressable onPress={() => setStage('custom')}>
                  <Text style={styles.linkText}>...oppure chiedi qualcosa di diverso</Text>
                </Pressable>
              )}
            </>
          )}

          {stage === 'custom' && (
            <>
              <Text style={styles.question}>{CUSTOM_COPY[kind].question}</Text>
              <TextInput
                style={styles.input}
                placeholder={CUSTOM_COPY[kind].placeholder}
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
                    <Text style={styles.primaryButtonText}>Suggeriscimi qualcosa</Text>
                  </>
                )}
              </Pressable>
              <Pressable onPress={() => setStage('choice')}>
                <Text style={styles.linkText}>Torna indietro</Text>
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
  ideaTitle: { fontSize: 12, fontWeight: '700', color: '#7CB342', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  suggestionText: { fontSize: 16, color: '#4A4A4A', lineHeight: 24, marginBottom: 12 },
  pointerRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 20 },
  pointerText: { flex: 1, fontSize: 13, color: '#7CB342', fontWeight: '600' },
  aiTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    backgroundColor: '#E8F5E9',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginBottom: 10,
  },
  aiTagText: { fontSize: 12, color: '#7CB342', fontWeight: '600' },
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
    backgroundColor: '#7CB342',
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
    borderColor: '#7CB342',
  },
  outlineButtonText: { color: '#7CB342', fontSize: 15, fontWeight: '600' },
  secondaryButton: { padding: 12, alignItems: 'center', marginBottom: 2 },
  secondaryButtonText: { color: '#7CB342', fontSize: 15, fontWeight: '500' },
  linkText: { color: '#999', fontSize: 14, textAlign: 'center', textDecorationLine: 'underline', marginTop: 4 },
});
