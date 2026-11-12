import {
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
