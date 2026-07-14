import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView,
  Platform,
  Animated,
  Easing
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { WebView } from 'react-native-webview';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAppContext } from '../../src/contexts/AppContext';

// Binaural beat sessions mapped to wellness areas
interface BinauralSession {
  id: string;
  name: string;
  area: string;
  frequency: number;
  baseFrequency: number;
  waveType: 'alpha' | 'beta' | 'theta' | 'delta';
  description: string;
  color: string;
  icon: string;
}

const BINAURAL_SESSIONS: BinauralSession[] = [
  {
    id: 'stress',
    name: 'Rilassamento Profondo',
    area: 'Stress',
    frequency: 10,
    baseFrequency: 200,
    waveType: 'alpha',
    description: 'Onde Alpha a 10Hz per ridurre stress e ansia',
    color: '#81C784',
    icon: 'leaf',
  },
  {
    id: 'sonno',
    name: 'Sonno Ristoratore',
    area: 'Sonno',
    frequency: 2,
    baseFrequency: 150,
    waveType: 'delta',
    description: 'Onde Delta a 2Hz per un sonno profondo e rigenerante',
    color: '#7986CB',
    icon: 'moon',
  },
  {
    id: 'energia',
    name: 'Energia e Focus',
    area: 'Energia',
    frequency: 20,
    baseFrequency: 250,
    waveType: 'beta',
    description: 'Onde Beta a 20Hz per aumentare energia e concentrazione',
    color: '#FFB74D',
    icon: 'flash',
  },
  {
    id: 'equilibrio_mentale',
    name: 'Equilibrio Mentale',
    area: 'Equilibrio mentale',
    frequency: 6,
    baseFrequency: 180,
    waveType: 'theta',
    description: 'Onde Theta a 6Hz per meditazione e creatività',
    color: '#BA68C8',
    icon: 'bulb',
  },
  {
    id: 'movimento',
    name: 'Motivazione Attiva',
    area: 'Movimento',
    frequency: 18,
    baseFrequency: 240,
    waveType: 'beta',
    description: 'Onde Beta a 18Hz per motivazione e attività fisica',
    color: '#4DD0E1',
    icon: 'walk',
  },
  {
    id: 'alimentazione',
    name: 'Consapevolezza Alimentare',
    area: 'Alimentazione',
    frequency: 8,
    baseFrequency: 190,
    waveType: 'alpha',
    description: 'Onde Alpha a 8Hz per mindful eating',
    color: '#AED581',
    icon: 'nutrition',
  },
  {
    id: 'pelle',
    name: 'Rigenerazione Cellulare',
    area: 'Pelle',
    frequency: 4,
    baseFrequency: 160,
    waveType: 'theta',
    description: 'Onde Theta a 4Hz per rilassamento e rigenerazione',
    color: '#F48FB1',
    icon: 'sparkles',
  },
];

const DURATION_OPTIONS = [
  { label: '5 min', value: 5 },
  { label: '10 min', value: 10 },
  { label: '15 min', value: 15 },
  { label: '20 min', value: 20 },
  { label: '30 min', value: 30 },
];

