import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import {
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Toast from "react-native-root-toast";
import { getLeadReminders } from "../../services/api";
import LoadingView from "../LoadingView";
import ReminderModal from "../ReminderModal";

interface Lead {
  _id: string;
  Name: string;
  // Add other lead properties as needed
}

interface Reminder {
  _id: string;
  DateTime: string;
  Comment: string;
  status: "Pending" | "Completed" | "Cancelled";
  Assignees?: {
    _id: string;
    username: string;
  } | null;
  timestamp: string;
  scheduledNotificationInfo?: any;
}

interface RemindersTabProps {
  lead: Lead;
}

const RemindersTab: React.FC<RemindersTabProps> = ({ lead }) => {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAddReminder, setShowAddReminder] = useState(false);

  const fetchReminders = async (showRefreshIndicator = false) => {
    try {
      if (showRefreshIndicator) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      const leadReminders = await getLeadReminders(lead._id);
      setReminders(leadReminders);
    } catch (err: any) {
      console.error("API Error:", err);
      setError(err.message || "Failed to load reminders");
      Toast.show("Failed to load reminders", {
        duration: Toast.durations.SHORT,
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchReminders();
  }, [lead._id]);

  const onRefresh = () => {
    fetchReminders(true);
  };

  const formatDateTime = (dateTime: string) => {
    const date = new Date(dateTime);
    return {
      date: date.toLocaleDateString([], {
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric",
      }),
      time: date.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      }),
    };
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Completed":
        return "text-green-600";
      case "Cancelled":
        return "text-red-600";
      case "Pending":
      default:
        return "text-yellow-600";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "Completed":
        return "checkmark-circle";
      case "Cancelled":
        return "close-circle";
      case "Pending":
      default:
        return "time";
    }
  };

  const renderReminder = (reminder: Reminder) => {
    const { date, time } = formatDateTime(reminder.DateTime);

    return (
      <View
        key={reminder._id}
        className="bg-white border border-gray-200 rounded-lg p-4 mb-3 shadow-sm"
      >
        {/* Header with date/time and status */}
        <View className="flex-row justify-between items-start mb-2">
          <View className="flex-1">
            <Text className="text-base font-semibold text-gray-900">
              {date}
            </Text>
            <Text className="text-sm text-gray-600">{time}</Text>
          </View>
          <View className="flex-row items-center">
            <Ionicons
              name={getStatusIcon(reminder.status)}
              size={16}
              color={
                reminder.status === "Completed"
                  ? "#16A34A"
                  : reminder.status === "Cancelled"
                  ? "#DC2626"
                  : "#CA8A04"
              }
              className="mr-1"
            />
            <Text
              className={`text-sm font-medium ${getStatusColor(
                reminder.status
              )}`}
            >
              {reminder.status}
            </Text>
          </View>
        </View>

        {/* Comment/Description */}
        {reminder.Comment && (
          <Text className="text-sm text-gray-700 mb-2 leading-5">
            {reminder.Comment}
          </Text>
        )}

        {/* Assignee if present */}
        {reminder.Assignees && (
          <View className="flex-row items-center mt-2">
            <Ionicons
              name="person"
              size={14}
              color="#6B7280"
              className="mr-1"
            />
            <Text className="text-xs text-gray-600">
              Assigned to: {reminder.Assignees.username}
            </Text>
          </View>
        )}

        {/* Created date */}
        <View className="flex-row items-center mt-1">
          <Ionicons
            name="calendar"
            size={14}
            color="#6B7280"
            className="mr-1"
          />
          <Text className="text-xs text-gray-500">
            Created: {new Date(reminder.timestamp).toLocaleDateString()}
          </Text>
        </View>
      </View>
    );
  };

  if (loading && !refreshing) {
    return (
      <View className="flex-1 justify-center items-center bg-white">
        <LoadingView />
        <Text className="text-gray-500 mt-2">Loading reminders...</Text>
      </View>
    );
  }

  if (error && !refreshing) {
    return (
      <View className="flex-1 justify-center items-center bg-white px-4">
        <Ionicons name="alert-circle" size={48} color="#EF4444" />
        <Text className="text-xl font-semibold text-gray-800 mt-4 mb-2 text-center">
          Error Loading Reminders
        </Text>
        <Text className="text-base text-gray-500 text-center mb-4">
          {error}
        </Text>
        <TouchableOpacity
          className="bg-miles-500 px-6 py-3 rounded-lg"
          onPress={() => fetchReminders()}
        >
          <Text className="text-white font-medium">Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-white">
      <ScrollView
        className="flex-1 p-4"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        {reminders.length === 0 ? (
          <View className="flex-1 justify-center items-center py-16">
            <Ionicons name="alarm-outline" size={64} color="#9CA3AF" />
            <Text className="text-xl font-semibold text-gray-700 mt-4 mb-2 text-center">
              No Reminders
            </Text>
            <Text className="text-base text-gray-500 text-center leading-6">
              Be the first to add a reminder for this lead.
            </Text>
          </View>
        ) : (
          <View className="pb-4">
            <Text className="text-sm text-gray-500 mb-2">Reminders ({reminders.length})</Text>
            {reminders.map(renderReminder)}
          </View>
        )}
      </ScrollView>

      {/* Add Reminder Button */}
      <View className="p-4 border-t border-gray-200">
        <TouchableOpacity
          onPress={() => setShowAddReminder(true)}
          className="bg-miles-500 rounded-lg py-3 px-4 flex-row items-center justify-center"
        >
          <Ionicons name="add" size={20} color="white" />
          <Text className="text-white font-medium ml-2">Add Reminder</Text>
        </TouchableOpacity>
      </View>

      <ReminderModal
        visible={showAddReminder}
        onClose={() => setShowAddReminder(false)}
        leadId={lead._id}
        assigneesOptions={[]}
        onSuccess={() => {
          setShowAddReminder(false);
          fetchReminders();
        }}
      />
    </View>
  );
};

export default RemindersTab;
