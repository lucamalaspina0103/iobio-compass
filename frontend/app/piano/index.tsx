import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  ActivityIndicator,
  RefreshControl
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAppContext } from '../../src/contexts/AppContext';

// Types
interface PianoTask {
  id: string;
  day: number;
  task: string;
  area: string;
  completed: boolean;
  optional: boolean; // true = "extra" task beyond the day's minimum, not required to keep the streak
}

interface ScreeningResult {
  indice_iobio: number;
  area_scores: { [key: string]: number };
  weak_areas: string[];
}

// Area display info - MUST match the 7 real screening areas (see screening/questionnaire.tsx AREA_INFO)
const AREA_INFO: { [key: string]: { name: string; icon: string; color: string } } = {
  energia: { name: 'Energia', icon: 'flash', color: '#FF9800' },
  sonno: { name: 'Sonno', icon: 'moon', color: '#9C27B0' },
  stress: { name: 'Stress', icon: 'alert-circle', color: '#F44336' },
  movimento: { name: 'Movimento', icon: 'walk', color: '#2196F3' },
  alimentazione: { name: 'Alimentazione', icon: 'restaurant', color: '#4CAF50' },
  pelle: { name: 'Pelle', icon: 'water', color: '#00BCD4' },
  equilibrio_mentale: { name: 'Equilibrio Mentale', icon: 'heart', color: '#E91E63' },
};

const getAreaInfo = (area: string) => AREA_INFO[area] || { name: area, icon: 'ellipse', color: '#999' };

