import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AGE_RANGES, GENDERS } from '../lib/profileOptions';

interface ProfileFieldsProps {
  ageRange: string;
  gender: string;
  onChangeAgeRange: (value: string) => void;
  onChangeGender: (value: string) => void;
  required?: boolean; // true = "obbligatorio" nell'etichetta (registrazione account)
}

// Selettore eta'/genere condiviso tra registrazione account (obbligatorio, ma "preferisco
// non dirlo" e' sempre un'opzione valida) e profilo rapido dei Guest (facoltativo).
export default function ProfileFields({
  ageRange,
  gender,
  onChangeAgeRange,
  onChangeGender,
  required = false,
}: ProfileFieldsProps) {
  return (
    <View>
      <View style={styles.section}>
        <Text style={styles.label}>
          Fascia d'età{required ? '' : ' (opzionale)'}
        </Text>
        <View style={styles.optionsGrid}>
          {AGE_RANGES.map(range => (
            <Pressable
              key={range.value}
              style={[styles.option, ageRange === range.value && styles.optionSelected]}
              onPress={() => onChangeAgeRange(range.value)}
            >
              <Text style={[styles.optionText, ageRange === range.value && styles.optionTextSelected]}>
                {range.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Genere{required ? '' : ' (opzionale)'}</Text>
        <View style={styles.optionsColumn}>
          {GENDERS.map(g => (
            <Pressable
              key={g.value}
              style={[styles.optionRow, gender === g.value && styles.optionRowSelected]}
              onPress={() => onChangeGender(g.value)}
            >
              <Ionicons
                name={g.icon as any}
                size={22}
                color={gender === g.value ? '#7CB342' : '#999'}
              />
              <Text style={[styles.optionRowText, gender === g.value && styles.optionRowTextSelected]}>
                {g.label}
              </Text>
              {gender === g.value && <Ionicons name="checkmark-circle" size={22} color="#7CB342" />}
            </Pressable>
          ))}
        </View>
      </View>

      <View style={styles.infoBox}>
        <Ionicons name="information-circle" size={18} color="#7CB342" />
        <Text style={styles.infoText}>
          Questi dati restano privati, servono solo per analisi interne e non influenzano mai
          i tuoi risultati. Puoi scegliere "Preferisco non dirlo".
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { marginBottom: 20 },
  label: { fontSize: 15, fontWeight: '600', color: '#4A4A4A', marginBottom: 10 },
  optionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  option: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderWidth: 2,
    borderColor: '#E0E0E0',
    minWidth: '47%',
  },
  optionSelected: { borderColor: '#7CB342', backgroundColor: '#E8F5E9' },
  optionText: { fontSize: 14, color: '#666', textAlign: 'center', fontWeight: '500' },
  optionTextSelected: { color: '#7CB342', fontWeight: '600' },
  optionsColumn: { gap: 10 },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 12,
    borderWidth: 2,
    borderColor: '#E0E0E0',
    gap: 10,
  },
  optionRowSelected: { borderColor: '#7CB342', backgroundColor: '#E8F5E9' },
  optionRowText: { flex: 1, fontSize: 14, color: '#666', fontWeight: '500' },
  optionRowTextSelected: { color: '#7CB342', fontWeight: '600' },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: '#E8F5E9',
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    gap: 10,
  },
  infoText: { flex: 1, fontSize: 12.5, color: '#4A4A4A', lineHeight: 18 },
});
