import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
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
}

interface ScreeningResult {
  indice_iobio: number;
  area_scores: { [key: string]: number };
  weak_areas: string[];
}

// Area icons mapping
const AREA_ICONS: { [key: string]: string } = {
  'Nutrizione': 'nutrition',
  'Movimento': 'walk',
  'Sonno': 'moon',
  'Stress': 'leaf',
  'Relazioni': 'people',
  'Mente': 'bulb',
  'Ambiente': 'earth',
};

// Local task templates for guest mode fallback
const TASK_TEMPLATES: { [key: string]: string[] } = {
  'Nutrizione': [
    'Bevi 8 bicchieri d\'acqua oggi',
    'Mangia almeno 5 porzioni di frutta/verdura',
    'Evita cibi processati per oggi',
    'Prepara un pasto sano fatto in casa',
    'Aggiungi una nuova verdura alla tua dieta',
  ],
  'Movimento': [
    'Fai 10 minuti di stretching mattutino',
    'Cammina almeno 5000 passi oggi',
    'Fai 15 minuti di esercizio fisico',
    'Prendi le scale invece dell\'ascensore',
    'Fai una passeggiata dopo pranzo',
  ],
  'Sonno': [
    'Vai a letto entro le 23:00',
    'Evita schermi 1 ora prima di dormire',
    'Crea una routine serale rilassante',
    'Mantieni la camera da letto fresca e buia',
    'Pratica 5 minuti di respirazione prima di dormire',
  ],
  'Stress': [
    'Pratica 5 minuti di meditazione',
    'Fai 3 respiri profondi ogni ora',
    'Dedica 15 minuti a un hobby rilassante',
    'Scrivi 3 cose per cui sei grato',
    'Fai una pausa consapevole dal lavoro',
  ],
  'Relazioni': [
    'Chiama un amico o familiare',
    'Dedica tempo di qualità a chi ami',
    'Fai un complimento sincero a qualcuno',
    'Pianifica un\'uscita sociale questa settimana',
    'Scrivi un messaggio affettuoso a una persona cara',
  ],
  'Mente': [
    'Leggi per 15 minuti',
    'Impara qualcosa di nuovo oggi',
    'Fai un puzzle o gioco mentale',
    'Scrivi nel tuo diario per 10 minuti',
    'Pratica la mindfulness per 5 minuti',
  ],
  'Ambiente': [
    'Riordina un angolo della tua casa',
    'Passa 15 minuti nella natura',
    'Apri le finestre per arieggiare',
    'Riduci l\'uso di plastica oggi',
    'Cura una pianta o il giardino',
  ],
};

// Generate local 30-day plan based on screening results
const generateLocalPlan = (screeningResult: ScreeningResult | null): PianoTask[] => {
  const tasks: PianoTask[] = [];
  
  // Determine which areas to focus on
  let focusAreas: string[] = [];
  
  if (screeningResult && screeningResult.weak_areas && screeningResult.weak_areas.length > 0) {
    focusAreas = screeningResult.weak_areas;
  } else {
    // Default areas if no screening result
    focusAreas = ['Nutrizione', 'Movimento', 'Sonno', 'Stress'];
  }
  
  // Generate 30 days of tasks
  for (let day = 1; day <= 30; day++) {
    // Rotate through focus areas
    const areaIndex = (day - 1) % focusAreas.length;
    const area = focusAreas[areaIndex];
    
    // Get tasks for this area
    const areaTasks = TASK_TEMPLATES[area] || TASK_TEMPLATES['Nutrizione'];
    const taskIndex = Math.floor((day - 1) / focusAreas.length) % areaTasks.length;
    
    tasks.push({
      id: `local_task_${day}`,
      day,
      task: areaTasks[taskIndex],
      area,
      completed: false,
    });
  }
  
  return tasks;
};

