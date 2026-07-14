import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAppContext } from '../../src/contexts/AppContext';

// Conditionally import victory-native only on mobile
let VictoryPolarAxis: any = null;
let VictoryChart: any = null;
let VictoryArea: any = null;
let VictoryLine: any = null;
let VictoryAxis: any = null;

if (Platform.OS !== 'web') {
  try {
    const victory = require('victory-native');
    VictoryPolarAxis = victory.VictoryPolarAxis;
    VictoryChart = victory.VictoryChart;
    VictoryArea = victory.VictoryArea;
    VictoryLine = victory.VictoryLine;
    VictoryAxis = victory.VictoryAxis;
  } catch (e) {
    console.log('Victory Native not available');
  }
}

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL;
const isWeb = Platform.OS === 'web';

export default function MappaScreen() {
  const { user, isGuest, screeningResult } = useAppContext();
  const [checkinHistory, setCheckinHistory] = useState<any[]>([]);

  useEffect(() => {
    loadCheckinHistory();
  }, []);

  const loadCheckinHistory = async () => {
    try {
      const userId = isGuest ? null : user?.id;
      const response = await fetch(`${API_URL}/api/checkin/history?user_id=${userId || ''}&days=14`);
      const data = await response.json();
      
      if (response.ok) {
        setCheckinHistory(data);
      }
    } catch (error) {
      console.error('Error loading checkin history:', error);
    }
  };

  // Prepare trend data
  const trendData = checkinHistory.slice(0, 7).reverse().map((checkin, index) => {
    const avg = (checkin.energia + checkin.umore + checkin.sonno) / 3;
    return {
      x: index + 1,
      y: (avg / 5) * 100, // Convert to 0-100 scale
    };
  });

  const getJourneyStage = (score: number) => {
    if (score >= 70) return { stage: 'Fioritura', icon: 'flower', color: '#7CB342', description: 'Il tuo benessere è in piena fioritura!' };
    if (score >= 40) return { stage: 'Crescita', icon: 'leaf', color: '#FFA726', description: 'Stai crescendo bene, continua così!' };
    return { stage: 'Semina', icon: 'water', color: '#42A5F5', description: 'Stai piantando i semi del benessere' };
  };

  const currentStage = screeningResult ? getJourneyStage(screeningResult.indice_iobio) : null;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.content}>
          <Text style={styles.title}>Il tuo Percorso</Text>
          <Text style={styles.subtitle}>Mappa visiva del benessere</Text>

          {screeningResult && currentStage && (
            <>
              <View style={styles.journeyCard}>
                <View style={styles.journeyHeader}>
                  <Ionicons name={currentStage.icon as any} size={48} color={currentStage.color} />
                  <View style={styles.journeyContent}>
                    <Text style={styles.journeyStage}>{currentStage.stage}</Text>
                    <Text style={styles.journeyDescription}>{currentStage.description}</Text>
                  </View>
                </View>
              </View>

              <View style={styles.chartCard}>
                <Text style={styles.sectionTitle}>Le tue aree di benessere</Text>
                {isWeb ? (
                  <View style={{ padding: 20, width: '100%' }}>
                    <Text style={{ color: '#999', textAlign: 'center', marginBottom: 16 }}>
                      📱 Grafici disponibili su mobile
                    </Text>
                    {Object.keys(screeningResult.area_scores).map((area, index) => (
                      <View key={index} style={{ 
                        flexDirection: 'row', 
                        justifyContent: 'space-between',
                        paddingVertical: 8,
                        borderBottomWidth: 1,
                        borderBottomColor: '#F0F0F0'
                      }}>
                        <Text style={{ color: '#4A4A4A', fontSize: 14 }}>{area}</Text>
                        <Text style={{ color: '#7CB342', fontSize: 14, fontWeight: '600' }}>
                          {screeningResult.area_scores[area]}/100
                        </Text>
                      </View>
                    ))}
                  </View>
                ) : (
                  <VictoryChart
                    polar
                    domain={{ y: [0, 100] }}
                    height={300}
                    width={350}
                  >
                    {Object.keys(screeningResult.area_scores).map((key, i) => (
                      <VictoryPolarAxis
                        key={i}
                        dependentAxis
                        style={{
                          axisLabel: { padding: 10, fontSize: 10 },
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
                        axisLabel: { padding: 20, fontSize: 11, fill: '#666' },
                        axis: { stroke: 'none' },
                        grid: { stroke: '#E0E0E0', strokeWidth: 1 },
                      }}
                      tickValues={Object.keys(screeningResult.area_scores).map((_, i) => i + 1)}
                      tickFormat={(t) => {
                        const area = Object.keys(screeningResult.area_scores)[t - 1];
                        return area && area.length > 12 ? area.substring(0, 10) + '...' : area;
                      }}
                    />
                    <VictoryArea
                      data={Object.keys(screeningResult.area_scores).map((area) => ({
                        x: area.length > 15 ? area.substring(0, 12) + '...' : area,
                        y: screeningResult.area_scores[area],
                      }))}
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
                )}
              </View>
            </>
          )}

          {trendData.length > 0 && (
            <View style={styles.chartCard}>
              <Text style={styles.sectionTitle}>Andamento ultimi 7 giorni</Text>
              <Text style={styles.chartSubtitle}>Media giornaliera (energia, umore, sonno)</Text>
              {isWeb ? (
                <View style={{ padding: 20 }}>
                  <Text style={{ color: '#999', textAlign: 'center' }}>
                    📱 Grafici disponibili su mobile
                  </Text>
                </View>
              ) : (
                <VictoryChart
                  height={250}
                  width={350}
                  domain={{ y: [0, 100] }}
                >
                  <VictoryAxis
                    style={{
                      axis: { stroke: '#E0E0E0' },
                      tickLabels: { fontSize: 10, fill: '#666' },
                    }}
                  />
                  <VictoryAxis
                    dependentAxis
                    style={{
                      axis: { stroke: '#E0E0E0' },
                      tickLabels: { fontSize: 10, fill: '#666' },
                      grid: { stroke: '#E0E0E0', strokeWidth: 0.5 },
                    }}
                  />
                  <VictoryLine
                    data={trendData}
                    style={{
                      data: { stroke: '#7CB342', strokeWidth: 3 },
                    }}
                    interpolation="natural"
                  />
                </VictoryChart>
              )}
            </View>
          )}

          {!screeningResult && (
            <View style={styles.emptyState}>
              <Ionicons name="map-outline" size={64} color="#E0E0E0" />
              <Text style={styles.emptyText}>Completa lo screening per vedere la tua mappa del benessere</Text>
            </View>
          )}

          <View style={styles.journeyStages}>
            <Text style={styles.sectionTitle}>Le fasi del tuo viaggio</Text>
            
            <View style={styles.stageItem}>
              <Ionicons name="water" size={32} color="#42A5F5" />
              <View style={styles.stageContent}>
                <Text style={styles.stageName}>Semina</Text>
                <Text style={styles.stageText}>Inizi a prenderti cura di te, piantando i semi del cambiamento</Text>
              </View>
            </View>

            <View style={styles.stageItem}>
              <Ionicons name="leaf" size={32} color="#FFA726" />
              <View style={styles.stageContent}>
                <Text style={styles.stageName}>Crescita</Text>
                <Text style={styles.stageText}>Le nuove abitudini crescono e si rafforzano</Text>
              </View>
            </View>

            <View style={styles.stageItem}>
              <Ionicons name="flower" size={32} color="#7CB342" />
              <View style={styles.stageContent}>
                <Text style={styles.stageName}>Fioritura</Text>
                <Text style={styles.stageText}>Il tuo benessere è in piena fioritura, continua a coltivarlo</Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
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
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#4A4A4A',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#999',
    marginBottom: 24,
  },
  journeyCard: {
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
  journeyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  journeyContent: {
    flex: 1,
    marginLeft: 16,
  },
  journeyStage: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#4A4A4A',
    marginBottom: 4,
  },
  journeyDescription: {
    fontSize: 14,
    color: '#666',
  },
  chartCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#4A4A4A',
    marginBottom: 16,
  },
  chartSubtitle: {
    fontSize: 12,
    color: '#999',
    marginBottom: 8,
    textAlign: 'center',
  },
  journeyStages: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  stageItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  stageContent: {
    flex: 1,
    marginLeft: 16,
  },
  stageName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#4A4A4A',
    marginBottom: 4,
  },
  stageText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  emptyState: {
    alignItems: 'center',
    padding: 48,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
    marginTop: 16,
  },
});
