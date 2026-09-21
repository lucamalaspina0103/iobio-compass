import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CycleNoticeKind, getNoticeCopy } from '../lib/cycleNotices';

interface CycleNoticeProps {
  kind: CycleNoticeKind;
  currentDay: number;
  onPress: () => void;
  onDismiss: () => void;
}

// Card non bloccante su Oggi: invita a salvare i progressi (Guest) o a iniziare il ciclo
// successivo. Toni: "soft" (verde, discreto) e "strong" (arancione, piu' netto).
export default function CycleNotice({ kind, currentDay, onPress, onDismiss }: CycleNoticeProps) {
  const copy = getNoticeCopy(kind, currentDay);
  const strong = copy.tone === 'strong';
  const accent = strong ? '#F57C00' : '#7CB342';

  return (
    <View style={[styles.card, strong ? styles.cardStrong : styles.cardSoft]}>
      <View style={styles.header}>
        <Ionicons name={copy.icon as any} size={22} color={accent} />
        <Text style={styles.title}>{copy.title}</Text>
      </View>
      <Text style={styles.text}>{copy.text}</Text>
      <View style={styles.actions}>
        <Pressable style={[styles.button, { backgroundColor: accent }]} onPress={onPress}>
          <Text style={styles.buttonText}>{copy.cta}</Text>
        </Pressable>
        {copy.dismissLabel && (
          <Pressable onPress={onDismiss} style={styles.dismiss}>
            <Text style={[styles.dismissText, { color: accent }]}>{copy.dismissLabel}</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1.5,
  },
  cardSoft: { backgroundColor: '#F1F8E9', borderColor: '#C5E1A5' },
  cardStrong: { backgroundColor: '#FFF3E0', borderColor: '#FFB74D' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  title: { flex: 1, fontSize: 16, fontWeight: '700', color: '#4A4A4A' },
  text: { fontSize: 14, color: '#666', lineHeight: 20, marginBottom: 12 },
  actions: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 16 },
  button: { borderRadius: 10, paddingVertical: 10, paddingHorizontal: 16 },
  buttonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '600' },
  dismiss: { paddingVertical: 10 },
  dismissText: { fontSize: 14, fontWeight: '500' },
});
