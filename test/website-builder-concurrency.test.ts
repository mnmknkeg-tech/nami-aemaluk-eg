import {
  collectExclusivelyOwnedSubtreeIds,
  getPageReachableNodeIds,
  findTreeParentIds,
  reorderChildrenReducer,
  updateNodePropsReducer,
  updateNodeStyleReducer,
} from '../apps/dashboard-web/src/components/website-builder/context/hooks/useBuilderComponentOperations';
import {
  enqueueSerialSave,
  isCurrentWebsiteRevision,
  mergeWebsiteSettings,
  restoreHistorySnapshot,
} from '../apps/dashboard-web/src/components/website-builder/context/hooks/useBuilderHistory';
import { Website } from '../apps/dashboard-web/src/components/website-builder/types/builder';

const baseWebsite = {
  activity: 'retail',
  pages: [],
  components: {
    node: {
      id: 'node',
      name: 'Product',
      type: 'text',
      category: 'content',
      parentId: null,
      childrenIds: [],
      props: { title: 'Original', enabled: true },
      styles: { desktop: { color: '#111111' } },
    },
  },
} as unknown as Website;

describe('website builder concurrent mutations', () => {
  it('resolves parent ownership from childrenIds even when parentId is stale', () => {
    const inconsistent = {
      ...baseWebsite,
      components: {
        root: { ...baseWebsite.components.node, id: 'root', childrenIds: ['child'] },
        child: { ...baseWebsite.components.node, id: 'child', parentId: 'missing-parent' },
      },
    } as Website;
    expect(findTreeParentIds(inconsistent, 'child')).toEqual(['root']);
  });

  it('preserves a shared legacy child when collecting a node subtree for deletion', () => {
    const sharedTree = {
      ...baseWebsite,
      components: {
        root: { ...baseWebsite.components.node, id: 'root', childrenIds: ['left', 'right'] },
        left: { ...baseWebsite.components.node, id: 'left', parentId: 'root', childrenIds: ['shared'] },
        right: { ...baseWebsite.components.node, id: 'right', parentId: 'root', childrenIds: ['shared'] },
        shared: { ...baseWebsite.components.node, id: 'shared', parentId: 'left' },
      },
    } as Website;

    expect(collectExclusivelyOwnedSubtreeIds(sharedTree, 'left', 'root')).toEqual(
      new Set(['left'])
    );
  });

  it('does not guess ownership when multiple parents list the same child', () => {
    const inconsistent = {
      ...baseWebsite,
      components: {
        first: { ...baseWebsite.components.node, id: 'first', childrenIds: ['child'] },
        second: { ...baseWebsite.components.node, id: 'second', childrenIds: ['child'] },
        child: { ...baseWebsite.components.node, id: 'child', parentId: 'first' },
      },
    } as Website;
    expect(findTreeParentIds(inconsistent, 'child')).toEqual(['first', 'second']);
  });

  it('keeps editor parent navigation scoped to real child edges', () => {
    const tree = {
      ...baseWebsite,
      components: {
        root: { ...baseWebsite.components.node, id: 'root', childrenIds: ['child'] },
        child: { ...baseWebsite.components.node, id: 'child', parentId: 'stale-parent' },
        stale: { ...baseWebsite.components.node, id: 'stale', childrenIds: [] },
      },
    } as Website;
    expect(findTreeParentIds(tree, 'child')).toEqual(['root']);
    expect(getPageReachableNodeIds(tree, 'root').has('stale')).toBe(false);
  });

  it('reorders an exact set of children without changing parent links', () => {
    const withChildren = {
      ...baseWebsite,
      components: {
        root: {
          ...baseWebsite.components.node,
          id: 'root',
          childrenIds: ['first', 'second'],
        },
        first: { ...baseWebsite.components.node, id: 'first', parentId: 'root' },
        second: { ...baseWebsite.components.node, id: 'second', parentId: 'root' },
      },
    } as Website;

    const reordered = reorderChildrenReducer('root', ['second', 'first'])(withChildren);
    expect(reordered.components.root.childrenIds).toEqual(['second', 'first']);
    expect(reordered.components.first.parentId).toBe('root');
    expect(reordered.components.second.parentId).toBe('root');
  });

  it.each([
    ['missing child', ['first']],
    ['unknown child', ['first', 'unknown']],
    ['duplicate child', ['first', 'first']],
  ])('rejects a reorder containing a %s', (_label, nextIds) => {
    const withChildren = {
      ...baseWebsite,
      components: {
        root: { ...baseWebsite.components.node, id: 'root', childrenIds: ['first', 'second'] },
        first: { ...baseWebsite.components.node, id: 'first', parentId: 'root' },
        second: { ...baseWebsite.components.node, id: 'second', parentId: 'root' },
      },
    } as Website;

    expect(reorderChildrenReducer('root', nextIds as string[])(withChildren)).toBe(withChildren);
  });

  it('composes a props update followed immediately by a style update without dropping either', () => {
    const withProps = updateNodePropsReducer('node', { title: 'Updated' })(baseWebsite);
    const withStyle = updateNodeStyleReducer(
      'node',
      { backgroundColor: '#ffffff' },
      'desktop'
    )(withProps);

    expect(withStyle.components.node.props).toEqual({ title: 'Updated', enabled: true });
    expect(withStyle.components.node.styles.desktop).toEqual({
      color: '#111111',
      backgroundColor: '#ffffff',
    });
  });

  it('applies two sequential prop patches against the latest website', () => {
    const first = updateNodePropsReducer('node', { title: 'Latest title' })(baseWebsite);
    const second = updateNodePropsReducer('node', { subtitle: 'Latest subtitle' })(first);

    expect(second.components.node.props).toEqual({
      title: 'Latest title',
      enabled: true,
      subtitle: 'Latest subtitle',
    });
  });

  it('includes nested website settings in undo and redo snapshots', () => {
    const before = {
      ...baseWebsite,
      settings: { announcement: { enabled: false, text: 'Old' }, seo: { title: 'Store' } },
    } as Website;
    const after = mergeWebsiteSettings(before, {
      announcement: { enabled: true, text: 'New' },
    });

    expect(after.settings?.announcement).toEqual({ enabled: true, text: 'New' });
    expect(after.settings?.seo).toEqual({ title: 'Store' });
    expect(before.settings?.announcement).toEqual({ enabled: false, text: 'Old' });

    const undo = restoreHistorySnapshot({
      direction: 'undo',
      current: after,
      past: [before],
      future: [],
    });
    expect(undo?.website.settings?.announcement).toEqual({ enabled: false, text: 'Old' });
    const redo = restoreHistorySnapshot({
      direction: 'redo',
      current: undo!.website,
      past: undo!.past,
      future: undo!.future,
    });
    expect(redo?.website.settings?.announcement).toEqual({ enabled: true, text: 'New' });
  });

  it.each(['undo', 'redo'] as const)(
    '%s restores the snapshot and marks it unsaved',
    (direction) => {
      const current = { ...baseWebsite, name: 'Current' } as Website;
      const snapshot = { ...baseWebsite, name: 'Restored' } as Website;
      const transition = restoreHistorySnapshot({
        direction,
        current,
        past: direction === 'undo' ? [snapshot] : [],
        future: direction === 'redo' ? [snapshot] : [],
      });

      expect(transition?.website.name).toBe('Restored');
      expect(transition?.autosaveStatus).toBe('unsaved');
    }
  );

  it('serializes autosaves so a newer snapshot cannot finish before an older request', async () => {
    const queue = { current: Promise.resolve() as Promise<unknown> };
    const events: string[] = [];
    let releaseFirst!: () => void;
    const firstGate = new Promise<void>((resolve) => {
      releaseFirst = resolve;
    });

    const first = enqueueSerialSave(queue, async () => {
      events.push('A:start');
      await firstGate;
      events.push('A:finish');
    });
    const second = enqueueSerialSave(queue, async () => {
      events.push('B:finish');
    });

    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(events).toEqual(['A:start']);
    releaseFirst();
    await Promise.all([first, second]);
    expect(events).toEqual(['A:start', 'A:finish', 'B:finish']);
  });

  it('does not mark a snapshot current after a newer edit increments the revision', () => {
    expect(isCurrentWebsiteRevision(4, 5)).toBe(false);
    expect(isCurrentWebsiteRevision(5, 5)).toBe(true);
  });
});
