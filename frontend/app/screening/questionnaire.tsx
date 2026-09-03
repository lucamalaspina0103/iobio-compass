import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Pressable, Animated } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAppContext } from '../../src/contexts/AppContext';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

// Error Boundary Component
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
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
            Errore Screening
          </Text>
          <Text style={{ fontSize: 14, color: '#666', marginBottom: 8 }}>
            {this.state.error?.toString() || 'Unknown error'}
          </Text>
          <Text style={{ fontSize: 12, color: '#999', marginTop: 16 }}>
            Build: SCREENING-21-FIX-001
          </Text>
        </SafeAreaView>
      );
    }
    return this.props.children;
  }
}

// Question structure
interface Question {
  id: string;
  area: string;
  text: string;
  scaleType: 'frequency' | 'quality' | 'intensity';
  polarity: 'positive' | 'negative';
  weight: number;
}

// FIXED 21 QUESTIONS (3 per area × 7 areas)
const QUESTIONS: Question[] = [
  // ENERGIA (3)
  { id: 'energia_1', area: 'energia', text: 'Come valuti il tuo livello di energia durante il giorno?', scaleType: 'quality', polarity: 'positive', weight: 1 },
  { id: 'energia_2', area: 'energia', text: 'Quanto spesso ti senti stanco/a senza un motivo chiaro?', scaleType: 'frequency', polarity: 'negative', weight: 1 },
  { id: 'energia_3', area: 'energia', text: 'Nel pomeriggio, quanto ti è facile mantenere concentrazione e lucidità?', scaleType: 'quality', polarity: 'positive', weight: 1 },
  
  // SONNO (3)
  { id: 'sonno_1', area: 'sonno', text: 'Come valuti la qualità complessiva del tuo sonno nell\'ultima settimana?', scaleType: 'quality', polarity: 'positive', weight: 1.2 },
  { id: 'sonno_2', area: 'sonno', text: 'Quanto spesso ti svegli durante la notte?', scaleType: 'frequency', polarity: 'negative', weight: 1.2 },
  { id: 'sonno_3', area: 'sonno', text: 'Quanto ti senti riposato/a al risveglio?', scaleType: 'quality', polarity: 'positive', weight: 1 },
  
  // STRESS (3)
  { id: 'stress_1', area: 'stress', text: 'Negli ultimi 7 giorni, quanto ti sei sentito/a sotto pressione o in tensione?', scaleType: 'intensity', polarity: 'negative', weight: 1.2 },
  { id: 'stress_2', area: 'stress', text: 'Quanto spesso ti capita di rimuginare o di non riuscire a "staccare" mentalmente?', scaleType: 'frequency', polarity: 'negative', weight: 1.2 },
  { id: 'stress_3', area: 'stress', text: 'Quanto ti senti in grado di recuperare calma durante la giornata?', scaleType: 'quality', polarity: 'positive', weight: 1 },
  
  // MOVIMENTO (3)
  { id: 'movimento_1', area: 'movimento', text: 'Negli ultimi 7 giorni, quanto ti sei mosso/a (camminate, sport, attività)?', scaleType: 'frequency', polarity: 'positive', weight: 1 },
  { id: 'movimento_2', area: 'movimento', text: 'Quanto spesso senti rigidità o dolori muscolari/articolari che limitano i movimenti?', scaleType: 'frequency', polarity: 'negative', weight: 1 },
  { id: 'movimento_3', area: 'movimento', text: 'Come valuti la tua sensazione di corpo "sciolto e reattivo" durante la giornata?', scaleType: 'quality', polarity: 'positive', weight: 1 },
  
  // ALIMENTAZIONE (3)
  { id: 'alimentazione_1', area: 'alimentazione', text: 'Come valuti l\'equilibrio della tua alimentazione nell\'ultima settimana?', scaleType: 'quality', polarity: 'positive', weight: 1 },
  { id: 'alimentazione_2', area: 'alimentazione', text: 'Quanto spesso mangi in modo affrettato o distratto, senza ascoltare fame e sazietà?', scaleType: 'frequency', polarity: 'negative', weight: 1 },
  { id: 'alimentazione_3', area: 'alimentazione', text: 'Quanto ti senti stabile come energia dopo i pasti (senza cali forti)?', scaleType: 'quality', polarity: 'positive', weight: 1 },
  
  // PELLE (3)
  { id: 'pelle_1', area: 'pelle', text: 'Come valuti lo stato generale della tua pelle in questo periodo?', scaleType: 'quality', polarity: 'positive', weight: 1 },
  { id: 'pelle_2', area: 'pelle', text: 'Quanto spesso noti sensibilità, rossori o imperfezioni che ti danno fastidio?', scaleType: 'frequency', polarity: 'negative', weight: 1 },
  { id: 'pelle_3', area: 'pelle', text: 'Quanto ti senti soddisfatto/a di idratazione e comfort della pelle (senza "tirare")?', scaleType: 'quality', polarity: 'positive', weight: 1 },
  
  // EQUILIBRIO MENTALE (3)
  { id: 'equilibrio_mentale_1', area: 'equilibrio_mentale', text: 'Quanto ti senti emotivamente centrato/a negli ultimi 7 giorni?', scaleType: 'quality', polarity: 'positive', weight: 1 },
  { id: 'equilibrio_mentale_2', area: 'equilibrio_mentale', text: 'Quanto spesso ti senti sopraffatto/a da pensieri o emozioni difficili da gestire?', scaleType: 'frequency', polarity: 'negative', weight: 1 },
  { id: 'equilibrio_mentale_3', area: 'equilibrio_mentale', text: 'Quanto valuti la tua capacità di ritagliarti pochi minuti per ricaricarti (pausa, respiro, silenzio)?', scaleType: 'quality', polarity: 'positive', weight: 1 },
];

