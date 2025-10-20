import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { TaskSummary, FilterType } from "../../types/tasks";

interface SummaryCardsProps {
  summary: TaskSummary;
  activeFilter: FilterType;
  onFilterChange: (filter: FilterType) => void;
}

export const SummaryCards: React.FC<SummaryCardsProps> = ({ 
  summary, 
  activeFilter, 
  onFilterChange 
}) => {
  return (
    <View className="flex-row justify-between mt-4 gap-2">
      <TouchableOpacity
        className={`flex-1 items-center py-3 rounded-xl ${
          activeFilter === "all"
            ? "bg-miles-50 border-2 border-miles-200"
            : "bg-white border border-gray-200"
        }`}
        onPress={() => onFilterChange("all")}
      >
        <Text
          className={`text-2xl font-bold ${
            activeFilter === "all" ? "text-miles-700" : "text-gray-900"
          }`}
        >
          {summary.total}
        </Text>
        <Text
          className={`text-sm font-medium ${
            activeFilter === "all" ? "text-miles-600" : "text-gray-500"
          }`}
        >
          Total Tasks
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        className={`flex-1 items-center py-3 rounded-xl ${
          activeFilter === "meetings"
            ? "bg-miles-50 border-2 border-miles-200"
            : "bg-white border border-gray-200"
        }`}
        onPress={() => onFilterChange("meetings")}
      >
        <Text
          className={`text-2xl font-bold ${
            activeFilter === "meetings" ? "text-miles-700" : "text-gray-900"
          }`}
        >
          {summary.meetings}
        </Text>
        <Text
          className={`text-sm font-medium ${
            activeFilter === "meetings" ? "text-miles-600" : "text-gray-500"
          }`}
        >
          Meetings
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        className={`flex-1 items-center py-3 rounded-xl ${
          activeFilter === "reminders"
            ? "bg-miles-50 border-2 border-miles-200"
            : "bg-white border border-gray-200"
        }`}
        onPress={() => onFilterChange("reminders")}
      >
        <Text
          className={`text-2xl font-bold ${
            activeFilter === "reminders"
              ? "text-miles-700"
              : "text-gray-900"
          }`}
        >
          {summary.reminders}
        </Text>
        <Text
          className={`text-sm font-medium ${
            activeFilter === "reminders"
              ? "text-miles-600"
              : "text-gray-500"
          }`}
        >
          Reminders
        </Text>
      </TouchableOpacity>
    </View>
  );
};