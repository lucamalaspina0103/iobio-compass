import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, Alert, Modal, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAppContext } from '../../src/contexts/AppContext';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

export default function ProfiloScreen() {
  const router = useRouter();
  const { user, isGuest, screeningResult, logout } = useAppContext();
  const [showResetModal, setShowResetModal] = useState(false);
  const [showRetakeModal, setShowRetakeModal] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Modal e non Alert.alert: su web Alert.alert non mostra nulla e "Esci" resterebbe muto.
  const handleLogout = () => {
    setShowLogoutModal(true);
  };

  const confirmLogout = async () => {
    setShowLogoutModal(false);
    await logout();
    router.replace('/onboarding/welcome');
  };

  const openDeleteModal = () => {
    setDeletePassword('');
    setDeleteError(null);
    setShowDeleteModal(true);
  };

  // Cancella per sempre account e dati dal server (serve la password), poi svuota il dispositivo.
  const confirmDeleteAccount = async () => {
    if (!user?.email) return;
    if (!deletePassword) {
      setDeleteError('Inserisci la tua password per confermare.');
      return;
    }
    setDeleting(true);
    setDeleteError(null);
    try {
      const response = await fetch(`${API_URL}/api/account/delete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: user.email, password: deletePassword }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => null);
        setDeleteError(typeof data?.detail === 'string' ? data.detail : "Non è stato possibile eliminare l'account, riprova.");
        return;
      }
      setShowDeleteModal(false);
      await logout();
      router.replace('/onboarding/welcome');
    } catch (error) {
      setDeleteError('Non riesco a collegarmi al server. Controlla la connessione e riprova.');
    } finally {
      setDeleting(false);
    }
  };

  const goSaveProgress = () => {
    setShowLogoutModal(false);
    router.push('/salva-progressi');
  };

  const handleRetakeScreening = () => {
    setShowRetakeModal(true);
  };

  const confirmRetakeScreening = () => {
    setShowRetakeModal(false);
    router.push('/screening/profile');
  };

  const handleResetApp = async () => {
    setShowResetModal(false);
    
    try {
      // Clear ALL AsyncStorage
      await AsyncStorage.clear();
      
      // Logout (clears context state)
      await logout();
      
      // Navigate to welcome screen
      router.replace('/onboarding/welcome');
    } catch (error) {
      console.error('Error resetting app:', error);
      Alert.alert('Errore', 'Impossibile resettare l\'app');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.content}>
          <View style={styles.header}>
            <View style={styles.avatarContainer}>
              <Ionicons name="person" size={48} color="#7CB342" />
            </View>
            <Text style={styles.userName}>
              {isGuest ? 'Utente Guest' : user?.email}
            </Text>
            {isGuest && (
              <View style={styles.guestBadge}>
                <Text style={styles.guestBadgeText}>Modalità Guest</Text>
              </View>
            )}
          </View>

          {isGuest && (
            <Pressable style={styles.saveCard} onPress={() => router.push('/salva-progressi')}>
              <View style={styles.saveIcon}>
                <Ionicons name="cloud-upload" size={24} color="#FFFFFF" />
              </View>
              <View style={styles.saveTextWrap}>
                <Text style={styles.saveTitle}>Salva i tuoi progressi</Text>
                <Text style={styles.saveText}>
                  Crea un account gratuito: piano, stelle e storico restano al sicuro.
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={24} color="#7CB342" />
            </Pressable>
          )}

          {screeningResult && (
            <View style={styles.statsCard}>
              <Text style={styles.statsTitle}>Le tue statistiche</Text>
              <View style={styles.statsRow}>
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{screeningResult.indice_iobio}</Text>
                  <Text style={styles.statLabel}>Indice IOBIO</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{screeningResult.weak_areas.length}</Text>
                  <Text style={styles.statLabel}>Aree da migliorare</Text>
                </View>
              </View>
            </View>
          )}

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Benessere</Text>
            
            <Pressable style={styles.menuItem} onPress={handleRetakeScreening}>
              <View style={styles.menuIconContainer}>
                <Ionicons name="clipboard" size={24} color="#7CB342" />
              </View>
              <Text style={styles.menuText}>Rifai lo screening</Text>
              <Ionicons name="chevron-forward" size={24} color="#999" />
            </Pressable>

            <Pressable 
              style={styles.menuItem}
              onPress={() => {
                console.log('PROFILE_TAP_PIANO_30');
                router.push('/piano');
              }}
            >
              <View style={styles.menuIconContainer}>
                <Ionicons name="calendar" size={24} color="#7CB342" />
              </View>
              <Text style={styles.menuText}>Piano 30 giorni</Text>
              <Ionicons name="chevron-forward" size={24} color="#999" />
            </Pressable>

            <Pressable 
              style={styles.menuItem}
              onPress={() => router.push('/(tabs)/mappa')}
            >
              <View style={styles.menuIconContainer}>
                <Ionicons name="trending-up" size={24} color="#7CB342" />
              </View>
              <Text style={styles.menuText}>Progressi</Text>
              <Ionicons name="chevron-forward" size={24} color="#999" />
            </Pressable>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Impostazioni</Text>
            
            <Pressable 
              style={styles.menuItem}
              onPress={() => router.push('/settings/notifications')}
            >
              <View style={styles.menuIconContainer}>
                <Ionicons name="notifications" size={24} color="#7CB342" />
              </View>
              <Text style={styles.menuText}>Notifiche</Text>
              <Ionicons name="chevron-forward" size={24} color="#999" />
            </Pressable>

            <Pressable 
              style={styles.menuItem}
              onPress={() => router.push('/settings/privacy')}
            >
              <View style={styles.menuIconContainer}>
                <Ionicons name="lock-closed" size={24} color="#7CB342" />
              </View>
              <Text style={styles.menuText}>Privacy</Text>
              <Ionicons name="chevron-forward" size={24} color="#999" />
            </Pressable>

            <Pressable 
              style={styles.menuItem}
              onPress={() => router.push('/support')}
            >
              <View style={styles.menuIconContainer}>
                <Ionicons name="help-circle" size={24} color="#7CB342" />
              </View>
              <Text style={styles.menuText}>Aiuto e supporto</Text>
              <Ionicons name="chevron-forward" size={24} color="#999" />
            </Pressable>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Info</Text>
            
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Versione</Text>
              <Text style={styles.infoValue}>1.0.0</Text>
            </View>

            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Data screening</Text>
              <Text style={styles.infoValue}>
                {screeningResult 
                  ? new Date(screeningResult.date).toLocaleDateString('it-IT')
                  : 'Non disponibile'
                }
              </Text>
            </View>
          </View>

          <Pressable 
            style={styles.resetButton} 
            onPress={() => setShowResetModal(true)}
          >
            <Ionicons name="refresh-circle" size={24} color="#FF9800" />
            <Text style={styles.resetText}>Reset app (riparti da zero)</Text>
          </Pressable>

          <Pressable style={styles.logoutButton} onPress={handleLogout}>
            <Ionicons name="log-out" size={24} color="#EF5350" />
            <Text style={styles.logoutText}>Esci</Text>
          </Pressable>

          {!isGuest && (
            <Pressable style={styles.deleteAccountLink} onPress={openDeleteModal}>
              <Text style={styles.deleteAccountText}>Elimina il mio account</Text>
            </Pressable>
          )}

          <View style={styles.footer}>
            <Ionicons name="leaf" size={24} color="#7CB342" />
            <Text style={styles.footerText}>IOBIO Compass</Text>
            <Text style={styles.footerSubtext}>Benessere Olistico</Text>
            <Text style={styles.buildLabel}>Build: PROFILO-LINKS-010</Text>
          </View>
        </View>
      </ScrollView>

      <Modal
        visible={showRetakeModal}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowRetakeModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalIcon}>
              <Ionicons name="clipboard" size={48} color="#7CB342" />
            </View>
            <Text style={styles.modalTitle}>Rifai lo screening</Text>
            <Text style={styles.modalText}>
              Vuoi rifare lo screening per aggiornare il tuo profilo?
            </Text>
            <View style={styles.modalButtons}>
              <Pressable
                style={styles.modalButtonCancel}
                onPress={() => setShowRetakeModal(false)}
              >
                <Text style={styles.modalButtonCancelText}>Annulla</Text>
              </Pressable>
              <Pressable
                style={styles.modalButtonConfirm}
                onPress={confirmRetakeScreening}
              >
                <Text style={styles.modalButtonConfirmText}>Continua</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showLogoutModal}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowLogoutModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalIcon}>
              <Ionicons name={isGuest ? 'warning' : 'log-out'} size={48} color="#FF9800" />
            </View>
            <Text style={styles.modalTitle}>{isGuest ? 'Aspetta un attimo' : 'Vuoi uscire?'}</Text>
            <Text style={styles.modalText}>
              {isGuest
                ? 'Sei in modalità Guest: piano, stelle e storico sono salvati solo su questo dispositivo. Se esci ora li perdi.'
                : 'Potrai rientrare in qualsiasi momento con la tua email e password: i tuoi progressi restano salvati.'}
            </Text>
            {isGuest && (
              <Pressable style={styles.modalButtonPrimary} onPress={goSaveProgress}>
                <Text style={styles.modalButtonConfirmText}>Salva prima i progressi</Text>
              </Pressable>
            )}
            <View style={styles.modalButtons}>
              <Pressable style={styles.modalButtonCancel} onPress={() => setShowLogoutModal(false)}>
                <Text style={styles.modalButtonCancelText}>Annulla</Text>
              </Pressable>
              <Pressable style={styles.modalButtonConfirm} onPress={confirmLogout}>
                <Text style={styles.modalButtonConfirmText}>{isGuest ? 'Esci comunque' : 'Esci'}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showDeleteModal}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowDeleteModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalIcon}>
              <Ionicons name="trash" size={48} color="#EF5350" />
            </View>
            <Text style={styles.modalTitle}>Eliminare l'account?</Text>
            <Text style={styles.modalText}>
              Cancelliamo per sempre il tuo account, il piano, le stelle e lo storico. Non si può annullare.
            </Text>
            <TextInput
              style={styles.deleteInput}
              placeholder="Inserisci la tua password"
              value={deletePassword}
              onChangeText={setDeletePassword}
              secureTextEntry
              autoComplete="current-password"
            />
            {deleteError && <Text style={styles.deleteError}>{deleteError}</Text>}
            <View style={styles.modalButtons}>
              <Pressable style={styles.modalButtonCancel} onPress={() => setShowDeleteModal(false)}>
                <Text style={styles.modalButtonCancelText}>Annulla</Text>
              </Pressable>
              <Pressable
                style={[styles.modalButtonDanger, deleting && { opacity: 0.6 }]}
                onPress={confirmDeleteAccount}
                disabled={deleting}
              >
                <Text style={styles.modalButtonConfirmText}>{deleting ? 'Elimino...' : 'Elimina'}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showResetModal}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowResetModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalIcon}>
              <Ionicons name="warning" size={48} color="#FF9800" />
            </View>
            <Text style={styles.modalTitle}>Sei sicuro?</Text>
            <Text style={styles.modalText}>
              Perderai tutti i dati locali di questa sessione, inclusi:{'\n\n'}
              • Onboarding completato{'\n'}
              • Screening e risultati{'\n'}
              • Check-in giornalieri{'\n'}
              • Dati guest salvati localmente
            </Text>
            <View style={styles.modalButtons}>
              <Pressable 
                style={styles.modalButtonCancel}
                onPress={() => setShowResetModal(false)}
              >
                <Text style={styles.modalButtonCancelText}>Annulla</Text>
              </Pressable>
              <Pressable 
                style={styles.modalButtonConfirm}
                onPress={handleResetApp}
              >
                <Text style={styles.modalButtonConfirmText}>Reset App</Text>
              </Pressable>
            </View>
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
    alignItems: 'center',
    marginBottom: 24,
  },
  avatarContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#E8F5E9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#4A4A4A',
    marginBottom: 8,
  },
  guestBadge: {
    backgroundColor: '#FFF8E1',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  guestBadgeText: {
    fontSize: 12,
    color: '#F57C00',
    fontWeight: '500',
  },
  statsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  statsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4A4A4A',
    marginBottom: 16,
    textAlign: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#7CB342',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
  statDivider: {
    width: 1,
    backgroundColor: '#E0E0E0',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#999',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  menuIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E8F5E9',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  menuText: {
    flex: 1,
    fontSize: 16,
    color: '#4A4A4A',
  },
  infoItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
  },
  infoLabel: {
    fontSize: 16,
    color: '#4A4A4A',
  },
  infoValue: {
    fontSize: 16,
    color: '#999',
  },
  resetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF8E1',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#FF9800',
  },
  resetText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FF9800',
    marginLeft: 8,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 32,
    borderWidth: 2,
    borderColor: '#EF5350',
  },
  logoutText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#EF5350',
    marginLeft: 8,
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  footerText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4A4A4A',
    marginTop: 8,
  },
  footerSubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 4,
  },
  buildLabel: {
    fontSize: 11,
    color: '#7CB342',
    marginTop: 8,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 32,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
  },
  modalIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FFF8E1',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#4A4A4A',
    marginBottom: 16,
  },
  modalText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 24,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  modalButtonCancel: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
  },
  modalButtonCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  modalButtonConfirm: {
    flex: 1,
    backgroundColor: '#FF9800',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
  },
  modalButtonConfirmText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  modalButtonDanger: {
    flex: 1,
    backgroundColor: '#EF5350',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
  },
  deleteInput: {
    width: '100%',
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    marginBottom: 12,
  },
  deleteError: {
    color: '#C62828',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 12,
  },
  deleteAccountLink: {
    alignItems: 'center',
    marginTop: -16,
    marginBottom: 24,
    padding: 8,
  },
  deleteAccountText: {
    color: '#999',
    fontSize: 14,
    textDecorationLine: 'underline',
  },
  modalButtonPrimary: {
    width: '100%',
    backgroundColor: '#7CB342',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    marginBottom: 12,
  },
  saveCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F8E9',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    borderWidth: 2,
    borderColor: '#7CB342',
    gap: 12,
  },
  saveIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#7CB342',
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveTextWrap: {
    flex: 1,
  },
  saveTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#4A4A4A',
    marginBottom: 2,
  },
  saveText: {
    fontSize: 13,
    color: '#666',
    lineHeight: 18,
  },
});