export default function SuoniScreen() {
  const { screeningResult } = useAppContext();
  const [selectedSession, setSelectedSession] = useState<BinauralSession>(BINAURAL_SESSIONS[0]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(10);
  const [timeRemaining, setTimeRemaining] = useState(10 * 60);
  const [volume, setVolume] = useState(0.5);
  const [showDurationPicker, setShowDurationPicker] = useState(false);
  
  const webViewRef = useRef<WebView>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Auto-select session based on screening weak areas
  useEffect(() => {
    const loadRecommendedSession = async () => {
      try {
        const resultsStr = await AsyncStorage.getItem('iobio_latest_results');
        if (resultsStr) {
          const results = JSON.parse(resultsStr);
          if (results.weak_areas && results.weak_areas.length > 0) {
            const weakArea = results.weak_areas[0].toLowerCase();
            const matchedSession = BINAURAL_SESSIONS.find(
              s => s.area.toLowerCase().includes(weakArea) || s.id === weakArea
            );
            if (matchedSession) {
              setSelectedSession(matchedSession);
            }
          }
        }
      } catch (error) {
        console.log('Error loading recommended session:', error);
      }
    };
    
    loadRecommendedSession();
  }, [screeningResult]);

  // Timer countdown
  useEffect(() => {
    if (isPlaying && timeRemaining > 0) {
      timerRef.current = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1) {
            stopAudio();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isPlaying]);

  // Animation for playing state
  useEffect(() => {
    if (isPlaying) {
      // Rotation animation
      Animated.loop(
        Animated.timing(rotateAnim, {
          toValue: 1,
          duration: 8000,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      ).start();
      
      // Pulse animation
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.1,
            duration: 1000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      rotateAnim.setValue(0);
      pulseAnim.setValue(1);
    }
  }, [isPlaying]);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Web Audio API ref for web platform
  const webAudioRef = useRef<{
    context: AudioContext | null;
    oscillatorL: OscillatorNode | null;
    oscillatorR: OscillatorNode | null;
    gainNode: GainNode | null;
  }>({
    context: null,
    oscillatorL: null,
    oscillatorR: null,
    gainNode: null,
  });

  // Start audio using Web Audio API directly (for web platform)
  const startWebAudio = () => {
    try {
      // Create or resume AudioContext
      if (!webAudioRef.current.context) {
        webAudioRef.current.context = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      
      const ctx = webAudioRef.current.context;
      
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      // Stop existing oscillators if any
      if (webAudioRef.current.oscillatorL) {
        try { webAudioRef.current.oscillatorL.stop(); } catch (e) {}
      }
      if (webAudioRef.current.oscillatorR) {
        try { webAudioRef.current.oscillatorR.stop(); } catch (e) {}
      }

      // Create new oscillators
      const oscillatorL = ctx.createOscillator();
      const oscillatorR = ctx.createOscillator();
      const gainNode = ctx.createGain();
      const merger = ctx.createChannelMerger(2);

      oscillatorL.type = 'sine';
      oscillatorR.type = 'sine';

      const baseFreq = selectedSession.baseFrequency;
      const binauralFreq = selectedSession.frequency;

      oscillatorL.frequency.value = baseFreq;
      oscillatorR.frequency.value = baseFreq + binauralFreq;

      gainNode.gain.value = volume;

      oscillatorL.connect(merger, 0, 0);
      oscillatorR.connect(merger, 0, 1);
      merger.connect(gainNode);
      gainNode.connect(ctx.destination);

      oscillatorL.start();
      oscillatorR.start();

      // Store references
      webAudioRef.current.oscillatorL = oscillatorL;
      webAudioRef.current.oscillatorR = oscillatorR;
      webAudioRef.current.gainNode = gainNode;

      console.log('Web Audio started:', baseFreq, 'Hz +', binauralFreq, 'Hz binaural');
    } catch (error) {
      console.error('Web Audio error:', error);
    }
  };

  // Stop audio for web platform
  const stopWebAudio = () => {
    try {
      if (webAudioRef.current.oscillatorL) {
        webAudioRef.current.oscillatorL.stop();
        webAudioRef.current.oscillatorL = null;
      }
      if (webAudioRef.current.oscillatorR) {
        webAudioRef.current.oscillatorR.stop();
        webAudioRef.current.oscillatorR = null;
      }
      console.log('Web Audio stopped');
    } catch (error) {
      console.error('Stop Web Audio error:', error);
    }
  };

  // Update volume for web platform
  const updateWebAudioVolume = (newVolume: number) => {
    if (webAudioRef.current.gainNode) {
      webAudioRef.current.gainNode.gain.value = newVolume;
    }
  };

  const playAudio = () => {
    setIsPlaying(true);
    setTimeRemaining(duration * 60);
    
    // Use Web Audio API directly for web platform
    if (Platform.OS === 'web') {
      startWebAudio();
      return;
    }
    
    // Use WebView injection for native platforms (iOS/Android)
    const jsCode = `
      if (typeof audioContext === 'undefined') {
        var audioContext = new (window.AudioContext || window.webkitAudioContext)();
      }
      if (audioContext.state === 'suspended') {
        audioContext.resume();
      }
      
      // Stop existing oscillators
      if (typeof oscillatorL !== 'undefined') oscillatorL.stop();
      if (typeof oscillatorR !== 'undefined') oscillatorR.stop();
      
      var oscillatorL = audioContext.createOscillator();
      var oscillatorR = audioContext.createOscillator();
      var gainNode = audioContext.createGain();
      var merger = audioContext.createChannelMerger(2);
      
      oscillatorL.type = 'sine';
      oscillatorR.type = 'sine';
      
      var baseFreq = ${selectedSession.baseFrequency};
      var binauralFreq = ${selectedSession.frequency};
      
      oscillatorL.frequency.value = baseFreq;
      oscillatorR.frequency.value = baseFreq + binauralFreq;
      
      gainNode.gain.value = ${volume};
      
      oscillatorL.connect(merger, 0, 0);
      oscillatorR.connect(merger, 0, 1);
      merger.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillatorL.start();
      oscillatorR.start();
      
      window.oscillatorL = oscillatorL;
      window.oscillatorR = oscillatorR;
      window.gainNode = gainNode;
      window.audioContext = audioContext;
      
      true;
    `;
    
    webViewRef.current?.injectJavaScript(jsCode);
  };

  const stopAudio = () => {
    setIsPlaying(false);
    
    // Use Web Audio API directly for web platform
    if (Platform.OS === 'web') {
      stopWebAudio();
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      return;
    }
    
    // Use WebView injection for native platforms
    const jsCode = `
      if (typeof oscillatorL !== 'undefined') {
        oscillatorL.stop();
      }
      if (typeof oscillatorR !== 'undefined') {
        oscillatorR.stop();
      }
      true;
    `;
    
    webViewRef.current?.injectJavaScript(jsCode);
    
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
  };

  const togglePlayPause = () => {
    if (isPlaying) {
      stopAudio();
    } else {
      playAudio();
    }
  };

  const updateVolume = (newVolume: number) => {
    setVolume(newVolume);
    
    if (isPlaying) {
      // Use Web Audio API directly for web platform
      if (Platform.OS === 'web') {
        updateWebAudioVolume(newVolume);
        return;
      }
      
      // Use WebView injection for native platforms
      const jsCode = `
        if (typeof gainNode !== 'undefined') {
          gainNode.gain.value = ${newVolume};
        }
        true;
      `;
      webViewRef.current?.injectJavaScript(jsCode);
    }
  };

  const selectDuration = (minutes: number) => {
    setDuration(minutes);
    setTimeRemaining(minutes * 60);
    setShowDurationPicker(false);
  };

  const rotateInterpolate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const progress = 1 - (timeRemaining / (duration * 60));

  return (
    <SafeAreaView style={styles.container}>
      {/* Hidden WebView for audio engine */}
      <WebView
        ref={webViewRef}
        source={{ html: '<html><body></body></html>' }}
        style={{ height: 0, width: 0, opacity: 0 }}
        javaScriptEnabled={true}
        mediaPlaybackRequiresUserAction={false}
      />
      
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Suoni Binaurali</Text>
          <Text style={styles.headerSubtitle}>
            Frequenze per il tuo benessere
          </Text>
        </View>

        {/* Current Session Card */}
        <View style={[styles.playerCard, { backgroundColor: selectedSession.color + '20' }]}>
          <View style={styles.playerHeader}>
            <View style={[styles.sessionIcon, { backgroundColor: selectedSession.color }]}>
              <Ionicons name={selectedSession.icon as any} size={28} color="#FFFFFF" />
            </View>
            <View style={styles.sessionInfo}>
              <Text style={styles.sessionName}>{selectedSession.name}</Text>
              <Text style={styles.sessionArea}>{selectedSession.area}</Text>
            </View>
          </View>
          
          <Text style={styles.sessionDescription}>{selectedSession.description}</Text>
          
          {/* Circular Timer */}
          <View style={styles.timerContainer}>
            <Animated.View 
              style={[
                styles.timerCircle,
                { 
                  borderColor: selectedSession.color,
                  transform: [
                    { rotate: isPlaying ? rotateInterpolate : '0deg' },
                    { scale: pulseAnim }
                  ]
                }
              ]}
            >
              <View style={styles.timerInner}>
                <Text style={styles.timerText}>{formatTime(timeRemaining)}</Text>
                <Text style={styles.timerLabel}>
                  {isPlaying ? 'In riproduzione' : 'Pronto'}
                </Text>
              </View>
            </Animated.View>
            
            {/* Progress ring */}
            <View style={[styles.progressRing, { borderColor: selectedSession.color + '40' }]}>
              <View 
                style={[
                  styles.progressFill, 
                  { 
                    backgroundColor: selectedSession.color,
                    height: `${progress * 100}%` 
                  }
                ]} 
              />
            </View>
          </View>

          {/* Play/Pause Button */}
          <TouchableOpacity 
            style={[styles.playButton, { backgroundColor: selectedSession.color }]}
            onPress={togglePlayPause}
            activeOpacity={0.8}
          >
            <Ionicons 
              name={isPlaying ? 'pause' : 'play'} 
              size={32} 
              color="#FFFFFF" 
            />
          </TouchableOpacity>

          {/* Duration Selector */}
          <TouchableOpacity 
            style={styles.durationSelector}
            onPress={() => setShowDurationPicker(!showDurationPicker)}
          >
            <Ionicons name="time-outline" size={20} color="#666" />
            <Text style={styles.durationText}>{duration} minuti</Text>
            <Ionicons name="chevron-down" size={16} color="#666" />
          </TouchableOpacity>

          {showDurationPicker && (
            <View style={styles.durationPicker}>
              {DURATION_OPTIONS.map(option => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.durationOption,
                    duration === option.value && { backgroundColor: selectedSession.color + '30' }
                  ]}
                  onPress={() => selectDuration(option.value)}
                >
                  <Text style={[
                    styles.durationOptionText,
                    duration === option.value && { color: selectedSession.color, fontWeight: '700' }
                  ]}>
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Volume Control */}
          <View style={styles.volumeContainer}>
            <TouchableOpacity onPress={() => updateVolume(Math.max(0, volume - 0.1))}>
              <Ionicons name="volume-low" size={24} color="#666" />
            </TouchableOpacity>
            
            <View style={styles.volumeBar}>
              <View style={[styles.volumeFill, { width: `${volume * 100}%`, backgroundColor: selectedSession.color }]} />
            </View>
            
            <TouchableOpacity onPress={() => updateVolume(Math.min(1, volume + 0.1))}>
              <Ionicons name="volume-high" size={24} color="#666" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Session List */}
        <View style={styles.sessionsSection}>
          <Text style={styles.sectionTitle}>Tutte le Sessioni</Text>
          
          {BINAURAL_SESSIONS.map(session => (
            <TouchableOpacity
              key={session.id}
              style={[
                styles.sessionCard,
                selectedSession.id === session.id && { 
                  borderColor: session.color,
                  borderWidth: 2,
                  backgroundColor: session.color + '10'
                }
              ]}
              onPress={() => {
                if (isPlaying) stopAudio();
                setSelectedSession(session);
                setTimeRemaining(duration * 60);
              }}
              activeOpacity={0.7}
            >
              <View style={[styles.sessionCardIcon, { backgroundColor: session.color }]}>
                <Ionicons name={session.icon as any} size={22} color="#FFFFFF" />
              </View>
              
              <View style={styles.sessionCardInfo}>
                <Text style={styles.sessionCardName}>{session.name}</Text>
                <Text style={styles.sessionCardFreq}>
                  {session.waveType.charAt(0).toUpperCase() + session.waveType.slice(1)} • {session.frequency}Hz
                </Text>
              </View>
              
              {selectedSession.id === session.id && (
                <Ionicons name="checkmark-circle" size={24} color={session.color} />
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* Info Section */}
        <View style={styles.infoSection}>
          <View style={styles.infoCard}>
            <Ionicons name="headset" size={24} color="#7CB342" />
            <Text style={styles.infoTitle}>Usa le cuffie</Text>
            <Text style={styles.infoText}>
              I suoni binaurali richiedono cuffie stereo per funzionare correttamente.
              Ogni orecchio riceve una frequenza leggermente diversa.
            </Text>
          </View>
        </View>

        {/* Build Label */}
        <Text style={styles.buildLabel}>Build: SUONI-WEBAUDIO-006</Text>
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
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 24,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#4A4A4A',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#666',
  },
  playerCard: {
    borderRadius: 20,
    padding: 20,
    marginBottom: 24,
  },
  playerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  sessionIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sessionInfo: {
    marginLeft: 14,
    flex: 1,
  },
  sessionName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#4A4A4A',
  },
  sessionArea: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  sessionDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 20,
  },
  timerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    position: 'relative',
  },
  timerCircle: {
    width: 180,
    height: 180,
    borderRadius: 90,
    borderWidth: 4,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  timerInner: {
    alignItems: 'center',
  },
  timerText: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#4A4A4A',
  },
  timerLabel: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  progressRing: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    borderWidth: 2,
    overflow: 'hidden',
  },
  progressFill: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    opacity: 0.3,
  },
  playButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  durationSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    gap: 8,
  },
  durationText: {
    fontSize: 16,
    color: '#4A4A4A',
    fontWeight: '600',
  },
  durationPicker: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 16,
  },
  durationOption: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
  },
  durationOptionText: {
    fontSize: 14,
    color: '#666',
  },
  volumeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  volumeBar: {
    width: 150,
    height: 6,
    backgroundColor: '#E0E0E0',
    borderRadius: 3,
    overflow: 'hidden',
  },
  volumeFill: {
    height: '100%',
    borderRadius: 3,
  },
  sessionsSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#4A4A4A',
    marginBottom: 16,
  },
  sessionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  sessionCardIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sessionCardInfo: {
    flex: 1,
    marginLeft: 14,
  },
  sessionCardName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4A4A4A',
  },
  sessionCardFreq: {
    fontSize: 13,
    color: '#999',
    marginTop: 2,
  },
  infoSection: {
    marginBottom: 20,
  },
  infoCard: {
    backgroundColor: '#E8F5E9',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4A4A4A',
    marginTop: 10,
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
  buildLabel: {
    fontSize: 11,
    color: '#7CB342',
    fontWeight: '600',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
});
