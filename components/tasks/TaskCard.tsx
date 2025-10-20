import React from "react";
import { View, Text, TouchableOpacity, Linking, Alert } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { Task } from "../../types/tasks";
import { 
  formatDateWithCountdown, 
  getTaskTypeColor,
  getTaskDateIcon,
  getTaskDateIconColor,
  getTaskDateIconBackground
} from "../../utils/taskUtils";
import { formatPhoneNumber } from "../../utils/dateFormatter";

interface TaskCardProps {
  task: Task;
  currentTime: Date;
  onComplete: () => void;
  onUndoComplete: () => void;
}

const handlePhoneCall = (phoneNumber: string) => {
  if (!phoneNumber) {
    Alert.alert("Error", "Phone number not available");
    return;
  }
  Linking.openURL(`tel:${formatPhoneNumber(phoneNumber)}`);
};

const handleWhatsAppPress = (phoneNumber: string) => {
  if (!phoneNumber) {
    Alert.alert("Error", "Phone number not available");
    return;
  }
  
  const whatsappUrl = `https://wa.me/${encodeURIComponent(
    formatPhoneNumber(phoneNumber)
  )}?text=${encodeURIComponent(
    "Hello! I'm reaching out regarding our scheduled meeting/reminder."
  )}`;
  
  Linking.openURL(whatsappUrl);
};

export const TaskCard: React.FC<TaskCardProps> = ({ 
  task, 
  currentTime, 
  onComplete, 
  onUndoComplete 
}) => {
  const isCompleted = task.completed;

  return (
    <View
      className={`rounded-xl mb-4 shadow-sm ${
        isCompleted ? "bg-gray-100" : "bg-white"
      } border ${isCompleted ? "border-gray-200" : "border-gray-100"}`}
    >
      {/* Header Section - Task type, title, and completion */}
      <View className="p-4 pb-2">
        <View className="flex-row items-start justify-between">
          <View className="flex-1 pr-3">
            <View className="flex-row items-center mb-2">
              <View
                className={`w-8 h-8 rounded-full items-center justify-center mr-3 ${
                  isCompleted 
                    ? "bg-gray-200" 
                    : task.type === "meeting" 
                    ? "bg-pink-100" 
                    : "bg-green-100"
                }`}
              >
                <Ionicons
                  name={task.type === "meeting" ? "people" : "alarm"}
                  size={16}
                  color={isCompleted ? "#9CA3AF" : getTaskTypeColor(task.type)}
                />
              </View>
              <View className="flex-1">
                <Text
                  style={{
                    color: isCompleted ? "#9CA3AF" : getTaskTypeColor(task.type),
                  }}
                  className="text-sm font-semibold uppercase tracking-wide"
                >
                  {task.type}
                </Text>
                {isCompleted && (
                  <View className="mt-1">
                    <Text className="text-xs font-medium text-gray-500">
                      {task.completionStatus}
                    </Text>
                  </View>
                )}
              </View>
            </View>
            
            {task.title && (
              <Text
                className={`text-lg font-bold mb-1 ${
                  isCompleted ? "text-gray-500" : "text-gray-900"
                }`}
              >
                {task.title}
              </Text>
            )}
            
            {/* Description */}
            {task.description && (
              <Text
                className={`text-sm leading-5 ${
                  isCompleted ? "text-gray-500" : "text-gray-600"
                }`}
              >
                {task.description}
              </Text>
            )}
          </View>

          {/* Completion Button */}
          <TouchableOpacity
            onPress={isCompleted ? onUndoComplete : onComplete}
            className={`w-8 h-8 rounded-full items-center justify-center ${
              isCompleted
                ? "bg-miles-100 border border-miles-200"
                : "bg-miles-500 shadow-sm"
            }`}
          >
            <Ionicons
              name={isCompleted ? "refresh-outline" : "checkmark"}
              size={16}
              color={isCompleted ? "#176298" : "#FFFFFF"}
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Contact & Location Section */}
      {task.leadName && (
        <View className="px-4 py-3 border-t border-gray-100">
          {/* Lead name and location row */}
          <View className="flex-row items-center justify-between mb-3">
            <View className="flex-row items-center flex-1">
              <Ionicons
                name="person"
                size={16}
                color={isCompleted ? "#9CA3AF" : "#176298"}
              />
              <Text
                className={`ml-2 text-sm font-semibold ${
                  isCompleted ? "text-gray-500" : "text-gray-900"
                }`}
              >
                {task.leadName}
              </Text>
            </View>
            
            {task.location && (
              <View className="flex-row items-center">
                <Ionicons
                  name="location-outline"
                  size={14}
                  color={isCompleted ? "#9CA3AF" : "#6B7280"}
                />
                <Text
                  className={`ml-1 text-sm ${
                    isCompleted ? "text-gray-500" : "text-gray-600"
                  }`}
                >
                  {task.location}
                </Text>
              </View>
            )}
          </View>
          
          {/* Action buttons */}
          {task.leadPhone && !isCompleted && (
            <View className="flex-row">
              <TouchableOpacity
                onPress={() => handlePhoneCall(task.leadPhone)}
                className="flex-1 flex-row items-center justify-center bg-miles-50 border border-miles-200 py-2.5 rounded-lg mr-2"
              >
                <Ionicons name="call" size={16} color="#176298" />
                <Text className="text-miles-700 text-sm font-medium ml-2">
                  Call
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                onPress={() => handleWhatsAppPress(task.leadPhone)}
                className="flex-1 flex-row items-center justify-center bg-emerald-50 border border-emerald-200 py-2.5 rounded-lg"
              >
                <Ionicons name="logo-whatsapp" size={16} color="#059669" />
                <Text className="text-emerald-700 text-sm font-medium ml-2">
                  WhatsApp
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}

      {/* Time Footer */}
      <View
        className={`px-4 py-3 border-t ${
          isCompleted ? "bg-gray-50 border-gray-200" : "bg-gray-50 border-gray-100"
        }`}
      >
        <View className="flex-row items-center justify-end">
          <View
            className={`w-6 h-6 rounded-full items-center justify-center mr-3 ${
              getTaskDateIconBackground(task.date, currentTime, isCompleted)
            }`}
          >
            <Ionicons 
              name={getTaskDateIcon(task.date, currentTime)}
              size={12}
              color={getTaskDateIconColor(task.date, currentTime, isCompleted)}
            />
          </View>
          <Text
            className={`text-sm font-medium ${
              isCompleted ? "text-gray-500" : "text-gray-700"
            }`}
          >
            {formatDateWithCountdown(task.date, currentTime)}
          </Text>
        </View>
      </View>
    </View>
  );
};