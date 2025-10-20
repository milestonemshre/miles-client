import React, { useEffect, useState } from 'react';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface DialerTimeTrackerProps {
  isActive: boolean;
  isInDialer: boolean;
  getCurrentDuration: () => number;
  className?: string;
}

export default function DialerTimeTracker({
  isActive,
  isInDialer,
  getCurrentDuration,
  className = '',
}: DialerTimeTrackerProps) {
  const [duration, setDuration] = useState(0);

  // Update duration every second when session is active
  useEffect(() => {
    if (!isActive) {
      setDuration(0);
      return;
    }

    const interval = setInterval(() => {
      setDuration(getCurrentDuration());
    }, 1000);

    return () => clearInterval(interval);
  }, [isActive, getCurrentDuration]);

  // Format duration as MM:SS
  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (!isActive) return null;

  return (
    <View className={`flex-row items-center px-3 py-2 bg-miles-50 rounded-lg border border-miles-200 ${className}`}>
      <View className="flex-row items-center">
        <View className={`w-2 h-2 rounded-full mr-2 ${isInDialer ? 'bg-red-500' : 'bg-green-500'}`}>
          {isInDialer && (
            <View className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
          )}
        </View>
        
        <Ionicons 
          name={isInDialer ? "call" : "time"} 
          size={16} 
          color={isInDialer ? "#EF4444" : "#059669"} 
        />
        
        <Text className={`ml-2 text-sm font-mono font-semibold ${
          isInDialer ? 'text-red-600' : 'text-green-600'
        }`}>
          {formatDuration(duration)}
        </Text>
        
        <Text className={`ml-2 text-xs ${
          isInDialer ? 'text-red-500' : 'text-green-500'
        }`}>
          {isInDialer ? 'In Call' : 'Call Time'}
        </Text>
      </View>
    </View>
  );
}