import { StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { theme } from '../theme';

interface OnlineStatusHeaderProps {
  isOnline: boolean;
  pendingCount: number;
  isSyncing: boolean;
}

const WIDE_BREAKPOINT = 480;

export const OnlineStatusHeader = ({
  isOnline,
  pendingCount,
  isSyncing,
}: OnlineStatusHeaderProps) => {
  const { width } = useWindowDimensions();
  const useColumn = width < WIDE_BREAKPOINT;

  return (
    <View style={[styles.wrapper, useColumn ? styles.wrapperColumn : styles.wrapperRow]}>
      <View style={[styles.badge, isOnline ? styles.badgeOnline : styles.badgeOffline]}>
        <Text style={styles.badgeText}>{isOnline ? 'Online' : 'Offline'}</Text>
      </View>
      <View style={useColumn ? styles.metaColumn : styles.metaRow}>
        <Text style={styles.counterText}>Pendentes: {pendingCount}</Text>
        {isSyncing ? <Text style={styles.syncText}>Sincronizando…</Text> : null}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    marginTop: theme.space.md,
    marginBottom: theme.space.sm,
    padding: theme.space.sm + 4,
    borderRadius: theme.radii.md,
    backgroundColor: theme.colors.primaryMuted,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: theme.space.sm,
  },
  wrapperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  wrapperColumn: {
    flexDirection: 'column',
    alignItems: 'stretch',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.space.sm,
    flexShrink: 1,
    flexWrap: 'wrap',
  },
  metaColumn: {
    flexDirection: 'column',
    gap: 4,
  },
  badge: {
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: theme.space.sm,
    alignSelf: 'flex-start',
    minHeight: 36,
    justifyContent: 'center',
  },
  badgeOnline: {
    backgroundColor: theme.colors.primary,
  },
  badgeOffline: {
    backgroundColor: theme.colors.danger,
  },
  badgeText: {
    color: theme.colors.surface,
    fontWeight: '700',
    fontSize: theme.fontSize.bodySmall,
  },
  counterText: {
    color: theme.colors.text,
    fontWeight: '600',
    fontSize: theme.fontSize.body,
    lineHeight: 22,
  },
  syncText: {
    color: theme.colors.textSecondary,
    fontStyle: 'italic',
    fontSize: theme.fontSize.bodySmall,
    lineHeight: 20,
  },
});
