import React from "react";
import { View, Text, TouchableWithoutFeedback } from "react-native";
import { PeriodType } from "../../types/tasks";

interface PeriodToggleProps {
  period: PeriodType;
  onPeriodChange: (period: PeriodType) => void;
}

export const PeriodToggle: React.FC<PeriodToggleProps> = ({ period, onPeriodChange }) => {
  return (
    <View className="flex-row bg-miles-50 rounded-xl p-1">
      <TouchableWithoutFeedback onPress={() => onPeriodChange("today")}>
        <View
          className={`flex-1 py-2 px-4 rounded-lg items-center ${
            period === "today" ? "bg-miles-500 shadow-sm" : "bg-transparent"
          }`}
        >
          <Text
            className={`font-semibold ${
              period === "today" ? "text-white" : "text-miles-700"
            }`}
          >
            Today
          </Text>
        </View>
      </TouchableWithoutFeedback>
      <TouchableWithoutFeedback onPress={() => onPeriodChange("week")}>
        <View
          className={`flex-1 py-2 px-4 rounded-lg items-center ${
            period === "week" ? "bg-miles-500 shadow-sm" : "bg-transparent"
          }`}
        >
          <Text
            className={`font-semibold ${
              period === "week" ? "text-white" : "text-miles-700"
            }`}
          >
            This Week
          </Text>
        </View>
      </TouchableWithoutFeedback>
    </View>
  );
};