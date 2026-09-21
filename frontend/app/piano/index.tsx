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
import { useAppContext } from '../../src/contexts/AppContext';
import {
  PianoTask,
  getAreaInfo,
  getPhaseForDay,
  getCurrentDay,
  loadLocalTasks,
  saveLocalTasks,
  fetchBackendTasks,
  completeBackendTask,
  MILESTONES,
} from '../../src/lib/pianoPlan';
import { computeStreaks, computeStars, getDayStars } from '../../src/lib/rewards';
import StarRow from '../../src/components/StarRow';

export default function PianoScreen() {
  const router = useRouter();
  const { user, isGuest, screeningResult, isBootstrapped } = useAppContext();

  const [tasks, setTasks] = useState<PianoTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentDay, setCurrentDay] = useState(1);
  const [expandedDays, setExpandedDays] = useState<number[]>([]);

  useEffect(() => {
    getCurrentDay().then(setCurrentDay);
  }, []);

  // Carica il piano: locale per i Guest (privato al dispositivo), dal server per
  // gli utenti registrati (condiviso tra dispositivi). Stessa fonte usata da Oggi.
  const loadTasks = useCallback(async () => {
    try {
      if (isGuest || !user?.id) {
        const local = await loadLocalTasks(screeningResult);
        setTasks(local);
      } else {
        const remote = await fetchBackendTasks(user.id);
        setTasks(remote);
      }
    } catch (error) {
      console.error('Error loading tasks:', error);
      const fallback = await loadLocalTasks(screeningResult);
      setTasks(fallback);
    } finally {
      setLoading(false);
    }
  }, [screeningResult, isGuest, user?.id]);

  useEffect(() => {
    if (!isBootstrapped) return;
    loadTasks();
  }, [loadTasks, isBootstrapped]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadTasks();
    setRefreshing(false);
  }, [loadTasks]);

  const toggleTaskCompletion = async (taskId: string) => {
    // I giorni futuri si possono vedere ma non spuntare in anticipo
    const targetTask = tasks.find(t => t.id === taskId);
    if (targetTask && targetTask.day > currentDay) return;

    const updatedTasks = tasks.map(task =>
      task.id === taskId ? { ...task, completed: !task.completed } : task
    );
    setTasks(updatedTasks);

    if (isGuest || !user?.id) {
      await saveLocalTasks(updatedTasks);
    } else {
      const target = tasks.find(t => t.id === taskId);
      try {
        await completeBackendTask(taskId, !target?.completed);
      } catch (error) {
        console.error('Error saving task completion:', error);
        setTasks(tasks); // rollback in caso di errore di rete
      }
    }
  };

  const toggleDayExpansion = (day: number) => {
    setExpandedDays(prev =>
      prev.includes(day)
        ? prev.filter(d => d !== day)
        : [...prev, day]
    );
  };

  const completedTasks = tasks.filter(t => t.completed).length;
  const progressPercentage = tasks.length > 0 ? Math.round((completedTasks / tasks.length) * 100) : 0;

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

  // Serie e stelle condivise con la schermata Oggi. La serie non si azzera solo perche'
  // oggi non hai ancora fatto i task: se oggi non e' ancora riuscito si conta da ieri.
  const streaks = computeStreaks(tasks, currentDay);
  const streak = streaks.current;
  const stars = computeStars(tasks, streaks.best, currentDay);
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

          <View style={styles.totalStarsRow}>
            <Ionicons name="star" size={18} color="#FFB300" />
            <Text style={styles.totalStarsText}>
              {stars.total} {stars.total === 1 ? 'stella guadagnata' : 'stelle guadagnate'}
              {stars.bonusStars > 0 ? ` (di cui ${stars.bonusStars} di bonus)` : ''}
            </Text>
          </View>

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

                  <View style={styles.dayRight}>
                    {dayTasks.length > 0 && day <= currentDay && (
                      <StarRow
                        earned={getDayStars(dayTasks).earned}
                        max={getDayStars(dayTasks).max}
                        size={13}
                      />
                    )}
                    <Ionicons
                      name={isExpanded ? "chevron-up" : "chevron-down"}
                      size={20}
                      color="#999"
                    />
                  </View>
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
          <Text style={styles.buildLabel}>Build: PIANO-UNIFICATO-001</Text>
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
  totalStarsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    gap: 6,
  },
  totalStarsText: {
    fontSize: 13,
    color: '#8A6D3B',
    fontWeight: '600',
  },
  dayRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
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
