import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { SafeAreaView } from 'react-native-safe-area-context';

import { authTokenKey, loginWithEmail } from '../services/authService';
import { theme } from '../theme';

interface LoginScreenProps {
  onAuthenticated: (token: string) => void;
}

const MIN_TOUCH = theme.touchMin;

export const LoginScreen = ({ onAuthenticated }: LoginScreenProps) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const canSubmit = useMemo(
    () => email.trim().length > 0 && password.trim().length > 0 && !submitting,
    [email, password, submitting],
  );

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
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.stack}>
            <Text style={styles.title}>Entrar</Text>
            <Text style={styles.subtitle}>Acesse com seu e-mail e senha para continuar.</Text>

            <View style={styles.form}>
              <Text style={styles.label}>E-mail</Text>
              <TextInput
                style={styles.input}
                placeholder="seu.email@hospital.com"
                placeholderTextColor={theme.colors.textMuted}
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
                placeholderTextColor={theme.colors.textMuted}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={true}
              />

              <Pressable
                style={({ pressed }) => [
                  styles.button,
                  !canSubmit && styles.buttonDisabled,
                  pressed && canSubmit && styles.buttonPressed,
                ]}
                onPress={handleLogin}
                disabled={!canSubmit}
              >
                {submitting ? (
                  <ActivityIndicator color={theme.colors.surface} />
                ) : (
                  <Text style={styles.buttonText}>Entrar</Text>
                )}
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.bgElevated,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: theme.space.lg,
    paddingVertical: theme.space.lg,
  },
  stack: {
    flexDirection: 'column',
    width: '100%',
  },
  title: {
    fontSize: theme.fontSize.headline,
    fontWeight: '700',
    color: theme.colors.text,
    letterSpacing: -0.3,
  },
  subtitle: {
    marginTop: theme.space.xs,
    marginBottom: theme.space.md,
    color: theme.colors.textSecondary,
    fontSize: theme.fontSize.body,
    lineHeight: 24,
  },
  form: {
    flexDirection: 'column',
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radii.md,
    padding: theme.space.md,
    gap: theme.space.sm,
    backgroundColor: theme.colors.surface,
  },
  label: {
    color: theme.colors.text,
    fontWeight: '600',
    fontSize: theme.fontSize.bodySmall,
  },
  input: {
    borderWidth: 1,
    borderColor: theme.colors.borderStrong,
    borderRadius: theme.radii.sm,
    paddingHorizontal: theme.space.sm + 4,
    minHeight: MIN_TOUCH,
    fontSize: theme.fontSize.body,
    color: theme.colors.text,
    backgroundColor: theme.colors.bgElevated,
  },
  button: {
    marginTop: theme.space.xs,
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radii.sm,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: MIN_TOUCH,
  },
  buttonPressed: {
    backgroundColor: theme.colors.primaryPressed,
  },
  buttonDisabled: {
    opacity: 0.45,
  },
  buttonText: {
    color: theme.colors.surface,
    fontWeight: '700',
    fontSize: theme.fontSize.body,
  },
});