export default function PianoScreen() {
  const router = useRouter();
  const { user, isGuest, screeningResult } = useAppContext();
  
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
      const savedTasks = await AsyncStorage.getItem('piano_tasks');
      
      if (savedTasks) {
        setTasks(JSON.parse(savedTasks));
        setLoading(false);
        return;
      }
      
      // If no saved tasks, generate new plan
      const newTasks = generateLocalPlan(screeningResult);
      setTasks(newTasks);
      
      // Save to local storage
      await AsyncStorage.setItem('piano_tasks', JSON.stringify(newTasks));
      
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
    loadTasks();
    // Expand current day by default
    setExpandedDays([currentDay]);
  }, [loadTasks, currentDay]);
  
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
      await AsyncStorage.setItem('piano_tasks', JSON.stringify(updatedTasks));
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
  
  // Get today's task
  const todayTask = tasks.find(t => t.day === currentDay);
  
  // Group tasks by day
  const tasksByDay: { [key: number]: PianoTask[] } = {};
  tasks.forEach(task => {
    if (!tasksByDay[task.day]) {
      tasksByDay[task.day] = [];
    }
    tasksByDay[task.day].push(task);
  });
  
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
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#4A4A4A" />
          </TouchableOpacity>
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
                Giorno {currentDay} di 30
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
        </View>
        
        {/* Today's Focus Card */}
        {todayTask && (
          <View style={styles.todayCard}>
            <View style={styles.todayHeader}>
              <View style={styles.todayBadge}>
                <Text style={styles.todayBadgeText}>OGGI</Text>
              </View>
              <Text style={styles.todayArea}>{todayTask.area}</Text>
            </View>
            
            <Text style={styles.todayTask}>{todayTask.task}</Text>
            
            <TouchableOpacity 
              style={[
                styles.todayButton,
                todayTask.completed && styles.todayButtonCompleted
              ]}
              onPress={() => toggleTaskCompletion(todayTask.id)}
            >
              <Ionicons 
                name={todayTask.completed ? "checkmark-circle" : "circle-outline"} 
                size={24} 
                color={todayTask.completed ? "#FFFFFF" : "#7CB342"} 
              />
              <Text style={[
                styles.todayButtonText,
                todayTask.completed && styles.todayButtonTextCompleted
              ]}>
                {todayTask.completed ? 'Completato!' : 'Segna come completato'}
              </Text>
            </TouchableOpacity>
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
            const dayCompleted = dayTasks.every(t => t.completed);
            
            return (
              <View key={day} style={styles.dayContainer}>
                <TouchableOpacity 
                  style={[
                    styles.dayHeader,
                    isCurrentDay && styles.dayHeaderCurrent,
                    dayCompleted && isPastDay && styles.dayHeaderCompleted,
                  ]}
                  onPress={() => toggleDayExpansion(day)}
                >
                  <View style={styles.dayInfo}>
                    <View style={[
                      styles.dayNumber,
                      isCurrentDay && styles.dayNumberCurrent,
                      dayCompleted && styles.dayNumberCompleted,
                    ]}>
                      {dayCompleted ? (
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
                          {dayTasks[0].area}
                        </Text>
                      )}
                    </View>
                  </View>
                  
                  <Ionicons 
                    name={isExpanded ? "chevron-up" : "chevron-down"} 
                    size={20} 
                    color="#999" 
                  />
                </TouchableOpacity>
                
                {isExpanded && dayTasks.length > 0 && (
                  <View style={styles.dayContent}>
                    {dayTasks.map(task => (
                      <TouchableOpacity 
                        key={task.id}
                        style={styles.taskItem}
                        onPress={() => toggleTaskCompletion(task.id)}
                      >
                        <Ionicons 
                          name={task.completed ? "checkbox" : "square-outline"} 
                          size={24} 
                          color={task.completed ? "#7CB342" : "#BDBDBD"} 
                        />
                        <Text style={[
                          styles.taskText,
                          task.completed && styles.taskTextCompleted
                        ]}>
                          {task.task}
                        </Text>
                      </TouchableOpacity>
                    ))}
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
          <Text style={styles.buildLabel}>Build: PIANO-SDK-003</Text>
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
  todayCard: {
    backgroundColor: '#7CB342',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  todayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
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
  todayArea: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
    marginLeft: 12,
  },
  todayTask: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    lineHeight: 26,
    marginBottom: 16,
  },
  todayButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
  },
  todayButtonCompleted: {
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  todayButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#7CB342',
    marginLeft: 8,
  },
  todayButtonTextCompleted: {
    color: '#FFFFFF',
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
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },
  taskText: {
    flex: 1,
    fontSize: 15,
    color: '#4A4A4A',
    marginLeft: 12,
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
