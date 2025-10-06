import LoginPage from "@/components/LoginPage";
import useOneSignal from "@/hooks/useOneSignal";
import { Stack } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { StatusBar } from "expo-status-bar";
import { jwtDecode } from "jwt-decode";
import React, { createContext, useEffect, useState } from "react";
import { AppState } from "react-native";
import { RootSiblingParent } from "react-native-root-siblings";
import "../global.css";

export const UserContext = createContext<any | null>(null);
export const LogoutContext = createContext<(() => Promise<void>) | null>(null);

export default function RootLayout() {
  const [loaded, setLoaded] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<any | null>(null);
  const [authCheckInProgress, setAuthCheckInProgress] = useState(false);

  // Initialize OneSignal when user is available
  useOneSignal(user);

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
      await SecureStore.deleteItemAsync("userToken");
      await SecureStore.deleteItemAsync("refreshToken");
      await SecureStore.deleteItemAsync("user_permissions");
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
