import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, AppStateStatus } from 'react-native';

interface DialerSession {
  id: string;
  leadId: string;
  phoneNumber: string;
  startedAt: number;
  endedAt?: number;
  durationSeconds?: number;
  transferredToDialer: boolean;
}

interface UseDialerTimeTrackingProps {
  leadId?: string;
  phoneNumber?: string;
  onSessionComplete?: (session: DialerSession) => void;
  onTransferToDialer?: (session: DialerSession) => void;
  onReturnFromDialer?: (session: DialerSession) => void;
}

export function useDialerTimeTracking({
  leadId,
  phoneNumber,
  onSessionComplete,
  onTransferToDialer,
  onReturnFromDialer,
}: UseDialerTimeTrackingProps = {}) {
  const [currentSession, setCurrentSession] = useState<DialerSession | null>(null);
  const [isInDialer, setIsInDialer] = useState(false);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  const sessionRef = useRef<DialerSession | null>(null);

  // Start a new dialer session
  const startDialerSession = (sessionLeadId: string, sessionPhoneNumber: string) => {
    const session: DialerSession = {
      id: `dialer-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      leadId: sessionLeadId,
      phoneNumber: sessionPhoneNumber,
      startedAt: Date.now(),
      transferredToDialer: false,
    };

    console.log('📱 Starting dialer session:', {
      sessionId: session.id,
      leadId: sessionLeadId,
      phoneNumber: sessionPhoneNumber,
      startTime: new Date(session.startedAt).toLocaleTimeString()
    });

    setCurrentSession(session);
    sessionRef.current = session;
    
    return session;
  };

  // End the current dialer session
  const endDialerSession = useCallback(() => {
    const session = sessionRef.current;
    if (!session) {
      console.log('⚠️ Attempted to end dialer session but no session active');
      return null;
    }

    const endedAt = Date.now();
    const durationSeconds = Math.max(0, Math.round((endedAt - session.startedAt) / 1000));

    // Add safeguard: warn if session is being ended too quickly
    if (durationSeconds < 5) {
      console.log(`⚠️ Warning: Dialer session ending very quickly (${durationSeconds}s). This might indicate premature ending.`);
      console.trace('Stack trace for premature session end:');
    }

    console.log('🔴 Ending dialer session:', {
      sessionId: session.id,
      durationSeconds,
      durationFormatted: `${Math.floor(durationSeconds / 60)}m ${durationSeconds % 60}s`,
      transferredToDialer: session.transferredToDialer,
      startTime: new Date(session.startedAt).toLocaleTimeString(),
      endTime: new Date(endedAt).toLocaleTimeString()
    });

    const completedSession: DialerSession = {
      ...session,
      endedAt,
      durationSeconds,
    };

    setCurrentSession(null);
    setIsInDialer(false);
    sessionRef.current = null;

    onSessionComplete?.(completedSession);
    return completedSession;
  }, [onSessionComplete]);

  // Get current session duration in real-time
  const getCurrentDuration = () => {
    if (!sessionRef.current) return 0;
    return Math.max(0, Math.round((Date.now() - sessionRef.current.startedAt) / 1000));
  };

  // AppState listener to detect dialer transfer
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      const previousState = appStateRef.current;
      appStateRef.current = nextState;

      const session = sessionRef.current;
      if (!session) return;

      // User transferred to dialer (app went to background/inactive)
      if (
        previousState === 'active' &&
        (nextState === 'background' || nextState === 'inactive') &&
        !session.transferredToDialer
      ) {
        console.log('🔄 User transferred to dialer - app state:', previousState, '→', nextState);
        const updatedSession = {
          ...session,
          transferredToDialer: true,
        };
        sessionRef.current = updatedSession;
        setCurrentSession(updatedSession);
        setIsInDialer(true);
        onTransferToDialer?.(updatedSession);
      }

      // User returned from dialer (app became active)
      if (
        (previousState === 'background' || previousState === 'inactive') &&
        nextState === 'active' &&
        session.transferredToDialer
      ) {
        console.log('⬅️ User returned from dialer - app state:', previousState, '→', nextState);
        console.log('Current session duration:', getCurrentDuration(), 'seconds');
        setIsInDialer(false);
        onReturnFromDialer?.(session);
        
        // Optionally end session automatically on return
        // endDialerSession();
      }
    });

    return () => subscription.remove();
  }, [onTransferToDialer, onReturnFromDialer]);

  // Clean up on unmount - only log, don't end active sessions
  useEffect(() => {
    return () => {
      if (sessionRef.current) {
        console.log('⚠️ Component unmounting with active dialer session:', sessionRef.current.id);
        // Don't automatically end the session on unmount
        // Let it be ended manually when the user workflow is complete
      }
    };
  }, []);

  return {
    currentSession,
    isInDialer,
    startDialerSession,
    endDialerSession,
    getCurrentDuration,
    // Helper properties
    isSessionActive: !!currentSession,
    sessionDuration: currentSession ? getCurrentDuration() : 0,
  };
}