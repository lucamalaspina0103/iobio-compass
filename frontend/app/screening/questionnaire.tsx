import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, Pressable, Animated } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAppContext } from '../../src/contexts/AppContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ALL_QUESTIONS, getCoreQuestions, getScaleLabels, questionText } from '../../src/lib/questionBank';
import { getAreaInfo } from '../../src/lib/pianoPlan';
import { useI18n } from '../../src/i18n';
import { runScreeningSubmit } from '../../src/lib/submitScreening';

// Error Boundary Component
class ErrorBoundary extends React.Component<
  { children: React.ReactNode; title: string },
  { hasError: boolean; error: any }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <SafeAreaView style={{ flex: 1, backgroundColor: '#F5F5DC', padding: 24, justifyContent: 'center' }}>
          <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#EF5350', marginBottom: 16 }}>
            {this.props.title}
          </Text>
          <Text style={{ fontSize: 14, color: '#666', marginBottom: 8 }}>
            {this.state.error?.toString() || 'Unknown error'}
          </Text>
        </SafeAreaView>
      );
    }
    return this.props.children;
  }
}

function QuestionnaireScreen() {
  const router = useRouter();
  const { t } = useI18n();
  const { user, isGuest, setScreeningResult } = useAppContext();
  const { mode: modeParam } = useLocalSearchParams<{ mode?: string }>();
  const isQuick = modeParam === 'quick';
  const QUESTIONS = useMemo(
    () => (isQuick ? getCoreQuestions() : ALL_QUESTIONS),
    [isQuick]
  );
  // Progressi salvati separati per tipo, cosi' un controllo rapido non riprende un questionario completo lasciato a meta'
  const PROGRESS_KEY = isQuick ? 'screening_quick_progress' : 'screening_v2_progress';
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<number[]>(Array(QUESTIONS.length).fill(0));
  const [currentAnswer, setCurrentAnswer] = useState(3);
  const [fadeAnim] = useState(new Animated.Value(1));
  const [loading, setLoading] = useState(false);

  const totalQuestions = QUESTIONS.length;
  const progress = ((currentQuestionIndex + 1) / totalQuestions) * 100;
  const timeRemaining = Math.ceil((totalQuestions - currentQuestionIndex - 1) * 0.3);

  // Defensive: ensure question exists
  const currentQuestion = QUESTIONS[currentQuestionIndex];
  if (!currentQuestion) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={{ color: '#EF5350', textAlign: 'center', padding: 24 }}>
          {t('quest.errMissing')}
        </Text>
      </SafeAreaView>
    );
  }

  const areaInfo = getAreaInfo(currentQuestion.area);
  const scaleLabels = getScaleLabels(currentQuestion.scaleType);
  const polarity = currentQuestion.polarity || 'positive'; // Defensive default

  useEffect(() => {
    loadSavedProgress();
  }, []);

  useEffect(() => {
    if (answers[currentQuestionIndex] > 0) {
      setCurrentAnswer(answers[currentQuestionIndex]);
    } else {
      setCurrentAnswer(3);
    }
    
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [currentQuestionIndex]);

  const loadSavedProgress = async () => {
    try {
      const saved = await AsyncStorage.getItem(PROGRESS_KEY);
      if (saved) {
        const { questionIndex, savedAnswers } = JSON.parse(saved);
        // Solo se coerente con questo questionario (stesso numero di domande)
        if (Array.isArray(savedAnswers) && savedAnswers.length === QUESTIONS.length && questionIndex < QUESTIONS.length) {
          setCurrentQuestionIndex(questionIndex);
          setAnswers(savedAnswers);
        }
      }
    } catch (error) {
      console.error('Error loading progress:', error);
    }
  };

  const saveProgress = async (index: number, updatedAnswers: number[]) => {
    try {
      await AsyncStorage.setItem(PROGRESS_KEY, JSON.stringify({
        questionIndex: index,
        savedAnswers: updatedAnswers,
      }));
    } catch (error) {
      console.error('Error saving progress:', error);
    }
  };

  const handleAnswerChange = (value: number) => {
    setCurrentAnswer(value);
  };

  const getSmartHint = (value: number, polarity: string): string => {
    if (polarity === 'negative') {
      if (value >= 4) return t('quest.hintHigh');
      return t('quest.noted');
    } else {
      if (value >= 4) return t('quest.hintGreat');
      return t('quest.noted');
    }
  };

  const handleNext = () => {
    // Ensure current answer is saved before proceeding
    const updatedAnswers = [...answers];
    updatedAnswers[currentQuestionIndex] = currentAnswer;
    setAnswers(updatedAnswers);

    if (currentQuestionIndex < totalQuestions - 1) {
      // Not last question, go to next
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }).start(() => {
        const nextIndex = currentQuestionIndex + 1;
        setCurrentQuestionIndex(nextIndex);
        saveProgress(nextIndex, updatedAnswers);
        fadeAnim.setValue(1);
      });
    } else {
      // Ultima domanda, invio
      submitScreening(updatedAnswers);
    }
  };

  const handleBack = () => {
    if (currentQuestionIndex > 0) {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }).start(() => {
        const prevIndex = currentQuestionIndex - 1;
        setCurrentQuestionIndex(prevIndex);
        saveProgress(prevIndex, answers);
        fadeAnim.setValue(1);
      });
    }
  };

  const submitScreening = async (finalAnswers: number[]) => {
    setLoading(true);
    try {
      await runScreeningSubmit({
        questions: QUESTIONS,
        answers: finalAnswers,
        kind: isQuick ? 'quick' : 'full',
        isGuest,
        userId: user?.id ?? null,
        setScreeningResult,
      });
      await AsyncStorage.removeItem(PROGRESS_KEY);
      router.replace('/screening/results');
    } catch (error) {
      console.error('Critical error in submit:', error);
      alert(t('quest.errCalc'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.progressInfo}>
          <Text style={styles.progressText}>{isQuick ? t('quest.quick') + ' · ' : ''}{t('quest.progress', { n: currentQuestionIndex + 1, total: totalQuestions })}</Text>
          <Text style={styles.timeText}>{t('quest.minutes', { n: timeRemaining })}</Text>
        </View>
        <View style={styles.progressBarContainer}>
          <View style={[styles.progressBar, { width: `${progress}%` }]} />
        </View>
      </View>

      <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
        <View style={[styles.areaHeader, { backgroundColor: areaInfo.color + '20' }]}>
          <Ionicons name={areaInfo.icon as any} size={32} color={areaInfo.color} />
          <Text style={[styles.areaName, { color: areaInfo.color }]}>{areaInfo.name}</Text>
        </View>

        <View style={styles.questionCard}>
          <Text style={styles.questionText}>{questionText(currentQuestion)}</Text>
        </View>

        <View style={styles.answerSection}>
          <View style={styles.buttonSelector}>
            {[1, 2, 3, 4, 5].map((value) => (
              <Pressable
                key={value}
                style={[
                  styles.valueButton,
                  currentAnswer === value && [styles.valueButtonSelected, { backgroundColor: areaInfo.color }],
                ]}
                onPress={() => handleAnswerChange(value)}
              >
                <Text style={[
                  styles.valueButtonText,
                  currentAnswer === value && styles.valueButtonTextSelected
                ]}>
                  {value}
                </Text>
              </Pressable>
            ))}
          </View>

          <View style={styles.labelsContainer}>
            {scaleLabels.map((label, index) => (
              <Text key={index} style={[
                styles.label,
                currentAnswer === index + 1 && styles.labelActive
              ]}>
                {label}
              </Text>
            ))}
          </View>

          <View style={styles.hintContainer}>
            <Text style={styles.hintText}>{getSmartHint(currentAnswer, polarity)}</Text>
          </View>
        </View>
      </Animated.View>

      <View style={styles.buttonContainer}>
        {currentQuestionIndex > 0 && (
          <Pressable style={styles.backButton} onPress={handleBack}>
            <Ionicons name="arrow-back" size={20} color="#557A6D" />
            <Text style={styles.backButtonText}>{t('quest.back')}</Text>
          </Pressable>
        )}
        <Pressable
          style={[styles.nextButton, { flex: currentQuestionIndex === 0 ? 1 : undefined }]}
          onPress={handleNext}
          disabled={loading}
        >
          <Text style={styles.nextButtonText}>
            {loading ? t('quest.loading') : currentQuestionIndex === totalQuestions - 1 ? t('quest.complete') : t('quest.next')}
          </Text>
          {currentQuestionIndex < totalQuestions - 1 && <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />}
        </Pressable>
      </View>

    </SafeAreaView>
  );
}

// Wrap with ErrorBoundary
export default function WrappedQuestionnaireScreen() {
  const { t } = useI18n();
  return (
    <ErrorBoundary title={t('quest.errTitle')}>
      <QuestionnaireScreen />
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5DC' },
  header: { padding: 20, paddingTop: 8 },
  progressInfo: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  progressText: { fontSize: 16, fontWeight: '600', color: '#4A4A4A' },
  timeText: { fontSize: 14, color: '#999' },
  progressBarContainer: { height: 6, backgroundColor: '#E0E0E0', borderRadius: 3, overflow: 'hidden' },
  progressBar: { height: '100%', backgroundColor: '#557A6D', borderRadius: 3 },
  content: { flex: 1, padding: 24, justifyContent: 'center' },
  areaHeader: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 12, marginBottom: 24, gap: 12 },
  areaName: { fontSize: 18, fontWeight: '600' },
  questionCard: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 24, marginBottom: 32, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 3 },
  questionText: { fontSize: 18, fontWeight: '500', color: '#4A4A4A', lineHeight: 26 },
  answerSection: { marginBottom: 32 },
  buttonSelector: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16, gap: 8 },
  valueButton: { flex: 1, aspectRatio: 1, backgroundColor: '#FFFFFF', borderRadius: 12, borderWidth: 2, borderColor: '#E0E0E0', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  valueButtonSelected: { borderColor: '#557A6D', borderWidth: 3 },
  valueButtonText: { fontSize: 24, fontWeight: '600', color: '#666' },
  valueButtonTextSelected: { color: '#FFFFFF' },
  labelsContainer: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  label: { fontSize: 10, color: '#999', flex: 1, textAlign: 'center' },
  labelActive: { color: '#557A6D', fontWeight: '600' },
  hintContainer: { backgroundColor: '#E4EEEA', borderRadius: 12, padding: 16 },
  hintText: { fontSize: 14, color: '#4A4A4A', lineHeight: 20, textAlign: 'center' },
  buttonContainer: { flexDirection: 'row', padding: 20, gap: 12 },
  backButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16, borderWidth: 2, borderColor: '#557A6D', gap: 8 },
  backButtonText: { color: '#557A6D', fontSize: 16, fontWeight: '600' },
  nextButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#557A6D', borderRadius: 12, padding: 16, gap: 8 },
  nextButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  buildLabel: { fontSize: 10, color: '#557A6D', textAlign: 'center', paddingBottom: 8, fontWeight: '600' },
});