// Task pool per area - 15 micro-azioni ciascuna per evitare ripetizioni ravvicinate nei 30 giorni
const TASK_TEMPLATES: { [key: string]: string[] } = {
  energia: [
    "Fai 5 minuti di stretching al risveglio",
    "Bevi un bicchiere d'acqua appena sveglio",
    "Esci all'aria aperta per 10 minuti",
    "Fai una pausa di 5 minuti ogni 2 ore",
    "Mangia uno snack energetico a metà mattina",
    "Evita caffeina dopo le 15:00",
    "Fai 10 respiri profondi durante la giornata",
    "Prendi il sole per 15 minuti",
    "Ascolta musica energizzante per 10 minuti",
    "Fai una breve passeggiata dopo pranzo",
    "Fai una doccia rivitalizzante al mattino",
    "Apri le tende appena sveglio per la luce naturale",
    "Fai 2 minuti di jumping jack per svegliarti",
    "Prepara la colazione la sera prima per non correre",
    "Alzati e stiracchiati ogni ora di lavoro",
  ],
  sonno: [
    "Vai a letto alla stessa ora",
    "Spegni gli schermi 30 minuti prima di dormire",
    "Leggi 10 pagine di un libro rilassante",
    "Prepara la camera per la notte (buio, fresco)",
    "Fai un bagno caldo serale",
    "Evita pasti pesanti dopo le 20:00",
    "Pratica 5 minuti di meditazione serale",
    "Scrivi 3 cose positive della giornata",
    "Bevi una tisana rilassante",
    "Fai stretching leggero prima di dormire",
    "Metti il telefono in un'altra stanza la sera",
    "Fai una doccia tiepida prima di coricarti",
    "Scrivi la lista delle cose da fare domani per liberare la mente",
    "Riduci le luci in casa un'ora prima di dormire",
    "Evita alcol nella serata",
  ],
  stress: [
    "Pratica 2 minuti di respirazione profonda",
    "Scrivi i tuoi pensieri per 5 minuti",
    "Ascolta musica rilassante per 10 minuti",
    "Fai una pausa consapevole senza multitasking",
    "Esci per una camminata di 15 minuti",
    "Chiama un amico per 10 minuti",
    "Pratica la gratitudine: annota 3 cose positive",
    "Fai stretching per rilassare le tensioni",
    "Disconnettiti dai social per 1 ora",
    "Dedica 10 minuti a un hobby che ami",
    "Fai una lista delle priorità del giorno",
    "Prova la tecnica di respirazione 4-7-8",
    "Concediti 5 minuti di silenzio senza distrazioni",
    "Scrivi su carta un pensiero negativo per ridimensionarlo",
    "Fai una risata guardando qualcosa di divertente",
  ],
  movimento: [
    "Cammina per 10 minuti",
    "Fai 10 squat durante una pausa",
    "Prendi le scale invece dell'ascensore",
    "Fai stretching per 5 minuti",
    "Balla per 5 minuti su una canzone che ami",
    "Fai una passeggiata dopo cena",
    "Pratica yoga per 10 minuti",
    "Fai 5 minuti di esercizi a corpo libero",
    "Alzati e muoviti ogni ora",
    "Prova un nuovo sport per 15 minuti",
    "Fai 5000 passi oggi",
    "Parcheggia più lontano e cammina un po' di più",
    "Fai 10 minuti di camminata veloce",
    "Fai qualche piegamento durante la giornata",
    "Fai una sessione di bici o camminata all'aperto",
  ],
  alimentazione: [
    "Mangia una porzione di verdura a pranzo",
    "Bevi 8 bicchieri d'acqua",
    "Mangia frutta fresca come snack",
    "Prepara un pasto sano con ingredienti freschi",
    "Evita cibi processati oggi",
    "Mangia consapevolmente senza distrazioni",
    "Aggiungi proteine sane alla colazione",
    "Riduci lo zucchero raffinato",
    "Prova una nuova ricetta salutare",
    "Mangia noci o semi come snack",
    "Fai la spesa con una lista per evitare acquisti impulsivi",
    "Mastica lentamente ad ogni pasto",
    "Sostituisci una bevanda zuccherata con acqua o tisana",
    "Porta con te uno snack sano fuori casa",
    "Aggiungi una nuova verdura alla tua dieta",
  ],
  pelle: [
    "Applica crema idratante mattina e sera",
    "Bevi acqua regolarmente durante il giorno",
    "Usa protezione solare",
    "Detergi il viso mattina e sera",
    "Mangia cibi ricchi di antiossidanti",
    "Evita di toccarti il viso",
    "Dormi su una federa pulita",
    "Fai uno scrub delicato",
    "Applica una maschera idratante",
    "Limita l'esposizione allo stress",
    "Bevi un tè verde ricco di antiossidanti",
    "Cambia la federa del cuscino questa settimana",
    "Applica il contorno occhi prima di dormire",
    "Evita docce troppo calde che seccano la pelle",
    "Prenditi 5 minuti per un automassaggio al viso",
  ],
  equilibrio_mentale: [
    "Medita per 5 minuti al mattino",
    "Pratica la mindfulness durante un'attività",
    "Scrivi un diario delle emozioni",
    "Fai affermazioni positive allo specchio",
    "Disconnettiti dai social per 2 ore",
    "Pratica la gratitudine",
    "Leggi qualcosa di ispirazionale",
    "Ascolta un podcast motivazionale",
    "Passa tempo nella natura",
    "Pratica il perdono verso te stesso",
    "Fai 3 respiri consapevoli prima di iniziare la giornata",
    "Scrivi una cosa che ti rende orgoglioso/a di te",
    "Concediti una pausa senza sensi di colpa",
    "Sorridi a te stesso/a allo specchio",
    "Condividi un pensiero con una persona di fiducia",
  ],
};

const DEFAULT_AREAS = ['energia', 'sonno', 'stress'];

// Fasi progressive del piano (ispirate al modello "10-20 ramp" e a Tiny Habits/BJ Fogg:
// si parte con 1 sola azione richiesta e si sale gradualmente, non tutto e subito).
interface Phase {
  key: string;
  label: string;
  minRequired: number;
}

const getPhaseForDay = (day: number, totalAreas: number): Phase => {
  const cap = (n: number) => Math.max(1, Math.min(n, totalAreas));
  if (day <= 7) return { key: 'aggancio', label: 'Settimana 1 · Aggancio', minRequired: cap(1) };
  if (day <= 14) return { key: 'consolidamento', label: 'Settimana 2 · Consolidamento', minRequired: cap(2) };
  if (day <= 21) return { key: 'automatismo', label: 'Settimana 3 · Automatismo', minRequired: cap(2) };
  return { key: 'mantenimento', label: 'Settimana 4 · Mantenimento', minRequired: cap(3) };
};

