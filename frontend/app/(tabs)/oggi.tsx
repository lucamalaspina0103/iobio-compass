import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, Modal, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
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
  getWeeklySummary,
} from '../../src/lib/pianoPlan';
import { getDailyReflection, CHECKIN_LABELS } from '../../src/lib/checkinReflection';
import {
  computeStreaks,
  computeStars,
  getDayStars,
  MILESTONE_MESSAGES,
  MILESTONE_STAR_BONUS,
  getMilestoneStatLine,
  loadCelebrated,
  saveCelebrated,
  getPendingMilestone,
} from '../../src/lib/rewards';
import { MILESTONES } from '../../src/lib/pianoPlan';
import StarRow from '../../src/components/StarRow';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL;
const CHECKIN_TODAY_KEY = 'checkin_today';

const todayDateStr = () => new Date().toISOString().slice(0, 10); // YYYY-MM-DD

export default function OggiScreen() {
  const router = useRouter();
  const { user, isGuest, screeningResult, isBootstrapped } = useAppContext();
  const [allTasks, setAllTasks] = useState<PianoTask[]>([]);
  const [currentDay, setCurrentDay] = useState(1);
  const [showCheckin, setShowCheckin] = useState(false);
  const [checkinData, setCheckinData] = useState({ energia: 0, umore: 0, sonno: 0 });
  const [loading, setLoading] = useState(false);
  const [todaysReflection, setTodaysReflection] = useState<{ area: string; question: string } | null>(null);
  const [showReflection, setShowReflection] = useState(false);
  const [celebrated, setCelebrated] = useState<number[]>([]);
  const [celebratedLoaded, setCelebratedLoaded] = useState(false);
  const [celebration, setCelebration] = useState<number | null>(null);

  useEffect(() => {
    // Aspetta che AppContext finisca di caricare user/isGuest da storage, altrimenti
    // interroghiamo la fonte sbagliata (bug gia' risolto in precedenza, da non perdere).
    if (!isBootstrapped) return;
    loadTasks();
    loadTodaysCheckin();
    loadCelebrated().then(list => {
      setCelebrated(list);
      setCelebratedLoaded(true);
    });
  }, [isBootstrapped]);

  // Festeggia un nuovo traguardo di serie (una sola volta per traguardo), ma mai mentre
  // e' aperta un'altra finestra (check-in / riflessione).
  useEffect(() => {
    if (!celebratedLoaded || allTasks.length === 0 || celebration !== null) return;
    if (showCheckin || showReflection) return;
    const { best } = computeStreaks(allTasks, currentDay);
    const pending = getPendingMilestone(best, celebrated);
    if (pending !== null) setCelebration(pending);
  }, [allTasks, currentDay, celebrated, celebratedLoaded, showCheckin, showReflection, celebration]);

  const dismissCelebration = async () => {
    if (celebration === null) return;
    // Segna come festeggiati anche i traguardi inferiori, per non accodare messaggi arretrati
    const updated = Array.from(new Set([...celebrated, ...MILESTONES.filter(m => m <= celebration)]));
    setCelebrated(updated);
    setCelebration(null);
    await saveCelebrated(updated);
  };

  const loadTodaysCheckin = async () => {
    try {
      const saved = await AsyncStorage.getItem(CHECKIN_TODAY_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.date === todayDateStr()) {
          setTodaysReflection(parsed.reflection);
        }
      }
    } catch (error) {
      console.error('Error loading today\'s check-in:', error);
    }
  };

  const loadTasks = async () => {
    try {
      const day = await getCurrentDay();
      setCurrentDay(day);

      if (isGuest || !user?.id) {
        const local = await loadLocalTasks(screeningResult);
        setAllTasks(local);
      } else {
        const remote = await fetchBackendTasks(user.id);
        setAllTasks(remote);
      }
    } catch (error) {
      console.error('Error loading tasks:', error);
    }
  };

  // Stessa fonte dati (locale per Guest, server per utenti registrati) usata dalla
  // schermata "Piano 30 giorni", cosi' un task flaggato qui risulta flaggato anche li'.
  const toggleTask = async (taskId: string, completed: boolean) => {
    const updated = allTasks.map(t => (t.id === taskId ? { ...t, completed: !completed } : t));
    setAllTasks(updated);

    try {
      if (isGuest || !user?.id) {
        await saveLocalTasks(updated);
      } else {
        await completeBackendTask(taskId, !completed);
      }
    } catch (error) {
      setAllTasks(allTasks); // rollback
      Alert.alert('Errore', 'Impossibile aggiornare il task');
    }
  };

  const submitCheckin = async () => {
    if (checkinData.energia === 0 || checkinData.umore === 0 || checkinData.sonno === 0) {
      Alert.alert('Attenzione', 'Completa tutte le domande');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/checkin/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: isGuest ? null : user?.id,
          ...checkinData,
        }),
      });

      if (response.ok) {
        const reflection = getDailyReflection(checkinData);
        setTodaysReflection(reflection);
        await AsyncStorage.setItem(CHECKIN_TODAY_KEY, JSON.stringify({
          date: todayDateStr(),
          data: checkinData,
          reflection,
        }));
        setShowCheckin(false);
        setShowReflection(true);
        setCheckinData({ energia: 0, umore: 0, sonno: 0 });
      }
    } catch (error) {
      Alert.alert('Errore', 'Impossibile salvare il check-in');
    } finally {
      setLoading(false);
    }
  };

  const todayTasks = allTasks.filter(t => t.day === currentDay);
  const tomorrowTasks = allTasks.filter(t => t.day === currentDay + 1);
  const todayPhase = getPhaseForDay(currentDay, todayTasks.length || 3);
  const completedCount = todayTasks.filter(t => t.completed).length;
  const progress = todayTasks.length > 0 ? (completedCount / todayTasks.length) * 100 : 0;
  const todaySucceeded = completedCount >= todayPhase.minRequired;

  // Sintesi settimanale con 3 consigli da esperti, solo nei giorni di checkpoint
  // (7/14/21/28), prima del check-in - le aree deboli si ricavano dai task stessi
  // cosi' funziona identico sia in modalita' Guest (locale) sia registrata (server).
  const weakAreasFromTasks = Array.from(
    new Set(allTasks.filter(t => t.day === 1).map(t => t.area))
  );
  const weeklySummary = getWeeklySummary(currentDay, weakAreasFromTasks, allTasks);

  // Stelle: una per azione completata (solo giorni fino a oggi) + bonus dei traguardi
  const streaks = computeStreaks(allTasks, currentDay);
  const stars = computeStars(allTasks, streaks.best, currentDay);
  const dayStars = getDayStars(todayTasks);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.content}>
          <View style={styles.headerRow}>
            <View style={styles.header}>
              <Text style={styles.greeting}>Ciao! 🌿</Text>
              <Text style={styles.date}>
                {new Date().toLocaleDateString('it-IT', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long'
                })}
              </Text>
            </View>
            {allTasks.length > 0 && (
              <View style={styles.starChip}>
                <Ionicons name="star" size={18} color="#FFB300" />
                <Text style={styles.starChipText}>{stars.total}</Text>
              </View>
            )}
          </View>

          {screeningResult && (
            <View style={styles.scoreCard}>
              <View style={styles.scoreContent}>
                <Text style={styles.scoreLabel}>Il tuo Indice IOBIO</Text>
                <Text style={styles.scoreValue}>{screeningResult.indice_iobio}</Text>
              </View>
              <Ionicons name="leaf" size={48} color="#7CB342" />
            </View>
          )}

          {weeklySummary && (
            <View style={styles.weeklyCard}>
              <View style={styles.weeklyHeader}>
                <Ionicons name="calendar" size={22} color="#4A4A4A" />
                <Text style={styles.weeklyTitle}>La tua settimana {weeklySummary.weekNumber}</Text>
              </View>
              <Text style={styles.weeklyRecap}>
                {weeklySummary.daysSucceededInWeek} giorni riusciti su {weeklySummary.totalDaysInWeek} questa settimana
              </Text>

              {weeklySummary.tips.map((wt) => {
                const info = getAreaInfo(wt.area);
                return (
                  <View key={wt.area} style={styles.weeklyTipRow}>
                    <View style={[styles.weeklyTipDot, { backgroundColor: info.color }]} />
                    <View style={styles.taskContent}>
                      <Text style={styles.weeklyTipText}>{wt.tip}</Text>
                      <Text style={styles.weeklyTipSource}>
                        {wt.expert.name} · {wt.expert.role}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>
          )}

          {!todaysReflection && (
            <View style={styles.inviteRow}>
              <Ionicons name="arrow-down" size={14} color="#7CB342" />
              <Text style={styles.inviteText}>
                Prima il check-in, poi i task: insieme per il tuo benessere olistico
              </Text>
            </View>
          )}

          <Pressable
            style={styles.checkinButton}
            onPress={() => setShowCheckin(true)}
          >
            <Ionicons
              name={todaysReflection ? 'checkmark-circle' : 'heart-circle'}
              size={32}
              color="#7CB342"
            />
            <View style={styles.checkinContent}>
              <Text style={styles.checkinTitle}>Check-in giornaliero</Text>
              <Text style={styles.checkinSubtitle}>
                {todaysReflection ? 'Fatto per oggi · tocca per rifarlo' : '1 minuto per il tuo benessere'}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color="#7CB342" />
          </Pressable>

          {todaysReflection && (
            <Pressable style={styles.reflectionCard} onPress={() => setShowReflection(true)}>
              <Ionicons name="help-circle" size={22} color="#7CB342" />
              <View style={styles.taskContent}>
                <Text style={styles.reflectionLabel}>Un pensiero per oggi</Text>
                <Text style={styles.reflectionQuestion}>{todaysReflection.question}</Text>
              </View>
            </Pressable>
          )}

          <Pressable
            style={styles.coachButton}
            onPress={() => router.push('/(tabs)/aicoach')}
          >
            <Ionicons name="chatbubble-ellipses" size={32} color="#7CB342" />
            <View style={styles.checkinContent}>
              <Text style={styles.checkinTitle}>AI Coach</Text>
              <Text style={styles.checkinSubtitle}>Consigli e approfondimenti per te</Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color="#7CB342" />
          </Pressable>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>I tuoi task di oggi</Text>
            {todayTasks.length > 0 ? (
              <>
                <View style={styles.progressContainer}>
                  <View style={styles.progressBar}>
                    <View style={[styles.progressFill, { width: `${progress}%` }]} />
                  </View>
                  <StarRow earned={dayStars.earned} max={dayStars.max} size={18} />
                </View>

                {todaySucceeded ? (
                  <View style={styles.successBanner}>
                    <Ionicons name="checkmark-circle" size={18} color="#7CB342" />
                    <Text style={styles.successText}>Giornata riuscita, sei a posto!</Text>
                  </View>
                ) : (
                  <View style={styles.requiredBanner}>
                    <Ionicons name="alert-circle" size={18} color="#F57C00" />
                    <Text style={styles.requiredText}>
                      Completa almeno {todayPhase.minRequired} di {todayTasks.length} task per far riuscire la giornata
                    </Text>
                  </View>
                )}

                {todayTasks.map((task) => {
                  const info = getAreaInfo(task.area);
                  return (
                    <Pressable
                      key={task.id}
                      style={styles.taskItem}
                      onPress={() => toggleTask(task.id, task.completed)}
                    >
                      <View style={[
                        styles.checkbox,
                        { borderColor: info.color },
                        task.completed && { backgroundColor: info.color },
                      ]}>
                        {task.completed && <Ionicons name="checkmark" size={20} color="#FFFFFF" />}
                      </View>
                      <View style={styles.taskContent}>
                        <Text style={[styles.taskText, task.completed && styles.taskTextCompleted]}>
                          {task.task}
                        </Text>
                        <Text style={[styles.taskArea, { color: info.color }]}>
                          {info.name}{task.optional ? ' · extra' : ''}
                        </Text>
                      </View>
                    </Pressable>
                  );
                })}

                <Pressable style={styles.planLink} onPress={() => router.push('/piano')}>
                  <Text style={styles.planLinkText}>Vedi tutto il piano 30 giorni</Text>
                  <Ionicons name="arrow-forward" size={16} color="#7CB342" />
                </Pressable>
              </>
            ) : (
              <View style={styles.emptyState}>
                <Ionicons name="fitness" size={64} color="#E0E0E0" />
                <Text style={styles.emptyText}>Completa lo screening per vedere i tuoi task</Text>
              </View>
            )}
          </View>

          {/* Anteprima di domani, cosi' puoi organizzarti in anticipo - visibile una
              volta che la giornata di oggi e' andata a buon fine */}
          {todaySucceeded && tomorrowTasks.length > 0 && (
            <View style={styles.tomorrowSection}>
              <Text style={styles.tomorrowTitle}>Domani ti aspetta</Text>
              {tomorrowTasks.map(task => {
                const info = getAreaInfo(task.area);
                return (
                  <View key={task.id} style={styles.tomorrowItem}>
                    <View style={[styles.tomorrowDot, { backgroundColor: info.color }]} />
                    <View style={styles.taskContent}>
                      <Text style={styles.tomorrowText}>{task.task}</Text>
                      <Text style={[styles.taskArea, { color: info.color }]}>
                        {info.name}{task.optional ? ' · extra' : ''}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>

      <Modal
        visible={showCheckin}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowCheckin(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Check-in Giornaliero</Text>
              <Pressable onPress={() => setShowCheckin(false)}>
                <Ionicons name="close" size={28} color="#4A4A4A" />
              </Pressable>
            </View>

            <View style={styles.checkinQuestion}>
              <Text style={styles.questionText}>Come ti senti oggi?</Text>

              <Text style={styles.questionLabel}>Energia</Text>
              <View style={styles.scaleContainer}>
                {[1, 2, 3, 4, 5].map((value) => (
                  <Pressable
                    key={value}
                    style={[
                      styles.scaleButton,
                      checkinData.energia === value && styles.scaleButtonSelected,
                    ]}
                    onPress={() => setCheckinData({ ...checkinData, energia: value })}
                  >
                    <Text
                      style={[
                        styles.scaleButtonText,
                        checkinData.energia === value && styles.scaleButtonTextSelected,
                      ]}
                    >
                      {value}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <Text style={styles.questionLabel}>Umore</Text>
              <View style={styles.scaleContainer}>
                {[1, 2, 3, 4, 5].map((value) => (
                  <Pressable
                    key={value}
                    style={[
                      styles.scaleButton,
                      checkinData.umore === value && styles.scaleButtonSelected,
                    ]}
                    onPress={() => setCheckinData({ ...checkinData, umore: value })}
                  >
                    <Text
                      style={[
                        styles.scaleButtonText,
                        checkinData.umore === value && styles.scaleButtonTextSelected,
                      ]}
                    >
                      {value}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <Text style={styles.questionLabel}>Qualità del sonno</Text>
              <View style={styles.scaleContainer}>
                {[1, 2, 3, 4, 5].map((value) => (
                  <Pressable
                    key={value}
                    style={[
                      styles.scaleButton,
                      checkinData.sonno === value && styles.scaleButtonSelected,
                    ]}
                    onPress={() => setCheckinData({ ...checkinData, sonno: value })}
                  >
                    <Text
                      style={[
                        styles.scaleButtonText,
                        checkinData.sonno === value && styles.scaleButtonTextSelected,
                      ]}
                    >
                      {value}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            <Pressable
              style={[styles.submitButton, loading && styles.submitButtonDisabled]}
              onPress={submitCheckin}
              disabled={loading}
            >
              <Text style={styles.submitButtonText}>
                {loading ? 'Salvataggio...' : 'Completa Check-in'}
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showReflection}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowReflection(false)}
      >
        <View style={styles.reflectionOverlay}>
          <View style={styles.reflectionModalContent}>
            <Ionicons name="checkmark-circle" size={40} color="#7CB342" />
            <Text style={styles.reflectionModalTitle}>Check-in completato!</Text>
            <Text style={styles.reflectionModalHint}>
              Non una risposta, solo una domanda per fermarti un attimo:
            </Text>
            <Text style={styles.reflectionModalQuestion}>
              {todaysReflection?.question}
            </Text>
            <Text style={styles.reflectionModalFooter}>
              Tra qualche giorno, in base a come va la settimana, arriveranno anche dei consigli mirati.
            </Text>
            <Pressable style={styles.reflectionModalButton} onPress={() => setShowReflection(false)}>
              <Text style={styles.reflectionModalButtonText}>Continua</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <Modal
        visible={celebration !== null}
        animationType="fade"
        transparent={true}
        onRequestClose={dismissCelebration}
      >
        <View style={styles.reflectionOverlay}>
          {celebration !== null && MILESTONE_MESSAGES[celebration] && (
            <View style={styles.reflectionModalContent}>
              <Ionicons
                name={MILESTONE_MESSAGES[celebration].icon as any}
                size={48}
                color={MILESTONE_MESSAGES[celebration].color}
              />
              <Text style={styles.reflectionModalTitle}>{MILESTONE_MESSAGES[celebration].title}</Text>
              <View style={styles.bonusRow}>
                <StarRow earned={3} max={3} size={22} />
                <Text style={styles.bonusText}>+{MILESTONE_STAR_BONUS[celebration]} stelle bonus</Text>
              </View>
              <Text style={styles.celebrationMessage}>{MILESTONE_MESSAGES[celebration].message}</Text>
              <Text style={styles.reflectionModalFooter}>{getMilestoneStatLine(allTasks)}</Text>
              <Pressable style={styles.reflectionModalButton} onPress={dismissCelebration}>
                <Text style={styles.reflectionModalButtonText}>Continua</Text>
              </Pressable>
            </View>
          )}
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5DC',
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    padding: 24,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  header: {
    flex: 1,
  },
  starChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFF8E1',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#FFE082',
  },
  starChipText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#8A6D3B',
  },
  bonusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  bonusText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#8A6D3B',
  },
  celebrationMessage: {
    fontSize: 15,
    color: '#4A4A4A',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 16,
  },
  greeting: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#4A4A4A',
  },
  date: {
    fontSize: 16,
    color: '#999',
    marginTop: 4,
    textTransform: 'capitalize',
  },
  scoreCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
  scoreContent: {
    flex: 1,
  },
  scoreLabel: {
    fontSize: 14,
    color: '#999',
    marginBottom: 4,
  },
  scoreValue: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#7CB342',
  },
  weeklyCard: {
    backgroundColor: '#FFF8E1',
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#FFE0B2',
  },
  weeklyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  weeklyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#4A4A4A',
  },
  weeklyRecap: {
    fontSize: 13,
    color: '#8A6D3B',
    marginBottom: 14,
  },
  weeklyTipRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
    gap: 10,
  },
  weeklyTipDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 6,
  },
  weeklyTipText: {
    fontSize: 14,
    color: '#4A4A4A',
    lineHeight: 20,
    marginBottom: 2,
  },
  weeklyTipSource: {
    fontSize: 11,
    color: '#999',
    fontStyle: 'italic',
  },
  checkinButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  coachButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  inviteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginBottom: 8,
  },
  inviteText: {
    fontSize: 12,
    color: '#7CB342',
    fontWeight: '600',
    textAlign: 'center',
  },
  reflectionCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#F1F8E9',
    borderRadius: 16,
    padding: 16,
    marginTop: -12,
    marginBottom: 24,
    gap: 12,
  },
  reflectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#7CB342',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  reflectionQuestion: {
    fontSize: 14,
    color: '#4A4A4A',
    lineHeight: 20,
  },
  reflectionOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  reflectionModalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 28,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
  },
  reflectionModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#4A4A4A',
    marginTop: 12,
    marginBottom: 16,
  },
  reflectionModalHint: {
    fontSize: 13,
    color: '#999',
    textAlign: 'center',
    marginBottom: 10,
  },
  reflectionModalQuestion: {
    fontSize: 17,
    fontWeight: '600',
    color: '#4A4A4A',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 16,
  },
  reflectionModalFooter: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    marginBottom: 20,
  },
  reflectionModalButton: {
    backgroundColor: '#7CB342',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 32,
  },
  reflectionModalButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  checkinContent: {
    flex: 1,
    marginLeft: 12,
  },
  checkinTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#4A4A4A',
  },
  checkinSubtitle: {
    fontSize: 14,
    color: '#999',
    marginTop: 2,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#4A4A4A',
    marginBottom: 16,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  progressBar: {
    flex: 1,
    height: 8,
    backgroundColor: '#E0E0E0',
    borderRadius: 4,
    overflow: 'hidden',
    marginRight: 12,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#7CB342',
  },
  progressText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#7CB342',
  },
  successBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    borderRadius: 10,
    padding: 10,
    marginBottom: 12,
    gap: 8,
  },
  successText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4A7A2E',
  },
  requiredBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF3E0',
    borderRadius: 10,
    padding: 10,
    marginBottom: 12,
    gap: 8,
  },
  requiredText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: '#E65100',
  },
  taskItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  checkbox: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#7CB342',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  checkboxChecked: {
    backgroundColor: '#7CB342',
  },
  taskContent: {
    flex: 1,
  },
  taskText: {
    fontSize: 16,
    color: '#4A4A4A',
    marginBottom: 4,
  },
  taskTextCompleted: {
    textDecorationLine: 'line-through',
    color: '#999',
  },
  taskArea: {
    fontSize: 12,
    fontWeight: '600',
  },
  planLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
  },
  planLinkText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#7CB342',
  },
  tomorrowSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#E8F5E9',
    borderStyle: 'dashed',
  },
  tomorrowTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4A4A4A',
    marginBottom: 12,
  },
  tomorrowItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
    gap: 10,
  },
  tomorrowDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 6,
  },
  tomorrowText: {
    fontSize: 14,
    color: '#4A4A4A',
    marginBottom: 2,
  },
  emptyState: {
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
    marginTop: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#F5F5DC',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#4A4A4A',
  },
  checkinQuestion: {
    marginBottom: 24,
  },
  questionText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#4A4A4A',
    marginBottom: 24,
    textAlign: 'center',
  },
  questionLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#4A4A4A',
    marginBottom: 12,
    marginTop: 16,
  },
  scaleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  scaleButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#E0E0E0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scaleButtonSelected: {
    backgroundColor: '#7CB342',
    borderColor: '#7CB342',
  },
  scaleButtonText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#666',
  },
  scaleButtonTextSelected: {
    color: '#FFFFFF',
  },
  submitButton: {
    backgroundColor: '#7CB342',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
});
