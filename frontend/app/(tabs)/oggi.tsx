import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Modal, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAppContext } from '../../src/contexts/AppContext';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

interface Task {
  id: string;
  day: number;
  task: string;
  area: string;
  completed: boolean;
}

export default function OggiScreen() {
  const { user, isGuest, screeningResult } = useAppContext();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [todayTasks, setTodayTasks] = useState<Task[]>([]);
  const [showCheckin, setShowCheckin] = useState(false);
  const [checkinData, setCheckinData] = useState({ energia: 0, umore: 0, sonno: 0 });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadTasks();
  }, []);

  const loadTasks = async () => {
    try {
      const userId = isGuest ? null : user?.id;
      const response = await fetch(`${API_URL}/api/piano/tasks?user_id=${userId || ''}`);
      const data = await response.json();
      
      if (response.ok) {
        setTasks(data);
        // Get today's tasks (first 3 for simplicity)
        const today = data.slice(0, 3);
        setTodayTasks(today);
      }
    } catch (error) {
      console.error('Error loading tasks:', error);
    }
  };

  const toggleTask = async (taskId: string, completed: boolean) => {
    try {
      const response = await fetch(`${API_URL}/api/piano/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ task_id: taskId, completed: !completed }),
      });

      if (response.ok) {
        setTodayTasks(todayTasks.map(t => 
          t.id === taskId ? { ...t, completed: !completed } : t
        ));
      }
    } catch (error) {
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
        Alert.alert('Successo', 'Check-in completato!');
        setShowCheckin(false);
        setCheckinData({ energia: 0, umore: 0, sonno: 0 });
      }
    } catch (error) {
      Alert.alert('Errore', 'Impossibile salvare il check-in');
    } finally {
      setLoading(false);
    }
  };

  const completedCount = todayTasks.filter(t => t.completed).length;
  const progress = todayTasks.length > 0 ? (completedCount / todayTasks.length) * 100 : 0;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.content}>
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

          {screeningResult && (
            <View style={styles.scoreCard}>
              <View style={styles.scoreContent}>
                <Text style={styles.scoreLabel}>Il tuo Indice IOBIO</Text>
                <Text style={styles.scoreValue}>{screeningResult.indice_iobio}</Text>
              </View>
              <Ionicons name="leaf" size={48} color="#7CB342" />
            </View>
          )}

          <TouchableOpacity 
            style={styles.checkinButton}
            onPress={() => setShowCheckin(true)}
          >
            <Ionicons name="heart-circle" size={32} color="#7CB342" />
            <View style={styles.checkinContent}>
              <Text style={styles.checkinTitle}>Check-in giornaliero</Text>
              <Text style={styles.checkinSubtitle}>1 minuto per il tuo benessere</Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color="#7CB342" />
          </TouchableOpacity>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>I tuoi task di oggi</Text>
            {todayTasks.length > 0 ? (
              <>
                <View style={styles.progressContainer}>
                  <View style={styles.progressBar}>
                    <View style={[styles.progressFill, { width: `${progress}%` }]} />
                  </View>
                  <Text style={styles.progressText}>{completedCount}/{todayTasks.length}</Text>
                </View>
                {todayTasks.map((task) => (
                  <TouchableOpacity
                    key={task.id}
                    style={styles.taskItem}
                    onPress={() => toggleTask(task.id, task.completed)}
                  >
                    <View style={[styles.checkbox, task.completed && styles.checkboxChecked]}>
                      {task.completed && <Ionicons name="checkmark" size={20} color="#FFFFFF" />}
                    </View>
                    <View style={styles.taskContent}>
                      <Text style={[styles.taskText, task.completed && styles.taskTextCompleted]}>
                        {task.task}
                      </Text>
                      <Text style={styles.taskArea}>{task.area}</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </>
            ) : (
              <View style={styles.emptyState}>
                <Ionicons name="fitness" size={64} color="#E0E0E0" />
                <Text style={styles.emptyText}>Completa lo screening per vedere i tuoi task</Text>
              </View>
            )}
          </View>
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
              <TouchableOpacity onPress={() => setShowCheckin(false)}>
                <Ionicons name="close" size={28} color="#4A4A4A" />
              </TouchableOpacity>
            </View>

            <View style={styles.checkinQuestion}>
              <Text style={styles.questionText}>Come ti senti oggi?</Text>
              
              <Text style={styles.questionLabel}>Energia</Text>
              <View style={styles.scaleContainer}>
                {[1, 2, 3, 4, 5].map((value) => (
                  <TouchableOpacity
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
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.questionLabel}>Umore</Text>
              <View style={styles.scaleContainer}>
                {[1, 2, 3, 4, 5].map((value) => (
                  <TouchableOpacity
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
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.questionLabel}>Qualità del sonno</Text>
              <View style={styles.scaleContainer}>
                {[1, 2, 3, 4, 5].map((value) => (
                  <TouchableOpacity
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
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <TouchableOpacity
              style={[styles.submitButton, loading && styles.submitButtonDisabled]}
              onPress={submitCheckin}
              disabled={loading}
            >
              <Text style={styles.submitButtonText}>
                {loading ? 'Salvataggio...' : 'Completa Check-in'}
              </Text>
            </TouchableOpacity>
          </View>
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
  header: {
    marginBottom: 24,
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
  checkinButton: {
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
    marginBottom: 16,
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
    color: '#7CB342',
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
