import { useEffect, useState } from 'react';
import NetInfo from '@react-native-community/netinfo';

export const useNetworkStatus = () => {
  const [isOnline, setIsOnline] = useState<boolean>(true);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      const connected = Boolean(state.isConnected && state.isInternetReachable !== false);
      setIsOnline(connected);
    });

    NetInfo.fetch().then((state) => {
      const connected = Boolean(state.isConnected && state.isInternetReachable !== false);
      setIsOnline(connected);
    });

    return unsubscribe;
  }, []);

  return { isOnline };
};
