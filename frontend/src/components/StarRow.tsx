import React from 'react';
import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface StarRowProps {
  earned: number;
  max: number;
  size?: number;
  color?: string;
}

// Fila di stelle: piene per quelle guadagnate, vuote per quelle ancora disponibili.
export default function StarRow({ earned, max, size = 16, color = '#FFB300' }: StarRowProps) {
  return (
    <View style={{ flexDirection: 'row', gap: 2 }}>
      {Array.from({ length: max }, (_, i) => (
        <Ionicons
          key={i}
          name={i < earned ? 'star' : 'star-outline'}
          size={size}
          color={color}
        />
      ))}
    </View>
  );
}
