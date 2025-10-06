import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Toast from "react-native-root-toast";
import { addReminder, getUsers, updateReminder } from "../services/api";

interface User {
  _id: string;
  username: string;
}

interface NotifyBefore {
  time: number;
  unit: "minutes" | "hours" | "days";
}

interface ReminderData {
  DateTime: string;
  Assignees: string;
  Leadid: string;
  Comment: string;
  notifyBefore: NotifyBefore;
}

interface ReminderModalProps {
  visible: boolean;
  onClose: () => void;
  leadId: string;
  assigneesOptions?: User[];
  onSuccess?: () => void;
  reminderToEdit?: any;
}

// Helper function to get timezone offset string
const getTimezoneOffsetString = () => {
  const now = new Date();
  const offset = -now.getTimezoneOffset();
  const sign = offset >= 0 ? "+" : "-";
  const absOffset = Math.abs(offset);
  const hours = String(Math.floor(absOffset / 60)).padStart(2, "0");
  const minutes = String(absOffset % 60).padStart(2, "0");
  return `${sign}${hours}:${minutes}`;
};

const ReminderModal: React.FC<ReminderModalProps> = ({
  visible,
  onClose,
  leadId,
  assigneesOptions = [],
  onSuccess,
  reminderToEdit = null,
}) => {
  const [loading, setLoading] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [showAssigneeSelect, setShowAssigneeSelect] = useState(false);
  const [showUnitSelect, setShowUnitSelect] = useState(false);

  // Assignee options state
  const [fetchedAssigneesOptions, setFetchedAssigneesOptions] = useState<User[]>([]);
  const [assigneesOptionsLoading, setAssigneesOptionsLoading] = useState(false);

  const isEditMode = !!reminderToEdit;

  const [reminder, setReminder] = useState<ReminderData>({
    DateTime: "",
    Assignees: "",
    Leadid: leadId,
    Comment: "",
    notifyBefore: {
      time: 0,
      unit: "minutes",
    },
  });

  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedTime, setSelectedTime] = useState<Date>(new Date());

  useEffect(() => {
    if (reminderToEdit) {
      // If editing an existing reminder, populate with its data
      const dateTime = new Date(reminderToEdit.DateTime);
      setSelectedDate(dateTime);
      setSelectedTime(dateTime);

      setReminder({
        ...reminderToEdit,
        DateTime: reminderToEdit.DateTime,
        notifyBefore: reminderToEdit.notifyBefore || {
          time: 0,
          unit: "minutes",
        },
      });
    } else {
      // Reset to default values for new reminder
      const now = new Date();
      setSelectedDate(now);
      setSelectedTime(now);

      setReminder({
        DateTime: "",
        Assignees: "",
        Leadid: leadId,
        Comment: "",
        notifyBefore: {
          time: 0,
          unit: "minutes",
        },
      });
    }

    // If visible and no assignees options provided, fetch users
    const hasAssigneesOptionsProp = assigneesOptions && assigneesOptions.length > 0;
    if (visible && !hasAssigneesOptionsProp && fetchedAssigneesOptions.length === 0) {
      (async () => {
        setAssigneesOptionsLoading(true);
        try {
          const users = await getUsers();
          setFetchedAssigneesOptions(users);
        } catch (e) {
          console.error(e);
        } finally {
          setAssigneesOptionsLoading(false);
        }
      })();
    }

    // Cleanup function to reset nested modal states when main modal changes
    return () => {
      if (!visible) {
        setShowDatePicker(false);
        setShowTimePicker(false);
        setShowAssigneeSelect(false);
        setShowUnitSelect(false);
      }
    };
  }, [reminderToEdit, leadId, visible]);

  const updateDateTime = () => {
    // Combine date and time
    const combinedDateTime = new Date(
      selectedDate.getFullYear(),
      selectedDate.getMonth(),
      selectedDate.getDate(),
      selectedTime.getHours(),
      selectedTime.getMinutes()
    );

    // Format for local timezone without Z suffix
    const year = combinedDateTime.getFullYear();
    const month = String(combinedDateTime.getMonth() + 1).padStart(2, "0");
    const day = String(combinedDateTime.getDate()).padStart(2, "0");
    const hours = String(combinedDateTime.getHours()).padStart(2, "0");
    const minutes = String(combinedDateTime.getMinutes()).padStart(2, "0");
    const seconds = String(combinedDateTime.getSeconds()).padStart(2, "0");

    const localDateTimeString = `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
    setReminder((prev) => ({ ...prev, DateTime: localDateTimeString }));
  };

  useEffect(() => {
    updateDateTime();
  }, [selectedDate, selectedTime]);

  const handleDateChange = (event: any, date?: Date) => {
    setShowDatePicker(false);
    if (date) {
      setSelectedDate(date);
    }
  };

  const handleTimeChange = (event: any, time?: Date) => {
    setShowTimePicker(false);
    if (time) {
      setSelectedTime(time);
    }
  };

  const formatDateTime = (date: Date, time: Date) => {
    const dateStr = date.toLocaleDateString();
    const timeStr = time.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
    return `${dateStr} ${timeStr}`;
  };

  // Get effective assignees options (prop or fetched)
  const effectiveAssigneesOptions = assigneesOptions.length > 0 ? assigneesOptions : fetchedAssigneesOptions;

  const getSelectedAssignee = () => {
    if (!reminder.Assignees) return null;
    return effectiveAssigneesOptions.find((user) => user._id === reminder.Assignees);
  };

  const onSubmit = async () => {
    if (!reminder.DateTime) {
      Alert.alert("Error", "Please select a date and time for the reminder.");
      return;
    }

    setLoading(true);
    try {
      // Create a copy of the reminder for submission
      const reminderData = { ...reminder };

      // Handle empty Assignees - convert empty string to null for API
      if (!reminderData.Assignees || reminderData.Assignees === "") {
        reminderData.Assignees = null;
      }

      // Add timezone offset if needed
      if (reminderData.DateTime && typeof reminderData.DateTime === "string") {
        // Only add timezone if it doesn't already have one
        if (
          !reminderData.DateTime.includes("+") &&
          !reminderData.DateTime.includes("-", 10)
        ) {
          reminderData.DateTime = `${
            reminderData.DateTime
          }${getTimezoneOffsetString()}`;
        }
      }

      // Log the reminder data being sent
      console.log('📅 Submitting reminder:', {
        DateTime: reminderData.DateTime,
        notifyBefore: reminderData.notifyBefore,
        Assignees: reminderData.Assignees,
        Comment: reminderData.Comment,
        Leadid: reminderData.Leadid
      });

      let result;
      if (isEditMode && reminderToEdit?._id) {
        result = await updateReminder(reminderToEdit._id, reminderData);
      } else {
        result = await addReminder(reminderData);
      }
      
      console.log('✅ Reminder API response:', result);

      Toast.show(
        isEditMode
          ? "Reminder updated successfully"
          : "Reminder added successfully",
        {
          duration: Toast.durations.SHORT,
        }
      );

      if (onSuccess) onSuccess();
      onClose();
    } catch (error: any) {
      console.error(error
      );

      const errorMessage =
        error.message || `Failed to ${isEditMode ? "update" : "add"} reminder`;
      Alert.alert("Error", errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const unitOptions = [
    { value: "minutes", label: "Minutes" },
    { value: "hours", label: "Hours" },
    { value: "days", label: "Days" },
  ];

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-white">
        {/* Header */}
        <View className="flex-row items-center justify-between p-4 border-b border-gray-200">
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={24} color="#6B7280" />
          </TouchableOpacity>
          <Text className="text-lg font-semibold text-gray-900">
            {isEditMode ? "Edit Reminder" : "Add Reminder"}
          </Text>
          <View className="w-6" />
        </View>

        <ScrollView className="flex-1 p-4">
          {/* Date and Time Selection */}
          <View className="mb-4">
            <Text className="text-sm font-medium text-gray-700 mb-2">
              Date & Time <Text className="text-red-500">*</Text>
            </Text>

            <View className="flex-row gap-2">
              {/* Date Selection */}
              <TouchableOpacity
                className="flex-1 bg-white border border-gray-300 rounded-lg p-3 flex-row items-center justify-center"
                onPress={() => setShowDatePicker(true)}
              >
                <Ionicons
                  name="calendar"
                  size={16}
                  color="#6B7280"
                  className="mr-2"
                />
                <Text className="text-base text-gray-900">
                  {selectedDate.toLocaleDateString([], {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </Text>
              </TouchableOpacity>

              {/* Time Selection */}
              <TouchableOpacity
                className="bg-white border border-gray-300 rounded-lg p-3 flex-row items-center justify-center min-w-[100px]"
                onPress={() => setShowTimePicker(true)}
              >
                <Ionicons
                  name="time"
                  size={16}
                  color="#6B7280"
                  className="mr-2"
                />
                <Text className="text-base text-gray-900">
                  {selectedTime.toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                    hour12: true,
                  })}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Assignee Selection */}
          <View className="mb-4">
            <Text className="text-sm font-medium text-gray-700 mb-2">
              Assignee
            </Text>
            <TouchableOpacity
              className="bg-white border border-gray-300 rounded-lg p-3 flex-row items-center justify-between"
              onPress={() => setShowAssigneeSelect(true)}
            >
              <Text className="text-base text-gray-900">
                {getSelectedAssignee()?.username || "Select assignee"}
              </Text>
              <Ionicons name="chevron-down" size={16} color="#6B7280" />
            </TouchableOpacity>
          </View>

          {/* Comment */}
          <View className="mb-4">
            <Text className="text-sm font-medium text-gray-700 mb-2">
              Description
            </Text>
            <TextInput
              className="bg-white border border-gray-300 rounded-lg p-3 text-base text-gray-900"
              value={reminder.Comment}
              onChangeText={(text) =>
                setReminder((prev) => ({ ...prev, Comment: text }))
              }
              placeholder="Reminder description"
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </View>

          {/* Notify Before */}
          {reminder.DateTime && (
            <View className="mb-4">
              <Text className="text-sm font-medium text-gray-700 mb-2">
                Notify Before
              </Text>
              <View className="flex-row gap-2">
                <TextInput
                  className="flex-1 bg-white border border-gray-300 rounded-lg p-3 text-base text-gray-900"
                  value={reminder.notifyBefore.time.toString()}
                  onChangeText={(text) =>
                    setReminder((prev) => ({
                      ...prev,
                      notifyBefore: {
                        ...prev.notifyBefore,
                        time: parseInt(text) || 0,
                      },
                    }))
                  }
                  placeholder="0"
                  keyboardType="numeric"
                />
                <TouchableOpacity
                  className="flex-1 bg-white border border-gray-300 rounded-lg p-3 flex-row items-center justify-between"
                  onPress={() => setShowUnitSelect(true)}
                >
                  <Text className="text-base text-gray-900">
                    {unitOptions.find(
                      (u) => u.value === reminder.notifyBefore.unit
                    )?.label || "Minutes"}
                  </Text>
                  <Ionicons name="chevron-down" size={16} color="#6B7280" />
                </TouchableOpacity>
              </View>
            </View>
          )}
        </ScrollView>

        {/* Submit Button */}
        <View className="p-4 border-t border-gray-200">
          <TouchableOpacity
            className={`rounded-lg p-4 items-center flex-row justify-center ${
              loading || !reminder.DateTime ? "bg-gray-300" : "bg-miles-500"
            }`}
            onPress={onSubmit}
            disabled={loading || !reminder.DateTime}
          >
            {loading && (
              <ActivityIndicator size="small" color="white" className="mr-2" />
            )}
            <Text className="text-white text-base font-semibold">
              {isEditMode ? "Update Reminder" : "Add Reminder"}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Date Picker */}
        {showDatePicker && (
          <DateTimePicker
            value={selectedDate}
            mode="date"
            display={Platform.OS === "ios" ? "compact" : "default"}
            onChange={handleDateChange}
            minimumDate={new Date()}
            maximumDate={new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)} // 1 year from now
            accentColor="#176298" // Miles brand color
          />
        )}

        {/* Time Picker */}
        {showTimePicker && (
          <DateTimePicker
            value={selectedTime}
            mode="time"
            display={Platform.OS === "ios" ? "compact" : "default"}
            onChange={handleTimeChange}
            accentColor="#176298" // Miles brand color
          />
        )}

        {/* Assignee Select Modal */}
        <Modal
          key="assignee-select-modal"
          visible={showAssigneeSelect}
          animationType="slide"
          transparent={false}
          onRequestClose={() => setShowAssigneeSelect(false)}
        >
          <View className="flex-1 bg-white">
              <View className="flex-row items-center justify-between p-4 border-b border-gray-200">
                <Text className="text-lg font-semibold text-gray-900">
                  Select Assignee
                </Text>
                <TouchableOpacity onPress={() => setShowAssigneeSelect(false)}>
                  <Ionicons name="close" size={24} color="#6B7280" />
                </TouchableOpacity>
              </View>

              <ScrollView className="flex-1">
                <TouchableOpacity
                  className={`flex-row items-center p-4 ${
                    !reminder.Assignees ? "bg-miles-50" : ""
                  }`}
                  onPress={() => {
                    setReminder((prev) => ({ ...prev, Assignees: "" }));
                    setShowAssigneeSelect(false);
                  }}
                >
                  <Text className="text-base text-gray-900 flex-1">
                    No assignee
                  </Text>
                  {!reminder.Assignees && (
                    <Ionicons name="checkmark" size={20} color="#3B82F6" />
                  )}
                </TouchableOpacity>
                {assigneesOptionsLoading ? (
                  <View className="flex-row justify-center items-center p-4">
                    <ActivityIndicator size="small" color="#176298" />
                    <Text className="text-gray-600 ml-2">Loading users...</Text>
                  </View>
                ) : (
                  effectiveAssigneesOptions.map((user) => (
                    <TouchableOpacity
                      key={user._id}
                      className={`flex-row items-center p-4 ${
                        reminder.Assignees === user._id ? "bg-miles-50" : ""
                      }`}
                      onPress={() => {
                        setReminder((prev) => ({ ...prev, Assignees: user._id }));
                        setShowAssigneeSelect(false);
                      }}
                    >
                      <View className="text-base text-gray-900 justify-between flex-1 flex-row">
                        <Text>{user.username}</Text>
                        <Text className="mr-2">
                          {user.Role ? ` (${user.Role})` : ""}
                        </Text>
                      </View>
                      <Ionicons
                        className={`${
                          reminder.Assignees === user._id
                            ? "visible"
                            : "invisible"
                        }`}
                        name="checkmark"
                        size={20}
                        color="#3B82F6"
                      />
                    </TouchableOpacity>
                  ))
                )}
              </ScrollView>
            </View>
        </Modal>

        {/* Unit Select Modal */}
        <Modal
          key="unit-select-modal"
          visible={showUnitSelect}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setShowUnitSelect(false)}
        >
          <View className="flex-1 justify-end bg-black/50">
            <View className="bg-white rounded-t-lg">
              <View className="flex-row items-center justify-between p-4 border-b border-gray-200">
                <Text className="text-lg font-semibold text-gray-900">
                  Select Unit
                </Text>
                <TouchableOpacity onPress={() => setShowUnitSelect(false)}>
                  <Ionicons name="close" size={24} color="#6B7280" />
                </TouchableOpacity>
              </View>

              <ScrollView>
                {unitOptions.map((unit) => (
                  <TouchableOpacity
                    key={unit.value}
                    className={`flex-row items-center p-4 ${
                      reminder.notifyBefore.unit === unit.value
                        ? "bg-miles-50"
                        : ""
                    }`}
                    onPress={() => {
                      setReminder((prev) => ({
                        ...prev,
                        notifyBefore: {
                          ...prev.notifyBefore,
                          unit: unit.value as "minutes" | "hours" | "days",
                        },
                      }));
                      setShowUnitSelect(false);
                    }}
                  >
                    <Text className="text-base text-gray-900 flex-1">
                      {unit.label}
                    </Text>
                    {reminder.notifyBefore.unit === unit.value && (
                      <Ionicons name="checkmark" size={20} color="#3B82F6" />
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>
        </Modal>
      </View>
    </Modal>
  );
};

export default ReminderModal;
