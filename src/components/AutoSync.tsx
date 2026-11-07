import { useEffect } from 'react';
import NetInfo from '@react-native-community/netinfo';
import { useAuth } from '@/contexts/AuthContext';
import { syncPendingLocations } from '@/lib/sync';
import { useTrackingStore } from '@/store/tracking';

export function AutoSync() {
  const { session } = useAuth();
  const refresh = useTrackingStore((state) => state.refresh);

  useEffect(() => {
    let reachable = false;
    let disposed = false;
    let syncing = false;
    let attempts = 0;
    let retryTimeout: ReturnType<typeof setTimeout> | undefined;

    const scheduleRetry = () => {
      if (disposed || !reachable || !session?.user.id) return;
      const delay = Math.min(5_000 * 2 ** attempts, 5 * 60_000);
      attempts += 1;
      retryTimeout = setTimeout(() => {
        void synchronize();
      }, delay);
    };

    const synchronize = async () => {
      if (disposed || syncing || !reachable || !session?.user.id) return;
      syncing = true;
      try {
        await syncPendingLocations(session.user.id);
        attempts = 0;
        if (!disposed) await refresh();
      } catch (syncError) {
        console.error('Automatic location sync failed:', syncError);
        if (!disposed) {
          await refresh().catch((refreshError: unknown) => {
            console.error(
              'Could not refresh after a sync failure:',
              refreshError,
            );
          });
        }
        if (retryTimeout) clearTimeout(retryTimeout);
        scheduleRetry();
      } finally {
        syncing = false;
      }
    };

    const unsubscribe = NetInfo.addEventListener((state) => {
      reachable =
        state.isConnected === true && state.isInternetReachable !== false;
      if (reachable) {
        if (retryTimeout) clearTimeout(retryTimeout);
        retryTimeout = undefined;
        attempts = 0;
        void synchronize();
      } else if (retryTimeout) {
        clearTimeout(retryTimeout);
        retryTimeout = undefined;
      }
    });

    return () => {
      disposed = true;
      unsubscribe();
      if (retryTimeout) clearTimeout(retryTimeout);
    };
  }, [refresh, session?.user.id]);

  return null;
}
