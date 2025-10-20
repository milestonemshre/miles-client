import Ionicons from "@expo/vector-icons/Ionicons";
import { router } from "expo-router";
import React from "react";
import { Alert, Linking, Text, TouchableOpacity, View } from "react-native";
import Animated, { SlideInDown, SlideOutUp } from "react-native-reanimated";
import { formatPhoneNumber, formatTimestamp } from "../utils/dateFormatter";
import AuthenticatedImage from "./AuthenticatedImage";
import StatusPicker from "./StatusPicker";

interface Lead {
  _id: string;
  Name: string;
  Phone?: string;
  AltPhone?: string;
  Description?: string;
  LeadStatus?: {
    _id: string;
    Status: string;
    color: string;
  };
  Source?: {
    _id: string;
    Source: string;
  };
  Assigned?: {
    username: string;
    Avatar?: string;
  };
  tags?: Array<{
    Tag: string;
  }>;
  lastComment?: {
    Content: string;
  };
  commentCount?: number;
  visibleCommentCount?: number;
  timestamp?: string;
  LeadAssignedDate?: string;
  lastCalled?: string;
}

interface LeadCardProps {
  lead: Lead;
  onDetailsPress: () => void;
  selected?: boolean;
  onCardPress: () => void;
  statusOptions?: Array<{
    value: string;
    label: string;
    color: string;
    requiresReminder?: "yes" | "no" | "optional";
  }>;
  sourceOptions?: Array<{
    value: string;
    label: string;
  }>;
  onLeadUpdate?: (leadId: string, updates: any) => Promise<void>;
  userPermissions?: {
    lead?: string[];
  };
  onOpenModal?: (type: string, callback?: () => void) => void;
  onCallStatusUpdateModalOpen?: (preSelectedStatusId?: string) => void;
  scrollToCard?: (leadId: string) => void;
}

