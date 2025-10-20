import LoginPage from "@/components/LoginPage";
import useLocation from "@/hooks/useLocation";
import useOneSignal from "@/hooks/useOneSignal";
// Import background location task to ensure it's registered
import * as Location from "expo-location";
import { Stack } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { StatusBar } from "expo-status-bar";
import * as TaskManager from "expo-task-manager";
import { jwtDecode } from "jwt-decode";
import React, { createContext, useEffect, useState } from "react";
import { AppState } from "react-native";
import { RootSiblingParent } from "react-native-root-siblings";
import "../global.css";
import "../tasks/backgroundLocationTask";
import { BACKGROUND_LOCATION_TASK } from "../tasks/backgroundLocationTask";

export const UserContext = createContext<any | null>(null);
export const LogoutContext = createContext<(() => Promise<void>) | null>(null);

export default function RootLayout() {
  const [loaded, setLoaded] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<any | null>(null);
  const [authCheckInProgress, setAuthCheckInProgress] = useState(false);

  // Initialize OneSignal when user is available
  useOneSignal(user);

  // Get location hook functions
  const { permissionGranted, requestLocationPermission } = useLocation(user);

  // Function to validate stored token and handle logout
  const validateStoredToken = async () => {
    if (authCheckInProgress) return;

    setAuthCheckInProgress(true);
    try {
      const storedToken = await SecureStore.getItemAsync("userToken");

      if (storedToken) {
        try {
          const decodedToken = jwtDecode(storedToken);
          const currentTime = Math.floor(Date.now() / 1000);

          // Check if token is expired
          if (decodedToken.exp && currentTime > decodedToken.exp) {
            await handleLogout();
          } else {
            // Token is still valid, update state
            setToken(storedToken);
            setUser(decodedToken);
          }
        } catch (tokenError) {
          console.error("Token decode error in _layout:", tokenError);
          await handleLogout();
        }
      }
    } catch (error) {
      console.error(error);
    } finally {
      setAuthCheckInProgress(false);
    }
  };

  // Function to handle complete logout
  const handleLogout = async () => {
    try {
      // Stop background location tracking
      const isRegistered = await TaskManager.isTaskRegisteredAsync(
        BACKGROUND_LOCATION_TASK
      );
      if (isRegistered) {
        await Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
        console.log("Background location task stopped on logout");
      }

      await SecureStore.deleteItemAsync("userToken");
      await SecureStore.deleteItemAsync("refreshToken");
      await SecureStore.deleteItemAsync("user_permissions");
      await SecureStore.deleteItemAsync("currentUser"); // Clean up stored user for background tasks
      await SecureStore.deleteItemAsync("lastLocationSentTime"); // Clean up location timing
      await SecureStore.deleteItemAsync("lastLocationSent"); // Clean up last location
      setToken(null);
      setUser(null);
    } catch (error) {
      console.error("Logout cleanup error:", error);
      // Even if cleanup fails, reset the state
      setToken(null);
      setUser(null);
    }
  };

  useEffect(() => {
    const initializeApp = async () => {
      await validateStoredToken();
      setLoaded(true);
    };
    initializeApp();
  }, []);

  // Check and request location permission after successful login
  useEffect(() => {
    if (user && !permissionGranted) {
      // Small delay to let the main app render first, then check/request permissions
      const timer = setTimeout(async () => {
        try {
          // First check if we already have permissions
          const { status: existingStatus } =
            await Location.getForegroundPermissionsAsync();
          console.log("Existing foreground permission status:", existingStatus);

          if (existingStatus === "granted") {
            console.log(
              "Location permission already granted, will start tracking via hook"
            );
            // The hook will handle starting location updates when permission is detected
          } else {
            console.log(
              "Location permission not granted, requesting permission..."
            );
            await requestLocationPermission();
          }
        } catch (error) {
          console.warn("Failed to check/request location permission:", error);
        }
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [user, permissionGranted, requestLocationPermission]);

  // Listen for app state changes to validate token when app becomes active
  useEffect(() => {
    const handleAppStateChange = (nextAppState: string) => {
      if (nextAppState === "active" && token) {
        // Validate token when app becomes active
        validateStoredToken();
      }
    };

    const subscription = AppState.addEventListener(
      "change",
      handleAppStateChange
    );
    return () => subscription?.remove();
  }, [token]);

  // Listen for storage changes (in case of logout from other parts of the app)
  useEffect(() => {
    const checkTokenPeriodically = setInterval(async () => {
      if (token) {
        const storedToken = await SecureStore.getItemAsync("userToken");
        if (!storedToken) {
          // Token was cleared externally, update state
          setToken(null);
          setUser(null);
        }
      }
    }, 30000); // Check every 30 seconds

    return () => clearInterval(checkTokenPeriodically);
  }, [token]);

  const handleLoginSuccess = async (newToken: string) => {
    try {
      // Decode token first to validate it
      const decodedToken = jwtDecode(newToken) as { id: string; exp?: number };

      // Store token
      await SecureStore.setItemAsync("userToken", newToken);

      // Update app state
      setToken(newToken);
      setUser(decodedToken);
    } catch (error) {
      console.error("Login success handler error:", error);
      throw error; // Re-throw so the login component can handle it
    }
  };

  if (!token && loaded) {
    return <LoginPage onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <RootSiblingParent>
      <StatusBar style="dark" backgroundColor="#ffffff" />
      <UserContext.Provider value={user}>
        <LogoutContext.Provider value={handleLogout}>
          <Stack>
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen
              name="lead-details/[id]"
              options={{
                headerShown: true,
                headerTitle: "",
                headerBackTitle: "Back",
                headerStyle: {
                  backgroundColor: "#ffffff",
                },
                headerTintColor: "#374151",
                headerShadowVisible: true,
              }}
            />
          </Stack>
        </LogoutContext.Provider>
      </UserContext.Provider>
    </RootSiblingParent>
  );
}