const MILESTONES = [7, 14, 21, 30];

// Generate local 30-day plan based on screening results.
// Ogni giorno propone un'opzione per ciascuna delle aree deboli (di norma 3): l'utente
// sceglie quali completare. Il numero minimo richiesto per "riuscire" la giornata sale
// progressivamente nel corso del mese (vedi getPhaseForDay).
const generateLocalPlan = (screeningResult: ScreeningResult | null): PianoTask[] => {
  const tasks: PianoTask[] = [];

  let focusAreas =
    screeningResult?.weak_areas && screeningResult.weak_areas.length > 0
      ? screeningResult.weak_areas.slice(0, 3)
      : DEFAULT_AREAS;

  focusAreas = focusAreas.map(a => a.toLowerCase().replace(/\s+/g, '_'));

  const areaCursor: { [key: string]: number } = {};
  focusAreas.forEach(a => { areaCursor[a] = 0; });

  for (let day = 1; day <= 30; day++) {
    const { minRequired } = getPhaseForDay(day, focusAreas.length);

    focusAreas.forEach((area, idx) => {
      const pool = TASK_TEMPLATES[area] || TASK_TEMPLATES['energia'];
      const taskText = pool[areaCursor[area] % pool.length];
      areaCursor[area] += 1;

      tasks.push({
        id: `local_task_${day}_${area}`,
        day,
        task: taskText,
        area,
        completed: false,
        optional: idx >= minRequired,
      });
    });
  }

  return tasks;
};

