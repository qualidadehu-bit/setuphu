import { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, SafeAreaView, StyleSheet, Text, TextInput, View } from 'react-native';
import * as SecureStore from 'expo-secure-store';

import { authTokenKey, loginWithEmail } from '../services/authService';

interface LoginScreenProps {
  onAuthenticated: (token: string) => void;
}

export const LoginScreen = ({ onAuthenticated }: LoginScreenProps) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const canSubmit = useMemo(() => email.trim().length > 0 && password.trim().length > 0 && !submitting, [email, password, submitting]);

  const handleLogin = async () => {
    if (!canSubmit) {
      Alert.alert('Login', 'Informe e-mail e senha.');
      return;
    }

    setSubmitting(true);
    try {
      const token = await loginWithEmail({
        email: email.trim().toLowerCase(),
        password,
      });

      await SecureStore.setItemAsync(authTokenKey, token);
      onAuthenticated(token);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Nao foi possivel autenticar.';
      Alert.alert('Falha no login', message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.wrapper}>
        <Text style={styles.title}>Entrar</Text>
        <Text style={styles.subtitle}>Acesse com seu e-mail e senha para continuar.</Text>

        <View style={styles.form}>
          <Text style={styles.label}>E-mail</Text>
          <TextInput
            style={styles.input}
            placeholder="seu.email@hospital.com"
            autoCapitalize="none"
            keyboardType="email-address"
            autoCorrect={false}
            value={email}
            onChangeText={setEmail}
          />

          <Text style={styles.label}>Senha</Text>
          <TextInput
            style={styles.input}
            placeholder="Digite sua senha"
            value={password}
            onChangeText={setPassword}
            secureTextEntry={true}
          />

          <Pressable
            style={({ pressed }) => [styles.button, (!canSubmit || pressed) && styles.buttonPressed]}
            onPress={handleLogin}
            disabled={!canSubmit}
          >
            {submitting ? <ActivityIndicator color="#ffffff" /> : <Text style={styles.buttonText}>Entrar</Text>}
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  wrapper: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#0f172a',
  },
  subtitle: {
    marginTop: 6,
    color: '#475569',
    marginBottom: 20,
  },
  form: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 14,
    padding: 16,
    gap: 10,
  },
  label: {
    color: '#0f172a',
    fontWeight: '600',
  },
  input: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#ffffff',
  },
  button: {
    marginTop: 8,
    backgroundColor: '#0f766e',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  buttonPressed: {
    opacity: 0.75,
  },
  buttonText: {
    color: '#ffffff',
    fontWeight: '700',
  },
});
