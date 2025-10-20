import LoadingView from "@/components/LoadingView";
import {
  fetchCampaignLeadIds,
  fetchCampaignLeads,
} from "@/services/campaignApi";
import { getUserPermissions } from "@/utils/userPermissions";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useNavigation, useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Linking,
  Platform,
  SafeAreaView,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Toast from "react-native-root-toast";
import CallStatusUpdateModal from "../../components/CallStatusUpdateModal";
import CommentsTab from "../../components/leadDetails/CommentsTab";
import MeetingsTab from "../../components/leadDetails/MeetingsTab";
import ProfileTab from "../../components/leadDetails/ProfileTab";
import RemindersTab from "../../components/leadDetails/RemindersTab";
import MeetingModal from "../../components/MeetingModal";
import ReminderModal from "../../components/ReminderModal";
import { useDialerTimeTracking } from "../../hooks/useDialerTimeTracking";
import {
  fetchLeadById,
  fetchStatusOptions,
  getUsers,
  logDialerSession,
} from "../../services/api";

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

type TabType = "Profile" | "Comments" | "Reminders" | "Meetings";

export default function LeadDetailsPage() {
  const router = useRouter();
  const navigation = useNavigation();
  const params = useLocalSearchParams();
  const id = params.id as string;

  // Check if we're in calling mode
  const fromCalling = params.fromCalling === "true";
  const campaignId = params.campaignId as string;
  const campaignName = params.campaignName as string;
  const startingFromAuto = fromCalling && (!id || id === "auto");

  const [lead, setLead] = useState<Lead | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>("Profile");
  const [error, setError] = useState<string | null>(null);

  // Calling-related state
  const [campaignLeads, setCampaignLeads] = useState<string[]>([]);
  const [currentLeadIndex, setCurrentLeadIndex] = useState(-1);
  const [loadingNavigation, setLoadingNavigation] = useState(false);

  // Call status update modal state
  const [showCallStatusModal, setShowCallStatusModal] = useState(false);
  const [statusOptions, setStatusOptions] = useState<
    {
      value: string;
      label: string;
      color: string;
      requiresReminder?: "yes" | "no" | "optional";
    }[]
  >([]);

  // Reminder modal state
  const [showReminderModal, setShowReminderModal] = useState(false);
  const [reminderLeadId, setReminderLeadId] = useState<string | null>(null);
  const [users, setUsers] = useState<any[]>([]);

  // Meeting modal state
  const [showMeetingModal, setShowMeetingModal] = useState(false);
  const [meetingLeadId, setMeetingLeadId] = useState<string | null>(null);

  // Track reminder/meeting completion for current call status update
  const [callReminderAdded, setCallReminderAdded] = useState(false);
  const [callMeetingAdded, setCallMeetingAdded] = useState(false);
  const [callComment, setCallComment] = useState("");

  const permissions = getUserPermissions();

  // Dialer time tracking
  const dialerTimeTracking = useDialerTimeTracking({
    leadId: lead?._id,
    phoneNumber: lead?.Phone || lead?.AltPhone,
    onSessionComplete: async (session) => {
      console.log("📞 Dialer session completed:", {
        sessionId: session.id,
        leadId: session.leadId,
        durationSeconds: session.durationSeconds,
        durationFormatted: session.durationSeconds
          ? `${Math.floor(session.durationSeconds / 60)}m ${
              session.durationSeconds % 60
            }s`
          : "0s",
        transferredToDialer: session.transferredToDialer,
        phoneNumber: session.phoneNumber,
        startTime: new Date(session.startedAt).toLocaleTimeString(),
        endTime: session.endedAt
          ? new Date(session.endedAt).toLocaleTimeString()
          : "N/A",
      });

      // Log dialer session to API if duration is valid
      if (
        session.endedAt &&
        session.durationSeconds &&
        session.durationSeconds > 0
      ) {
        try {
          const result = await logDialerSession({
            leadId: session.leadId,
            phoneNumber: session.phoneNumber,
            startedAt: new Date(session.startedAt).toISOString(),
            endedAt: new Date(session.endedAt).toISOString(),
            durationSeconds: session.durationSeconds,
            transferredToDialer: session.transferredToDialer,
            platform: Platform.OS,
          });
          console.log("✅ Dialer session logged to backend:", result.sessionId);
        } catch (error) {
          console.warn("❌ Failed to log dialer session:", error);
        }
      } else {
        console.log(
          "⚠️ Skipping dialer session log - invalid duration:",
          session.durationSeconds
        );
      }
    },
    onTransferToDialer: (session) => {
      console.log("User transferred to dialer:", session.id);
    },
    onReturnFromDialer: (session) => {
      console.log("User returned from dialer - Session details:", {
        sessionId: session.id,
        totalDuration: dialerTimeTracking.getCurrentDuration(),
        transferredToDialer: session.transferredToDialer,
      });

      // Show call status modal after returning from dialer
      setTimeout(() => {
        setCallReminderAdded(false);
        setCallMeetingAdded(false);
        setCallComment("");
        setShowCallStatusModal(true);
      }, 500);

      // Don't end session immediately - wait for user to complete the call workflow
    },
  });

  // If we navigated here via Start Calling without a specific lead id, resolve the first lead and replace route
  useEffect(() => {
    if (!startingFromAuto) return;
    const resolveFirstLead = async () => {
      try {
        if (!campaignName) return;
        const response = await fetchCampaignLeads({
          campaignName,
          page: 1,
          limit: 20,
        });
        const leads = Array.isArray(response.data) ? response.data : [];
        if (!leads.length) {
          setError("No leads found in this campaign");
          return;
        }
        const isPending = (lead: any) => {
          const status = lead?.LeadStatus?.Status;
          return !status || status === "New" || status === "RNR";
        };
        const firstLead = leads.find(isPending) || leads[0];
        router.replace({
          pathname: `/lead-details/${firstLead._id}`,
          params: {
            fromCalling: "true",
            campaignId,
            campaignName,
          },
        });
      } catch {
        setError("Failed to start calling");
      } finally {
        setLoading(true); // keep showing loading until replaced
      }
    };
    resolveFirstLead();
  }, [startingFromAuto, campaignName, campaignId, router]);

  // Load campaign lead IDs quickly for navigation
  const loadCampaignLeads = useCallback(async () => {
    if (!fromCalling || !campaignName) return;

    try {
      const response = await fetchCampaignLeadIds({
        campaignName,
        page: 1,
        limit: 2000, // IDs are lightweight; fetch many for smooth navigation
      });

      const leadIds = Array.isArray(response.data) ? response.data : [];
      setCampaignLeads(leadIds);

      // Find current lead index
      const index = leadIds.indexOf(id);
      setCurrentLeadIndex(index);
    } catch (error) {
      console.error("Failed to load campaign leads:", error);
    }
  }, [fromCalling, campaignName, id]);

  // Navigate to next lead
  const navigateToNextLead = useCallback(async () => {
    if (currentLeadIndex === -1 || currentLeadIndex >= campaignLeads.length - 1)
      return;

    setLoadingNavigation(true);
    const nextLeadId = campaignLeads[currentLeadIndex + 1];

    router.replace({
      pathname: `/lead-details/${nextLeadId}`,
      params: {
        fromCalling: "true",
        campaignId,
        campaignName,
      },
    });
  }, [currentLeadIndex, campaignLeads, router, campaignId, campaignName]);

  // Set the header title and place a Next button beside the name in the header (calling mode)
  useEffect(() => {
    if (!navigation) return;

    const canGoNext =
      currentLeadIndex >= 0 &&
      currentLeadIndex < campaignLeads.length - 1 &&
      !loadingNavigation;

    navigation.setOptions({
      headerTitle: lead ? lead.Name : "Lead Details",
      headerRight: () =>
        campaignLeads.length > 0 ? (
          <TouchableOpacity
            onPress={navigateToNextLead}
            disabled={!canGoNext}
            style={{
              paddingVertical: 6,
              paddingHorizontal: 12,
              borderRadius: 16,
              backgroundColor: canGoNext ? "#176298" : "#E5E7EB",
            }}
          >
            <Text
              style={{
                color: canGoNext ? "#FFFFFF" : "#9CA3AF",
                fontWeight: "600",
              }}
            >
              Next
            </Text>
          </TouchableOpacity>
        ) : null,
    });
  }, [
    navigation,
    lead,
    fromCalling,
    currentLeadIndex,
    campaignLeads.length,
    loadingNavigation,
    navigateToNextLead,
  ]);

  // Load status options and users
  useEffect(() => {
    const loadData = async () => {
      try {
        const [options, usersData] = await Promise.all([
          fetchStatusOptions(),
          getUsers(),
        ]);
        setStatusOptions(options);
        setUsers(usersData);
      } catch (error) {
        console.error("Failed to load data:", error);
      }
    };

    loadData();
  }, []);

  useEffect(() => {
    if (!id) return;
    if (startingFromAuto) return; // wait for auto-resolution to replace with actual lead id

    const fetchLead = async () => {
      try {
        setLoading(true);
        setError(null);

        const leadData = await fetchLeadById(id);
        setLead(leadData);

        // Load campaign leads if in calling mode
        if (fromCalling) {
          await loadCampaignLeads();
        }
      } catch (err) {
        console.error(err);
        setError("Failed to load lead details");
      } finally {
        setLoading(false);
        setLoadingNavigation(false);
      }
    };

    fetchLead();
  }, [id, fromCalling, loadCampaignLeads, startingFromAuto]);

  // Prefetch next lead details whenever current lead or index changes
  useEffect(() => {
    if (!lead) return;
    if (currentLeadIndex < 0) return;
    const nextIdx = currentLeadIndex + 1;
    if (nextIdx >= campaignLeads.length) return;
    const nextId = campaignLeads[nextIdx];
    // Simple prefetch without caching - let the browser handle caching
    fetchLeadById(nextId).catch(() => {});
  }, [lead, currentLeadIndex, campaignLeads]);

  const handleLeadUpdate = async () => {
    // Refetch the lead data to ensure we have the latest information
    try {
      const leadData = await fetchLeadById(id);
      setLead(leadData);

      // End dialer session when user completes lead update
      // This ensures we only log calls that resulted in actual user engagement
      if (dialerTimeTracking.isSessionActive) {
        console.log("📞 Ending dialer session after successful lead update");
        dialerTimeTracking.endDialerSession();
      }
    } catch (error) {
      console.error("Failed to refresh lead data:", error);
    }
  };

  // Action button handlers
  const handleCall = () => {
    const phoneNumber = lead?.Phone || lead?.AltPhone;
    if (!phoneNumber) {
      Alert.alert("No Phone Number", "This lead doesn't have a phone number.");
      return;
    }

    if (!lead?._id) {
      Alert.alert("Error", "Lead ID is missing.");
      return;
    }

    // Start dialer time tracking session
    dialerTimeTracking.startDialerSession(lead._id, String(phoneNumber));

    const url = `tel:${phoneNumber}`;
    Linking.openURL(url).catch(() => {
      Alert.alert("Error", "Unable to make phone call");
      // End tracking session if call failed
      dialerTimeTracking.endDialerSession();
    });
  };

  const handleWhatsApp = () => {
    const phoneNumber = lead?.Phone || lead?.AltPhone;
    if (!phoneNumber) {
      Alert.alert("No Phone Number", "This lead doesn't have a phone number.");
      return;
    }
    // Remove any non-digit characters from phone number
    const cleanNumber = phoneNumber.replace(/\D/g, "");
    const url = `whatsapp://send?phone=${cleanNumber}`;
    Linking.openURL(url).catch(() => {
      Alert.alert("Error", "WhatsApp is not installed or unable to open");
    });
  };

  const handleSMS = async () => {
    const phoneNumber = lead?.Phone || lead?.AltPhone;
    if (!phoneNumber) {
      Alert.alert("No Phone Number", "This lead doesn't have a phone number.");
      return;
    }

    const cleanNumber = String(phoneNumber).replace(/\D/g, "");

    if (Platform.OS === "android") {
      // Try preferred SMS packages first to avoid non-SMS apps being suggested
      const preferredPkgs = [
        "com.google.android.apps.messaging", // Google Messages
        "com.samsung.android.messaging", // Samsung Messages
        "com.android.mms", // AOSP/legacy
        "com.oneplus.mms", // OnePlus
        "com.sonyericsson.conversations", // Sony
        "com.htc.sense.mms", // HTC
        "com.asus.mms", // ASUS
        "com.motorola.messaging", // Motorola
      ];

      for (const pkg of preferredPkgs) {
        // intent URI targeting a specific package
        const intentUri = `intent://${cleanNumber}#Intent;scheme=smsto;action=android.intent.action.SENDTO;package=${pkg};end`;
        try {
          const canOpen = await Linking.canOpenURL(intentUri);
          if (canOpen) {
            await Linking.openURL(intentUri);
            return;
          }
        } catch {}
      }

      // Fallback: smsto opens default chooser limited to SMS-capable apps
      const url = `smsto:${cleanNumber}`;
      Linking.openURL(url).catch(() => {
        Alert.alert("Error", "Unable to open SMS");
      });
      return;
    }

    // iOS
    const url = `sms:${cleanNumber}`;
    Linking.openURL(url).catch(() => {
      Alert.alert("Error", "Unable to open SMS");
    });
  };

  // Old AppState listener removed - now using improved dialer session tracking

  // Reminder modal handlers
  const openReminderModal = useCallback((leadId: string) => {
    setReminderLeadId(leadId);
    setShowReminderModal(true);
  }, []);

  const closeReminderModal = useCallback(() => {
    setReminderLeadId(null);
    setShowReminderModal(false);
  }, []);

  const handleReminderSuccess = useCallback(() => {
    Toast.show("Reminder added successfully", {
      duration: Toast.durations.SHORT,
    });
    setCallReminderAdded(true);
    closeReminderModal();
    // Refresh lead data or show success message
    if (lead) {
      // Optionally refresh lead data here
    }
  }, [lead, closeReminderModal]);

  // Meeting modal handlers
  const openMeetingModal = useCallback((leadId: string) => {
    setMeetingLeadId(leadId);
    setShowMeetingModal(true);
  }, []);

  const closeMeetingModal = useCallback(() => {
    setMeetingLeadId(null);
    setShowMeetingModal(false);
  }, []);

  const handleMeetingSuccess = useCallback(() => {
    Toast.show("Meeting scheduled successfully", {
      duration: Toast.durations.SHORT,
    });
    setCallMeetingAdded(true);
    closeMeetingModal();
    // Refresh lead data or show success message
    if (lead) {
      // Optionally refresh lead data here
    }
  }, [lead, closeMeetingModal]);

  const handleEmail = () => {
    const email = lead?.Email;
    if (!email) {
      Alert.alert(
        "No Email Address",
        "This lead doesn't have an email address."
      );
      return;
    }
    const url = `mailto:${email}`;
    Linking.openURL(url).catch(() => {
      Alert.alert("Error", "Unable to open email client");
    });
  };

  const renderActionButton = (
    iconName: string,
    label: string,
    onPress: () => void,
    disabled: boolean = false,
    color?: string
  ) => (
    <TouchableOpacity
      className={`flex-1 items-center py-3 px-2 rounded-lg ${
        disabled ? "bg-gray-100" : "bg-miles-50 active:bg-miles-100"
      }`}
      onPress={onPress}
      disabled={disabled}
    >
      <Ionicons
        name={iconName as any}
        size={24}
        color={disabled ? "#9CA3AF" : color || "#124b68"}
      />
      <Text
        style={{ color: disabled ? "#9ca3af" : color || "#124b68" }}
        className={`text-xs font-medium mt-1`}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );

  const renderTabButton = (tab: TabType, label: string) => (
    <TouchableOpacity
      key={tab}
      className={`px-4 py-2 rounded-lg ${
        activeTab === tab ? "bg-miles-100" : "bg-transparent"
      }`}
      onPress={() => setActiveTab(tab)}
    >
      <Text
        className={`text-sm font-medium ${
          activeTab === tab ? "text-miles-800" : "text-gray-600"
        }`}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );

  const renderTabContent = () => {
    if (!lead) return null;

    switch (activeTab) {
      case "Profile":
        return (
          <ProfileTab
            lead={lead}
            onLeadUpdate={handleLeadUpdate}
            userPermissions={permissions}
          />
        );
      case "Comments":
        return <CommentsTab lead={lead} />;
      case "Reminders":
        return <RemindersTab lead={lead} />;
      case "Meetings":
        return <MeetingsTab lead={lead} />;
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-white">
        <View className="flex-1 justify-center items-center">
          <LoadingView />
          <Text className="text-gray-500 mt-2">Loading lead details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !lead) {
    return (
      <SafeAreaView className="flex-1 bg-white">
        <View className="flex-1 justify-center items-center px-4">
          <Ionicons name="alert-circle" size={48} color="#EF4444" />
          <Text className="text-xl font-semibold text-gray-800 mt-4 text-center">
            {error || "Lead not found"}
          </Text>
          <TouchableOpacity
            className="bg-miles-500 px-6 py-3 rounded-lg mt-4"
            onPress={() => router.back()}
          >
            <Text className="text-white font-medium">Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-white">
      {/* Action Buttons */}
      <View className="px-4 py-4 bg-white border-b border-gray-100">
        <View className="flex-row gap-3">
          {renderActionButton(
            "call",
            "Call",
            handleCall,
            !lead?.Phone && !lead?.AltPhone
          )}
          {renderActionButton(
            "logo-whatsapp",
            "WhatsApp",
            handleWhatsApp,
            !lead?.Phone && !lead?.AltPhone,
            "#059669"
          )}
          {renderActionButton(
            "chatbubble-ellipses",
            "SMS",
            handleSMS,
            !lead?.Phone && !lead?.AltPhone
          )}
          {renderActionButton("mail", "Email", handleEmail, !lead?.Email)}
        </View>
      </View>

      {/* Tab Navigation */}
      <View className="px-4 py-3 border-b border-gray-200">
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 0 }}
        >
          <View className="flex-row gap-2">
            {renderTabButton("Profile", "Profile")}
            {renderTabButton("Comments", "Comments")}
            {renderTabButton("Reminders", "Reminders")}
            {renderTabButton("Meetings", "Meetings")}
          </View>
        </ScrollView>
      </View>

      {/* Tab Content */}
      <View className="flex-1">{renderTabContent()}</View>

      {/* Call Status Update Modal */}
      <CallStatusUpdateModal
        visible={showCallStatusModal}
        onClose={() => {
          setCallReminderAdded(false);
          setCallMeetingAdded(false);
          setCallComment("");
          setShowCallStatusModal(false);
          // Note: Dialer session will only end if user actually updated the lead
        }}
        lead={lead}
        statusOptions={statusOptions}
        onLeadUpdate={handleLeadUpdate}
        onReminderPress={() => {
          if (lead) {
            openReminderModal(lead._id);
          }
        }}
        onMeetingPress={() => {
          if (lead) {
            openMeetingModal(lead._id);
          }
        }}
        reminderAdded={callReminderAdded}
        meetingAdded={callMeetingAdded}
        onCommentChange={setCallComment}
      />

      {/* Reminder Modal */}
      <ReminderModal
        visible={showReminderModal}
        onClose={closeReminderModal}
        leadId={reminderLeadId || ""}
        assigneesOptions={users}
        onSuccess={handleReminderSuccess}
        initialComment={callComment}
      />

      {/* Meeting Modal */}
      <MeetingModal
        visible={showMeetingModal}
        onClose={closeMeetingModal}
        leadId={meetingLeadId || ""}
        assigneeOptions={users}
        statusOptions={statusOptions}
        onSuccess={handleMeetingSuccess}
        initialComment={callComment}
      />
    </SafeAreaView>
  );
}