// Scale labels with defensive fallback
const SCALE_LABELS: { [key: string]: string[] } = {
  frequency: ['Mai', 'Raramente', 'A volte', 'Spesso', 'Sempre'],
  quality: ['Molto scarsa', 'Scarsa', 'Discreta', 'Buona', 'Ottima'],
  intensity: ['Per niente', 'Poco', 'Moderata', 'Alta', 'Molto alta'],
};

// Defensive getter for scale labels
const getScaleLabels = (scaleType: string): string[] => {
  return SCALE_LABELS[scaleType] || SCALE_LABELS.frequency;
};

// Area display info
const AREA_INFO: { [key: string]: { name: string; icon: string; color: string } } = {
  energia: { name: 'Energia', icon: 'flash', color: '#FF9800' },
  sonno: { name: 'Sonno', icon: 'moon', color: '#9C27B0' },
  stress: { name: 'Stress', icon: 'alert-circle', color: '#F44336' },
  movimento: { name: 'Movimento', icon: 'walk', color: '#2196F3' },
  alimentazione: { name: 'Alimentazione', icon: 'restaurant', color: '#4CAF50' },
  pelle: { name: 'Pelle', icon: 'water', color: '#00BCD4' },
  equilibrio_mentale: { name: 'Equilibrio Mentale', icon: 'heart', color: '#E91E63' },
};

