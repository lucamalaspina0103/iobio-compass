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

const AREA_ACTIONS: { [key: string]: string } = {
  energia: 'Inizia la giornata con 10 minuti di movimento',
  sonno: 'Crea una routine serale rilassante',
  stress: 'Pratica 5 minuti di respirazione profonda',
  movimento: 'Aggiungi una camminata di 15 minuti',
  alimentazione: 'Pianifica pasti sani per la settimana',
  pelle: 'Prenditi cura di sonno, idratazione e alimentazione',
  equilibrio_mentale: 'Dedica qualche minuto alla mindfulness',
};

export default function ResultsScreen() {
  const router = useRouter();
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
          <Text style={styles.errorText}>Nessun risultato disponibile</Text>
        </View>
      </SafeAreaView>
    );
  }

  const { indice_iobio, area_scores, weak_areas } = screeningResult;

  const getScoreInterpretation = (score: number) => {
    if (score >= 80) return {
      title: 'Eccellente!',
      description: 'Il tuo benessere è in ottima forma. Continua con le tue buone abitudini!',
      color: ['#7CB342', '#9CCC65'],
      icon: 'trophy',
    };
    if (score >= 60) return {
      title: 'Buon Livello',
      description: 'Hai una buona base di benessere. Con piccoli miglioramenti puoi eccellere!',
      color: ['#FFA726', '#FFB74D'],
      icon: 'star',
    };
    if (score >= 40) return {
      title: 'In Crescita',
      description: 'Ci sono margini di miglioramento. Il piano personalizzato ti aiuterà!',
      color: ['#42A5F5', '#64B5F6'],
      icon: 'trending-up',
    };
    return {
      title: 'Inizia Ora',
      description: 'Questo è il momento perfetto per investire nel tuo benessere. Ogni passo conta!',
      color: ['#EF5350', '#E57373'],
      icon: 'leaf',
    };
  };

  const interpretation = getScoreInterpretation(indice_iobio);
  const isQuick = screeningResult.kind === 'quick';

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
    x: area.length > 15 ? area.substring(0, 12) + '...' : area,
    y: area_scores[area],
  }));

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.content}>
          <LinearGradient
            colors={interpretation.color}
            style={styles.scoreCard}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Ionicons name={interpretation.icon as any} size={48} color="#FFFFFF" />
            <Text style={styles.scoreCardTitle}>{interpretation.title}</Text>
            <View style={styles.scoreCircle}>
              <Text style={styles.scoreValue}>{indice_iobio}</Text>
              <Text style={styles.scoreLabel}>Indice IOBIO</Text>
            </View>
            <Text style={styles.scoreDescription}>{interpretation.description}</Text>
          </LinearGradient>

          {isQuick && (
            <Text style={styles.quickNote}>Controllo rapido · il piano è stato aggiornato da oggi in poi</Text>
          )}

          {previous && (
            <View style={styles.compareCard}>
              <Text style={styles.compareTitle}>
                Rispetto all'ultimo controllo{daysAgo > 0 ? ` (${daysAgo} ${daysAgo === 1 ? 'giorno' : 'giorni'} fa)` : ''}
              </Text>
              <Text style={styles.compareDelta}>
                Indice IOBIO: {previous.indice_iobio} → {indice_iobio}
                {delta > 0 ? `  (+${delta})` : delta < 0 ? `  (${delta})` : '  (stabile)'}
              </Text>
              {grew.length > 0 && (
                <Text style={styles.compareGood}>
                  In crescita: {grew.map(x => `${getAreaInfo(x.area).name} +${x.diff}`).join(' · ')}
                </Text>
              )}
              {toWatch.length > 0 && (
                <Text style={styles.compareWatch}>
                  Da seguire: {toWatch.map(x => getAreaInfo(x.area).name).join(' · ')}
                </Text>
              )}
              {areaChanges.length === 0 && (
                <Text style={styles.compareWatch}>Nessun cambiamento: la costanza è già un risultato.</Text>
              )}
            </View>
          )}

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>I tuoi Top 3 Focus</Text>
            <Text style={styles.sectionSubtitle}>Aree dove concentrare l'attenzione</Text>

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
                  💡 {AREA_ACTIONS[area] || 'Un piccolo gesto al giorno fa la differenza'}
                </Text>
                <View style={styles.addButton}>
                  <Ionicons name="checkmark-circle" size={20} color="#7CB342" />
                  <Text style={styles.addButtonText}>Già nel tuo piano</Text>
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
                <Ionicons name="musical-notes" size={24} color="#7CB342" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.soundCardTitle}>Ascolta la tua sessione consigliata</Text>
                <Text style={styles.soundCardSub}>
                  Frequenze selezionate per {getAreaInfo(weak_areas[0]).name}
                </Text>
              </View>
            </View>
            <Ionicons name="arrow-forward-circle" size={28} color="#7CB342" />
          </Pressable>

          {!isWeb && (
            <View style={styles.chartCard}>
              <Text style={styles.sectionTitle}>Panoramica Completa</Text>
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
                  tickFormat={(t) => {
                    const area = Object.keys(area_scores)[t - 1];
                    return area && area.length > 12 ? area.substring(0, 10) + '...' : area;
                  }}
                />
                <VictoryArea
                  data={chartData}
                  style={{
                    data: {
                      fill: '#7CB342',
                      fillOpacity: 0.3,
                      stroke: '#7CB342',
                      strokeWidth: 2,
                    },
                  }}
                />
              </VictoryChart>
            </View>
          )}

          {isWeb && (
            <View style={styles.chartCard}>
              <Text style={styles.sectionTitle}>Tutte le Aree</Text>
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
            <Text style={styles.ctaButtonText}>Vai al Piano Personalizzato</Text>
            <Ionicons name="arrow-forward" size={24} color="#FFFFFF" />
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  quickNote: { textAlign: 'center', color: '#7CB342', fontSize: 13, fontWeight: '600', marginTop: 12 },
  compareCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginTop: 16,
    gap: 6,
  },
  compareTitle: { fontSize: 15, fontWeight: '700', color: '#4A4A4A' },
  compareDelta: { fontSize: 15, color: '#4A4A4A' },
  compareGood: { fontSize: 13, color: '#558B2F', lineHeight: 19 },
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
    backgroundColor: '#7CB342',
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
    color: '#7CB342',
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
    backgroundColor: '#E8F5E9',
    borderRadius: 8,
    padding: 10,
    gap: 8,
  },
  addButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#7CB342',
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
    backgroundColor: '#7CB342',
  },
  areaRowScore: {
    fontSize: 14,
    fontWeight: '600',
    color: '#7CB342',
    width: 30,
    textAlign: 'right',
  },
  ctaButton: {
    flexDirection: 'row',
    backgroundColor: '#7CB342',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    shadowColor: '#7CB342',
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
    backgroundColor: '#F1F8E9',
    borderRadius: 16,
    padding: 18,
    marginBottom: 24,
    borderWidth: 1.5,
    borderColor: '#AED581',
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
    backgroundColor: '#E8F5E9',
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
