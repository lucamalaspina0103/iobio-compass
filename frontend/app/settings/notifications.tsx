import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, Switch, ActivityIndicator, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useI18n } from '../../src/i18n';
import {
  NotificationSettings,
  DEFAULT_NOTIFICATION_SETTINGS,
  REMINDER_TIME_OPTIONS,
  PAUSE_DAYS,
  loadNotificationSettings,
  saveNotificationSettings,
  isPaused,
} from '../../src/lib/notificationSettings';
import {
  PermissionState,
  getPermissionState,
  requestPermission,
  syncNotifications,
} from '../../src/lib/notificationsNative';

const TRACK = { false: '#E0E0E0', true: '#9DBDB0' };

export default function NotificationsScreen() {
  const router = useRouter();
  const { t, locale } = useI18n();
  const [settings, setSettings] = useState<NotificationSettings>(DEFAULT_NOTIFICATION_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [permission, setPermission] = useState<PermissionState>('unsupported');

  useEffect(() => {
    loadNotificationSettings().then(s => {
      setSettings(s);
      setLoading(false);
    });
    getPermissionState().then(setPermission);
  }, []);

  const update = (patch: Partial<NotificationSettings>) => {
    const next = { ...settings, ...patch };
    setSettings(next);
    // Salva e poi riprogramma le notifiche con le nuove scelte (sul sito web non fa nulla)
    saveNotificationSettings(next).then(() => syncNotifications());
  };

  const askPermission = async () => {
    await requestPermission();
    setPermission(await getPermissionState());
    syncNotifications();
  };

  const paused = isPaused(settings);
  const pausedLabel = settings.pausedUntil
    ? new Date(settings.pausedUntil).toLocaleDateString(locale, { day: 'numeric', month: 'long' })
    : '';

  const pauseForAWeek = () => {
    const until = new Date(Date.now() + PAUSE_DAYS * 24 * 60 * 60 * 1000);
    update({ pausedUntil: until.toISOString() });
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#4A4A4A" />
        </Pressable>
        <Text style={styles.headerTitle}>{t('pf.notifications')}</Text>
        <View style={styles.backButton} />
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#557A6D" />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.intro}>{t('nt.intro')}</Text>

          {permission === 'unsupported' && (
            <View style={styles.soonBox}>
              <Ionicons name="time-outline" size={20} color="#557A6D" />
              <Text style={styles.soonText}>{t('nt.unsupported')}</Text>
            </View>
          )}
          {permission === 'granted' && (
            <View style={styles.soonBox}>
              <Ionicons name="checkmark-circle" size={20} color="#557A6D" />
              <Text style={styles.soonText}>{t('nt.granted')}</Text>
            </View>
          )}
          {permission === 'undetermined' && (
            <View style={styles.soonBox}>
              <Ionicons name="notifications-outline" size={20} color="#557A6D" />
              <Text style={styles.soonText}>{t('nt.undetermined')}</Text>
              <Pressable onPress={askPermission}>
                <Text style={styles.pauseAction}>{t('nt.allow')}</Text>
              </Pressable>
            </View>
          )}
          {permission === 'denied' && (
            <View style={styles.soonBox}>
              <Ionicons name="notifications-off-outline" size={20} color="#F57C00" />
              <Text style={styles.soonText}>{t('nt.denied')}</Text>
              <Pressable onPress={() => Linking.openSettings()}>
                <Text style={styles.pauseAction}>{t('nt.openSettings')}</Text>
              </Pressable>
            </View>
          )}

          <View style={styles.card}>
            <View style={styles.cardTextWrap}>
              <Text style={styles.cardTitle}>{t('nt.receive')}</Text>
              <Text style={styles.cardDesc}>{t('nt.master')}</Text>
            </View>
            <Switch
              value={settings.enabled}
              onValueChange={v => update({ enabled: v })}
              trackColor={TRACK}
              thumbColor={settings.enabled ? '#557A6D' : '#f4f3f4'}
            />
          </View>

          <View style={[styles.group, !settings.enabled && styles.groupDisabled]} pointerEvents={settings.enabled ? 'auto' : 'none'}>
            <View style={styles.card}>
              <View style={styles.iconWrap}>
                <Ionicons name="sunny" size={22} color="#557A6D" />
              </View>
              <View style={styles.cardTextWrap}>
                <Text style={styles.cardTitle}>{t('notif.m1.title')}</Text>
                <Text style={styles.cardDesc}>{t('nt.momentDesc')}</Text>
              </View>
              <Switch
                value={settings.dailyMoment}
                onValueChange={v => update({ dailyMoment: v })}
                trackColor={TRACK}
                thumbColor={settings.dailyMoment ? '#557A6D' : '#f4f3f4'}
              />
            </View>

            {settings.dailyMoment && (
              <View style={styles.timeCard}>
                <Text style={styles.timeLabel}>{t('nt.timeQ')}</Text>
                <View style={styles.timeRow}>
                  {REMINDER_TIME_OPTIONS.map(opt => {
                    const selected = settings.reminderTime === opt.value;
                    return (
                      <Pressable
                        key={opt.value}
                        style={[styles.timeChip, selected && styles.timeChipSelected]}
                        onPress={() => update({ reminderTime: opt.value })}
                      >
                        <Text style={[styles.timeChipText, selected && styles.timeChipTextSelected]}>{opt.label}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            )}

            <View style={styles.card}>
              <View style={styles.iconWrap}>
                <Ionicons name="hand-left" size={22} color="#557A6D" />
              </View>
              <View style={styles.cardTextWrap}>
                <Text style={styles.cardTitle}>{t('nt.comebackTitle')}</Text>
                <Text style={styles.cardDesc}>{t('nt.comebackDesc')}</Text>
              </View>
              <Switch
                value={settings.comeback}
                onValueChange={v => update({ comeback: v })}
                trackColor={TRACK}
                thumbColor={settings.comeback ? '#557A6D' : '#f4f3f4'}
              />
            </View>

            <View style={styles.card}>
              <View style={styles.iconWrap}>
                <Ionicons name="ribbon" size={22} color="#557A6D" />
              </View>
              <View style={styles.cardTextWrap}>
                <Text style={styles.cardTitle}>{t('nt.milestonesTitle')}</Text>
                <Text style={styles.cardDesc}>{t('nt.milestonesDesc')}</Text>
              </View>
              <Switch
                value={settings.milestones}
                onValueChange={v => update({ milestones: v })}
                trackColor={TRACK}
                thumbColor={settings.milestones ? '#557A6D' : '#f4f3f4'}
              />
            </View>
          </View>

          {settings.enabled && (
            <View style={styles.pauseCard}>
              {paused ? (
                <>
                  <Text style={styles.pauseText}>{t('nt.pausedUntil', { date: pausedLabel })}</Text>
                  <Pressable onPress={() => update({ pausedUntil: null })}>
                    <Text style={styles.pauseAction}>{t('nt.resume')}</Text>
                  </Pressable>
                </>
              ) : (
                <>
                  <Text style={styles.pauseText}>{t('nt.needBreak')}</Text>
                  <Pressable onPress={pauseForAWeek}>
                    <Text style={styles.pauseAction}>{t('nt.silence', { n: PAUSE_DAYS })}</Text>
                  </Pressable>
                </>
              )}
            </View>
          )}

          <Text style={styles.footerNote}>
            {!settings.enabled ? t('nt.footerOff') : paused ? t('nt.footerPaused') : t('nt.footer')}
          </Text>
        </ScrollView>
      )}
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
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#4A4A4A' },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { padding: 20, paddingBottom: 40 },
  intro: { fontSize: 15, color: '#666', lineHeight: 22, marginBottom: 16 },
  soonBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: '#E4EEEA',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
  },
  soonText: { flex: 1, fontSize: 13, color: '#4A4A4A', lineHeight: 19 },
  group: { gap: 0 },
  groupDisabled: { opacity: 0.45 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
    gap: 12,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E4EEEA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTextWrap: { flex: 1 },
  cardTitle: { fontSize: 16, fontWeight: '600', color: '#4A4A4A', marginBottom: 2 },
  cardDesc: { fontSize: 13, color: '#888', lineHeight: 18 },
  timeCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    marginTop: -4,
    marginBottom: 10,
  },
  timeLabel: { fontSize: 13, color: '#666', marginBottom: 10 },
  timeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  timeChip: {
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderWidth: 2,
    borderColor: '#E0E0E0',
    backgroundColor: '#FFFFFF',
  },
  timeChipSelected: { borderColor: '#557A6D', backgroundColor: '#E4EEEA' },
  timeChipText: { fontSize: 14, color: '#666', fontWeight: '500' },
  timeChipTextSelected: { color: '#557A6D', fontWeight: '700' },
  pauseCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    marginTop: 6,
    marginBottom: 16,
  },
  pauseText: { flex: 1, fontSize: 14, color: '#4A4A4A' },
  pauseAction: { fontSize: 14, color: '#557A6D', fontWeight: '600' },
  footerNote: { fontSize: 13, color: '#999', textAlign: 'center', lineHeight: 19 },
});
