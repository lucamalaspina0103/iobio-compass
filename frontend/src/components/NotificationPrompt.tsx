import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  REMINDER_TIME_OPTIONS,
  loadNotificationSettings,
  saveNotificationSettings,
} from '../lib/notificationSettings';
import { requestPermission, rememberPromptDeclined, syncNotifications } from '../lib/notificationsNative';

interface NotificationPromptProps {
  visible: boolean;
  onClose: () => void;
}

// Chiede il permesso per le notifiche solo dopo la prima giornata riuscita, spiegando prima
// cosa riceverai: una sola notifica al giorno, all'ora scelta, solo se non hai fatto la tua parte.
export default function NotificationPrompt({ visible, onClose }: NotificationPromptProps) {
  const [time, setTime] = useState('09:00');
  const [busy, setBusy] = useState(false);

  const accept = async () => {
    setBusy(true);
    try {
      const settings = await loadNotificationSettings();
      await saveNotificationSettings({ ...settings, enabled: true, dailyMoment: true, reminderTime: time });
      const granted = await requestPermission();
      if (granted) await syncNotifications();
      else await rememberPromptDeclined();
    } finally {
      setBusy(false);
      onClose();
    }
  };

  const decline = async () => {
    await rememberPromptDeclined();
    onClose();
  };

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={decline}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.iconWrap}>
            <Ionicons name="notifications" size={34} color="#7CB342" />
          </View>
          <Text style={styles.title}>Un promemoria gentile?</Text>
          <Text style={styles.text}>
            Hai fatto il primo passo. Se vuoi, ti ricordo il tuo momento una volta al giorno, all'ora che scegli e solo se non hai ancora fatto la tua parte. Nessuna insistenza: puoi metterlo in pausa o spegnerlo quando vuoi.
          </Text>

          <Text style={styles.label}>A che ora?</Text>
          <View style={styles.timeRow}>
            {REMINDER_TIME_OPTIONS.map(opt => {
              const selected = time === opt.value;
              return (
                <Pressable
                  key={opt.value}
                  style={[styles.chip, selected && styles.chipSelected]}
                  onPress={() => setTime(opt.value)}
                >
                  <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{opt.label}</Text>
                </Pressable>
              );
            })}
          </View>

          <Pressable style={[styles.primary, busy && styles.disabled]} onPress={accept} disabled={busy}>
            <Text style={styles.primaryText}>Sì, ricordamelo</Text>
          </Pressable>
          <Pressable onPress={decline} disabled={busy}>
            <Text style={styles.secondaryText}>Non ora</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  card: { backgroundColor: '#FFFBF0', borderRadius: 24, padding: 24, width: '100%', maxWidth: 420, alignItems: 'center' },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#E8F5E9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  title: { fontSize: 22, fontWeight: '700', color: '#4A4A4A', marginBottom: 10, textAlign: 'center' },
  text: { fontSize: 15, color: '#666', lineHeight: 22, textAlign: 'center', marginBottom: 18 },
  label: { fontSize: 13, color: '#888', marginBottom: 8 },
  timeRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8, marginBottom: 20 },
  chip: { borderRadius: 10, paddingVertical: 8, paddingHorizontal: 14, borderWidth: 2, borderColor: '#E0E0E0', backgroundColor: '#FFFFFF' },
  chipSelected: { borderColor: '#7CB342', backgroundColor: '#E8F5E9' },
  chipText: { fontSize: 14, color: '#666', fontWeight: '500' },
  chipTextSelected: { color: '#7CB342', fontWeight: '700' },
  primary: { backgroundColor: '#7CB342', borderRadius: 12, paddingVertical: 14, alignSelf: 'stretch', alignItems: 'center', marginBottom: 6 },
  disabled: { opacity: 0.6 },
  primaryText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  secondaryText: { color: '#999', fontSize: 15, padding: 10 },
});
