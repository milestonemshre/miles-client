import React, { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Modal,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Toast from "react-native-root-toast";
import StatusPicker from "./StatusPicker";
import SourcePicker from "./SourcePicker";
import SearchableDropdown from "./SearchableDropdown";
import { updateLead, createAuthHeaders, validateAuthToken } from "../services/api";

interface Lead {
  _id: string;
  Name: string;
  LeadStatus?: {
    _id: string;
    Status: string;
    color: string;
  };
  Source?: {
    _id: string;
    Source: string;
  };
  Type?: string;
  Project?: string;
  Budget?: string;
  dynamicFields?: Record<string, any>;
}

interface RequirementField {
  _id: string;
  name: string;
  label: string;
  type: 'string' | 'number' | 'list';
  options?: string[];
}

interface LeadStatusUpdateModalProps {
  visible: boolean;
  onClose: () => void;
  lead: Lead | null;
  statusOptions: {
    value: string;
    label: string;
    color: string;
    requiresReminder?: "yes" | "no" | "optional";
  }[];
  sourceOptions: {
    value: string;
    label: string;
  }[];
  onLeadUpdate?: (updatedLead: Lead) => void;
  onReminderPress?: () => void;
  onMeetingPress?: () => void;
  reminderAdded?: boolean;
  meetingAdded?: boolean;
  onCommentChange?: (comment: string) => void;
}

const LeadStatusUpdateModal: React.FC<LeadStatusUpdateModalProps> = ({
  visible,
  onClose,
  lead,
  statusOptions,
  sourceOptions,
  onLeadUpdate,
  onReminderPress,
  onMeetingPress,
  reminderAdded: externalReminderAdded,
  meetingAdded: externalMeetingAdded,
  onCommentChange,
}) => {
  const [selectedStatus, setSelectedStatus] = useState<string>("");
  const [selectedSource, setSelectedSource] = useState<string>("");
  const [comment, setComment] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [requirementFields, setRequirementFields] = useState<RequirementField[]>([]);
  const [requirements, setRequirements] = useState<{
    Type?: string;
    Project?: string;
    Budget?: string;
    [key: string]: any;
  }>({});
  const [showRequirements, setShowRequirements] = useState(false);

  useEffect(() => {
    if (visible && lead) {
      setSelectedStatus(lead.LeadStatus?._id || "");
      setSelectedSource(lead.Source?._id || "");
      setComment("");
      
      // Initialize requirements from lead data
      setRequirements({
        Type: lead.Type || "",
        Project: lead.Project || "",
        Budget: lead.Budget || "",
        ...lead.dynamicFields,
      });
    }
  }, [visible, lead]);

  // Fetch requirement fields when modal opens
  useEffect(() => {
    if (visible) {
      const fetchRequirementFields = async () => {
        try {
          if (!(await validateAuthToken())) {
            return;
          }

          const headers = await createAuthHeaders();
          const response = await fetch(`${process.env.EXPO_PUBLIC_BASE_URL}/api/requirement-fields?includeInactive=false`, {
            method: 'GET',
            headers,
          });

          if (response.ok) {
            const data = await response.json();
            console.log('LeadStatusUpdateModal - Fetched requirement fields:', data.fields?.length || 0);
            const fields = data.fields || [];
            
            // If no fields returned, try to initialize default fields first
            if (fields.length === 0) {
              console.log('LeadStatusUpdateModal - No fields returned, attempting to initialize defaults');
              try {
                // Try to initialize default fields
                const initResponse = await fetch(`${process.env.EXPO_PUBLIC_BASE_URL}/api/requirement-fields/initialize`, {
                  method: 'POST',
                  headers,
                });
                
                if (initResponse.ok) {
                  const initData = await initResponse.json();
                  console.log('LeadStatusUpdateModal - Successfully initialized default fields:', initData.fields?.length || 0);
                  setRequirementFields(initData.fields || []);
                } else {
                  // If initialization fails, fall back to hardcoded defaults
                  console.log('LeadStatusUpdateModal - Initialization failed, using hardcoded defaults');
                  setRequirementFields([
                    { _id: 'default_type', name: 'Type', label: 'Type', type: 'string' as const },
                    { _id: 'default_project', name: 'Project', label: 'Project', type: 'string' as const },
                    { _id: 'default_budget', name: 'Budget', label: 'Budget', type: 'string' as const }
                  ]);
                }
              } catch (initError) {
                console.error('LeadStatusUpdateModal - Error during initialization:', initError);
                // Fall back to hardcoded defaults
                setRequirementFields([
                  { _id: 'default_type', name: 'Type', label: 'Type', type: 'string' as const },
                  { _id: 'default_project', name: 'Project', label: 'Project', type: 'string' as const },
                  { _id: 'default_budget', name: 'Budget', label: 'Budget', type: 'string' as const }
                ]);
              }
            } else {
              setRequirementFields(fields);
            }
          } else {
            console.error('LeadStatusUpdateModal - Failed to fetch requirement fields:', response.status);
            // Use default fields as fallback
            setRequirementFields([
              { _id: 'default_type', name: 'Type', label: 'Type', type: 'string' as const },
              { _id: 'default_project', name: 'Project', label: 'Project', type: 'string' as const },
              { _id: 'default_budget', name: 'Budget', label: 'Budget', type: 'string' as const }
            ]);
          }
        } catch (error) {
          console.error('LeadStatusUpdateModal - Error fetching requirement fields:', error);
          // Use fallback fields even on error
          setRequirementFields([
            { _id: 'default_type', name: 'Type', label: 'Type', type: 'string' as const },
            { _id: 'default_project', name: 'Project', label: 'Project', type: 'string' as const },
            { _id: 'default_budget', name: 'Budget', label: 'Budget', type: 'string' as const }
          ]);
        }
      };

      fetchRequirementFields();
    }
  }, [visible]);

  const handleStatusChange = (value: string, option: any) => {
    setSelectedStatus(value);
  };

  const handleSourceChange = (value: string, option: any) => {
    setSelectedSource(value);
  };

  const handleRequirementChange = (fieldName: string, value: string) => {
    setRequirements(prev => ({
      ...prev,
      [fieldName]: value,
    }));
  };

  const handleSkip = () => {
    setComment("");
    setSelectedStatus(lead?.LeadStatus?._id || "");
    setSelectedSource(lead?.Source?._id || "");
    setRequirements({
      Type: lead?.Type || "",
      Project: lead?.Project || "",
      Budget: lead?.Budget || "",
      ...lead?.dynamicFields,
    });
    setShowRequirements(false);
    onClose();
  };

  const handleSubmit = useCallback(async () => {
    if (!lead) return;

    try {
      setLoading(true);

      const statusChanged = selectedStatus !== lead.LeadStatus?._id;
      const sourceChanged = selectedSource !== lead.Source?._id;
      const trimmedComment = comment.trim();
      const wordCount = trimmedComment.split(/\s+/).length;

      // Get the status label for the new status
      const newStatusOption = statusOptions.find(o => o.value === selectedStatus);
      const newStatusLabel = newStatusOption?.label;

      // List of statuses that don't require description
      const noDescriptionStatuses = ["RNR"];

      if (
        statusChanged &&
        wordCount < 3 &&
        !noDescriptionStatuses.includes(newStatusLabel || "")
      ) {
        Toast.show("Description must exceed 2 words on status change.", {
          duration: Toast.durations.LONG,
          position: Toast.positions.BOTTOM,
          backgroundColor: "#EF4444",
          textColor: "#FFFFFF",
          shadow: true,
        });
        return;
      }

      // Handle required reminders/meetings first
      if (statusChanged) {
        // Check for Meeting status (specific handling)
        if (newStatusLabel === "Meeting") {
          if (!externalMeetingAdded && onMeetingPress) {
            onMeetingPress();
            return;
          }
        }
        // Check for required reminders
        else if (newStatusOption?.requiresReminder === "yes") {
          if (!externalReminderAdded && onReminderPress) {
            onReminderPress();
            return;
          }
        }
      }

      // Check if any requirement fields have been modified
      const originalRequirements = {
        Type: lead.Type || "",
        Project: lead.Project || "",
        Budget: lead.Budget || "",
        ...lead.dynamicFields,
      };
      
      // Check if any fields have changed from original values
      const hasChangedRequirements = Object.keys(requirements).some(key => {
        const newValue = requirements[key];
        const originalValue = originalRequirements[key] || "";
        return newValue !== originalValue;
      });

      // Prepare update data
      const updates: any = {};

      // Add comment if provided
      if (trimmedComment) {
        updates.updateDescription = trimmedComment;
      }

      // Add status update if changed
      if (statusChanged && newStatusOption) {
        updates.LeadStatus = {
          _id: newStatusOption.value,
          Status: newStatusOption.label,
          color: newStatusOption.color,
        };
        updates.originalLeadStatus = lead.LeadStatus;
      }

      // Add source update if changed
      if (sourceChanged) {
        const newSourceOption = sourceOptions.find(o => o.value === selectedSource);
        if (newSourceOption) {
          updates.Source = {
            _id: newSourceOption.value,
            Source: newSourceOption.label,
          };
        }
      }

      // Add requirements updates if user chose to update them OR if any fields have changed
      if (showRequirements || hasChangedRequirements) {
        // Separate default fields from dynamic fields
        const { Type, Project, Budget, ...dynamicFields } = requirements;
        
        // Add default fields if they have values (not empty) and are different from original
        if (Type && Type.trim() && Type.trim() !== (lead.Type || "")) {
          updates.Type = Type.trim();
        }
        if (Project && Project.trim() && Project.trim() !== (lead.Project || "")) {
          updates.Project = Project.trim();
        }
        if (Budget && Budget.trim() && Budget.trim() !== (lead.Budget || "")) {
          updates.Budget = Budget.trim();
        }
        
        // Add dynamic fields if they have values and are different from original
        const changedDynamicFields = Object.fromEntries(
          Object.entries(dynamicFields).filter(([key, value]) => {
            if (!value || (typeof value === 'string' && !value.trim())) {
              return false;
            }
            const originalValue = (lead.dynamicFields && lead.dynamicFields[key]) || "";
            const currentValue = typeof value === 'string' ? value.trim() : value;
            return currentValue !== originalValue;
          })
        );
        
        if (Object.keys(changedDynamicFields).length > 0) {
          console.log('LeadStatusUpdateModal - Changed dynamic fields:', changedDynamicFields);
          updates.dynamicFields = {
            ...lead.dynamicFields,
            ...changedDynamicFields,
          };
          console.log('LeadStatusUpdateModal - Final dynamic fields to send:', updates.dynamicFields);
        }
      }

      // Only update if there are actual changes
      if (Object.keys(updates).length === 0) {
        Toast.show("No changes to update", {
          duration: Toast.durations.SHORT,
        });
        onClose();
        return;
      }

      // Log the updates being sent to API
      console.log('LeadStatusUpdateModal - Updates being sent to API:', JSON.stringify(updates, null, 2));
      
      // Update the lead
      await updateLead(lead._id, updates);

      // Update local lead data
      if (onLeadUpdate) {
        const updatedLead = {
          ...lead,
          ...updates,
          lastCalled: Date.now(),
        };

        if (trimmedComment) {
          updatedLead.lastComment = {
            Content: trimmedComment,
            timestamp: Date.now(),
          };
        }

        onLeadUpdate(updatedLead);
      }

      Toast.show("Lead updated successfully", {
        duration: Toast.durations.SHORT,
      });

      // Check if status was changed to "Closure"
      if (statusChanged && newStatusLabel === "Closure") {
        Alert.alert(
          "Success",
          "Lead status changed to Closure. You can now create a deal from this lead."
        );
      }

      onClose();
    } catch (error: any) {
      console.error("Failed to update lead:", error);
      Toast.show(`Failed to update lead: ${error.message}`, {
        duration: Toast.durations.LONG,
      });
    } finally {
      setLoading(false);
    }
  }, [lead, selectedStatus, selectedSource, comment, requirements, statusOptions, sourceOptions, onLeadUpdate, onReminderPress, onMeetingPress, externalReminderAdded, externalMeetingAdded, showRequirements, onClose]);

  if (!lead) return null;

  const statusChanged = selectedStatus !== lead.LeadStatus?._id;
  const sourceChanged = selectedSource !== lead.Source?._id;
  const newStatusOption = statusOptions.find(o => o.value === selectedStatus);
  const newStatusLabel = newStatusOption?.label;
  
  // Determine what type of action is needed
  const requiresMeeting = statusChanged && newStatusLabel === "Meeting" && !externalMeetingAdded;
  const requiresReminder = statusChanged && newStatusOption?.requiresReminder === "yes" && !externalReminderAdded;
  const showReminderButton = statusChanged && newStatusOption?.requiresReminder === "optional";
  
  // Show Next button if meeting/reminder is required but not yet added
  const showNextButton = requiresMeeting || requiresReminder;
  const nextButtonText = requiresMeeting ? "Next (Add Meeting)" : "Next (Add Reminder)";

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleSkip}
    >
      <View className="flex-1 bg-white">
        {/* Header */}
        <View className="flex-row items-center justify-between p-4 border-b border-gray-200">
          <View className="flex-1">
            <Text className="text-lg font-semibold text-gray-900">
              Update Lead
            </Text>
            <Text className="text-sm text-gray-500 mt-1" numberOfLines={1}>
              {lead.Name}
            </Text>
          </View>
          <TouchableOpacity
            onPress={handleSkip}
            className="ml-4 p-2 rounded-full bg-gray-100"
          >
            <Ionicons name="close" size={20} color="#6B7280" />
          </TouchableOpacity>
        </View>

        <ScrollView className="flex-1 p-4">
          {/* Status Picker */}
          <View className="mb-6">
            <Text className="text-sm font-medium text-gray-700 mb-3">
              Lead Status
            </Text>
            <StatusPicker
              value={selectedStatus}
              options={statusOptions}
              onValueChange={handleStatusChange}
            />
          </View>

          {/* Source Picker */}
          <View className="mb-6">
            <Text className="text-sm font-medium text-gray-700 mb-3">
              Lead Source
            </Text>
            <SourcePicker
              value={selectedSource}
              options={sourceOptions}
              onValueChange={handleSourceChange}
            />
          </View>

          {/* Comment Input */}
          <View className="mb-6">
            <Text className="text-sm font-medium text-gray-700 mb-3">
              {statusChanged || sourceChanged ? "Update Comment *" : "Comment"}
            </Text>
            <TextInput
              className="border border-gray-300 rounded-lg p-3 min-h-[100px] text-gray-900"
              placeholder={
                statusChanged || sourceChanged
                  ? "Describe the changes made..."
                  : "Add a comment about the lead..."
              }
              value={comment}
              onChangeText={(text) => {
                setComment(text);
                if (onCommentChange) {
                  onCommentChange(text);
                }
              }}
              multiline
              textAlignVertical="top"
              autoFocus
            />
            {(statusChanged || sourceChanged) && (
              <Text className="text-xs text-gray-500 mt-1">
                * Required when changing status or source (minimum 3 words)
              </Text>
            )}
          </View>

          {/* Requirements Toggle */}
          <View className="mb-6">
            <TouchableOpacity
              onPress={() => setShowRequirements(!showRequirements)}
              className="flex-row items-center justify-between p-3 border border-gray-300 rounded-lg bg-gray-50"
            >
              <View className="flex-row items-center">
                <Ionicons 
                  name="document-text-outline" 
                  size={20} 
                  color="#6B7280" 
                />
                <Text className="text-gray-700 font-medium ml-2">
                  Update Requirements
                </Text>
              </View>
              <Ionicons
                name={showRequirements ? "chevron-up" : "chevron-down"}
                size={20}
                color="#6B7280"
              />
            </TouchableOpacity>
            
            {showRequirements && (
              <View className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                <Text className="text-sm font-medium text-gray-700 mb-3">
                  Requirements
                </Text>
                <Text className="text-xs text-gray-500 mb-4">
                  Only filled fields will be updated
                </Text>
                
                {/* All requirement fields in a single section */}
                {[
                  // Default fields first
                  ...['Type', 'Project', 'Budget'].map(name => {
                    const field = requirementFields.find(f => f.name === name);
                    return {
                      _id: `default_${name}`,
                      name,
                      label: field?.label || name,
                      type: field?.type || 'string' as const,
                      options: field?.options,
                      placeholder: name === 'Type' ? 'Property type...' : 
                                  name === 'Project' ? 'Project name...' : 
                                  'Budget range...'
                    };
                  }),
                  // Then dynamic fields
                  ...requirementFields
                    .filter(field => !['Type', 'Project', 'Budget'].includes(field.name))
                    .map(field => ({
                      ...field,
                      placeholder: field.type === 'list' ? `Select ${field.label}...` : `Enter ${field.label.toLowerCase()}...`
                    }))
                ].map((field) => (
                  <View key={field._id} className="mb-4">
                    <Text className="text-sm font-medium text-gray-700 mb-2">{field.label}</Text>
                    {field.type === 'list' && field.options && field.options.length > 0 ? (
                      <SearchableDropdown
                        options={field.options.map(option => ({ value: option, label: option }))}
                        value={requirements[field.name] || ''}
                        placeholder={field.placeholder}
                        onSelect={(selectedOption) => {
                          handleRequirementChange(field.name, selectedOption ? selectedOption.value : '');
                        }}
                        allowClear={true}
                        className="shadow-sm"
                      />
                    ) : (
                      <TextInput
                        className="border border-gray-300 rounded-lg p-3 text-gray-900 bg-white shadow-sm"
                        placeholder={field.placeholder}
                        value={requirements[field.name] || ""}
                        onChangeText={(text) => handleRequirementChange(field.name, text)}
                        keyboardType={field.type === 'number' ? 'numeric' : 'default'}
                      />
                    )}
                  </View>
                ))}
              </View>
            )}
          </View>

          {/* Reminder Button for Optional Reminders */}
          {showReminderButton && onReminderPress && (
            <TouchableOpacity
              onPress={onReminderPress}
              className="flex-row items-center justify-center p-3 border border-miles-300 rounded-lg mb-4 bg-miles-50"
            >
              <Ionicons name="alarm-outline" size={20} color="#124b68" />
              <Text className="text-miles-700 font-medium ml-2">
                Add Reminder (Optional)
              </Text>
            </TouchableOpacity>
          )}
        </ScrollView>

        {/* Footer */}
        <View className="p-4 border-t border-gray-200">
          <View className="flex-row gap-3">
            <TouchableOpacity
              onPress={handleSkip}
              className="flex-1 p-3 border border-gray-300 rounded-lg"
              disabled={loading}
            >
              <Text className="text-center text-gray-700 font-medium">
                Cancel
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleSubmit}
              disabled={loading || ((statusChanged || sourceChanged) && comment.trim().split(/\s+/).length < 3)}
              className={`flex-1 p-3 rounded-lg ${
                loading || ((statusChanged || sourceChanged) && comment.trim().split(/\s+/).length < 3)
                  ? "bg-gray-300"
                  : "bg-miles-500"
              }`}
            >
              <Text
                className={`text-center font-medium ${
                  loading || ((statusChanged || sourceChanged) && comment.trim().split(/\s+/).length < 3)
                    ? "text-gray-500"
                    : "text-white"
                }`}
              >
                {loading 
                  ? "Updating..." 
                  : showNextButton 
                    ? nextButtonText 
                    : "Update Lead"
                }
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

export default LeadStatusUpdateModal;