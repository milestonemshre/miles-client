import { getLeadMeetings } from "@/services/api";
import { formatTimestamp } from "@/utils/dateFormatter";
import { Ionicons } from "@expo/vector-icons";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Toast from "react-native-root-toast";

interface Lead {
  _id: string;
  Name: string;
}

interface Meeting {
  _id: string;
  Subject: string;
  Description?: string;
  MeetingDate: string;
  MeetingTime: string;
  Duration?: number;
  Priority: string;
  MeetingType: string;
  Status: string;
  Assignee?: {
    username: string;
  };
  createdAt: string;
  updatedAt: string;
}

interface MeetingsTabProps {
  lead: Lead;
}

const MeetingsTab: React.FC<MeetingsTabProps> = ({ lead }) => {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchMeetings = useCallback(async () => {
    try {
            const meetingsData = await getLeadMeetings(lead._id);

            const finalMeetings = meetingsData || [];
      setMeetings(finalMeetings);
      setError(null);

          } catch (err: any) {
      console.error({
        error: err,
        message: err.message,
        stack: err.stack,
      });
      setError(err.message || "Failed to fetch meetings");
      Toast.show(`Error fetching meetings: ${err.message}`, {
        duration: Toast.durations.SHORT,
        position: Toast.positions.BOTTOM,
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [lead._id]);

  useEffect(() => {
    fetchMeetings();
  }, [fetchMeetings]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchMeetings();
  }, [fetchMeetings]);

  const getPriorityColor = (priority: string) => {
    switch (priority.toLowerCase()) {
      case "high":
        return "text-red-600 bg-red-50 border-red-200";
      case "medium":
        return "text-orange-600 bg-orange-50 border-orange-200";
      case "low":
        return "text-green-600 bg-green-50 border-green-200";
      default:
        return "text-gray-600 bg-gray-50 border-gray-200";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "scheduled":
        return "text-blue-600 bg-blue-50 border-blue-200";
      case "completed":
        return "text-green-600 bg-green-50 border-green-200";
      case "cancelled":
        return "text-red-600 bg-red-50 border-red-200";
      case "postponed":
        return "text-yellow-600 bg-yellow-50 border-yellow-200";
      default:
        return "text-gray-600 bg-gray-50 border-gray-200";
    }
  };

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-white p-4">
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text className="text-gray-500 mt-2">Loading meetings...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      className="flex-1 bg-white"
      contentContainerStyle={{ flexGrow: 1 }}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {error && (
        <View className="bg-red-50 border border-red-200 rounded-lg m-4 p-4">
          <View className="flex-row items-center">
            <Ionicons name="alert-circle" size={20} color="#DC2626" />
            <Text className="text-red-700 font-medium ml-2">
              Error Loading Meetings
            </Text>
          </View>
          <Text className="text-red-600 text-sm mt-1">{error}</Text>
          <TouchableOpacity
            className="bg-red-600 rounded-lg px-4 py-2 mt-3 self-start"
            onPress={() => {
              setError(null);
              setLoading(true);
              fetchMeetings();
            }}
          >
            <Text className="text-white text-sm font-medium">Try Again</Text>
          </TouchableOpacity>
        </View>
      )}

      {meetings.length === 0 && !error ? (
        <View className="flex-1 justify-center items-center py-16 px-4">
          <Ionicons name="calendar-outline" size={64} color="#9CA3AF" />
          <Text className="text-xl font-semibold text-gray-700 mt-4 mb-2 text-center">
            No Meetings
          </Text>
          <Text className="text-base text-gray-500 text-center leading-6">
            No meetings have been scheduled for this lead yet.
          </Text>
        </View>
      ) : (
        <View className="p-4">
          <Text className="text-lg font-semibold text-gray-900 mb-4">
            Meetings ({meetings.length})
          </Text>

          {meetings.map((meeting, index) => (
            <View
              key={meeting._id || index}
              className="bg-white border border-gray-200 rounded-lg p-4 mb-3 shadow-sm"
            >
              {/* Header */}
              <View className="flex-row justify-between items-start mb-3">
                <View className="flex-1 pr-2">
                  <Text className="text-base font-semibold text-gray-900 mb-1">
                    {meeting.Subject}
                  </Text>
                  <View className="flex-row items-center flex-wrap gap-2">
                    <View
                      className={`px-2 py-1 rounded-full border ${getPriorityColor(
                        meeting.Priority
                      )}`}
                    >
                      <Text
                        className={`text-xs font-medium ${
                          getPriorityColor(meeting.Priority).split(" ")[0]
                        }`}
                      >
                        {meeting.Priority} Priority
                      </Text>
                    </View>
                    <View
                      className={`px-2 py-1 rounded-full border ${getStatusColor(
                        meeting.Status
                      )}`}
                    >
                      <Text
                        className={`text-xs font-medium ${
                          getStatusColor(meeting.Status).split(" ")[0]
                        }`}
                      >
                        {meeting.Status}
                      </Text>
                    </View>
                  </View>
                </View>
                <Ionicons name="calendar" size={20} color="#6B7280" />
              </View>

              {/* Meeting Details */}
              <View className="space-y-2">
                <View className="flex-row items-center">
                  <Ionicons name="time" size={16} color="#6B7280" />
                  <Text className="text-sm text-gray-600 ml-2">
                    {formatTimestamp(meeting.MeetingDate)} at{" "}
                    {meeting.MeetingTime}
                  </Text>
                </View>

                {meeting.Duration && (
                  <View className="flex-row items-center">
                    <Ionicons name="hourglass" size={16} color="#6B7280" />
                    <Text className="text-sm text-gray-600 ml-2">
                      Duration: {meeting.Duration} minutes
                    </Text>
                  </View>
                )}

                <View className="flex-row items-center">
                  <Ionicons name="business" size={16} color="#6B7280" />
                  <Text className="text-sm text-gray-600 ml-2">
                    Type: {meeting.MeetingType}
                  </Text>
                </View>

                {meeting.Assignee && (
                  <View className="flex-row items-center">
                    <Ionicons name="person" size={16} color="#6B7280" />
                    <Text className="text-sm text-gray-600 ml-2">
                      Assigned to: {meeting.Assignee.username}
                    </Text>
                  </View>
                )}
              </View>

              {/* Description */}
              {meeting.Description && (
                <View className="mt-3 pt-3 border-t border-gray-100">
                  <Text className="text-sm text-gray-700">
                    {meeting.Description}
                  </Text>
                </View>
              )}

              {/* Footer with timestamps */}
              <View className="mt-3 pt-3 border-t border-gray-100">
                <Text className="text-xs text-gray-400">
                  Created: {formatTimestamp(meeting.createdAt)}
                  {meeting.updatedAt !== meeting.createdAt && (
                    <Text>
                      {" "}
                      • Updated: {formatTimestamp(meeting.updatedAt)}
                    </Text>
                  )}
                </Text>
              </View>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
};

export default MeetingsTab;
