import { StyleSheet, Text, View } from 'react-native';

interface OnlineStatusHeaderProps {
  isOnline: boolean;
  pendingCount: number;
  isSyncing: boolean;
}

export const OnlineStatusHeader = ({
  isOnline,
  pendingCount,
  isSyncing,
}: OnlineStatusHeaderProps) => {
  return (
    <View style={styles.wrapper}>
      <View style={[styles.badge, isOnline ? styles.badgeOnline : styles.badgeOffline]}>
        <Text style={styles.badgeText}>{isOnline ? 'Online' : 'Offline'}</Text>
      </View>
      <Text style={styles.counterText}>Pendentes: {pendingCount}</Text>
      {isSyncing ? <Text style={styles.syncText}>Sincronizando...</Text> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    marginTop: 16,
    marginBottom: 12,
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#f1f5f9',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  badge: {
    borderRadius: 99,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  badgeOnline: {
    backgroundColor: '#16a34a',
  },
  badgeOffline: {
    backgroundColor: '#dc2626',
  },
  badgeText: {
    color: '#ffffff',
    fontWeight: '700',
  },
  counterText: {
    color: '#0f172a',
    fontWeight: '600',
  },
  syncText: {
    color: '#0f172a',
    fontStyle: 'italic',
    fontSize: 12,
  },
});
