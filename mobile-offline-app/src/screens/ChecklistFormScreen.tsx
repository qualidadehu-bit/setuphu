import { useMemo, useState } from 'react';
import {
  Alert,
  Button,
  Modal,
  Pressable,
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

type BedAction = 'alta-medica';
type BedSignal = 'PR' | 'MR' | 'CR' | 'DR' | 'CP' | 'SS';

const BED_CARDS = [
  { id: 'A1', status: 'Pronto para alta' },
  { id: 'B2', status: 'Aguardando transporte' },
  { id: 'C3', status: 'Em observação' },
];

export const ChecklistFormScreen = ({ onLogout }: ChecklistFormScreenProps) => {
  const [name, setName] = useState('');
  const [observation, setObservation] = useState('');
  const [checklistOk, setChecklistOk] = useState(false);
  const [openMenuBedId, setOpenMenuBedId] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<{ bedId: string; action: BedAction } | null>(null);
  const [signalModalBedId, setSignalModalBedId] = useState<string | null>(null);
  const [selectedSignalsByBed, setSelectedSignalsByBed] = useState<Record<string, BedSignal[]>>({});
  const [draftSignals, setDraftSignals] = useState<BedSignal[]>([]);

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
      Alert.alert('Validação', 'Informe ao menos o nome do formulário.');
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
          ? 'Formulário salvo e sincronização disparada.'
          : 'Formulário salvo offline e adicionado à fila.',
      );
    } catch (error) {
      Alert.alert('Erro', error instanceof Error ? error.message : String(error));
    }
  };

  const openActionConfirmation = (bedId: string, action: BedAction) => {
    setOpenMenuBedId(null);
    setPendingAction({ bedId, action });
  };

  const closeConfirmation = () => {
    setPendingAction(null);
  };

  const handleConfirmAction = () => {
    if (!pendingAction) {
      return;
    }

    console.log('[bed-action]', {
      bedId: pendingAction.bedId,
      action: pendingAction.action,
    });

    setPendingAction(null);
  };

  const openSignalModal = (bedId: string) => {
    setOpenMenuBedId(null);
    setSignalModalBedId(bedId);
    setDraftSignals(selectedSignalsByBed[bedId] ?? []);
  };

  const closeSignalModal = () => {
    setSignalModalBedId(null);
    setDraftSignals([]);
  };

  const toggleDraftSignal = (signal: BedSignal) => {
    setDraftSignals((current) =>
      current.includes(signal) ? current.filter((item) => item !== signal) : [...current, signal],
    );
  };

  const saveSignals = () => {
    if (!signalModalBedId) {
      return;
    }
    setSelectedSignalsByBed((current) => ({
      ...current,
      [signalModalBedId]: draftSignals,
    }));
    setSignalModalBedId(null);
    setDraftSignals([]);
  };

  const confirmationMessage = useMemo(() => {
    if (!pendingAction) {
      return '';
    }

    if (pendingAction.action === 'alta-medica') {
      return `Confirmar alta médica para o Leito ${pendingAction.bedId}?`;
    }

    return '';
  }, [pendingAction]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Checklist de Qualidade</Text>
        <Text style={styles.subtitle}>Coleta offline-first com sincronização automática</Text>
        {onLogout ? (
          <View style={styles.logoutButton}>
            <Button title="Sair" color="#475569" onPress={onLogout} />
          </View>
        ) : null}

        <OnlineStatusHeader isOnline={isOnline} pendingCount={pendingCount} isSyncing={isSyncing} />

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Gestão de Leitos</Text>
          <Text style={styles.sectionSubtitle}>Ações rápidas com confirmação para evitar toques acidentais</Text>
          {BED_CARDS.map((bed) => (
            <View key={bed.id} style={styles.bedCard}>
              <View style={styles.bedHeader}>
                <View>
                  <Text style={styles.bedTitle}>Leito {bed.id}</Text>
                  <Text style={styles.bedStatus}>{bed.status}</Text>
                </View>

                <View style={styles.kebabWrapper}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Abrir menu de ações do Leito ${bed.id}`}
                    accessibilityHint="Toque para visualizar ações rápidas do leito"
                    hitSlop={10}
                    style={styles.kebabButton}
                    onPress={() =>
                      setOpenMenuBedId((currentBedId) => (currentBedId === bed.id ? null : bed.id))
                    }
                  >
                    <Text style={styles.kebabText}>⋯</Text>
                  </Pressable>

                  {openMenuBedId === bed.id ? (
                    <Pressable style={styles.menuOverlay} onPress={() => setOpenMenuBedId(null)}>
                      <View style={styles.menuPanel}>
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel={`Sinalizações do Leito ${bed.id}`}
                          accessibilityHint="Abre o painel para marcar complexidade e riscos do paciente"
                          style={styles.menuItem}
                          onPress={() => openSignalModal(bed.id)}
                        >
                          <Text style={styles.menuItemText}>🏷️ Sinalizações</Text>
                        </Pressable>
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel={`Alta médica para o Leito ${bed.id}`}
                          style={styles.menuItem}
                          onPress={() => openActionConfirmation(bed.id, 'alta-medica')}
                        >
                          <Text style={styles.menuItemText}>🩺 Alta Médica</Text>
                        </Pressable>
                      </View>
                    </Pressable>
                  ) : null}
                </View>
              </View>
              <View style={styles.signalTagsRow}>
                {(selectedSignalsByBed[bed.id] ?? []).map((signal) => (
                  <View key={`${bed.id}-${signal}`} style={[styles.signalTag, getSignalTagStyle(signal)]}>
                    <Text style={[styles.signalTagText, getSignalTextStyle(signal)]}>{signal}</Text>
                  </View>
                ))}
              </View>
            </View>
          ))}
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>Nome do formulário</Text>
          <TextInput
            style={styles.input}
            placeholder="Ex: Inspeção turno manhã"
            value={name}
            onChangeText={setName}
          />

          <Text style={styles.label}>Observação</Text>
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
            <Button title="Salvar formulário" onPress={handleSave} disabled={!canSave || isSyncing} />
          </View>

          <View style={styles.buttonWrapper}>
            <Button title="Sincronizar agora" onPress={syncNow} disabled={!isOnline || isSyncing} />
          </View>
        </View>

        {lastError ? <Text style={styles.errorText}>Última falha: {lastError}</Text> : null}
      </ScrollView>

      <Modal
        transparent
        animationType="fade"
        visible={Boolean(pendingAction)}
        onRequestClose={closeConfirmation}
      >
        <Pressable style={styles.modalOverlay} onPress={closeConfirmation}>
          <Pressable style={styles.modalContent} onPress={(event) => event.stopPropagation()}>
            <Text style={styles.modalTitle}>Confirmação de Ação</Text>
            <Text style={styles.modalText}>{confirmationMessage}</Text>

            <View style={styles.modalButtons}>
              <Pressable style={styles.cancelButton} onPress={closeConfirmation}>
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </Pressable>
              <Pressable style={styles.confirmButton} onPress={handleConfirmAction}>
                <Text style={styles.confirmButtonText}>Confirmar</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        transparent
        animationType="fade"
        visible={Boolean(signalModalBedId)}
        onRequestClose={closeSignalModal}
      >
        <Pressable style={styles.modalOverlay} onPress={closeSignalModal}>
          <Pressable style={styles.modalContent} onPress={(event) => event.stopPropagation()}>
            <Text style={styles.modalTitle}>Sinalizações do Leito {signalModalBedId}</Text>
            <Text style={styles.modalText}>Selecione uma ou mais categorias de risco/perfil:</Text>

            <Text style={styles.signalGroupTitle}>Complexidade</Text>
            <View style={styles.signalChipsWrap}>
              {(['PR', 'MR', 'CR'] as BedSignal[]).map((signal) => {
                const selected = draftSignals.includes(signal);
                return (
                  <Pressable
                    key={signal}
                    accessibilityRole="button"
                    accessibilityLabel={`Alternar sinalização ${signal}`}
                    style={[styles.signalChip, selected ? styles.signalChipSelected : styles.signalChipDefault]}
                    onPress={() => toggleDraftSignal(signal)}
                  >
                    <Text
                      style={[
                        styles.signalChipText,
                        selected ? styles.signalChipTextSelected : styles.signalChipTextDefault,
                      ]}
                    >
                      {signal}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <Text style={styles.signalGroupTitle}>Riscos</Text>
            <View style={styles.signalChipsWrap}>
              {(['DR', 'CP', 'SS'] as BedSignal[]).map((signal) => {
                const selected = draftSignals.includes(signal);
                return (
                  <Pressable
                    key={signal}
                    accessibilityRole="button"
                    accessibilityLabel={`Alternar sinalização ${signal}`}
                    style={[styles.signalChip, selected ? styles.signalChipSelected : styles.signalChipDefault]}
                    onPress={() => toggleDraftSignal(signal)}
                  >
                    <Text
                      style={[
                        styles.signalChipText,
                        selected ? styles.signalChipTextSelected : styles.signalChipTextDefault,
                      ]}
                    >
                      {signal}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <View style={styles.modalButtons}>
              <Pressable style={styles.cancelButton} onPress={closeSignalModal}>
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </Pressable>
              <Pressable style={styles.confirmButton} onPress={saveSignals}>
                <Text style={styles.confirmButtonText}>Confirmar</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
};

const getSignalTagStyle = (signal: BedSignal) => {
  if (signal === 'CR') {
    return { borderColor: '#fca5a5', backgroundColor: '#fef2f2' };
  }
  if (signal === 'SS') {
    return { borderColor: '#fcd34d', backgroundColor: '#fffbeb' };
  }
  return { borderColor: '#a7f3d0', backgroundColor: '#ecfdf5' };
};

const getSignalTextStyle = (signal: BedSignal) => {
  if (signal === 'CR') {
    return { color: '#b91c1c' };
  }
  if (signal === 'SS') {
    return { color: '#b45309' };
  }
  return { color: '#065f46' };
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
  sectionCard: {
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#d7dfd9',
    borderRadius: 14,
    padding: 14,
    backgroundColor: '#f8faf7',
    gap: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1f2937',
  },
  sectionSubtitle: {
    color: '#4b5563',
    marginBottom: 2,
  },
  bedCard: {
    borderWidth: 1,
    borderColor: '#e4e4e7',
    borderRadius: 12,
    padding: 12,
    backgroundColor: '#fffdf8',
  },
  bedHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  bedTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  bedStatus: {
    marginTop: 3,
    color: '#4b5563',
  },
  signalTagsRow: {
    marginTop: 8,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  signalTag: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  signalTagText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  kebabWrapper: {
    position: 'relative',
  },
  kebabButton: {
    minWidth: 36,
    minHeight: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
    backgroundColor: '#f3f4f6',
  },
  kebabText: {
    fontSize: 24,
    lineHeight: 24,
    marginTop: -4,
    color: '#374151',
  },
  menuOverlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    left: -190,
    bottom: -90,
    zIndex: 20,
  },
  menuPanel: {
    position: 'absolute',
    top: 40,
    right: 0,
    width: 190,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 12,
    backgroundColor: '#fffbf2',
    shadowColor: '#111827',
    shadowOpacity: 0.18,
    shadowRadius: 8,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    elevation: 6,
  },
  menuItem: {
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  menuItemText: {
    color: '#1f2937',
    fontWeight: '600',
  },
  signalGroupTitle: {
    marginTop: 14,
    marginBottom: 8,
    color: '#374151',
    fontWeight: '700',
    fontSize: 13,
  },
  signalChipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  signalChip: {
    borderWidth: 1,
    borderRadius: 999,
    minWidth: 50,
    minHeight: 34,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  signalChipDefault: {
    borderColor: '#d1d5db',
    backgroundColor: '#fffdfb',
  },
  signalChipSelected: {
    borderColor: '#0f766e',
    backgroundColor: '#0f766e',
  },
  signalChipText: {
    fontWeight: '700',
    fontSize: 12,
  },
  signalChipTextDefault: {
    color: '#374151',
  },
  signalChipTextSelected: {
    color: '#ffffff',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 22,
  },
  modalContent: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 16,
    backgroundColor: '#fffdf8',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    padding: 18,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  modalText: {
    marginTop: 8,
    color: '#374151',
    lineHeight: 20,
  },
  modalButtons: {
    marginTop: 18,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
  },
  cancelButton: {
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    backgroundColor: '#e5e7eb',
  },
  cancelButtonText: {
    color: '#374151',
    fontWeight: '600',
  },
  confirmButton: {
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    backgroundColor: '#0f766e',
  },
  confirmButtonText: {
    color: '#ffffff',
    fontWeight: '700',
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
