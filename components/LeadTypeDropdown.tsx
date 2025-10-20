import React from "react";
import { Text, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";

export type LeadType = "community" | "marketing";

interface LeadTypeDropdownProps {
  selectedType: LeadType;
  onPress: () => void;
}

const LeadTypeDropdown: React.FC<LeadTypeDropdownProps> = ({
  selectedType,
  onPress,
}) => {
  const getDisplayName = (type: LeadType) => {
    switch (type) {
      case "community":
        return "Community";
      case "marketing":
        return "Marketing";
      default:
        return "Marketing";
    }
  };

  return (
    <TouchableOpacity
      onPress={onPress}
      className="flex-row items-center justify-center py-2 px-4"
    >
      <Text className="text-lg font-semibold text-white mr-2">
        {getDisplayName(selectedType)}
      </Text>
      <Ionicons name="chevron-down" size={16} color="white" />
    </TouchableOpacity>
  );
};

export default LeadTypeDropdown;