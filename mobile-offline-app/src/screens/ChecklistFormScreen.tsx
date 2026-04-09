import { useMemo, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { OnlineStatusHeader } from '../components/OnlineStatusHeader';
import { useNetworkStatus } from '../hooks/useNetworkStatus';
import { useSyncQueue } from '../hooks/useSyncQueue';
import { theme } from '../theme';

interface ChecklistFormScreenProps {
  onLogout?: () => void;
}

type BedAction = 'alta-medica';
type BedSignal = 'PR' | 'MR' | 'CR' | 'DR' | 'UCP' | 'SS';
type RawBedSignal = BedSignal | 'CP';

const BED_CARDS = [
  { id: 'A1', status: 'Pronto para alta', signals: ['PR', 'DR'] as RawBedSignal[] },
  { id: 'B2', status: 'Aguardando transporte', signals: ['SS'] as RawBedSignal[] },
  { id: 'C3', status: 'Em observação', signals: ['CP'] as RawBedSignal[] },
];

const MIN_TOUCH = theme.touchMin;

const normalizeSignals = (signals: RawBedSignal[]): BedSignal[] => {
  const normalized = signals.map((signal) => (signal === 'CP' ? 'UCP' : signal));
  return Array.from(new Set(normalized));
};

export const ChecklistFormScreen = ({ onLogout }: ChecklistFormScreenProps) => {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [name, setName] = useState('');
  const [observation, setObservation] = useState('');
  const [checklistOk, setChecklistOk] = useState(false);
  const [openMenuBedId, setOpenMenuBedId] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<{ bedId: string; action: BedAction } | null>(null);

  const { isOnline } = useNetworkStatus();
  const { pendingCount, isSyncing, lastError, saveFormOfflineFirst, syncNow } = useSyncQueue({
    isOnline,
  });

  const canSave = useMemo(() => name.trim().length > 0, [name]);
  const isDesktopWeb = Platform.OS === 'web' && width >= 900;
  const stackFormControls = !isDesktopWeb && width < 420;
  const stackModalActions = width < 400;

  const cardWidth = useMemo(() => {
    if (!isDesktopWeb) return '100%';
    if (width >= 1400) return '32%';
    if (width >= 1100) return '48.5%';
    return '100%';
  }, [isDesktopWeb, width]);

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

  const confirmationMessage = useMemo(() => {
    if (!pendingAction) {
      return '';
    }

    if (pendingAction.action === 'alta-medica') {
      return `Confirmar alta médica para o Leito ${pendingAction.bedId}?`;
    }

    return '';
  }, [pendingAction]);

  const keyboardOffset = Platform.OS === 'ios' ? insets.top + 4 : 0;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <KeyboardAvoidingView
        style={styles.keyboardOuter}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={keyboardOffset}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.container}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.headerBlock}>
            <Text style={styles.title}>Checklist de Qualidade</Text>
            <Text style={styles.subtitle}>Coleta offline-first com sincronização automática</Text>
            {onLogout ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Sair da conta"
                style={({ pressed }) => [styles.logoutButton, pressed && styles.logoutButtonPressed]}
                onPress={onLogout}
              >
                <Text style={styles.logoutButtonText}>Sair</Text>
              </Pressable>
            ) : null}
          </View>

          <OnlineStatusHeader isOnline={isOnline} pendingCount={pendingCount} isSyncing={isSyncing} />

          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Gestão de Leitos</Text>
            <Text style={styles.sectionSubtitle}>
              Ações rápidas com confirmação para evitar toques acidentais
            </Text>
            <View style={[styles.bedCardsWrap, isDesktopWeb && styles.bedCardsWrapWeb]}>
              {BED_CARDS.map((bed) => (
                <View key={bed.id} style={[styles.bedCard, isDesktopWeb && { width: cardWidth }]}>
                  <View style={styles.bedHeader}>
                    <View style={styles.bedTitleBlock}>
                      <Text style={styles.bedTitle}>Leito {bed.id}</Text>
                      <Text style={styles.bedStatus}>{bed.status}</Text>
                    </View>

                    <View style={styles.kebabWrapper}>
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={`Abrir menu de ações do Leito ${bed.id}`}
                        accessibilityHint="Toque para visualizar ações rápidas do leito"
                        hitSlop={8}
                        style={({ pressed }) => [styles.kebabButton, pressed && styles.kebabButtonPressed]}
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
                              accessibilityLabel={`Alta médica para o Leito ${bed.id}`}
                              style={({ pressed }) => [styles.menuItem, pressed && styles.menuItemPressed]}
                              onPress={() => openActionConfirmation(bed.id, 'alta-medica')}
                            >
                              <Text style={styles.menuItemText}>Alta médica</Text>
                            </Pressable>
                          </View>
                        </Pressable>
                      ) : null}
                    </View>
                  </View>
                  <View style={styles.signalTagsRow}>
                    {normalizeSignals(bed.signals).map((signal) => (
                      <View key={`${bed.id}-${signal}`} style={[styles.signalTag, getSignalTagStyle(signal)]}>
                        <Text style={[styles.signalTagText, getSignalTextStyle(signal)]}>{signal}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              ))}
            </View>
          </View>

          <View style={styles.card}>
            <Text style={styles.label}>Nome do formulário</Text>
            <TextInput
              style={styles.input}
              placeholder="Ex: Inspeção turno manhã"
              placeholderTextColor={theme.colors.textMuted}
              value={name}
              onChangeText={setName}
            />

            <Text style={styles.label}>Observação</Text>
            <TextInput
              style={[styles.input, styles.multiline]}
              placeholder="Descreva pontos relevantes"
              placeholderTextColor={theme.colors.textMuted}
              value={observation}
              onChangeText={setObservation}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />

            <View style={[styles.switchRow, stackFormControls && styles.switchRowColumn]}>
              <Text style={styles.switchLabel}>Checklist aprovado?</Text>
              <Switch
                value={checklistOk}
                onValueChange={setChecklistOk}
                trackColor={{ false: theme.colors.borderStrong, true: theme.colors.primaryMuted }}
                thumbColor={checklistOk ? theme.colors.primary : theme.colors.surface}
              />
            </View>

            <Pressable
              style={({ pressed }) => [
                styles.primaryButton,
                (!canSave || isSyncing) && styles.buttonDisabled,
                pressed && canSave && !isSyncing && styles.primaryButtonPressed,
              ]}
              onPress={handleSave}
              disabled={!canSave || isSyncing}
            >
              <Text style={styles.primaryButtonText}>Salvar formulário</Text>
            </Pressable>

            <Pressable
              style={({ pressed }) => [
                styles.secondaryButton,
                (!isOnline || isSyncing) && styles.buttonDisabled,
                pressed && isOnline && !isSyncing && styles.secondaryButtonPressed,
              ]}
              onPress={syncNow}
              disabled={!isOnline || isSyncing}
            >
              <Text style={styles.secondaryButtonText}>Sincronizar agora</Text>
            </Pressable>
          </View>

          {lastError ? <Text style={styles.errorText}>Última falha: {lastError}</Text> : null}
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal
        transparent
        animationType="fade"
        visible={Boolean(pendingAction)}
        onRequestClose={closeConfirmation}
      >
        <Pressable style={styles.modalOverlay} onPress={closeConfirmation}>
          <Pressable style={styles.modalContent} onPress={(event) => event.stopPropagation()}>
            <Text style={styles.modalTitle}>Confirmação de ação</Text>
            <Text style={styles.modalText}>{confirmationMessage}</Text>

            <View style={[styles.modalButtons, stackModalActions && styles.modalButtonsColumn]}>
              <Pressable
                style={({ pressed }) => [styles.modalCancelButton, pressed && styles.modalCancelPressed]}
                onPress={closeConfirmation}
              >
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [styles.modalConfirmButton, pressed && styles.modalConfirmPressed]}
                onPress={handleConfirmAction}
              >
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
    return { borderColor: '#e8a8a8', backgroundColor: theme.colors.dangerMuted };
  }
  if (signal === 'SS') {
    return { borderColor: '#e8d48a', backgroundColor: '#faf6e8' };
  }
  return { borderColor: theme.colors.success, backgroundColor: theme.colors.successMuted };
};

