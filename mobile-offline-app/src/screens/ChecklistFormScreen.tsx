import { useMemo, useState } from 'react';
import {
  Alert,
  Button,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';

import { OnlineStatusHeader } from '../components/OnlineStatusHeader';
import { useNetworkStatus } from '../hooks/useNetworkStatus';
import { useSyncQueue } from '../hooks/useSyncQueue';

interface ChecklistFormScreenProps {
  onLogout?: () => void;
}

export const ChecklistFormScreen = ({ onLogout }: ChecklistFormScreenProps) => {
  const [name, setName] = useState('');
  const [observation, setObservation] = useState('');
  const [checklistOk, setChecklistOk] = useState(false);

  const { isOnline } = useNetworkStatus();
  const { pendingCount, isSyncing, lastError, saveFormOfflineFirst, syncNow } = useSyncQueue({
    isOnline,
  });

  const canSave = useMemo(() => name.trim().length > 0, [name]);

  const resetForm = () => {
    setName('');
    setObservation('');
    setChecklistOk(false);
  };

  const handleSave = async () => {
    if (!canSave) {
      Alert.alert('Validacao', 'Informe ao menos o nome do formulario.');
      return;
    }

    try {
      await saveFormOfflineFirst({
        name: name.trim(),
        observation: observation.trim(),
        checklistOk,
      });

      resetForm();
      Alert.alert(
        'Sucesso',
        isOnline
          ? 'Formulario salvo e sincronizacao disparada.'
          : 'Formulario salvo offline e adicionado a fila.',
      );
    } catch (error) {
      Alert.alert('Erro', error instanceof Error ? error.message : String(error));
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Checklist de Qualidade</Text>
        <Text style={styles.subtitle}>Coleta offline-first com sincronizacao automatica</Text>
        {onLogout ? (
          <View style={styles.logoutButton}>
            <Button title="Sair" color="#475569" onPress={onLogout} />
          </View>
        ) : null}

        <OnlineStatusHeader isOnline={isOnline} pendingCount={pendingCount} isSyncing={isSyncing} />

        <View style={styles.card}>
          <Text style={styles.label}>Nome do formulario</Text>
          <TextInput
            style={styles.input}
            placeholder="Ex: Inspecao turno manha"
            value={name}
            onChangeText={setName}
          />

          <Text style={styles.label}>Observacao</Text>
          <TextInput
            style={[styles.input, styles.multiline]}
            placeholder="Descreva pontos relevantes"
            value={observation}
            onChangeText={setObservation}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />

          <View style={styles.switchRow}>
            <Text style={styles.label}>Checklist aprovado?</Text>
            <Switch value={checklistOk} onValueChange={setChecklistOk} />
          </View>

          <View style={styles.buttonWrapper}>
            <Button title="Salvar formulario" onPress={handleSave} disabled={!canSave || isSyncing} />
          </View>

          <View style={styles.buttonWrapper}>
            <Button title="Sincronizar agora" onPress={syncNow} disabled={!isOnline || isSyncing} />
          </View>
        </View>

        {lastError ? <Text style={styles.errorText}>Ultima falha: {lastError}</Text> : null}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  container: {
    padding: 20,
    paddingBottom: 40,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#0f172a',
  },
  subtitle: {
    marginTop: 4,
    color: '#475569',
  },
  logoutButton: {
    marginTop: 10,
    alignSelf: 'flex-start',
  },
  card: {
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 14,
    padding: 14,
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
  multiline: {
    minHeight: 100,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  buttonWrapper: {
    marginTop: 8,
  },
  errorText: {
    marginTop: 14,
    color: '#b91c1c',
    fontWeight: '600',
  },
});
