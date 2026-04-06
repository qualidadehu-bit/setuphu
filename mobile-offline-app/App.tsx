import { useEffect, useState } from 'react';
import { ActivityIndicator, SafeAreaView, StyleSheet, View } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { StatusBar } from 'expo-status-bar';

import { ChecklistFormScreen } from './src/screens/ChecklistFormScreen';
import { LoginScreen } from './src/screens/LoginScreen';
import { authTokenKey, validateToken } from './src/services/authService';

export default function App() {
  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    const recoverSession = async () => {
      try {
        const savedToken = await SecureStore.getItemAsync(authTokenKey);
        if (!savedToken) {
          setToken(null);
          return;
        }

        await validateToken(savedToken);
        setToken(savedToken);
      } catch {
        await SecureStore.deleteItemAsync(authTokenKey);
        setToken(null);
      } finally {
        setIsBootstrapping(false);
      }
    };

    recoverSession();
  }, []);

  const handleAuthenticated = (nextToken: string) => {
    setToken(nextToken);
  };

  const handleLogout = async () => {
    await SecureStore.deleteItemAsync(authTokenKey);
    setToken(null);
  };

  if (isBootstrapping) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loader}>
          <ActivityIndicator size="large" color="#0f766e" />
        </View>
        <StatusBar style="dark" />
      </SafeAreaView>
    );
  }

  return (
    <>
      {token ? <ChecklistFormScreen onLogout={handleLogout} /> : <LoginScreen onAuthenticated={handleAuthenticated} />}
      <StatusBar style="dark" />
    </>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  loader: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
