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
import { addMeeting, searchDevelopers, updateMeeting } from "../services/api";
import SearchableDropdown from "./SearchableDropdown";

interface User {
  _id: string;
  username: string;
  Role?: string;
  isParent?: boolean;
}

interface NotifyBefore {
  time: number;
  unit: "minutes" | "hours" | "days";
}

interface MeetingData {
  Subject: string;
  Date: string;
  Priority: string;
  Lead: string;
  Assignees: string;
  Status: string;
  Comment: string;
  MeetingType: string;
  directoragnet: string;
  agentName: string;
  agentPhone: string;
  agentCompany: string;
  Developer: string;
  Location: string;
  Followers: string[];
  notifyBefore: NotifyBefore;
}

interface MeetingModalProps {
  visible: boolean;
  onClose: () => void;
  leadId: string;
  onSuccess?: () => void;
  meetingToEdit?: any;
  initialComment?: string;
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

const MeetingModal: React.FC<MeetingModalProps> = ({
  visible,
  onClose,
  leadId,
  onSuccess,
  meetingToEdit = null,
  initialComment = "",
}) => {
  const [loading, setLoading] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  // Developer search state
  const [developers, setDevelopers] = useState<any[]>([]);
  const [developerSearchLoading, setDeveloperSearchLoading] = useState(false);


  // Modal selection states
  const [showTypeSelect, setShowTypeSelect] = useState(false);
  const [showDirectAgentSelect, setShowDirectAgentSelect] = useState(false);
  const [showUnitSelect, setShowUnitSelect] = useState(false);

  const isEditMode = !!meetingToEdit;

  const [meeting, setMeeting] = useState<MeetingData>({
    Subject: "",
    Date: "",
    Priority: "",
    Lead: leadId,
    Assignees: "",
    Status: "",
    Comment: "",
    MeetingType: "",
    directoragnet: "",
    agentName: "",
    agentPhone: "",
    agentCompany: "",
    Developer: "",
    Location: "",
    Followers: [],
    notifyBefore: {
      time: 2,
      unit: "hours",
    },
  });

  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedTime, setSelectedTime] = useState<Date>(new Date());


  // Handle developer search (move before useEffect to avoid dependency issues)
  const handleDeveloperSearch = async (query: string) => {
    setDeveloperSearchLoading(true);
    try {
      const results = await searchDevelopers(query);
      setDevelopers(results);
    } catch (error) {
      console.error(error);
      setDevelopers([]);
    } finally {
      setDeveloperSearchLoading(false);
    }
  };

  useEffect(() => {
    if (meetingToEdit) {
      // If editing an existing meeting, populate with its data
      const dateTime = new Date(meetingToEdit.Date);
      setSelectedDate(dateTime);
      setSelectedTime(dateTime);

      setMeeting({
        ...meetingToEdit,
        Lead: leadId,
        Date: meetingToEdit.Date,
        notifyBefore: meetingToEdit.notifyBefore || {
          time: 2,
          unit: "hours",
        },
      });
    } else {
      // Reset to default values for new meeting
      const now = new Date();
      setSelectedDate(now);
      setSelectedTime(now);

      setMeeting({
        Subject: "",
        Date: "",
        Priority: "",
        Lead: leadId,
        Assignees: "",
        Status: "",
        Comment: initialComment,
        MeetingType: "",
        directoragnet: "",
        agentName: "",
        agentPhone: "",
        agentCompany: "",
        Developer: "",
        Location: "",
        Followers: [],
        notifyBefore: {
          time: 2,
          unit: "hours",
        },
      });
    }

    // Cleanup function to reset nested modal states when main modal changes
    return () => {
      if (!visible) {
        setShowDatePicker(false);
        setShowTimePicker(false);
        setShowTypeSelect(false);
        setShowDirectAgentSelect(false);
        setShowUnitSelect(false);
      }
    };
  }, [meetingToEdit, leadId, visible, initialComment]);

  // Load initial developers when modal opens (separate useEffect)
  useEffect(() => {
    if (visible && developers.length === 0) {
      handleDeveloperSearch("");
    }

  }, [visible]);

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
    setMeeting((prev) => ({ ...prev, Date: localDateTimeString }));
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



