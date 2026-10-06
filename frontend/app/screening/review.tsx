import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAppContext } from '../../src/contexts/AppContext';
import { getAreaInfo } from '../../src/lib/pianoPlan';
import {
  Question,
  REVIEW_AREA_ROTATION,
  getCoreQuestions,
  getDeepDiveQuestions,
  getScaleLabels,
} from '../../src/lib/questionBank';
import { computeLocalResult, runScreeningSubmit } from '../../src/lib/submitScreening';
import { loadFullHistory } from '../../src/lib/veteran';
import { ScreeningHistoryEntry } from '../../src/lib/screeningHistory';
import { parseDate } from '../../src/lib/checkDue';
import { addBackendDiaryEntry } from '../../src/lib/diary';

type Stage = 'intro' | 'questions' | 'reflect' | 'focus';

const REFLECTIONS = [
  { key: 'better', label: 'Cosa è andato meglio in questo periodo?' },
  { key: 'hard', label: 'Cosa ti è costato più fatica?' },
  { key: 'carry', label: 'Cosa vuoi portare con te nel prossimo mese?' },
] as const;

// Revisione del mese: per chi e' nell'app da oltre 3 mesi, al posto dello screening completo.
// 7 domande generali (come in ogni controllo, cosi' l'Indice resta confrontabile) + 2 di
// approfondimento su un'area a rotazione + riflessioni facoltative (finiscono nel diario) +
// la scelta delle aree del prossimo mese: le sceglie la persona, con le piu' basse suggerite.
export default function ReviewScreen() {
  const router = useRouter();
  const { user, isGuest, isBootstrapped, setScreeningResult } = useAppContext();

  const [loadingContext, setLoadingContext] = useState(true);
  const [history, setHistory] = useState<ScreeningHistoryEntry[]>([]);
  const [deepArea, setDeepArea] = useState(REVIEW_AREA_ROTATION[0]);

  const [stage, setStage] = useState<Stage>('intro');
  const [qIndex, setQIndex] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [reflections, setReflections] = useState<{ [key: string]: string }>({ better: '', hard: '', carry: '' });
  const [selected, setSelected] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const registered = !isGuest && !!user?.id;

  useEffect(() => {
    if (!isBootstrapped) return;
    if (!registered) {
      setLoadingContext(false);
      return;
    }
    loadFullHistory(user!.id).then(h => {
      setHistory(h);
      const reviews = h.filter(e => e.kind === 'review').length;
      setDeepArea(REVIEW_AREA_ROTATION[reviews % REVIEW_AREA_ROTATION.length]);
      setLoadingContext(false);
    });
  }, [isBootstrapped, registered, user?.id]);

  const questions: Question[] = useMemo(
    () => [...getCoreQuestions(), ...getDeepDiveQuestions(deepArea)],
    [deepArea]
  );

  // Il punteggio per area ricavato dalle risposte: serve a suggerire le aree del mese
  const suggested = useMemo(() => {
    if (answers.length < questions.length || answers.some(a => !a)) return [] as string[];
    const result = computeLocalResult(questions, answers, 'quick');
    return Object.entries(result.area_scores)
      .sort((a, b) => a[1] - b[1])
      .slice(0, 3)
      .map(([area]) => area);
  }, [answers, questions]);

  const areaScores = useMemo(() => {
    if (answers.length < questions.length || answers.some(a => !a)) return {} as { [k: string]: number };
    return computeLocalResult(questions, answers, 'quick').area_scores;
  }, [answers, questions]);

  const first = history[0];
  const last = history[history.length - 1];
  const daysWithUs = first ? Math.max(0, Math.floor((Date.now() - parseDate(first.date)) / (24 * 60 * 60 * 1000))) : 0;
  const delta = first && last ? last.indice_iobio - first.indice_iobio : 0;

  const totalSteps = 1 + questions.length + 2;
  const stepNumber = stage === 'intro' ? 1 : stage === 'questions' ? 2 + qIndex : stage === 'reflect' ? 2 + questions.length : 3 + questions.length;
  const progress = (stepNumber / totalSteps) * 100;

  const currentQuestion = questions[qIndex];
  const currentValue = answers[qIndex] || 0;

  const startQuestions = () => {
    setAnswers(Array(questions.length).fill(0));
    setQIndex(0);
    setStage('questions');
  };

  const answer = (value: number) => {
    const next = [...answers];
    next[qIndex] = value;
    setAnswers(next);
  };

  const nextQuestion = () => {
    if (!currentValue) return;
    if (qIndex < questions.length - 1) setQIndex(qIndex + 1);
    else setStage('reflect');
  };

  const backFromQuestion = () => {
    if (qIndex > 0) setQIndex(qIndex - 1);
    else setStage('intro');
  };

  const goToFocus = () => {
    setSelected(suggested);
    setStage('focus');
  };

  const toggleArea = (area: string) => {
    setError(null);
    if (selected.includes(area)) {
      setSelected(selected.filter(a => a !== area));
    } else if (selected.length >= 3) {
      setError('Puoi sceglierne al massimo 3: togline una per sceglierne un\'altra.');
    } else {
      setSelected([...selected, area]);
    }
  };

  const finish = async () => {
    if (selected.length === 0 || !registered) return;
    setSubmitting(true);
    setError(null);
    try {
      await runScreeningSubmit({
        questions,
        answers,
        kind: 'review',
        focusAreas: selected,
        isGuest: false,
        userId: user!.id,
        setScreeningResult,
      });

      // Le riflessioni, se scritte, diventano una voce del diario
      const parts = REFLECTIONS.filter(r => reflections[r.key].trim()).map(
        r => `${r.label}\n${reflections[r.key].trim()}`
      );
      if (parts.length > 0) {
        try {
          await addBackendDiaryEntry(user!.id, `Revisione del mese\n\n${parts.join('\n\n')}`, null, null);
        } catch (diaryError) {
          console.error('Error saving review reflections:', diaryError);
        }
      }
      router.replace('/screening/results');
    } catch (e) {
      console.error('Error finishing review:', e);
      setError('Qualcosa è andato storto, riprova tra un attimo.');
      setSubmitting(false);
    }
  };

  // ---- Schermate ----

  if (!isBootstrapped || loadingContext) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#557A6D" />
        </View>
      </SafeAreaView>
    );
  }

  if (!registered) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <Ionicons name="compass" size={56} color="#557A6D" />
          <Text style={styles.title}>La revisione del mese</Text>
          <Text style={styles.text}>È pensata per chi ha un account e cammina con noi da oltre tre mesi.</Text>
          <Pressable style={styles.primary} onPress={() => router.back()}>
            <Text style={styles.primaryText}>Torna indietro</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const header = (
    <View style={styles.header}>
      <View style={styles.headerRow}>
        <Pressable onPress={() => (stage === 'intro' ? router.back() : undefined)} hitSlop={8} disabled={stage !== 'intro'}>
          <Ionicons name="close" size={24} color={stage === 'intro' ? '#4A4A4A' : 'transparent'} />
        </Pressable>
        <Text style={styles.headerTitle}>Revisione del mese</Text>
        <View style={{ width: 24 }} />
      </View>
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${progress}%` }]} />
      </View>
    </View>
  );

  if (stage === 'intro') {
    return (
      <SafeAreaView style={styles.container}>
        {header}
        <ScrollView contentContainerStyle={styles.body}>
          <View style={styles.iconWrap}>
            <Ionicons name="compass" size={44} color="#557A6D" />
          </View>
          <Text style={styles.title}>Un altro mese insieme</Text>
          <Text style={styles.text}>
            {daysWithUs > 0 ? `Sei con noi da ${daysWithUs} giorni. ` : ''}È il momento di guardare il percorso fatto e di scegliere tu dove andare adesso.
          </Text>

          {first && last && first.id !== last.id && (
            <View style={styles.summaryCard}>
              <Text style={styles.summaryTitle}>Il tuo percorso</Text>
              <Text style={styles.summaryLine}>
                Indice IOBIO: {first.indice_iobio} → {last.indice_iobio}
                {delta > 0 ? `  (+${delta})` : delta < 0 ? `  (${delta})` : '  (stabile)'}
              </Text>
              <Text style={styles.summaryHint}>Dal primo screening all'ultimo controllo.</Text>
            </View>
          )}

          <View style={styles.stepsCard}>
            <Text style={styles.stepLine}>• {questions.length} domande veloci, circa 3 minuti</Text>
            <Text style={styles.stepLine}>• Due righe di riflessione, solo se ti va</Text>
            <Text style={styles.stepLine}>• Scegli tu le aree del prossimo mese</Text>
          </View>

          <Pressable style={styles.primary} onPress={startQuestions}>
            <Text style={styles.primaryText}>Iniziamo</Text>
          </Pressable>
          <Pressable onPress={() => router.back()}>
            <Text style={styles.secondaryText}>Non ora</Text>
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (stage === 'questions' && currentQuestion) {
    const info = getAreaInfo(currentQuestion.area);
    const labels = getScaleLabels(currentQuestion.scaleType);
    const isDeep = !currentQuestion.id.endsWith('_1');
    return (
      <SafeAreaView style={styles.container}>
        {header}
        <ScrollView contentContainerStyle={styles.body}>
          <View style={[styles.areaChip, { backgroundColor: info.color + '20' }]}>
            <Ionicons name={info.icon as any} size={20} color={info.color} />
            <Text style={[styles.areaChipText, { color: info.color }]}>
              {isDeep ? `Approfondimento · ${info.name}` : info.name}
            </Text>
          </View>
          <Text style={styles.question}>{currentQuestion.text}</Text>

          {labels.map((label, i) => {
            const value = i + 1;
            const active = currentValue === value;
            return (
              <Pressable
                key={label}
                style={[styles.option, active && { borderColor: info.color, backgroundColor: info.color + '18' }]}
                onPress={() => answer(value)}
              >
                <View style={[styles.radio, active && { borderColor: info.color, backgroundColor: info.color }]}>
                  {active && <Ionicons name="checkmark" size={14} color="#FFFFFF" />}
                </View>
                <Text style={[styles.optionText, active && { color: info.color, fontWeight: '700' }]}>{label}</Text>
              </Pressable>
            );
          })}

          <View style={styles.navRow}>
            <Pressable style={styles.backBtn} onPress={backFromQuestion}>
              <Text style={styles.backText}>Indietro</Text>
            </Pressable>
            <Pressable style={[styles.nextBtn, !currentValue && styles.disabled]} onPress={nextQuestion} disabled={!currentValue}>
              <Text style={styles.primaryText}>Avanti</Text>
            </Pressable>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (stage === 'reflect') {
    return (
      <SafeAreaView style={styles.container}>
        {header}
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
            <Text style={styles.title}>Due righe per te</Text>
            <Text style={styles.text}>Se ti va, scrivi: finiranno nel tuo diario, solo per te. Puoi saltare.</Text>
            {REFLECTIONS.map(r => (
              <View key={r.key} style={styles.reflectBlock}>
                <Text style={styles.reflectLabel}>{r.label}</Text>
                <TextInput
                  style={styles.reflectInput}
                  multiline
                  value={reflections[r.key]}
                  onChangeText={text => setReflections({ ...reflections, [r.key]: text })}
                  placeholder="Scrivi qui..."
                  textAlignVertical="top"
                />
              </View>
            ))}
            <View style={styles.navRow}>
              <Pressable style={styles.backBtn} onPress={() => { setQIndex(questions.length - 1); setStage('questions'); }}>
                <Text style={styles.backText}>Indietro</Text>
              </Pressable>
              <Pressable style={styles.nextBtn} onPress={goToFocus}>
                <Text style={styles.primaryText}>Avanti</Text>
              </Pressable>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  // stage === 'focus'
  return (
    <SafeAreaView style={styles.container}>
      {header}
      <ScrollView contentContainerStyle={styles.body}>
        <Text style={styles.title}>Dove vuoi andare adesso?</Text>
        <Text style={styles.text}>
          Scegli da 1 a 3 aree su cui lavorare nel prossimo mese. Ti suggeriamo quelle dove c'è più margine, ma decidi tu.
        </Text>

        {Object.keys(areaScores)
          .sort((a, b) => areaScores[a] - areaScores[b])
          .map(area => {
            const info = getAreaInfo(area);
            const active = selected.includes(area);
            return (
              <Pressable
                key={area}
                style={[styles.areaRow, active && { borderColor: info.color, backgroundColor: info.color + '14' }]}
                onPress={() => toggleArea(area)}
              >
                <View style={[styles.areaIcon, { backgroundColor: info.color + '25' }]}>
                  <Ionicons name={info.icon as any} size={22} color={info.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.areaName}>{info.name}</Text>
                  <Text style={styles.areaMeta}>
                    {areaScores[area]}/100{suggested.includes(area) ? ' · suggerita' : ''}
                  </Text>
                </View>
                <Ionicons
                  name={active ? 'checkmark-circle' : 'ellipse-outline'}
                  size={26}
                  color={active ? info.color : '#BDBDBD'}
                />
              </Pressable>
            );
          })}

        {error && <Text style={styles.errorText}>{error}</Text>}

        <Pressable
          style={[styles.primary, (selected.length === 0 || submitting) && styles.disabled]}
          onPress={finish}
          disabled={selected.length === 0 || submitting}
        >
          {submitting ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.primaryText}>Crea il mio prossimo mese</Text>
          )}
        </Pressable>
        <Pressable onPress={() => setStage('reflect')} disabled={submitting}>
          <Text style={styles.secondaryText}>Indietro</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5DC' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 14 },
  header: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 4 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  headerTitle: { fontSize: 15, fontWeight: '700', color: '#4A4A4A' },
  progressTrack: { height: 6, backgroundColor: '#E0E0E0', borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: 6, backgroundColor: '#557A6D', borderRadius: 3 },
  body: { padding: 20, paddingBottom: 40 },
  iconWrap: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#E4EEEA', alignItems: 'center', justifyContent: 'center', alignSelf: 'center', marginTop: 8, marginBottom: 16 },
  title: { fontSize: 24, fontWeight: '700', color: '#4A4A4A', textAlign: 'center', marginBottom: 10 },
  text: { fontSize: 15, color: '#666', lineHeight: 22, textAlign: 'center', marginBottom: 18 },
  summaryCard: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, marginBottom: 14, gap: 4 },
  summaryTitle: { fontSize: 13, fontWeight: '700', color: '#557A6D', textTransform: 'uppercase', letterSpacing: 0.5 },
  summaryLine: { fontSize: 17, fontWeight: '600', color: '#4A4A4A' },
  summaryHint: { fontSize: 12, color: '#999' },
  stepsCard: { backgroundColor: '#FFFBF0', borderRadius: 16, padding: 16, marginBottom: 22, gap: 6 },
  stepLine: { fontSize: 14, color: '#4A4A4A', lineHeight: 20 },
  primary: { backgroundColor: '#557A6D', borderRadius: 12, padding: 16, alignItems: 'center', marginBottom: 6 },
  primaryText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  secondaryText: { color: '#999', fontSize: 15, textAlign: 'center', padding: 12 },
  disabled: { opacity: 0.5 },
  areaChip: { flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'flex-start', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 6, marginBottom: 16 },
  areaChipText: { fontSize: 14, fontWeight: '700' },
  question: { fontSize: 20, fontWeight: '600', color: '#4A4A4A', lineHeight: 28, marginBottom: 20 },
  option: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#FFFFFF', borderRadius: 12, padding: 14, borderWidth: 2, borderColor: '#E0E0E0', marginBottom: 10 },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: '#BDBDBD', alignItems: 'center', justifyContent: 'center' },
  optionText: { fontSize: 16, color: '#4A4A4A' },
  navRow: { flexDirection: 'row', gap: 12, marginTop: 14 },
  backBtn: { flex: 1, borderRadius: 12, padding: 16, alignItems: 'center', backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E0E0E0' },
  backText: { color: '#666', fontSize: 16, fontWeight: '600' },
  nextBtn: { flex: 2, backgroundColor: '#557A6D', borderRadius: 12, padding: 16, alignItems: 'center' },
  reflectBlock: { marginBottom: 14 },
  reflectLabel: { fontSize: 14, fontWeight: '600', color: '#4A4A4A', marginBottom: 6 },
  reflectInput: { backgroundColor: '#FFFFFF', borderRadius: 12, padding: 14, fontSize: 15, minHeight: 84, borderWidth: 1, borderColor: '#E0E0E0' },
  areaRow: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#FFFFFF', borderRadius: 14, padding: 12, borderWidth: 2, borderColor: '#E0E0E0', marginBottom: 10 },
  areaIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  areaName: { fontSize: 16, fontWeight: '600', color: '#4A4A4A' },
  areaMeta: { fontSize: 12, color: '#999', marginTop: 2 },
  errorText: { color: '#C62828', fontSize: 14, textAlign: 'center', marginVertical: 8 },
});
