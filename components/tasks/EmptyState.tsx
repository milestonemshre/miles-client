import React from "react";
import { View, Text } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { FilterType, PeriodType } from "../../types/tasks";

interface EmptyStateProps {
  activeFilter: FilterType;
  period: PeriodType;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ activeFilter, period }) => {
  const getEmptyMessage = () => {
    const periodText = period === "today" ? "today" : "this week";
    
    if (activeFilter === "all") {
      return period === "today"
        ? "You have no meetings or reminders scheduled for today"
        : "You have no meetings or reminders scheduled for this week";
    }
    
    return `You have no ${activeFilter} scheduled for ${periodText}`;
  };

  return (
    <View className="flex-1 justify-center items-center py-12">
      <Ionicons name="calendar-outline" size={64} color="#D1D5DB" />
      <Text className="text-xl font-medium text-gray-500 mt-4">
        No {activeFilter === "all" ? "tasks" : activeFilter}{" "}
        {period === "today" ? "today" : "this week"}
      </Text>
      <Text className="text-gray-400 mt-2 text-center">
        {getEmptyMessage()}
      </Text>
    </View>
  );
};