const getSignalTextStyle = (signal: BedSignal) => {
  if (signal === 'CR') {
    return { color: theme.colors.danger };
  }
  if (signal === 'SS') {
    return { color: '#8a6d24' };
  }
  return { color: theme.colors.primaryPressed };
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.bgElevated,
  },
  keyboardOuter: {
    flex: 1,
  },
  container: {
    padding: theme.space.md + 4,
    paddingBottom: theme.space.xl + 8,
  },
  headerBlock: {
    flexDirection: 'column',
    gap: theme.space.xs,
  },
  title: {
    fontSize: theme.fontSize.title,
    fontWeight: '700',
    color: theme.colors.text,
    letterSpacing: -0.2,
  },
  subtitle: {
    marginTop: 2,
    color: theme.colors.textSecondary,
    fontSize: theme.fontSize.body,
    lineHeight: 24,
  },
  logoutButton: {
    marginTop: theme.space.sm,
    alignSelf: 'flex-start',
    minHeight: MIN_TOUCH,
    paddingHorizontal: theme.space.md,
    justifyContent: 'center',
    borderRadius: theme.radii.sm,
    backgroundColor: theme.colors.border,
    borderWidth: 1,
    borderColor: theme.colors.borderStrong,
  },
  logoutButtonPressed: {
    opacity: 0.85,
    backgroundColor: theme.colors.borderStrong,
  },
  logoutButtonText: {
    color: theme.colors.textSecondary,
    fontWeight: '700',
    fontSize: theme.fontSize.body,
  },
  card: {
    marginTop: theme.space.sm + 4,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radii.md,
    padding: theme.space.md,
    gap: theme.space.sm,
    backgroundColor: theme.colors.surface,
  },
  sectionCard: {
    marginTop: theme.space.sm + 4,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radii.md,
    padding: theme.space.md,
    gap: theme.space.sm,
    backgroundColor: theme.colors.primaryMuted,
  },
  sectionTitle: {
    fontSize: theme.fontSize.body + 2,
    fontWeight: '700',
    color: theme.colors.text,
  },
  sectionSubtitle: {
    color: theme.colors.textSecondary,
    marginBottom: 2,
    fontSize: theme.fontSize.bodySmall,
    lineHeight: 20,
  },
  bedCard: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radii.sm + 2,
    padding: theme.space.sm + 4,
    backgroundColor: theme.colors.surface,
  },
  bedCardsWrap: {
    gap: theme.space.sm,
    flexDirection: 'column',
  },
  bedCardsWrapWeb: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  bedHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: theme.space.sm,
  },
  bedTitleBlock: {
    flex: 1,
    flexDirection: 'column',
    minWidth: 0,
  },
  bedTitle: {
    fontSize: theme.fontSize.body,
    fontWeight: '700',
    color: theme.colors.text,
  },
  bedStatus: {
    marginTop: 4,
    color: theme.colors.textSecondary,
    fontSize: theme.fontSize.bodySmall,
    lineHeight: 20,
  },
  signalTagsRow: {
    marginTop: theme.space.sm,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  signalTag: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
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
    minWidth: MIN_TOUCH,
    minHeight: MIN_TOUCH,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: theme.radii.sm,
    backgroundColor: theme.colors.bgElevated,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  kebabButtonPressed: {
    backgroundColor: theme.colors.border,
  },
  kebabText: {
    fontSize: 22,
    lineHeight: 22,
    color: theme.colors.textSecondary,
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
    top: MIN_TOUCH + 4,
    right: 0,
    width: 200,
    borderWidth: 1,
    borderColor: theme.colors.borderStrong,
    borderRadius: theme.radii.sm + 2,
    backgroundColor: theme.colors.surface,
    shadowColor: theme.colors.text,
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  menuItem: {
    minHeight: MIN_TOUCH,
    paddingVertical: theme.space.sm,
    paddingHorizontal: theme.space.sm + 4,
    justifyContent: 'center',
  },
  menuItemPressed: {
    backgroundColor: theme.colors.primaryMuted,
  },
  menuItemText: {
    color: theme.colors.text,
    fontWeight: '600',
    fontSize: theme.fontSize.body,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: theme.colors.overlay,
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.space.md + 6,
  },
  modalContent: {
    width: '100%',
    maxWidth: 360,
    borderRadius: theme.radii.md + 2,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.space.md + 2,
  },
  modalTitle: {
    fontSize: theme.fontSize.body + 2,
    fontWeight: '700',
    color: theme.colors.text,
  },
  modalText: {
    marginTop: theme.space.sm,
    color: theme.colors.textSecondary,
    fontSize: theme.fontSize.body,
    lineHeight: 24,
  },
  modalButtons: {
    marginTop: theme.space.md + 2,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: theme.space.sm,
  },
  modalButtonsColumn: {
    flexDirection: 'column',
    alignItems: 'stretch',
  },
  modalCancelButton: {
    borderRadius: theme.radii.sm,
    minHeight: MIN_TOUCH,
    paddingHorizontal: theme.space.md,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.border,
  },
  modalCancelPressed: {
    opacity: 0.88,
  },
  modalConfirmButton: {
    borderRadius: theme.radii.sm,
    minHeight: MIN_TOUCH,
    paddingHorizontal: theme.space.md,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.primary,
  },
  modalConfirmPressed: {
    backgroundColor: theme.colors.primaryPressed,
  },
  cancelButtonText: {
    color: theme.colors.text,
    fontWeight: '600',
    fontSize: theme.fontSize.body,
  },
  confirmButtonText: {
    color: theme.colors.surface,
    fontWeight: '700',
    fontSize: theme.fontSize.body,
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
  multiline: {
    minHeight: 120,
    paddingTop: theme.space.sm + 2,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
    gap: theme.space.sm,
  },
  switchRowColumn: {
    flexDirection: 'column',
    alignItems: 'flex-start',
  },
  switchLabel: {
    color: theme.colors.text,
    fontWeight: '600',
    fontSize: theme.fontSize.body,
    lineHeight: 22,
  },
  primaryButton: {
    marginTop: theme.space.xs,
    borderRadius: theme.radii.sm,
    minHeight: MIN_TOUCH,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primary,
  },
  primaryButtonPressed: {
    backgroundColor: theme.colors.primaryPressed,
  },
  primaryButtonText: {
    color: theme.colors.surface,
    fontWeight: '700',
    fontSize: theme.fontSize.body,
  },
  secondaryButton: {
    marginTop: theme.space.xs,
    borderRadius: theme.radii.sm,
    minHeight: MIN_TOUCH,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.surface,
    borderWidth: 2,
    borderColor: theme.colors.primary,
  },
  secondaryButtonPressed: {
    backgroundColor: theme.colors.primaryMuted,
  },
  secondaryButtonText: {
    color: theme.colors.primaryPressed,
    fontWeight: '700',
    fontSize: theme.fontSize.body,
  },
  buttonDisabled: {
    opacity: 0.45,
  },
  errorText: {
    marginTop: theme.space.md,
    color: theme.colors.danger,
    fontWeight: '600',
    fontSize: theme.fontSize.bodySmall,
    lineHeight: 20,
  },
});
