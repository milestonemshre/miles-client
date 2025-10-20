import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Linking, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { formatTimestamp } from "../../utils/dateFormatter";
import RequirementsSection from "./RequirementsSection";

interface Lead {
  _id: string;
  Name: string;
  Phone?: string;
  AltPhone?: string;
  Description?: string;
  Email?: string;
  Address?: string;
  Type?: string;
  Project?: string;
  Budget?: string;
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
    _id: string;
    username: string;
    Avatar?: string;
  };
  tags?: {
    Tag: string;
  }[];
  timestamp?: string;
  LeadAssignedDate?: string;
  dynamicFields?: Record<string, any>;
}

interface ProfileTabProps {
  lead: Lead;
  onLeadUpdate: (updatedLead: Lead) => void;
  userPermissions: any;
}

const ProfileTab: React.FC<ProfileTabProps> = ({ lead, onLeadUpdate, userPermissions }) => {

  const handleEmailPress = (email: string) => {
    if (email) {
      Linking.openURL(`mailto:${email}`);
    }
  };

  const renderInfoSection = (title: string, children: React.ReactNode) => (
    <View className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-4">
      <Text className="text-lg font-semibold text-gray-900 mb-3">{title}</Text>
      {children}
    </View>
  );

  const renderInfoRow = (label: string, value: string | undefined, icon?: keyof typeof Ionicons.glyphMap, onPress?: () => void) => {
    if (!value) return null;

    const content = (
      <View className="flex-row items-center py-2">
        {icon && (
          <Ionicons name={icon} size={16} color="#6B7280" className="mr-3" />
        )}
        <View className="flex-1">
          <Text className="text-sm font-medium text-gray-500 mb-1">{label}:</Text>
          <Text className={`text-base ${onPress ? 'text-miles-600' : 'text-gray-900'}`}>
            {value}
          </Text>
        </View>
      </View>
    );

    if (onPress) {
      return (
        <TouchableOpacity key={label} onPress={onPress} className="border-b border-gray-100 last:border-b-0">
          {content}
        </TouchableOpacity>
      );
    }

    return (
      <View key={label} className="border-b border-gray-100 last:border-b-0">
        {content}
      </View>
    );
  };

  return (
    <ScrollView className="flex-1 bg-gray-50 p-4" showsVerticalScrollIndicator={false}>
      {/* Basic Information */}
      {renderInfoSection(
        "Basic Information",
        <>
          <View className="border-b border-gray-100 py-2">
            <Text className="text-sm font-medium text-gray-500 mb-1">Description:</Text>
            <Text className="text-base text-gray-900 leading-6">
              {lead.Description || "No description provided"}
            </Text>
          </View>
          {lead.Email && (
            <View className="border-b border-gray-100 py-2">
              <Text className="text-sm font-medium text-gray-500">
                Email:{" "}
                <Text 
                  className="text-base text-miles-600 font-normal"
                  onPress={() => handleEmailPress(lead.Email!)}
                >
                  {lead.Email}
                </Text>
              </Text>
            </View>
          )}
        </>
      )}


      {/* Lead Details */}
      {renderInfoSection(
        "Lead Details",
        <>
          {lead.LeadStatus && renderInfoRow(
            "Status",
            lead.LeadStatus.Status
          )}
          {lead.Source && renderInfoRow(
            "Source",
            lead.Source.Source
          )}
        </>
      )}

      {/* Requirements Section */}
      <RequirementsSection lead={lead} />

      {/* Tags */}
      {lead.tags && lead.tags.length > 0 && renderInfoSection(
        "Tags",
        <View className="flex-row flex-wrap gap-2">
          {lead.tags.map((tag, index) => (
            <View
              key={index}
              className="bg-miles-50 px-3 py-1 rounded-full border border-miles-200"
            >
              <Text className="text-sm text-miles-700 font-medium">
                {tag.Tag}
              </Text>
            </View>
          ))}
        </View>
      )}

      {/* Assignment Information */}
      {renderInfoSection(
        "Assignment Information",
        <>
          {lead.Assigned && renderInfoRow(
            "Assigned to",
            lead.Assigned.username,
            "person"
          )}
          {lead.timestamp && renderInfoRow(
            "Created",
            formatTimestamp(lead.timestamp),
            "time"
          )}
          {lead.LeadAssignedDate && renderInfoRow(
            "Assigned Date",
            formatTimestamp(lead.LeadAssignedDate),
            "calendar"
          )}
        </>
      )}

      {/* Edit Button - TODO: Implement editing functionality */}
      <View className="mt-6 mb-4">
        <TouchableOpacity className="bg-miles-500 rounded-lg py-3 px-6 flex-row items-center justify-center">
          <Ionicons name="create" size={20} color="white" />
          <Text className="text-white font-semibold ml-2">Edit Information</Text>
        </TouchableOpacity>
        <Text className="text-sm text-gray-400 text-center mt-2">
          Editing feature coming soon
        </Text>
      </View>
    </ScrollView>
  );
};

export default ProfileTab;
