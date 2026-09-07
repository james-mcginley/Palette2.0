import React from 'react';
import { ScreenPlaceholder } from '@/components/ScreenPlaceholder';

/**
 * The Duolingo-style snake path: nodes from curator_path_nodes, a drawer per
 * node, "Mark Module Complete" calling the advance_curator_path_node() RPC
 * (0009_curator_path_progress_rpcs.sql) — sequential only, so a node can't be
 * completed out of order. Confetti + badge unlock fire when that RPC's
 * `completed` return value comes back true. Call start_curator_path() once,
 * on first open, before any node can be advanced. Both RPCs are real and
 * atomic already; only the UI is deferred.
 */
export function CuratorPathScreen() {
  return (
    <ScreenPlaceholder
      title="Curator path"
      note="Snake path UI over curator_path_nodes + user_path_progress. start_curator_path() then advance_curator_path_node() per node handle progress/badge-award server-side — see the backend README for the schema."
    />
  );
}