function QuestionnaireScreen() {
  const router = useRouter();
  const { user, isGuest, setScreeningResult } = useAppContext();
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<number[]>(Array(21).fill(0));
  const [currentAnswer, setCurrentAnswer] = useState(3);
  const [fadeAnim] = useState(new Animated.Value(1));
  const [loading, setLoading] = useState(false);

  const totalQuestions = 21;
  const progress = ((currentQuestionIndex + 1) / totalQuestions) * 100;
  const timeRemaining = Math.ceil((totalQuestions - currentQuestionIndex - 1) * 0.3);

  // Defensive: ensure question exists
  const currentQuestion = QUESTIONS[currentQuestionIndex];
  if (!currentQuestion) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={{ color: '#EF5350', textAlign: 'center', padding: 24 }}>
          Question missing. Please restart.
        </Text>
      </SafeAreaView>
    );
  }

  const areaInfo = AREA_INFO[currentQuestion.area] || { name: 'Area', icon: 'help', color: '#999' };
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
      const saved = await AsyncStorage.getItem('screening_v2_progress');
      if (saved) {
        const { questionIndex, savedAnswers } = JSON.parse(saved);
        setCurrentQuestionIndex(questionIndex);
        setAnswers(savedAnswers);
      }
    } catch (error) {
      console.error('Error loading progress:', error);
    }
  };

  const saveProgress = async (index: number, updatedAnswers: number[]) => {
    try {
      await AsyncStorage.setItem('screening_v2_progress', JSON.stringify({
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
      if (value >= 4) return '💡 Qui potresti migliorare: inizia con piccole azioni quotidiane';
      return '✓ Annotato.';
    } else {
      if (value >= 4) return '🌟 Ottimo: continua così!';
      return '✓ Annotato.';
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
      // Last question (Q21), submit
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
    
    // PART 1: REQUIRED DEBUG LOGGING
    console.log('=== SUBMIT SCREENING V2 ===');
    console.log({
      currentIndex: currentQuestionIndex,
      totalQuestions: QUESTIONS.length,
      lastQuestionId: QUESTIONS[QUESTIONS.length - 1]?.id,
      lastAnswer: finalAnswers[QUESTIONS.length - 1],
      answersCount: finalAnswers.filter(a => a > 0).length,
      allAnswers: finalAnswers,
    });
    
    // Local computation for fallback
    const debugReport: any = { questions: [], areas: {}, iobioIndex: 0 };
    const areaScores: { [area: string]: { scores: number[], weights: number[] } } = {};
    
    try {
      // Calculate scores locally
      QUESTIONS.forEach((q, index) => {
        const value = finalAnswers[index];
        const polarity = q.polarity || 'positive';
        const weight = q.weight || 1;
        
        let questionScore: number;
        if (polarity === 'positive') {
          questionScore = ((value - 1) / 4) * 100;
        } else {
          questionScore = ((5 - value) / 4) * 100;
        }
        
        debugReport.questions.push({ id: q.id, value, polarity, questionScore: questionScore.toFixed(1) });
        
        if (!areaScores[q.area]) {
          areaScores[q.area] = { scores: [], weights: [] };
        }
        areaScores[q.area].scores.push(questionScore * weight);
        areaScores[q.area].weights.push(weight);
      });
      
      // Calculate area averages
      const areaAverages: { [area: string]: number } = {};
      Object.keys(areaScores).forEach(area => {
        const totalWeightedScore = areaScores[area].scores.reduce((a, b) => a + b, 0);
        const totalWeight = areaScores[area].weights.reduce((a, b) => a + b, 0);
        areaAverages[area] = totalWeightedScore / totalWeight;
        debugReport.areas[area] = areaAverages[area].toFixed(1);
      });
      
      // Calculate IOBIO index
      const iobioIndex = Object.values(areaAverages).reduce((a, b) => a + b, 0) / Object.keys(areaAverages).length;
      debugReport.iobioIndex = iobioIndex.toFixed(1);
      
      console.log('Questions:', debugReport.questions);
      console.log('Area Scores:', debugReport.areas);
      console.log('IOBIO Index:', debugReport.iobioIndex);
      
      // Find 3 weakest areas
      const sortedAreas = Object.entries(areaAverages).sort((a, b) => a[1] - b[1]);
      const weakAreas = sortedAreas.slice(0, 3).map(([area]) => area);
      
      // Create local results object
      const localResults = {
        id: `local_${Date.now()}`,
        indice_iobio: Math.round(iobioIndex),
        area_scores: Object.fromEntries(
          Object.entries(areaAverages).map(([k, v]) => [k, Math.round(v)])
        ),
        weak_areas: weakAreas,
        date: new Date().toISOString(),
      };
      
      console.log('Local Results:', localResults);
      
      // Store locally first (safety)
      await AsyncStorage.setItem('iobio_latest_results', JSON.stringify(localResults));
      
      // Try API submit
      try {
        const formattedAnswers = QUESTIONS.map((question, index) => ({
          question_id: question.id,
          area: question.area,
          answer: finalAnswers[index],
          scale_type: question.scaleType,
          polarity: question.polarity || 'positive',
          weight: question.weight || 1,
        }));

        const response = await fetch(`${API_URL}/api/screening/submit`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_id: isGuest ? null : user?.id,
            answers: formattedAnswers,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          console.log('API Response:', data);
          // Use API data if available
          setScreeningResult(data);
          await AsyncStorage.setItem('iobio_latest_results', JSON.stringify(data));
        } else {
          console.warn('API returned error, using local results');
          setScreeningResult(localResults);
        }
      } catch (apiError) {
        console.error('API submit failed:', apiError);
        // Use local results
        setScreeningResult(localResults);
        try {
          alert('Errore salvataggio: continuo in locale');
        } catch (alertError) {
          console.warn('Alert non mostrabile, continuo comunque:', alertError);
        }
      }
      
      // CRITICAL: Always navigate, even if API fails
      await AsyncStorage.removeItem('screening_v2_progress');
      router.replace('/screening/results');
      
    } catch (error) {
      console.error('Critical error in submit:', error);
      alert('Errore durante il calcolo. Riprova.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.progressInfo}>
          <Text style={styles.progressText}>Domanda {currentQuestionIndex + 1}/21</Text>
          <Text style={styles.timeText}>~{timeRemaining} min</Text>
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
          <Text style={styles.questionText}>{currentQuestion.text}</Text>
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
          <TouchableOpacity style={styles.backButton} onPress={handleBack}>
            <Ionicons name="arrow-back" size={20} color="#7CB342" />
            <Text style={styles.backButtonText}>Indietro</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[styles.nextButton, { flex: currentQuestionIndex === 0 ? 1 : undefined }]}
          onPress={handleNext}
          disabled={loading}
        >
          <Text style={styles.nextButtonText}>
            {loading ? 'Caricamento...' : currentQuestionIndex === 20 ? 'Completa' : 'Avanti'}
          </Text>
          {currentQuestionIndex < 20 && <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />}
        </TouchableOpacity>
      </View>

      <Text style={styles.buildLabel}>Build: SCREENING-21-FIX-001</Text>
    </SafeAreaView>
  );
}

// Wrap with ErrorBoundary
export default function WrappedQuestionnaireScreen() {
  return (
    <ErrorBoundary>
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
  progressBar: { height: '100%', backgroundColor: '#7CB342', borderRadius: 3 },
  content: { flex: 1, padding: 24, justifyContent: 'center' },
  areaHeader: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 12, marginBottom: 24, gap: 12 },
  areaName: { fontSize: 18, fontWeight: '600' },
  questionCard: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 24, marginBottom: 32, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 3 },
  questionText: { fontSize: 18, fontWeight: '500', color: '#4A4A4A', lineHeight: 26 },
  answerSection: { marginBottom: 32 },
  buttonSelector: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16, gap: 8 },
  valueButton: { flex: 1, aspectRatio: 1, backgroundColor: '#FFFFFF', borderRadius: 12, borderWidth: 2, borderColor: '#E0E0E0', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  valueButtonSelected: { borderColor: '#7CB342', borderWidth: 3 },
  valueButtonText: { fontSize: 24, fontWeight: '600', color: '#666' },
  valueButtonTextSelected: { color: '#FFFFFF' },
  labelsContainer: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  label: { fontSize: 10, color: '#999', flex: 1, textAlign: 'center' },
  labelActive: { color: '#7CB342', fontWeight: '600' },
  hintContainer: { backgroundColor: '#E8F5E9', borderRadius: 12, padding: 16 },
  hintText: { fontSize: 14, color: '#4A4A4A', lineHeight: 20, textAlign: 'center' },
  buttonContainer: { flexDirection: 'row', padding: 20, gap: 12 },
  backButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16, borderWidth: 2, borderColor: '#7CB342', gap: 8 },
  backButtonText: { color: '#7CB342', fontSize: 16, fontWeight: '600' },
  nextButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#7CB342', borderRadius: 12, padding: 16, gap: 8 },
  nextButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  buildLabel: { fontSize: 10, color: '#7CB342', textAlign: 'center', paddingBottom: 8, fontWeight: '600' },
});
