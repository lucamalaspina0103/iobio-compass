import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, Pressable, TextInput, ActivityIndicator, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getCuratedResource } from '../lib/taskInteraction';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

interface ResourceSuggestionModalProps {
  visible: boolean;
  taskText: string;
  area: string;
  kind: 'read' | 'listen';
  seed: number; // per far variare il consiglio curato nel piano di 30 giorni
  onComplete: () => void; // segna il task come fatto
  onClose: () => void;
  onSaveToDiary: (text: string) => void;
}

type Stage = 'choice' | 'suggestion' | 'custom';

// Si apre quando si tocca un task tipo "Leggi qualcosa di ispirazionale": invece di dare
// per scontato che la persona sappia gia' cosa fare, offre subito un consiglio pronto
// (curato, nessuna attesa), con la possibilita' di chiederne uno su misura all'IA solo se
// l'argomento proposto non fa al caso suo.
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
  const [suggestion, setSuggestion] = useState<{ text: string; pointer?: string; fromAI: boolean } | null>(null);
  const [customTopic, setCustomTopic] = useState('');
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (visible) {
      setStage('choice');
      setSuggestion(null);
      setCustomTopic('');
      setSaved(false);
    }
  }, [visible]);

  const showCurated = () => {
    const resource = getCuratedResource(area, seed);
    setSuggestion({ text: resource.passage, pointer: resource.pointer, fromAI: false });
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
        body: JSON.stringify({ topic, kind }),
      });
      const data = await response.json();
      setSuggestion({ text: data.suggestion, fromAI: true });
      setSaved(false);
      setStage('suggestion');
    } catch (error) {
      setSuggestion({ text: 'Non riesco a collegarmi in questo momento. Riprova tra poco.', fromAI: true });
      setSaved(false);
      setStage('suggestion');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveToDiary = () => {
    if (!suggestion) return;
    onSaveToDiary(suggestion.text);
    setSaved(true);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <ScrollView style={styles.card} contentContainerStyle={styles.cardContent} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <Ionicons name={kind === 'read' ? 'book-outline' : 'headset-outline'} size={22} color="#7CB342" />
            <Text style={styles.headerTitle}>{taskText}</Text>
            <Pressable onPress={onClose} hitSlop={8}>
              <Ionicons name="close" size={24} color="#999" />
            </Pressable>
          </View>

          {stage === 'choice' && (
            <>
              <Text style={styles.question}>Hai già in mente cosa fare?</Text>
              <Pressable style={styles.primaryButton} onPress={showCurated}>
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
              {suggestion.fromAI && (
                <View style={styles.aiTag}>
                  <Ionicons name="sparkles" size={14} color="#7CB342" />
                  <Text style={styles.aiTagText}>Suggerimento su misura</Text>
                </View>
              )}
              <Text style={styles.suggestionText}>{suggestion.text}</Text>
              {suggestion.pointer && (
                <View style={styles.pointerRow}>
                  <Ionicons name="pricetag-outline" size={14} color="#7CB342" />
                  <Text style={styles.pointerText}>{suggestion.pointer}</Text>
                </View>
              )}

              <Pressable style={styles.primaryButton} onPress={() => { onComplete(); onClose(); }}>
                <Ionicons name="checkmark-circle" size={18} color="#FFFFFF" />
                <Text style={styles.primaryButtonText}>Segna come fatto</Text>
              </Pressable>
              <Pressable style={styles.secondaryButton} onPress={handleSaveToDiary} disabled={saved}>
                <Text style={styles.secondaryButtonText}>{saved ? 'Salvato nel diario ✓' : 'Salva nel diario'}</Text>
              </Pressable>
              <Pressable onPress={() => setStage('custom')}>
                <Text style={styles.linkText}>...oppure scegli un argomento diverso</Text>
              </Pressable>
            </>
          )}

          {stage === 'custom' && (
            <>
              <Text style={styles.question}>Su quale argomento ti interessa un consiglio?</Text>
              <TextInput
                style={styles.input}
                placeholder="es. ansia da lavoro, motivazione, autostima..."
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
  suggestionText: { fontSize: 16, color: '#4A4A4A', lineHeight: 24, marginBottom: 12 },
  pointerRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 20 },
  pointerText: { fontSize: 13, color: '#7CB342', fontWeight: '500' },
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
  secondaryButton: { padding: 12, alignItems: 'center', marginBottom: 6 },
  secondaryButtonText: { color: '#7CB342', fontSize: 15, fontWeight: '500' },
  linkText: { color: '#999', fontSize: 14, textAlign: 'center', textDecorationLine: 'underline' },
});
