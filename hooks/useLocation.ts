import * as Location from "expo-location";
import * as SecureStore from "expo-secure-store";
import * as TaskManager from "expo-task-manager";
import { useEffect, useRef, useState } from "react";
import { BACKGROUND_LOCATION_TASK } from "../tasks/backgroundLocationTask";

export default function useLocation(user) {
  const [location, setLocation] = useState(null);
  const [address, setAddress] = useState({
    city: null,
    street: null,
  });
  const [error, setError] = useState(null);
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [isTrackingLocation, setIsTrackingLocation] = useState(false);
  const previousLocationRef = useRef(null);
  const watchSubscriptionRef = useRef(null);

  const SENSITIVITY_THRESHOLD = 500; // meters
  const MAX_RETRIES = 3;
  const RETRY_DELAY = 2000; // 2 seconds

  // Check existing permissions and clean up location tracking when user logs out
  useEffect(() => {
    if (user) {
      // Check if we already have location permissions
      const checkExistingPermissions = async () => {
        try {
          const { status } = await Location.getForegroundPermissionsAsync();
          console.log(
            "Checking existing location permissions for user:",
            status
          );
          if (status === "granted" && !permissionGranted) {
            console.log(
              "Found existing location permission, starting background location updates"
            );
            setPermissionGranted(true);
            setError(null);

            // Store user info for background task
            await SecureStore.setItemAsync("currentUser", JSON.stringify(user));
            await startBackgroundLocationUpdates();
          }
        } catch (error) {
          console.warn("Failed to check existing permissions:", error);
        }
      };
      checkExistingPermissions();
    } else {
      // User logged out, clean up
      const cleanup = async () => {
        await stopLocationTracking();
        setPermissionGranted(false);
        setLocation(null);
        setAddress({ city: null, street: null });
        setError(null);
      };
      cleanup();
    }
  }, [user]);

  // Cleanup function
  useEffect(() => {
    return () => {
      if (watchSubscriptionRef.current) {
        watchSubscriptionRef.current.remove();
      }
    };
  }, []);

  const requestLocationPermission = async () => {
    try {
      console.log("Requesting foreground location permission...");
      let { status } = await Location.requestForegroundPermissionsAsync();
      console.log("Foreground permission status:", status);

      if (status !== "granted") {
        console.log("Location permission denied by user");
        setError("Location permission denied");
        setPermissionGranted(false);
        return false;
      }

      console.log("Requesting background location permission...");
      const backgroundStatus =
        await Location.requestBackgroundPermissionsAsync();
      console.log("Background permission status:", backgroundStatus.status);

      if (backgroundStatus.status !== "granted") {
        console.warn(
          "Background location access denied - will only track in foreground"
        );
      }

      console.log(
        "Location permissions granted, starting background location updates..."
      );
      setPermissionGranted(true);
      setError(null);

      // Store user info for background task access
      if (user) {
        await SecureStore.setItemAsync("currentUser", JSON.stringify(user));
      }

      await startBackgroundLocationUpdates();
      return true;
    } catch (err) {
      console.error("Permission request error:", err);
      setError(`Permission error: ${err.message}`);
      setPermissionGranted(false);
      return false;
    }
  };

  const stopLocationTracking = async () => {
    try {
      console.log("Stopping background location tracking...");

      // Stop background location updates
      const isRegistered = await TaskManager.isTaskRegisteredAsync(
        BACKGROUND_LOCATION_TASK
      );
      if (isRegistered) {
        await Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
        console.log("Background location task stopped");
      }

      // Stop foreground tracking if active
      if (watchSubscriptionRef.current) {
        watchSubscriptionRef.current.remove();
        watchSubscriptionRef.current = null;
      }

      // Clean up stored user data and timing info
      await SecureStore.deleteItemAsync("currentUser");
      await SecureStore.deleteItemAsync("lastLocationSentTime");
      await SecureStore.deleteItemAsync("lastLocationSent");

      setIsTrackingLocation(false);
      console.log("Location tracking stopped successfully");
    } catch (error) {
      console.error("Failed to stop location tracking:", error);
    }
  };

  const startBackgroundLocationUpdates = async () => {
    try {
      console.log("Starting background location tracking...");

      // Check if TaskManager is available
      const isAvailable = await TaskManager.isAvailableAsync();
      if (!isAvailable) {
        console.warn(
          "TaskManager not available, falling back to foreground tracking"
        );
        await startForegroundLocationUpdates();
        return;
      }

      // Check if background task is already running
      const isRegistered = await TaskManager.isTaskRegisteredAsync(
        BACKGROUND_LOCATION_TASK
      );
      if (isRegistered) {
        console.log("Background location task is already running, skipping restart");
        setIsTrackingLocation(true);
        return;
      }

      // Start background location updates
      await Location.startLocationUpdatesAsync(BACKGROUND_LOCATION_TASK, {
        accuracy: Location.Accuracy.Balanced,
        timeInterval: 30000, // 30 seconds - stable for background
        distanceInterval: 10, // 10 meters - reasonable distance threshold
        deferredUpdatesInterval: 30000, // Force updates every 30 seconds
        pausesLocationUpdatesAutomatically: false, // Don't pause when stationary
        foregroundService: {
          notificationTitle: "Location Tracking",
          notificationBody:
            "Miles is tracking your location for better service.",
        },
      });

      setIsTrackingLocation(true);
      console.log("Background location tracking started successfully");
    } catch (err) {
      console.error("Failed to start background location tracking:", err);
      console.log("Falling back to foreground tracking...");
      await startForegroundLocationUpdates();
    }
  };

  const startForegroundLocationUpdates = async () => {
    try {
      console.log("Starting foreground location tracking...");
      const subscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          distanceInterval: 10, // 10 meters - reasonable distance
          timeInterval: 30000, // 30 seconds - stable foreground tracking
        },
        handleLocationUpdate
      );
      watchSubscriptionRef.current = subscription;
      setIsTrackingLocation(true);
      console.log("Foreground location tracking started successfully");
    } catch (err) {
      console.error("Failed to start foreground location tracking:", err);
      setError(`Location update error: ${err.message}`);
      setIsTrackingLocation(false);
    }
  };

  const handleLocationUpdate = async (position) => {
    try {
      const { latitude, longitude } = position.coords;
      console.log("Location update received:", {
        latitude,
        longitude,
        timestamp: new Date().toISOString(),
      });

      setLocation({ latitude, longitude });

      const shouldUpdateAddress =
        !address.city ||
        !address.street ||
        (previousLocationRef.current &&
          getDistance(
            previousLocationRef.current.latitude,
            previousLocationRef.current.longitude,
            latitude,
            longitude
          ) > SENSITIVITY_THRESHOLD);

      if (shouldUpdateAddress) {
        console.log("Updating address for new location");
        const fetchedAddress = await retryOperation(
          () => reverseGeocode(latitude, longitude),
          MAX_RETRIES,
          RETRY_DELAY
        );
        setAddress(fetchedAddress);
      }

      previousLocationRef.current = { latitude, longitude };

      if (user && user.id) {
        const currentTime = Date.now();

        // Get last sent time from storage (persistent across background/foreground)
        const lastSentTimeStr = await SecureStore.getItemAsync(
          "lastLocationSentTime"
        );
        const lastSentTime = lastSentTimeStr ? parseInt(lastSentTimeStr) : 0;
        const timeSinceLastSend = currentTime - lastSentTime;
        const FORCE_SEND_INTERVAL = 30000; // 30 seconds - stable interval

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
            (Math.abs(latitude - lastSentLocation.latitude) > 0.0001 ||
              Math.abs(longitude - lastSentLocation.longitude) > 0.0001));

        if (shouldSend) {
          console.log(
            "Sending foreground location to server for user:",
            user.id,
            "- Time since last:",
            timeSinceLastSend,
            "ms"
          );
          await sendLocationToServer(user.id, latitude, longitude);

          // Update stored timing and location data
          await SecureStore.setItemAsync(
            "lastLocationSentTime",
            currentTime.toString()
          );
          await SecureStore.setItemAsync(
            "lastLocationSent",
            JSON.stringify({ latitude, longitude })
          );
        } else {
          console.log(
            "Foreground location update skipped - Time since last:",
            timeSinceLastSend,
            "ms (waiting for 30 seconds)"
          );
        }
      } else {
        console.warn("Cannot send location - user or user.id is missing:", {
          user,
        });
      }
    } catch (err) {
      console.error("Location update error:", err);
      setError(`Location update failed: ${err.message}`);
    }
  };

  const retryOperation = async (operation, maxRetries, delay) => {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (err) {
        if (attempt === maxRetries) throw err;
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  };

  const reverseGeocode = async (latitude, longitude) => {
    try {
      // Using Expo's Location.reverseGeocodeAsync instead of Nominatim
      const results = await Location.reverseGeocodeAsync({
        latitude,
        longitude,
      });

      if (results && results.length > 0) {
        const addressData = results[0];
        return {
          city:
            addressData.city ||
            addressData.subregion ||
            addressData.region ||
            "Unknown City",
          street: addressData.street || addressData.name || "Unknown Street",
          district: addressData.district || addressData.region || null,
          postalCode: addressData.postalCode || null,
          country: addressData.country || null,
        };
      }

      throw new Error("No address data found");
    } catch (err) {
      console.error(err);
      return {
        city: "Error fetching city",
        street: "Error fetching street",
        error: err.message,
      };
    }
  };

  const sendLocationToServer = async (userId, latitude, longitude) => {
    const timestamp = new Date().toISOString();
    const data = { agent_id: userId, latitude, longitude, timestamp };

    // Use specific location service URL if available, otherwise use main API with /data endpoint
    console.log("Environment variables:", {
      EXPO_PUBLIC_LOCATION_SERVICE_URL:
        process.env.EXPO_PUBLIC_LOCATION_SERVICE_URL,
      EXPO_PUBLIC_BASE_URL: process.env.EXPO_PUBLIC_BASE_URL,
    });

    let url;
    if (process.env.EXPO_PUBLIC_LOCATION_SERVICE_URL) {
      const locationServiceUrl =
        process.env.EXPO_PUBLIC_LOCATION_SERVICE_URL.replace(/\/$/, "");
      url = `${locationServiceUrl}/data`;
      console.log("Using location service URL:", url);
    } else {
      // Use main API with /data endpoint (nginx proxies to agent-location service)
      const baseUrl =
        process.env.EXPO_PUBLIC_BASE_URL?.replace(/\/$/, "") || "";
      url = `${baseUrl}/data`;
      console.log("Using main API with /data endpoint:", url);
    }

    try {
      console.log("Sending location data:", { url, data });

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(data),
      });

      console.log("Location API response status:", response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Location API error response:", errorText);
        throw new Error(
          `HTTP error! status: ${response.status}, message: ${errorText}`
        );
      }

      const contentType = response.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        const result = await response.json();
        console.log("Location sent successfully:", result);
      } else {
        const text = await response.text();
        console.log("Location sent successfully (text response):", text);
      }
    } catch (error) {
      console.error("Failed to send location to server:", {
        error: error.message,
        url,
        data,
        userId,
        latitude,
        longitude,
      });
      throw error;
    }
  };

  return {
    location,
    address,
    error,
    permissionGranted,
    isTrackingLocation,
    // Function to request location permission and start tracking
    requestLocationPermission,
    // Function to stop location tracking
    stopLocationTracking,
    // Add a manual refresh function if needed
    refreshLocation: () =>
      permissionGranted && startBackgroundLocationUpdates(),
  };
}

export const getDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371e3; // Earth's radius in meters
  const toRadians = (deg) => (deg * Math.PI) / 180;
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) ** 2;

  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};