  const onSubmit = async () => {
    if (
      !meeting.Subject ||
      !meeting.Date ||
      !meeting.MeetingType
    ) {
      Alert.alert("Error", "Please fill in all required fields.");
      return;
    }

    setLoading(true);
    try {
      // Create a copy of the meeting for submission
      const meetingData = { ...meeting };

      // Add timezone offset if needed
      if (meetingData.Date && typeof meetingData.Date === "string") {
        // Only add timezone if it doesn't already have one
        if (
          !meetingData.Date.includes("+") &&
          !meetingData.Date.includes("-", 10)
        ) {
          meetingData.Date = `${meetingData.Date}${getTimezoneOffsetString()}`;
        }
      }

      let result;
      if (isEditMode && meetingToEdit?._id) {
        result = await updateMeeting(meetingToEdit._id, meetingData);
      } else {
        result = await addMeeting(meetingData);
      }

      Toast.show(
        isEditMode
          ? "Meeting updated successfully"
          : "Meeting added successfully",
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
        error.message || `Failed to ${isEditMode ? "update" : "add"} meeting`;
      Alert.alert("Error", errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Options

  const typeOptions = [
    { value: "Primary", label: "Primary" },
    { value: "Secondary", label: "Secondary" },
  ];

  const directOrAgentOptions = [
    { value: "Direct", label: "Direct" },
    { value: "Agent", label: "Agent" },
  ];

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
            {isEditMode ? "Edit Meeting" : "Add Meeting"}
          </Text>
          <View className="w-6" />
        </View>

        <ScrollView className="flex-1 p-4">
          {/* Subject */}
          <View className="mb-4">
            <Text className="text-sm font-medium text-gray-700 mb-2">
              Subject <Text className="text-red-500">*</Text>
            </Text>
            <TextInput
              className="bg-white border border-gray-300 rounded-lg p-3 text-base text-gray-900"
              value={meeting.Subject}
              onChangeText={(text) =>
                setMeeting((prev) => ({ ...prev, Subject: text }))
              }
              placeholder="Enter meeting subject"
            />
          </View>

          {/* Date and Time Selection */}
          <View className="mb-4">
            <Text className="text-sm font-medium text-gray-700 mb-2">
              Meeting Date & Time <Text className="text-red-500">*</Text>
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


          {/* Meeting Type */}
          <View className="mb-4">
            <Text className="text-sm font-medium text-gray-700 mb-2">
              Meeting Type <Text className="text-red-500">*</Text>
            </Text>
            <TouchableOpacity
              className="bg-white border border-gray-300 rounded-lg p-3 flex-row items-center justify-between"
              onPress={() => setShowTypeSelect(true)}
            >
              <Text className="text-base text-gray-900">
                {meeting.MeetingType || "Select meeting type"}
              </Text>
              <Ionicons name="chevron-down" size={16} color="#6B7280" />
            </TouchableOpacity>
          </View>

          {/* Secondary Meeting Type Options */}
          {meeting.MeetingType === "Secondary" && (
            <View className="mb-4">
              <Text className="text-sm font-medium text-gray-700 mb-2">
                Direct or Agent
              </Text>
              <TouchableOpacity
                className="bg-white border border-gray-300 rounded-lg p-3 flex-row items-center justify-between"
                onPress={() => setShowDirectAgentSelect(true)}
              >
                <Text className="text-base text-gray-900">
                  {meeting.directoragnet || "Select direct or agent"}
                </Text>
                <Ionicons name="chevron-down" size={16} color="#6B7280" />
              </TouchableOpacity>
            </View>
          )}

          {/* Agent Details */}
          {meeting.directoragnet === "Agent" && (
            <>
              <View className="mb-4">
                <Text className="text-sm font-medium text-gray-700 mb-2">
                  Agent Name
                </Text>
                <TextInput
                  className="bg-white border border-gray-300 rounded-lg p-3 text-base text-gray-900"
                  value={meeting.agentName}
                  onChangeText={(text) =>
                    setMeeting((prev) => ({ ...prev, agentName: text }))
                  }
                  placeholder="Enter agent name"
                />
              </View>

              <View className="mb-4">
                <Text className="text-sm font-medium text-gray-700 mb-2">
                  Agent Phone
                </Text>
                <TextInput
                  className="bg-white border border-gray-300 rounded-lg p-3 text-base text-gray-900"
                  value={meeting.agentPhone}
                  onChangeText={(text) =>
                    setMeeting((prev) => ({ ...prev, agentPhone: text }))
                  }
                  placeholder="Enter agent phone"
                  keyboardType="phone-pad"
                />
              </View>

              <View className="mb-4">
                <Text className="text-sm font-medium text-gray-700 mb-2">
                  Agent Company
                </Text>
                <TextInput
                  className="bg-white border border-gray-300 rounded-lg p-3 text-base text-gray-900"
                  value={meeting.agentCompany}
                  onChangeText={(text) =>
                    setMeeting((prev) => ({ ...prev, agentCompany: text }))
                  }
                  placeholder="Enter agent company"
                />
              </View>
            </>
          )}

          {/* Primary Meeting Type Options */}
          {meeting.MeetingType === "Primary" && (
            <>
              <View className="mb-4">
                <Text className="text-sm font-medium text-gray-700 mb-2">
                  Developer
                </Text>
                <SearchableDropdown
                  options={developers}
                  value={meeting.Developer}
                  placeholder="Select or type developer name"
                  onSelect={(option) => {
                    setMeeting((prev) => ({
                      ...prev,
                      Developer: option ? option.value : "",
                    }));
                  }}
                  onSearch={handleDeveloperSearch}
                  loading={developerSearchLoading}
                  allowClear={true}
                />
              </View>

              <View className="mb-4">
                <Text className="text-sm font-medium text-gray-700 mb-2">
                  Location
                </Text>
                <TextInput
                  className="bg-white border border-gray-300 rounded-lg p-3 text-base text-gray-900"
                  value={meeting.Location}
                  onChangeText={(text) =>
                    setMeeting((prev) => ({ ...prev, Location: text }))
                  }
                  placeholder="Enter location"
                />
              </View>
            </>
          )}



          {/* Comment */}
          <View className="mb-4">
            <Text className="text-sm font-medium text-gray-700 mb-2">
              Comment
            </Text>
            <TextInput
              className="bg-white border border-gray-300 rounded-lg p-3 text-base text-gray-900"
              value={meeting.Comment}
              onChangeText={(text) =>
                setMeeting((prev) => ({ ...prev, Comment: text }))
              }
              placeholder="Enter meeting comment"
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </View>

          {/* Notify Before */}
          {meeting.Date && (
            <View className="mb-4">
              <Text className="text-sm font-medium text-gray-700 mb-2">
                Notify Before Meeting
              </Text>
              <View className="flex-row gap-2">
                <TextInput
                  className="flex-1 bg-white border border-gray-300 rounded-lg p-3 text-base text-gray-900"
                  value={meeting.notifyBefore.time.toString()}
                  onChangeText={(text) =>
                    setMeeting((prev) => ({
                      ...prev,
                      notifyBefore: {
                        ...prev.notifyBefore,
                        time: parseInt(text) || 2,
                      },
                    }))
                  }
                  placeholder="2"
                  keyboardType="numeric"
                />
                <TouchableOpacity
                  className="flex-1 bg-white border border-gray-300 rounded-lg p-3 flex-row items-center justify-between"
                  onPress={() => setShowUnitSelect(true)}
                >
                  <Text className="text-base text-gray-900">
                    {unitOptions.find(
                      (u) => u.value === meeting.notifyBefore.unit
                    )?.label || "Hours"}
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
              loading ||
              !meeting.Subject ||
              !meeting.Date ||
              !meeting.MeetingType
                ? "bg-gray-300"
                : "bg-miles-500"
            }`}
            onPress={onSubmit}
            disabled={
              loading ||
              !meeting.Subject ||
              !meeting.Date ||
              !meeting.MeetingType
            }
          >
            {loading && (
              <ActivityIndicator size="small" color="white" className="mr-2" />
            )}
            <Text className="text-white text-base font-semibold">
              {isEditMode ? "Update Meeting" : "Add Meeting"}
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


        {/* Type Select Modal */}
        <Modal
          key="type-select-modal"
          visible={showTypeSelect}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setShowTypeSelect(false)}
        >
          <View className="flex-1 justify-end bg-black/50">
            <View className="bg-white rounded-t-lg">
              <View className="flex-row items-center justify-between p-4 border-b border-gray-200">
                <Text className="text-lg font-semibold text-gray-900">
                  Select Meeting Type
                </Text>
                <TouchableOpacity onPress={() => setShowTypeSelect(false)}>
                  <Ionicons name="close" size={24} color="#6B7280" />
                </TouchableOpacity>
              </View>

              <ScrollView>
                {typeOptions.map((option) => (
                  <TouchableOpacity
                    key={option.value}
                    className={`flex-row items-center p-4 ${
                      meeting.MeetingType === option.value ? "bg-miles-50" : ""
                    }`}
                    onPress={() => {
                      setMeeting((prev) => ({
                        ...prev,
                        MeetingType: option.value,
                      }));
                      setShowTypeSelect(false);
                    }}
                  >
                    <Text className="text-base text-gray-900 flex-1">
                      {option.label}
                    </Text>
                    {meeting.MeetingType === option.value && (
                      <Ionicons name="checkmark" size={20} color="#3B82F6" />
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>
        </Modal>

        {/* Direct/Agent Select Modal */}
        <Modal
          key="direct-agent-select-modal"
          visible={showDirectAgentSelect}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setShowDirectAgentSelect(false)}
        >
          <View className="flex-1 justify-end bg-black/50">
            <View className="bg-white rounded-t-lg">
              <View className="flex-row items-center justify-between p-4 border-b border-gray-200">
                <Text className="text-lg font-semibold text-gray-900">
                  Select Direct or Agent
                </Text>
                <TouchableOpacity
                  onPress={() => setShowDirectAgentSelect(false)}
                >
                  <Ionicons name="close" size={24} color="#6B7280" />
                </TouchableOpacity>
              </View>

              <ScrollView>
                {directOrAgentOptions.map((option) => (
                  <TouchableOpacity
                    key={option.value}
                    className={`flex-row items-center p-4 ${
                      meeting.directoragnet === option.value
                        ? "bg-miles-50"
                        : ""
                    }`}
                    onPress={() => {
                      setMeeting((prev) => ({
                        ...prev,
                        directoragnet: option.value,
                      }));
                      setShowDirectAgentSelect(false);
                    }}
                  >
                    <Text className="text-base text-gray-900 flex-1">
                      {option.label}
                    </Text>
                    {meeting.directoragnet === option.value && (
                      <Ionicons name="checkmark" size={20} color="#3B82F6" />
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
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
                      meeting.notifyBefore.unit === unit.value
                        ? "bg-miles-50"
                        : ""
                    }`}
                    onPress={() => {
                      setMeeting((prev) => ({
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
                    {meeting.notifyBefore.unit === unit.value && (
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

export default MeetingModal;