export default function PianoScreen() {
  const router = useRouter();
  const { user, isGuest, screeningResult, isBootstrapped } = useAppContext();

  const [tasks, setTasks] = useState<PianoTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentDay, setCurrentDay] = useState(1);
  const [expandedDays, setExpandedDays] = useState<number[]>([]);

  // Calculate current day based on plan start date
  useEffect(() => {
    const calculateCurrentDay = async () => {
      try {
        const startDateStr = await AsyncStorage.getItem('piano_start_date');
        if (startDateStr) {
          const startDate = new Date(startDateStr);
          const today = new Date();
          const diffTime = today.getTime() - startDate.getTime();
          const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;
          setCurrentDay(Math.min(Math.max(diffDays, 1), 30));
        } else {
          // Set start date if not exists
          await AsyncStorage.setItem('piano_start_date', new Date().toISOString());
          setCurrentDay(1);
        }
      } catch (error) {
        console.error('Error calculating current day:', error);
        setCurrentDay(1);
      }
    };

    calculateCurrentDay();
  }, []);

  // Load tasks
  const loadTasks = useCallback(async () => {
    try {
      // First try to load from local storage
      const savedTasks = await AsyncStorage.getItem('piano_tasks_v2');

      if (savedTasks) {
        setTasks(JSON.parse(savedTasks));
        setLoading(false);
        return;
      }

      // If no saved tasks, generate new plan
      const newTasks = generateLocalPlan(screeningResult);
      setTasks(newTasks);

      // Save to local storage
      await AsyncStorage.setItem('piano_tasks_v2', JSON.stringify(newTasks));

    } catch (error) {
      console.error('Error loading tasks:', error);
      // Generate fallback tasks
      const fallbackTasks = generateLocalPlan(screeningResult);
      setTasks(fallbackTasks);
    } finally {
      setLoading(false);
    }
  }, [screeningResult]);

  useEffect(() => {
    // Wait for AppContext to finish loading the screening result from storage
    // before generating/caching a plan - otherwise we can lock in the default
    // areas instead of the user's real weak areas (race condition).
    if (!isBootstrapped) return;
    loadTasks();
    // Expand current day by default
    setExpandedDays([currentDay]);
  }, [loadTasks, currentDay, isBootstrapped]);

  // Handle refresh
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadTasks();
    setRefreshing(false);
  }, [loadTasks]);

  // Toggle task completion
  const toggleTaskCompletion = async (taskId: string) => {
    const updatedTasks = tasks.map(task =>
      task.id === taskId ? { ...task, completed: !task.completed } : task
    );

    setTasks(updatedTasks);

    // Save to local storage
    try {
      await AsyncStorage.setItem('piano_tasks_v2', JSON.stringify(updatedTasks));
    } catch (error) {
      console.error('Error saving task completion:', error);
    }
  };

  // Toggle day expansion
  const toggleDayExpansion = (day: number) => {
    setExpandedDays(prev =>
      prev.includes(day)
        ? prev.filter(d => d !== day)
        : [...prev, day]
    );
  };

  // Calculate progress
  const completedTasks = tasks.filter(t => t.completed).length;
  const progressPercentage = tasks.length > 0 ? Math.round((completedTasks / tasks.length) * 100) : 0;

  // Group tasks by day
  const tasksByDay: { [key: number]: PianoTask[] } = {};
  tasks.forEach(task => {
    if (!tasksByDay[task.day]) {
      tasksByDay[task.day] = [];
    }
    tasksByDay[task.day].push(task);
  });

  const todayTasks = tasksByDay[currentDay] || [];
  const todayPhase = getPhaseForDay(currentDay, todayTasks.length || 3);
  const todayCompletedCount = todayTasks.filter(t => t.completed).length;
  const todaySucceeded = todayCompletedCount >= todayPhase.minRequired;

  // A day "succeeds" once at least minRequired tasks for that day are completed
  const isDaySucceeded = (day: number, dayTasks: PianoTask[]) => {
    const phase = getPhaseForDay(day, dayTasks.length || 3);
    return dayTasks.filter(t => t.completed).length >= phase.minRequired;
  };

  // Current streak: consecutive successful days counting back from currentDay
  let streak = 0;
  for (let day = currentDay; day >= 1; day--) {
    const dayTasks = tasksByDay[day] || [];
    if (dayTasks.length > 0 && isDaySucceeded(day, dayTasks)) {
      streak++;
    } else {
      break;
    }
  }
  const nextMilestone = MILESTONES.find(m => m > streak);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#7CB342" />
          <Text style={styles.loadingText}>Caricamento piano...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#7CB342']} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#4A4A4A" />
          </Pressable>
          <Text style={styles.headerTitle}>Piano 30 Giorni</Text>
          <View style={styles.headerSpacer} />
        </View>

        {/* Progress Card */}
        <View style={styles.progressCard}>
          <View style={styles.progressHeader}>
            <Ionicons name="trophy" size={32} color="#FFB300" />
            <View style={styles.progressInfo}>
              <Text style={styles.progressTitle}>Il tuo progresso</Text>
              <Text style={styles.progressSubtitle}>
                Giorno {currentDay} di 30 · {todayPhase.label}
              </Text>
            </View>
            <View style={styles.progressCircle}>
              <Text style={styles.progressPercentage}>{progressPercentage}%</Text>
            </View>
          </View>

          <View style={styles.progressBarContainer}>
            <View style={[styles.progressBar, { width: `${progressPercentage}%` }]} />
          </View>

          <Text style={styles.progressStats}>
            {completedTasks} di {tasks.length} attività completate
          </Text>

          {streak > 0 && (
            <View style={styles.streakRow}>
              <Ionicons name="flame" size={18} color="#FF7043" />
              <Text style={styles.streakText}>
                {streak} {streak === 1 ? 'giorno' : 'giorni'} di fila
                {nextMilestone ? ` · prossimo traguardo: ${nextMilestone} giorni` : ' · piano completato!'}
              </Text>
            </View>
          )}
        </View>

        {/* Today's Focus Card */}
        {todayTasks.length > 0 && (
          <View style={styles.todayCard}>
            <View style={styles.todayHeader}>
              <View style={styles.todayBadge}>
                <Text style={styles.todayBadgeText}>OGGI</Text>
              </View>
              <Text style={styles.todayPhaseText}>
                Ne bastano {todayPhase.minRequired} di {todayTasks.length} oggi
              </Text>
            </View>

            {todaySucceeded && (
              <View style={styles.todaySuccessBanner}>
                <Ionicons name="checkmark-circle" size={18} color="#FFFFFF" />
                <Text style={styles.todaySuccessText}>Giornata riuscita, sei a posto!</Text>
              </View>
            )}

            {todayTasks.map(task => {
              const info = getAreaInfo(task.area);
              return (
                <Pressable
                  key={task.id}
                  style={[styles.optionRow, task.completed && styles.optionRowCompleted]}
                  onPress={() => toggleTaskCompletion(task.id)}
                >
                  <Ionicons
                    name={task.completed ? 'checkmark-circle' : 'ellipse-outline'}
                    size={24}
                    color={task.completed ? '#FFFFFF' : 'rgba(255,255,255,0.8)'}
                  />
                  <View style={styles.optionTextWrap}>
                    <Text style={styles.optionAreaTag}>
                      {info.name}{task.optional ? ' · extra' : ''}
                    </Text>
                    <Text style={[styles.optionText, task.completed && styles.optionTextCompleted]}>
                      {task.task}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
        )}

        {/* Days List */}
        <View style={styles.daysSection}>
          <Text style={styles.daysSectionTitle}>Tutte le attività</Text>

          {Array.from({ length: 30 }, (_, i) => i + 1).map(day => {
            const dayTasks = tasksByDay[day] || [];
            const isExpanded = expandedDays.includes(day);
            const isCurrentDay = day === currentDay;
            const isPastDay = day < currentDay;
            const phase = getPhaseForDay(day, dayTasks.length || 3);
            const dayCompletedCount = dayTasks.filter(t => t.completed).length;
            const daySucceeded = dayCompletedCount >= phase.minRequired;

            return (
              <View key={day} style={styles.dayContainer}>
                <Pressable
                  style={[
                    styles.dayHeader,
                    isCurrentDay && styles.dayHeaderCurrent,
                    daySucceeded && isPastDay && styles.dayHeaderCompleted,
                  ]}
                  onPress={() => toggleDayExpansion(day)}
                >
                  <View style={styles.dayInfo}>
                    <View style={[
                      styles.dayNumber,
                      isCurrentDay && styles.dayNumberCurrent,
                      daySucceeded && styles.dayNumberCompleted,
                    ]}>
                      {daySucceeded ? (
                        <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                      ) : (
                        <Text style={[
                          styles.dayNumberText,
                          isCurrentDay && styles.dayNumberTextCurrent,
                        ]}>
                          {day}
                        </Text>
                      )}
                    </View>
                    <View>
                      <Text style={styles.dayTitle}>
                        Giorno {day}
                        {isCurrentDay && ' (Oggi)'}
                      </Text>
                      {dayTasks.length > 0 && (
                        <Text style={styles.dayArea}>
                          {dayCompletedCount}/{dayTasks.length} · almeno {phase.minRequired} per riuscire
                        </Text>
                      )}
                    </View>
                  </View>

                  <Ionicons
                    name={isExpanded ? "chevron-up" : "chevron-down"}
                    size={20}
                    color="#999"
                  />
                </Pressable>

                {isExpanded && dayTasks.length > 0 && (
                  <View style={styles.dayContent}>
                    {dayTasks.map(task => {
                      const info = getAreaInfo(task.area);
                      return (
                        <Pressable
                          key={task.id}
                          style={styles.taskItem}
                          onPress={() => toggleTaskCompletion(task.id)}
                        >
                          <Ionicons
                            name={task.completed ? "checkbox" : "square-outline"}
                            size={24}
                            color={task.completed ? info.color : "#BDBDBD"}
                          />
                          <View style={styles.taskTextWrap}>
                            <Text style={styles.taskAreaTag}>
                              {info.name}{task.optional ? ' · extra' : ''}
                            </Text>
                            <Text style={[
                              styles.taskText,
                              task.completed && styles.taskTextCompleted
                            ]}>
                              {task.task}
                            </Text>
                          </View>
                        </Pressable>
                      );
                    })}
                  </View>
                )}
              </View>
            );
          })}
        </View>

        {/* Guest Mode Notice */}
        {isGuest && (
          <View style={styles.guestNotice}>
            <Ionicons name="information-circle" size={20} color="#FF9800" />
            <Text style={styles.guestNoticeText}>
              Modalità Guest: i progressi sono salvati localmente sul dispositivo.
            </Text>
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.buildLabel}>Build: PIANO-SCELTA-001</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5DC',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#4A4A4A',
  },
  headerSpacer: {
    width: 40,
  },
  progressCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  progressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  progressInfo: {
    flex: 1,
    marginLeft: 12,
  },
  progressTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4A4A4A',
  },
  progressSubtitle: {
    fontSize: 14,
    color: '#999',
    marginTop: 2,
  },
  progressCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#E8F5E9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressPercentage: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#7CB342',
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: '#E0E0E0',
    borderRadius: 4,
    marginBottom: 12,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#7CB342',
    borderRadius: 4,
  },
  progressStats: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  streakRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    gap: 6,
  },
  streakText: {
    fontSize: 13,
    color: '#FF7043',
    fontWeight: '600',
  },
  todayCard: {
    backgroundColor: '#7CB342',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  todayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  todayBadge: {
    backgroundColor: 'rgba(255,255,255,0.3)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  todayBadgeText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  todayPhaseText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.9)',
    fontWeight: '600',
  },
  todaySuccessBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 10,
    padding: 10,
    marginBottom: 12,
    gap: 8,
  },
  todaySuccessText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    gap: 10,
  },
  optionRowCompleted: {
    backgroundColor: 'rgba(255,255,255,0.28)',
  },
  optionTextWrap: {
    flex: 1,
  },
  optionAreaTag: {
    fontSize: 11,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.85)',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  optionText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
    lineHeight: 21,
  },
  optionTextCompleted: {
    textDecorationLine: 'line-through',
    color: 'rgba(255,255,255,0.8)',
  },
  daysSection: {
    marginTop: 8,
  },
  daysSectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4A4A4A',
    marginBottom: 12,
  },
  dayContainer: {
    marginBottom: 8,
  },
  dayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
  },
  dayHeaderCurrent: {
    borderWidth: 2,
    borderColor: '#7CB342',
  },
  dayHeaderCompleted: {
    backgroundColor: '#E8F5E9',
  },
  dayInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dayNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  dayNumberCurrent: {
    backgroundColor: '#7CB342',
  },
  dayNumberCompleted: {
    backgroundColor: '#7CB342',
  },
  dayNumberText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#666',
  },
  dayNumberTextCurrent: {
    color: '#FFFFFF',
  },
  dayTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4A4A4A',
  },
  dayArea: {
    fontSize: 13,
    color: '#999',
    marginTop: 2,
  },
  dayContent: {
    backgroundColor: '#FAFAFA',
    borderRadius: 12,
    padding: 12,
    marginTop: 4,
    marginLeft: 44,
  },
  taskItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
    gap: 10,
  },
  taskTextWrap: {
    flex: 1,
  },
  taskAreaTag: {
    fontSize: 11,
    fontWeight: '700',
    color: '#999',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  taskText: {
    fontSize: 15,
    color: '#4A4A4A',
    lineHeight: 22,
  },
  taskTextCompleted: {
    textDecorationLine: 'line-through',
    color: '#999',
  },
  guestNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF8E1',
    borderRadius: 12,
    padding: 14,
    marginTop: 16,
  },
  guestNoticeText: {
    flex: 1,
    fontSize: 13,
    color: '#F57C00',
    marginLeft: 10,
    lineHeight: 18,
  },
  footer: {
    alignItems: 'center',
    marginTop: 24,
    paddingTop: 16,
  },
  buildLabel: {
    fontSize: 11,
    color: '#7CB342',
    fontWeight: '600',
    letterSpacing: 0.5,
  },
});
