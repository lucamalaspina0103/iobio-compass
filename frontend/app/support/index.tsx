import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Linking, LayoutAnimation, Platform, UIManager } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useI18n } from '../../src/i18n';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const SUPPORT_EMAIL = 'supporto@iobiocompass.it';

// Le domande e risposte sono nei cataloghi (support.q1..q5 / support.a1..a5)
const FAQ_COUNT = 5;

export default function SupportScreen() {
  const router = useRouter();
  const { t } = useI18n();
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const toggleFaq = (i: number) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setOpenIndex(openIndex === i ? null : i);
  };

  const contactEmail = () => {
    Linking.openURL(`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(t('support.subject'))}`);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#4A4A4A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('pf.support')}</Text>
        <View style={styles.backButton} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.hero}>
          <View style={styles.heroIcon}>
            <Ionicons name="help-buoy" size={40} color="#557A6D" />
          </View>
          <Text style={styles.heroText}>{t('support.hero')}</Text>
        </View>

        <Text style={styles.sectionTitle}>{t('support.faq')}</Text>

        {Array.from({ length: FAQ_COUNT }, (_, k) => ({ q: t(`support.q${k + 1}`), a: t(`support.a${k + 1}`) })).map((faq, i) => (
          <TouchableOpacity
            key={i}
            style={styles.faqCard}
            activeOpacity={0.7}
            onPress={() => toggleFaq(i)}
          >
            <View style={styles.faqQuestionRow}>
              <Text style={styles.faqQuestion}>{faq.q}</Text>
              <Ionicons
                name={openIndex === i ? 'chevron-up' : 'chevron-down'}
                size={20}
                color="#557A6D"
              />
            </View>
            {openIndex === i && <Text style={styles.faqAnswer}>{faq.a}</Text>}
          </TouchableOpacity>
        ))}

        <Text style={styles.sectionTitle}>{t('support.contact')}</Text>

        <TouchableOpacity style={styles.contactCard} onPress={contactEmail}>
          <View style={styles.iconContainer}>
            <Ionicons name="mail" size={22} color="#557A6D" />
          </View>
          <View style={styles.textContainer}>
            <Text style={styles.cardTitle}>{t('support.emailUs')}</Text>
            <Text style={styles.cardDesc}>{SUPPORT_EMAIL}</Text>
          </View>
          <Ionicons name="chevron-forward" size={22} color="#999" />
        </TouchableOpacity>

        <View style={styles.noteBox}>
          <Ionicons name="information-circle" size={20} color="#F57C00" />
          <Text style={styles.noteText}>
            {t('support.note')}
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5DC' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#4A4A4A' },
  content: { padding: 24 },
  hero: { alignItems: 'center', marginBottom: 24 },
  heroIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#E4EEEA',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  heroText: { fontSize: 18, color: '#4A4A4A', fontWeight: '600' },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#999',
    marginBottom: 12,
    marginTop: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  faqCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  faqQuestionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  faqQuestion: { flex: 1, fontSize: 15, color: '#4A4A4A', fontWeight: '500', marginRight: 8 },
  faqAnswer: { fontSize: 14, color: '#666', lineHeight: 21, marginTop: 12 },
  contactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E4EEEA',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  textContainer: { flex: 1, marginRight: 8 },
  cardTitle: { fontSize: 16, color: '#4A4A4A', fontWeight: '500' },
  cardDesc: { fontSize: 13, color: '#999', marginTop: 2 },
  noteBox: {
    flexDirection: 'row',
    backgroundColor: '#FFF8E1',
    borderRadius: 12,
    padding: 16,
    alignItems: 'flex-start',
  },
  noteText: { flex: 1, fontSize: 13, color: '#8D6E63', marginLeft: 10, lineHeight: 19 },
});
