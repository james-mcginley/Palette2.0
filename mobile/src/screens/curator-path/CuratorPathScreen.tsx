import React, { useState } from 'react';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { RootStackParamList } from '@/navigation/types';
import {
  useCuratorPath, useStartCuratorPath, useAdvanceCuratorPathNode, type CuratorPathNode,
} from '@/lib/api/curatorPaths';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { colors, radii, spacing, textStyles } from '@/theme/tokens';

type Props = NativeStackScreenProps<RootStackParamList, 'CuratorPath'>;

type NodeStatus = 'complete' | 'current' | 'locked';

function statusFor(node: CuratorPathNode, currentPosition: number): NodeStatus {
  if (node.position < currentPosition) return 'complete';
  if (node.position === currentPosition) return 'current';
  return 'locked';
}

/**
 * The Duolingo-style snake path: start_curator_path() then
 * advance_curator_path_node() per node (0009_curator_path_progress_rpcs.sql)
 * handle progress/badge-award atomically and server-side — a node can't be
 * completed out of order because the RPC itself rejects any position that
 * isn't the caller's current one, so this UI only ever offers the button on
 * the one node that would actually succeed.
 */
export function CuratorPathScreen({ route }: Props) {
  const { pathId } = route.params;
  const { data, isLoading } = useCuratorPath(pathId);
  const startPath = useStartCuratorPath(pathId);
  const advanceNode = useAdvanceCuratorPathNode(pathId);
  const [completionBadge, setCompletionBadge] = useState<string | null>(null);

  if (isLoading || !data) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  const { path, nodes, progress, badgeName } = data;
  const currentPosition = progress?.current_node_position ?? 0;
  const isComplete = Boolean(progress?.completed_at);

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      <Text style={styles.title}>{path.title}</Text>
      <Text style={styles.curator}>By {path.curator_name}</Text>
      {path.description ? <Text style={styles.description}>{path.description}</Text> : null}

      {!progress ? (
        <Pressable
          style={styles.startButton}
          onPress={() => startPath.mutate()}
          disabled={startPath.isPending}
        >
          {startPath.isPending ? (
            <ActivityIndicator color={colors.textOnAccent} />
          ) : (
            <Text style={styles.startLabel}>Start path</Text>
          )}
        </Pressable>
      ) : (
        <>
          {isComplete ? (
            <View style={styles.completeBanner}>
              <Text style={styles.completeTitle}>Path complete</Text>
              {badgeName ? <Text style={styles.completeNote}>You earned "{badgeName}".</Text> : null}
            </View>
          ) : null}

          <View style={styles.path}>
            {nodes.map((node) => {
              const status = statusFor(node, currentPosition);
              return (
                <View key={node.id} style={styles.nodeRow}>
                  <View style={[styles.nodeDot, status === 'complete' && styles.nodeDotComplete, status === 'current' && styles.nodeDotCurrent]}>
                    <Text style={styles.nodeDotLabel}>{status === 'complete' ? '✓' : node.position}</Text>
                  </View>
                  <View style={[styles.nodeCard, status === 'locked' && styles.nodeCardLocked]}>
                    <Text style={[styles.nodeTitle, status === 'locked' && styles.nodeTitleLocked]}>{node.title}</Text>
                    {node.media_refs.map((ref) => (
                      <Text key={ref.media_id} style={styles.nodeMedia} numberOfLines={1}>
                        {ref.snapshot.title}{ref.snapshot.creator ? ` — ${ref.snapshot.creator}` : ''}
                      </Text>
                    ))}
                    {status === 'current' ? (
                      <Pressable
                        style={styles.completeButton}
                        disabled={advanceNode.isPending}
                        onPress={() =>
                          advanceNode.mutate(node.position, {
                            onSuccess: (result) => {
                              if (result.completed && badgeName) setCompletionBadge(badgeName);
                            },
                          })
                        }
                      >
                        {advanceNode.isPending ? (
                          <ActivityIndicator color={colors.textOnAccent} />
                        ) : (
                          <Text style={styles.completeButtonLabel}>Mark module complete</Text>
                        )}
                      </Pressable>
                    ) : null}
                  </View>
                </View>
              );
            })}
          </View>
        </>
      )}

      <ConfirmDialog
        visible={Boolean(completionBadge)}
        onClose={() => setCompletionBadge(null)}
        title="Path complete!"
        message={completionBadge ? `You earned "${completionBadge}".` : undefined}
        confirmLabel="Nice"
        hideCancel
        onConfirm={() => setCompletionBadge(null)}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surfaceCanvas },
  content: { padding: spacing[5], gap: spacing[2], paddingBottom: spacing[8] },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceCanvas },
  title: { ...textStyles.displayMd, color: colors.textPrimary },
  curator: { ...textStyles.caption, color: colors.amber, textTransform: 'uppercase', letterSpacing: 1.2 },
  description: { ...textStyles.bodyMd, color: colors.textSecondary, marginTop: spacing[1] },
  startButton: {
    marginTop: spacing[4], minHeight: 50, borderRadius: radii.full, backgroundColor: colors.accent,
    alignItems: 'center', justifyContent: 'center',
  },
  startLabel: { ...textStyles.bodyStrong, color: colors.textOnAccent },
  completeBanner: {
    marginTop: spacing[4], backgroundColor: colors.accentSoft, borderWidth: 1, borderColor: colors.accent,
    borderRadius: radii.md, padding: spacing[4], gap: 4,
  },
  completeTitle: { ...textStyles.headingMd, color: colors.textPrimary },
  completeNote: { ...textStyles.bodySm, color: colors.textSecondary },
  path: { marginTop: spacing[5], gap: spacing[3] },
  nodeRow: { flexDirection: 'row', gap: spacing[3] },
  nodeDot: {
    width: 32, height: 32, borderRadius: 16, backgroundColor: colors.surfaceRaised,
    borderWidth: 1, borderColor: colors.borderDefault, alignItems: 'center', justifyContent: 'center',
  },
  nodeDotComplete: { backgroundColor: colors.accent, borderColor: colors.accent },
  nodeDotCurrent: { borderColor: colors.accent },
  nodeDotLabel: { ...textStyles.caption, color: colors.textPrimary, fontWeight: '700' },
  nodeCard: {
    flex: 1, backgroundColor: colors.surfaceBase, borderWidth: 1, borderColor: colors.borderDefault,
    borderRadius: radii.md, padding: spacing[3], gap: 4,
  },
  nodeCardLocked: { opacity: 0.5 },
  nodeTitle: { ...textStyles.bodyStrong, color: colors.textPrimary },
  nodeTitleLocked: { color: colors.textDim },
  nodeMedia: { ...textStyles.caption, color: colors.textSecondary },
  completeButton: {
    marginTop: spacing[2], minHeight: 40, borderRadius: radii.full, backgroundColor: colors.accent,
    alignItems: 'center', justifyContent: 'center',
  },
  completeButtonLabel: { ...textStyles.caption, color: colors.textOnAccent, fontWeight: '700' },
});
