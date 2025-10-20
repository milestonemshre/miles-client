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
  Type?: string;
  Project?: string;
  Budget?: string;
  dynamicFields?: Record<string, any>;
  preSelectedStatusId?: string;
  originalLeadStatusId?: string;
}

interface RequirementField {
  _id: string;
  name: string;
  label: string;
  type: 'string' | 'number' | 'list';
  options?: string[];
}

interface CallStatusUpdateModalProps {
  visible: boolean;
  onClose: () => void;
  lead: Lead | null;
  statusOptions: {
    value: string;
    label: string;
    color: string;
    requiresReminder?: "yes" | "no" | "optional";
  }[];
  onLeadUpdate?: (updatedLead: Lead) => void;
  onReminderPress?: () => void;
  onMeetingPress?: () => void;
  reminderAdded?: boolean;
  meetingAdded?: boolean;
  onCommentChange?: (comment: string) => void;
}

const CallStatusUpdateModal: React.FC<CallStatusUpdateModalProps> = ({
  visible,
  onClose,
  lead,
  statusOptions,
  onLeadUpdate,
  onReminderPress,
  onMeetingPress,
  reminderAdded: externalReminderAdded,
  meetingAdded: externalMeetingAdded,
  onCommentChange,
}) => {
  const [selectedStatus, setSelectedStatus] = useState<string>("");
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
      // Use pre-selected status if available, otherwise use current lead status
      const statusToSet = lead.preSelectedStatusId || lead.LeadStatus?._id || "";
      setSelectedStatus(statusToSet);
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

  // Auto-update when reminder or meeting is added (if required)
  const [hasAutoUpdated, setHasAutoUpdated] = useState(false);
  
  useEffect(() => {
    if (!lead || !visible || loading || hasAutoUpdated) return;
    
    const statusChanged = selectedStatus !== (lead.originalLeadStatusId || lead.LeadStatus?._id);
    const newStatusOption = statusOptions.find(o => o.value === selectedStatus);
    const newStatusLabel = newStatusOption?.label;
    
    // Check if we should auto-update after reminder/meeting is added
    const shouldAutoUpdateForMeeting = statusChanged && newStatusLabel === "Meeting" && externalMeetingAdded;
    const shouldAutoUpdateForReminder = statusChanged && newStatusOption?.requiresReminder === "yes" && externalReminderAdded;
    
    if (shouldAutoUpdateForMeeting || shouldAutoUpdateForReminder) {
      console.log('CallStatusUpdateModal - Auto-updating after reminder/meeting added');
      setHasAutoUpdated(true);
      handleSubmit();
    }
  }, [externalReminderAdded, externalMeetingAdded, lead, visible, selectedStatus, statusOptions, loading, hasAutoUpdated, handleSubmit]);
  
  // Reset auto-update flag when modal is reopened
  useEffect(() => {
    if (visible) {
      setHasAutoUpdated(false);
    }
  }, [visible]);

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
            console.log('CallStatusUpdateModal - Fetched requirement fields:', data.fields?.length || 0);
            console.log('CallStatusUpdateModal - Raw field data:', JSON.stringify(data.fields, null, 2));
            const fields = data.fields || [];
            
            // If no fields returned, try to initialize default fields first
            if (fields.length === 0) {
              console.log('CallStatusUpdateModal - No fields returned, attempting to initialize defaults');
              try {
                // Try to initialize default fields
                const initResponse = await fetch(`${process.env.EXPO_PUBLIC_BASE_URL}/api/requirement-fields/initialize`, {
                  method: 'POST',
                  headers,
                });
                
                if (initResponse.ok) {
                  const initData = await initResponse.json();
                  console.log('CallStatusUpdateModal - Successfully initialized default fields:', initData.fields?.length || 0);
                  setRequirementFields(initData.fields || []);
                } else {
                  // If initialization fails, fall back to hardcoded defaults
                  console.log('CallStatusUpdateModal - Initialization failed, using hardcoded defaults');
                  setRequirementFields([
                    { _id: 'default_type', name: 'Type', label: 'Type', type: 'string' as const },
                    { _id: 'default_project', name: 'Project', label: 'Project', type: 'string' as const },
                    { _id: 'default_budget', name: 'Budget', label: 'Budget', type: 'string' as const }
                  ]);
                }
              } catch (initError) {
                console.error('CallStatusUpdateModal - Error during initialization:', initError);
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
            console.error('CallStatusUpdateModal - Failed to fetch requirement fields:', response.status);
            // Use default fields as fallback
            setRequirementFields([
              { _id: 'default_type', name: 'Type', label: 'Type', type: 'string' as const },
              { _id: 'default_project', name: 'Project', label: 'Project', type: 'string' as const },
              { _id: 'default_budget', name: 'Budget', label: 'Budget', type: 'string' as const }
            ]);
          }
        } catch (error) {
          console.error('CallStatusUpdateModal - Error fetching requirement fields:', error);
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

  const handleRequirementChange = (fieldName: string, value: string) => {
    setRequirements(prev => ({
      ...prev,
      [fieldName]: value,
    }));
  };

  const handleSkip = () => {
    setComment("");
    setSelectedStatus(lead?.LeadStatus?._id || "");
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

      // Use original lead status for comparison if available
      const originalStatusId = lead.originalLeadStatusId || lead.LeadStatus?._id;
      const statusChanged = selectedStatus !== originalStatusId;
      const trimmedComment = comment.trim();
      const wordCount = trimmedComment.split(/\s+/).length;

      // Debug logging
      console.log('CallStatusUpdateModal - Debug status change:');
      console.log('- selectedStatus:', selectedStatus);
      console.log('- lead.LeadStatus?._id:', lead.LeadStatus?._id);
      console.log('- lead.preSelectedStatusId:', lead.preSelectedStatusId);
      console.log('- statusChanged:', statusChanged);

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

      // Prepare update data
      const updates: any = {
        updateDescription: trimmedComment,
      };

      if (statusChanged && newStatusOption) {
        updates.LeadStatus = {
          _id: newStatusOption.value,
          Status: newStatusOption.label,
          color: newStatusOption.color,
        };
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
          console.log('CallStatusUpdateModal - Changed dynamic fields:', changedDynamicFields);
          updates.dynamicFields = {
            ...lead.dynamicFields,
            ...changedDynamicFields,
          };
          console.log('CallStatusUpdateModal - Final dynamic fields to send:', updates.dynamicFields);
        }
      }

      // Log the updates being sent to API
      console.log('CallStatusUpdateModal - Updates being sent to API:', JSON.stringify(updates, null, 2));
      
      // Update the lead
      await updateLead(lead._id, updates);

      // Update local lead data
      if (onLeadUpdate) {
        onLeadUpdate(lead._id, updates);
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
  }, [lead, selectedStatus, comment, requirements, statusOptions, onLeadUpdate, onReminderPress, onMeetingPress, externalReminderAdded, externalMeetingAdded, showRequirements, onClose]);

  if (!lead) return null;

  const statusChanged = selectedStatus !== lead.LeadStatus?._id;
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
          <TouchableOpacity onPress={handleSkip}>
            <Ionicons name="close" size={24} color="#6B7280" />
          </TouchableOpacity>
          <View className="flex-1 text-center">
            <Text className="text-lg font-semibold text-gray-900 text-center">
              Call Status Update
            </Text>
            <Text className="text-sm text-gray-500 mt-1 text-center" numberOfLines={1}>
              {lead.Name}
            </Text>
          </View>
          <View className="w-6" />
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

          {/* Comment Input */}
          <View className="mb-6">
            <Text className="text-sm font-medium text-gray-700 mb-3">
              {statusChanged ? "Update Comment *" : "Comment"}
            </Text>
            <TextInput
              className="border border-gray-300 rounded-lg p-3 min-h-[100px] text-gray-900"
              placeholder={
                statusChanged
                  ? "Describe the call outcome and status change..."
                  : "Add a comment about the call..."
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
            {statusChanged && (
              <Text className="text-xs text-gray-500 mt-1">
                * Required when changing status (minimum 3 words)
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
              className={`flex-1 p-3 border rounded-lg ${
                loading || showNextButton
                  ? "border-gray-200 bg-gray-100"
                  : "border-gray-300 bg-white"
              }`}
              disabled={loading || showNextButton}
            >
              <Text className={`text-center font-medium ${
                loading || showNextButton
                  ? "text-gray-400"
                  : "text-gray-700"
              }`}>
                Skip Update
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleSubmit}
              disabled={loading || (statusChanged && comment.trim().split(/\s+/).length < 3)}
              className={`flex-1 p-3 rounded-lg ${
                loading || (statusChanged && comment.trim().split(/\s+/).length < 3)
                  ? "bg-gray-300"
                  : "bg-miles-500"
              }`}
            >
              <Text
                className={`text-center font-medium ${
                  loading || (statusChanged && comment.trim().split(/\s+/).length < 3)
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

export default CallStatusUpdateModal;