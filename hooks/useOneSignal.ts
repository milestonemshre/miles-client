import { router } from "expo-router";
import { useEffect } from "react";
import { LogLevel, OneSignal } from "react-native-onesignal";

const ONE_SIGNAL_APP_ID = "d1134921-c416-419e-a0a7-0c98e2640e2a";

interface User {
  id: string;
}

export default function useOneSignal(user: User | null) {
  useEffect(() => {
    console.log(
      "OneSignal useEffect triggered, user:",
      user ? "exists" : "null"
    );
    if (user) setupOneSignal();
  }, [user]);

  async function setupOneSignal() {
    console.log("Setting up OneSignal...");
    try {
      // Enable verbose logging for debugging (remove in production)
      OneSignal.Debug.setLogLevel(LogLevel.Verbose);

      // Initialize with your OneSignal App ID
      OneSignal.initialize(ONE_SIGNAL_APP_ID);
      console.log("OneSignal initialized with app ID:", ONE_SIGNAL_APP_ID);

      // Use this method to prompt for push notifications.
      // Check current permission status first
      const permission = await OneSignal.Notifications.getPermissionAsync();
      console.log("Current notification permission status:", permission);

      if (!permission) {
        const result = await OneSignal.Notifications.requestPermission(true);
        console.log("Notification permission request result:", result);
      }

      // Log subscription status and player ID using async methods
      const subscriptionId = await OneSignal.User.pushSubscription.getIdAsync();
      console.log("OneSignal subscription ID (Player ID):", subscriptionId);

      const isSubscribed =
        await OneSignal.User.pushSubscription.getOptedInAsync();
      console.log("OneSignal subscription status (opted in):", isSubscribed);

      const pushToken = await OneSignal.User.pushSubscription.getTokenAsync();
      console.log("OneSignal push token:", pushToken);

      // Set user ID as external user ID in OneSignal for targeting
      if (user?.id) {
        console.log("Setting external user ID in OneSignal:", user.id);
        // Wait a moment for OneSignal to be fully initialized
        setTimeout(async () => {
          try {
            // Try the login method
            OneSignal.login(user.id);
            console.log("OneSignal login called for user:", user.id);

            // Also try setting external user ID directly (alternative method)
            OneSignal.User.addAlias("external_id", user.id);
            console.log("OneSignal external ID alias added:", user.id);
          } catch (error) {
            console.error("Error setting OneSignal external user ID:", error);
          }

          // Wait a bit more and verify the external ID was set
          setTimeout(async () => {
            try {
              const externalUserId = await OneSignal.User.getExternalId();
              console.log(
                "OneSignal external user ID verification:",
                externalUserId
              );
            } catch (error) {
              console.log("Could not verify external user ID:", error);
            }
          }, 3000);
        }, 1000);
      }

      // Send player ID to server if we have a subscription ID and user
      if (subscriptionId && user?.id) {
        console.log("Sending player ID to server...");
        await sendPlayerIdToServer(user.id, subscriptionId);
      }

      // Set up notification handlers to ensure proper display
      OneSignal.Notifications.addEventListener(
        "foregroundWillDisplay",
        (event) => {
          console.log("OneSignal foreground notification received:", event);
          // Explicitly display the notification in foreground
          event.getNotification().display();
        }
      );

      OneSignal.Notifications.addEventListener(
        "backgroundWillDisplay",
        (event) => {
          console.log("OneSignal background notification received:", event);
          // Let it display automatically
        }
      );

      // Set up notification click handler
      OneSignal.Notifications.addEventListener("click", (event) => {
        console.log("OneSignal notification clicked:", event);
        const notificationData = event.notification.additionalData || {};
        const { type } = notificationData;

        if (type === "lead_assignment") {
          console.log("Lead assignment notification clicked");
          // The user will be navigated to the leads tab automatically when they open the app
          // You could add more specific navigation logic here if needed
        } else if (type === "reminder") {
          console.log("Reminder notification clicked:", notificationData);
          // Navigate to tasks tab when reminder notification is clicked
          try {
            router.push("/(tabs)/tasks");
            console.log("Navigated to tasks tab");
          } catch (error) {
            console.error("Failed to navigate to tasks tab:", error);
          }
        } else if (type === "meeting_reminder") {
          console.log(
            "Meeting reminder notification clicked:",
            notificationData
          );
          // Navigate to tasks tab when meeting reminder notification is clicked
          try {
            router.push("/(tabs)/tasks");
            console.log("Navigated to tasks tab for meeting");
          } catch (error) {
            console.error("Failed to navigate to tasks tab:", error);
          }
        }
      });
    } catch (error) {
      console.error("OneSignal setup error:", error);
    }
  }

  const sendPlayerIdToServer = async (userId: string, playerId: string) => {
    try {
      console.log("Sending player ID to server:", { userId, playerId });
      const response = await fetch(
        `${process.env.EXPO_PUBLIC_BASE_URL}api/users/update-player-id`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId, playerId }),
        }
      );

      if (response.ok) {
        const result = await response.json();
        console.log("Player ID sent successfully:", result);
      } else {
        console.error(
          "Failed to send player ID:",
          response.status,
          response.statusText
        );
      }
    } catch (error) {
      console.error("Error sending player ID to server:", error);
    }
  };
}
