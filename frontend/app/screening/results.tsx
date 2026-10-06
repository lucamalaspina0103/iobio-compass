import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAppContext } from '../../src/contexts/AppContext';
import { LinearGradient } from 'expo-linear-gradient';
import { getAreaInfo } from '../../src/lib/pianoPlan';
import { loadPreviousScreening, ScreeningHistoryEntry } from '../../src/lib/screeningHistory';
import { parseDate } from '../../src/lib/checkDue';
import { useI18n } from '../../src/i18n';

// Conditionally import victory-native only on mobile
let VictoryPolarAxis: any = null;
let VictoryChart: any = null;
let VictoryArea: any = null;

if (Platform.OS !== 'web') {
  try {
    const victory = require('victory-native');
    VictoryPolarAxis = victory.VictoryPolarAxis;
    VictoryChart = victory.VictoryChart;
    VictoryArea = victory.VictoryArea;
  } catch (e) {
    console.log('Victory Native not available');
  }
}

const isWeb = Platform.OS === 'web';

export default function ResultsScreen() {
  const router = useRouter();
  const { t } = useI18n();
  const { user, isGuest, screeningResult } = useAppContext();
  const [previous, setPrevious] = useState<ScreeningHistoryEntry | null>(null);

  // Confronto con l'ultimo screening (completo o rapido) fatto prima di questo
  useEffect(() => {
    if (!screeningResult) return;
    loadPreviousScreening(screeningResult.id, isGuest, user?.id).then(setPrevious);
  }, [screeningResult?.id]);

  if (!screeningResult) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          <Text style={styles.errorText}>{t('results.none')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  const { indice_iobio, area_scores, weak_areas } = screeningResult;

  const getScoreInterpretation = (score: number) => {
    if (score >= 80) return {
      title: t('results.excellent.title'),
      description: t('results.excellent.desc'),
      color: ['#557A6D', '#8FB3A5'],
      icon: 'trophy',
    };
    if (score >= 60) return {
      title: t('results.good.title'),
      description: t('results.good.desc'),
      color: ['#FFA726', '#FFB74D'],
      icon: 'star',
    };
    if (score >= 40) return {
      title: t('results.growing.title'),
      description: t('results.growing.desc'),
      color: ['#42A5F5', '#64B5F6'],
      icon: 'trending-up',
    };
    return {
      title: t('results.start.title'),
      description: t('results.start.desc'),
      color: ['#EF5350', '#E57373'],
      icon: 'leaf',
    };
  };

  const interpretation = getScoreInterpretation(indice_iobio);
  const isQuick = screeningResult.kind === 'quick';
  const isReview = screeningResult.kind === 'review';

  // Cosa e' cambiato dall'ultima volta: tono sempre incoraggiante, nessun giudizio
  const delta = previous ? indice_iobio - previous.indice_iobio : 0;
  const areaChanges = previous
    ? Object.keys(area_scores)
        .map(area => ({ area, diff: area_scores[area] - (previous.area_scores[area] ?? area_scores[area]) }))
        .filter(x => x.diff !== 0)
    : [];
  const grew = areaChanges.filter(x => x.diff > 0).sort((a, b) => b.diff - a.diff).slice(0, 3);
  const toWatch = areaChanges.filter(x => x.diff < 0).sort((a, b) => a.diff - b.diff).slice(0, 2);
  const daysAgo = previous
    ? Math.max(0, Math.floor((Date.now() - parseDate(previous.date)) / (24 * 60 * 60 * 1000)))
    : 0;

  const chartData = Object.keys(area_scores).map(area => ({
    x: getAreaInfo(area).name,
    y: area_scores[area],
  }));

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.content}>
          <LinearGradient
            colors={interpretation.color as [string, string]}
            style={styles.scoreCard}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Ionicons name={interpretation.icon as any} size={48} color="#FFFFFF" />
            <Text style={styles.scoreCardTitle}>{interpretation.title}</Text>
            <View style={styles.scoreCircle}>
              <Text style={styles.scoreValue}>{indice_iobio}</Text>
              <Text style={styles.scoreLabel}>{t('results.index')}</Text>
            </View>
            <Text style={styles.scoreDescription}>{interpretation.description}</Text>
          </LinearGradient>

          {isQuick && (
            <Text style={styles.quickNote}>{t('results.quickNote')}</Text>
          )}
          {isReview && (
            <Text style={styles.quickNote}>{t('results.reviewNote')}</Text>
          )}

          {previous && (
            <View style={styles.compareCard}>
              <Text style={styles.compareTitle}>
                {t('results.compareTitle')}{daysAgo > 0 ? ` (${t('results.daysAgo', { count: daysAgo })})` : ''}
              </Text>
              <Text style={styles.compareDelta}>
                {t('results.index')}: {previous.indice_iobio} → {indice_iobio}
                {delta > 0 ? `  (+${delta})` : delta < 0 ? `  (${delta})` : `  (${t('results.stable')})`}
              </Text>
              {grew.length > 0 && (
                <Text style={styles.compareGood}>
                  {t('results.grew')} {grew.map(x => `${getAreaInfo(x.area).name} +${x.diff}`).join(' · ')}
                </Text>
              )}
              {toWatch.length > 0 && (
                <Text style={styles.compareWatch}>
                  {t('results.toWatch')} {toWatch.map(x => getAreaInfo(x.area).name).join(' · ')}
                </Text>
              )}
              {areaChanges.length === 0 && (
                <Text style={styles.compareWatch}>{t('results.noChange')}</Text>
              )}
            </View>
          )}

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{isReview ? t('results.focusReview') : t('results.focusTop3')}</Text>
            <Text style={styles.sectionSubtitle}>{isReview ? t('results.focusSubReview') : t('results.focusSubTop')}</Text>

            {weak_areas.map((area, index) => (
              <View key={index} style={styles.focusCard}>
                <View style={styles.focusHeader}>
                  <View style={styles.focusRank}>
                    <Text style={styles.focusRankText}>{index + 1}</Text>
                  </View>
                  <View style={styles.focusInfo}>
                    <Text style={styles.focusArea}>{getAreaInfo(area).name}</Text>
                    <Text style={styles.focusScore}>{area_scores[area]}/100</Text>
                  </View>
                </View>
                <Text style={styles.focusAction}>
                  💡 {t(`results.action.${area}`) !== `results.action.${area}` ? t(`results.action.${area}`) : t('results.action.default')}
                </Text>
                <View style={styles.addButton}>
                  <Ionicons name="checkmark-circle" size={20} color="#557A6D" />
                  <Text style={styles.addButtonText}>{t('results.inPlan')}</Text>
                </View>
              </View>
            ))}
          </View>

          <Pressable
            style={styles.soundCard}
            onPress={() => router.replace({ pathname: '/(tabs)/suoni', params: { session: weak_areas[0] } })}
          >
            <View style={styles.soundCardLeft}>
              <View style={styles.soundIconBg}>
                <Ionicons name="musical-notes" size={24} color="#557A6D" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.soundCardTitle}>{t('results.soundTitle')}</Text>
                <Text style={styles.soundCardSub}>
                  {t('results.soundSub', { area: getAreaInfo(weak_areas[0]).name })}
                </Text>
              </View>
            </View>
            <Ionicons name="arrow-forward-circle" size={28} color="#557A6D" />
          </Pressable>

          {!isWeb && (
            <View style={styles.chartCard}>
              <Text style={styles.sectionTitle}>{t('results.overview')}</Text>
              <VictoryChart
                polar
                domain={{ y: [0, 100] }}
                height={280}
                width={340}
              >
                {Object.keys(area_scores).map((key, i) => (
                  <VictoryPolarAxis
                    key={i}
                    dependentAxis
                    style={{
                      axis: { stroke: 'none' },
                      grid: { stroke: '#E0E0E0', strokeWidth: 0.5 },
                      tickLabels: { fill: 'transparent' },
                    }}
                    axisValue={i + 1}
                  />
                ))}
                <VictoryPolarAxis
                  labelPlacement="perpendicular"
                  style={{
                    axisLabel: { padding: 20, fontSize: 10, fill: '#666' },
                    axis: { stroke: 'none' },
                    grid: { stroke: '#E0E0E0', strokeWidth: 1 },
                  }}
                  tickValues={Object.keys(area_scores).map((_, i) => i + 1)}
                  tickFormat={(tick: number) => {
                    const area = Object.keys(area_scores)[tick - 1];
                    const name = area ? getAreaInfo(area).name : '';
                    return name.length > 12 ? name.substring(0, 10) + '...' : name;
                  }}
                />
                <VictoryArea
                  data={chartData}
                  style={{
                    data: {
                      fill: '#557A6D',
                      fillOpacity: 0.3,
                      stroke: '#557A6D',
                      strokeWidth: 2,
                    },
                  }}
                />
              </VictoryChart>
            </View>
          )}

          {isWeb && (
            <View style={styles.chartCard}>
              <Text style={styles.sectionTitle}>{t('results.allAreas')}</Text>
              {Object.keys(area_scores).map((area, index) => (
                <View key={index} style={styles.areaRow}>
                  <Text style={styles.areaRowName}>{getAreaInfo(area).name}</Text>
                  <View style={styles.areaRowBar}>
                    <View style={[styles.areaRowFill, { width: `${area_scores[area]}%` }]} />
                  </View>
                  <Text style={styles.areaRowScore}>{area_scores[area]}</Text>
                </View>
              ))}
            </View>
          )}

          <Pressable
            style={styles.ctaButton}
            onPress={() => router.replace('/(tabs)/oggi')}
          >
            <Text style={styles.ctaButtonText}>{t('results.cta')}</Text>
            <Ionicons name="arrow-forward" size={24} color="#FFFFFF" />
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  quickNote: { textAlign: 'center', color: '#557A6D', fontSize: 13, fontWeight: '600', marginTop: 12 },
  compareCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginTop: 16,
    gap: 6,
  },
  compareTitle: { fontSize: 15, fontWeight: '700', color: '#4A4A4A' },
  compareDelta: { fontSize: 15, color: '#4A4A4A' },
  compareGood: { fontSize: 13, color: '#3F5E52', lineHeight: 19 },
  compareWatch: { fontSize: 13, color: '#8D6E63', lineHeight: 19 },
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
  scoreCard: {
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    marginBottom: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 6,
  },
  scoreCardTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginTop: 16,
    marginBottom: 20,
  },
  scoreCircle: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    borderWidth: 4,
    borderColor: 'rgba(255, 255, 255, 0.5)',
  },
  scoreValue: {
    fontSize: 56,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  scoreLabel: {
    fontSize: 14,
    color: '#FFFFFF',
    opacity: 0.9,
  },
  scoreDescription: {
    fontSize: 16,
    color: '#FFFFFF',
    textAlign: 'center',
    lineHeight: 22,
    opacity: 0.95,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#4A4A4A',
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#999',
    marginBottom: 16,
  },
  focusCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  focusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  focusRank: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#557A6D',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  focusRankText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  focusInfo: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  focusArea: {
    fontSize: 18,
    fontWeight: '600',
    color: '#4A4A4A',
  },
  focusScore: {
    fontSize: 16,
    fontWeight: '600',
    color: '#557A6D',
  },
  focusAction: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 12,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E4EEEA',
    borderRadius: 8,
    padding: 10,
    gap: 8,
  },
  addButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#557A6D',
  },
  chartCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    alignItems: 'center',
  },
  webChartNote: {
    fontSize: 13,
    color: '#999',
    marginBottom: 16,
    textAlign: 'center',
  },
  areaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    width: '100%',
  },
  areaRowName: {
    fontSize: 13,
    color: '#4A4A4A',
    width: 120,
  },
  areaRowBar: {
    flex: 1,
    height: 8,
    backgroundColor: '#E0E0E0',
    borderRadius: 4,
    overflow: 'hidden',
    marginHorizontal: 8,
  },
  areaRowFill: {
    height: '100%',
    backgroundColor: '#557A6D',
  },
  areaRowScore: {
    fontSize: 14,
    fontWeight: '600',
    color: '#557A6D',
    width: 30,
    textAlign: 'right',
  },
  ctaButton: {
    flexDirection: 'row',
    backgroundColor: '#557A6D',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    shadowColor: '#557A6D',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  ctaButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  errorText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  soundCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#EEF4F1',
    borderRadius: 16,
    padding: 18,
    marginBottom: 24,
    borderWidth: 1.5,
    borderColor: '#9DBDB0',
  },
  soundCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    flex: 1,
  },
  soundIconBg: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#E4EEEA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  soundCardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#4A4A4A',
    marginBottom: 3,
  },
  soundCardSub: {
    fontSize: 12,
    color: '#666',
    lineHeight: 16,
  },
});