const LeadCard: React.FC<LeadCardProps> = ({
  lead,
  onDetailsPress,
  selected = false,
  onCardPress,
  statusOptions = [],

  userPermissions,
  onCallStatusUpdateModalOpen,
}) => {
  const [showContact, setShowContact] = useState(false);
  const [avatarError, setAvatarError] = useState(false);
  const [loading, setLoading] = useState(false);

  const canUpdateStatus =
    userPermissions?.lead?.includes("update_status") ?? true;

  const handlePhoneCall = (phoneNumber: string) => {
    if (!phoneNumber || phoneNumber.startsWith("***")) {
      Alert.alert(
        "Contact Unavailable",
        !phoneNumber
          ? "Contact information not available"
          : "Contact information is masked"
      );
      return;
    }
    Linking.openURL(`tel:${formatPhoneNumber(phoneNumber)}`);
  };

  const handleWhatsApp = (phoneNumber: string) => {
    if (!phoneNumber || phoneNumber.startsWith("***")) {
      Alert.alert(
        "Contact Unavailable",
        !phoneNumber
          ? "Contact information not available"
          : "Contact information is masked"
      );
      return;
    }
    Linking.openURL(
      `https://wa.me/${encodeURIComponent(
        formatPhoneNumber(phoneNumber)
      )}?text=${encodeURIComponent(
        "Hello! I'm reaching out regarding your inquiry."
      )}`
    );
  };

  const handleStatusChange = (value: string, option: any) => {
    // Open the CallStatusUpdateModal for status changes to handle reminders, meetings, and validation
    if (onCallStatusUpdateModalOpen) {
      onCallStatusUpdateModalOpen(option.value);
    }
  };

  const toggleContactInfo = () => {
    setShowContact(!showContact);
  };

  return (
    <View
      className={`bg-white rounded-lg mb-3 shadow-sm border ${
        selected ? "border-miles-500 border-2" : "border-gray-200"
      }`}
    >
      {/* Header - Touchable for card selection */}
      <TouchableOpacity
        onPress={onCardPress}
        className="w-full p-3 border-b border-gray-200"
      >
        <View className="flex-row justify-between">
          <View className="flex-1">
            <Text
              className={`text-base font-semibold text-gray-900 text-left`}
              numberOfLines={1}
            >
              {lead.Name}
            </Text>

            <View className="flex-row items-center">
              {lead?.Assigned ? (
                <>
                  <Text className="text-sm text-nowrap text-gray-500">
                    Assigned to:{" "}
                    <Text className="font-medium text-gray-900">
                      {lead.Assigned.username.replaceAll("  ", " ")}
                    </Text>
                  </Text>
                </>
              ) : (
                <Text className="text-sm text-gray-500">
                  Not assigned to any agent
                </Text>
              )}
            </View>
          </View>

          {lead.Assigned?.Avatar && !avatarError ? (
            <AuthenticatedImage
              source={{
                uri: `${process.env.EXPO_PUBLIC_BASE_URL || ""}${encodeURI(
                  lead.Assigned.Avatar
                )}`,
              }}
              className="size-10 rounded-full ml-2"
              onError={(error) => {
                setAvatarError(true);
              }}
              onLoad={() => {}}
              fallbackComponent={
                <View className="size-10 rounded-full bg-gray-100 items-center justify-center ml-2">
                  <Ionicons name="person" size={16} color="#9CA3AF" />
                </View>
              }
            />
          ) : (
            <View className="size-10 rounded-full bg-gray-100 items-center justify-center ml-2">
              <Ionicons name="person" size={16} color="#9CA3AF" />
            </View>
          )}
        </View>

        {/* Show creation and assignment dates if available */}
        {(lead.timestamp || lead.LeadAssignedDate) && (
          <View className="flex flex-col items-start flex-wrap gap-1 mt-2">
            {lead.lastCalled && lead.LeadStatus?.Status !== "New" && (
              <View className="flex-shrink-0">
                <Text className="text-xs px-2 py-1 bg-miles-100 text-miles-800 rounded-full font-medium">
                  {formatTimestamp(lead.lastCalled)}
                </Text>
              </View>
            )}
          </View>
        )}
      </TouchableOpacity>

      {/* Body - Also touchable for card selection */}
      <TouchableOpacity
        onPress={onCardPress}
        className="p-3"
        activeOpacity={0.7}
      >
        {/* Status and Source Row */}
        <View className="flex-row mb-3 gap-3">
          <View className="flex-1">
            <Text className="text-xs font-medium text-gray-500 mb-1">
              Status:
            </Text>
            <View onStartShouldSetResponder={() => true}>
              <StatusPicker
                value={lead.LeadStatus?._id || ""}
                options={statusOptions}
                onValueChange={handleStatusChange}
                disabled={!canUpdateStatus || loading}
              />
            </View>
          </View>

          <View className="flex-1">
            <Text className="text-xs font-medium text-gray-500 mb-1">
              Source:
            </Text>
            <View className="bg-gray-50 border border-gray-300 rounded-lg p-3">
              <Text className="text-sm font-medium text-gray-700">
                {lead.Source?.Source || "No Source"}
              </Text>
            </View>
          </View>
        </View>

        {/* Description */}
        {lead.Description &&
          (lead.LeadStatus?.Status == "New" ||
            lead.LeadStatus?.Status == "RNR") && (
            <View className="mb-3">
              <Text className="text-xs font-medium text-gray-500 mb-1">
                Description:
              </Text>
              <Text
                className="text-sm text-gray-700 leading-5"
                numberOfLines={2}
              >
                {lead.Description}
              </Text>
            </View>
          )}

        {/* Last Comment */}
        {lead.lastComment?.Content && lead.LeadStatus?.Status !== "New" && (
          <View className="mb-2">
            <Text className="text-xs font-medium text-gray-500 mb-1">
              Last Comment:
            </Text>
            <Text className="text-sm text-gray-900 leading-5" numberOfLines={2}>
              {lead.lastComment.Content}
            </Text>
            {lead.visibleCommentCount && lead.visibleCommentCount - 1 > 0 && (
              <TouchableOpacity onPress={onDetailsPress}>
                <Text className="text-xs text-miles-500 font-medium mt-1">
                  +{lead.visibleCommentCount - 1} more...
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Tags - Read Only Display */}
        {lead.tags && lead.tags.length > 0 && (
          <View>
            <Text className="text-xs font-medium text-gray-500 mb-1">
              Tags:
            </Text>
            <View className="flex-row flex-wrap gap-1">
              {lead.tags.slice(0, 3).map((tag, index) => (
                <View
                  key={index}
                  className="bg-miles-50 px-2 py-1 rounded-xl border border-miles-200"
                >
                  <Text className="text-xs text-miles-700 font-medium">
                    {tag.Tag}
                  </Text>
                </View>
              ))}
              {lead.tags.length > 3 && (
                <Text className="text-xs text-gray-500 italic">
                  +{lead.tags.length - 3} more
                </Text>
              )}
            </View>
          </View>
        )}
      </TouchableOpacity>

      {/* Footer Actions */}
      <View className="flex-row border-t border-gray-200 divide-x-2 divide-gray-200">
        <TouchableOpacity
          className="flex-1 flex-row justify-center items-center py-2.5"
          onPress={toggleContactInfo}
        >
          <Ionicons name="call" size={18} color="#6B7280" />
          <Text className="ml-1.5 text-gray-500 text-sm font-medium">
            Contact
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          className="flex-1 flex-row justify-center items-center py-2.5"
          onPress={() => onCallStatusUpdateModalOpen?.()}
        >
          <Ionicons name="create-outline" size={18} color="#6B7280" />
          <Text className="ml-1.5 text-gray-500 text-sm font-medium">
            Update
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          className="flex-1 flex-row justify-center items-center py-2.5"
          onPress={() => router.push(`/lead-details/${lead._id}`)}
        >
          <Ionicons name="information-circle" size={18} color="#6B7280" />
          <Text className="ml-1.5 text-gray-500 text-sm font-medium">
            Details
          </Text>
        </TouchableOpacity>
      </View>

      {/* Contact Section */}
      {showContact && (
        <Animated.View
          entering={SlideInDown.duration(300)}
          exiting={SlideOutUp.duration(300)}
          className="p-3 bg-gray-50 gap-2 border-t border-gray-200"
        >
          <View className="flex-row gap-2">
            <TouchableOpacity
              className={`flex-1 flex-row items-center px-2 py-1.5 rounded-2xl border ${
                !lead.Phone || lead.Phone.startsWith("***")
                  ? "bg-gray-100 border-gray-300"
                  : "bg-miles-50 border-miles-500"
              }`}
              onPress={() => handlePhoneCall(lead.Phone || "")}
            >
              <Ionicons
                name="call"
                size={16}
                color={
                  !lead.Phone || lead.Phone.startsWith("***")
                    ? "#9CA3AF"
                    : "#3B82F6"
                }
              />
              <Text
                className={`ml-1.5 text-xs font-medium ${
                  !lead.Phone || lead.Phone.startsWith("***")
                    ? "text-gray-500"
                    : "text-miles-800"
                }`}
              >
                {lead.Phone ? formatPhoneNumber(lead.Phone) : "N/A"}
              </Text>
            </TouchableOpacity>

            {lead.AltPhone && (
              <TouchableOpacity
                className={`flex-1 flex-row items-center px-2 py-1.5 rounded-2xl border ${
                  !lead.AltPhone || lead.AltPhone.startsWith("***")
                    ? "bg-gray-100 border-gray-300"
                    : "bg-red-50 border-red-500"
                }`}
                onPress={() => handlePhoneCall(lead.AltPhone)}
              >
                <Ionicons
                  name="call"
                  size={16}
                  color={
                    !lead.AltPhone || lead.AltPhone.startsWith("***")
                      ? "#9CA3AF"
                      : "#DC2626"
                  }
                />
                <Text
                  className={`ml-1.5 text-xs font-medium ${
                    !lead.AltPhone || lead.AltPhone.startsWith("***")
                      ? "text-gray-500"
                      : "text-red-600"
                  }`}
                >
                  {formatPhoneNumber(lead.AltPhone)}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          <View className="flex-row gap-2">
            <TouchableOpacity
              className={`flex-1 flex-row items-center px-2 py-1.5 rounded-2xl border ${
                !lead.Phone || lead.Phone.startsWith("***")
                  ? "bg-gray-100 border-gray-300"
                  : "bg-green-50 border-emerald-500"
              }`}
              onPress={() => handleWhatsApp(lead.Phone || "")}
            >
              <Ionicons
                name="logo-whatsapp"
                size={16}
                color={
                  !lead.Phone || lead.Phone.startsWith("***")
                    ? "#9CA3AF"
                    : "#10B981"
                }
              />
              <Text
                className={`ml-1.5 text-xs font-medium ${
                  !lead.Phone || lead.Phone.startsWith("***")
                    ? "text-gray-500"
                    : "text-emerald-600"
                }`}
              >
                Primary
              </Text>
            </TouchableOpacity>

            {lead.AltPhone && (
              <TouchableOpacity
                className={`flex-1 flex-row items-center px-2 py-1.5 rounded-2xl border ${
                  !lead.AltPhone || lead.AltPhone.startsWith("***")
                    ? "bg-gray-100 border-gray-300"
                    : "bg-green-50 border-emerald-500"
                }`}
                onPress={() => handleWhatsApp(lead.AltPhone)}
              >
                <Ionicons
                  name="logo-whatsapp"
                  size={16}
                  color={
                    !lead.AltPhone || lead.AltPhone.startsWith("***")
                      ? "#9CA3AF"
                      : "#10B981"
                  }
                />
                <Text
                  className={`ml-1.5 text-xs font-medium ${
                    !lead.AltPhone || lead.AltPhone.startsWith("***")
                      ? "text-gray-500"
                      : "text-emerald-600"
                  }`}
                >
                  Alternative
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </Animated.View>
      )}
    </View>
  );
};

export default LeadCard;
