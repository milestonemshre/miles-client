import * as Location from "expo-location";
import * as TaskManager from "expo-task-manager";

export const BACKGROUND_LOCATION_TASK = "background-location-task";

// Track last sent location and time to ensure we send updates every 30 seconds
const FORCE_SEND_INTERVAL = 30000; // 30 seconds in milliseconds

// Define the background location task
TaskManager.defineTask(
  BACKGROUND_LOCATION_TASK,
  async ({ data, error, executionInfo }) => {
    if (error) {
      console.error("Background location task error:", error);
      return;
    }

    if (data) {
      const { locations } = data as { locations: Location.LocationObject[] };

      console.log("Background location update received:", {
        count: locations.length,
        appState: executionInfo?.appState,
        taskName: executionInfo?.taskName,
      });

      // Process each location update
      for (const location of locations) {
        try {
          const currentTime = Date.now();

          // Get last sent time from storage (persistent across background/foreground)
          const SecureStore = await import("expo-secure-store");
          const lastSentTimeStr = await SecureStore.getItemAsync(
            "lastLocationSentTime"
          );
          const lastSentTime = lastSentTimeStr ? parseInt(lastSentTimeStr) : 0;
          const timeSinceLastSend = currentTime - lastSentTime;

          // Get last sent location from storage
          const lastSentLocationStr = await SecureStore.getItemAsync(
            "lastLocationSent"
          );
          const lastSentLocation = lastSentLocationStr
            ? JSON.parse(lastSentLocationStr)
            : null;

          // Check if we should send this location update
          const shouldSend =
            // First time sending
            lastSentTime === 0 ||
            // Force send every minute regardless of position
            timeSinceLastSend >= FORCE_SEND_INTERVAL ||
            // Send if position changed significantly (backup check)
            (lastSentLocation &&
              (Math.abs(location.coords.latitude - lastSentLocation.latitude) >
                0.0001 ||
                Math.abs(
                  location.coords.longitude - lastSentLocation.longitude
                ) > 0.0001));

          if (shouldSend) {
            await sendLocationToServer(location);

            // Update stored timing and location data
            await SecureStore.setItemAsync(
              "lastLocationSentTime",
              currentTime.toString()
            );
            await SecureStore.setItemAsync(
              "lastLocationSent",
              JSON.stringify({
                latitude: location.coords.latitude,
                longitude: location.coords.longitude,
              })
            );

            console.log(
              "Background location sent - Time since last:",
              timeSinceLastSend,
              "ms"
            );
          } else {
            console.log(
              "Background location update skipped - Time since last:",
              timeSinceLastSend,
              "ms (waiting for 30 seconds)"
            );
          }
        } catch (error) {
          console.error("Failed to send background location:", error);
          // Continue processing other locations even if one fails
        }
      }
    }
  }
);

const sendLocationToServer = async (location: Location.LocationObject) => {
  try {
    // Get the user ID from storage (since we're in background, we can't access React context)
    // We'll need to store the user ID when they log in
    const userJson = await import("expo-secure-store").then((store) =>
      store.getItemAsync("currentUser")
    );

    if (!userJson) {
      console.warn("No user found in storage, skipping location update");
      return;
    }

    const user = JSON.parse(userJson);
    const userId = user.id;

    const timestamp = new Date(location.timestamp).toISOString();
    const data = {
      agent_id: userId,
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
      timestamp,
    };

    // Use environment variable logic (hardcoded here since we can't access .env in background)
    const url = "https://crm.propertymetre.com/data";

    console.log("Sending background location:", {
      url,
      userId,
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
      timestamp,
      accuracy: location.coords.accuracy,
      speed: location.coords.speed,
    });

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `HTTP error! status: ${response.status}, message: ${errorText}`
      );
    }

    const responseText = await response.text();
    console.log("Background location sent successfully:", responseText);
  } catch (error) {
    console.error("Background location send error:", error);
    throw error;
  }
};
