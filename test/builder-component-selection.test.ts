import { handleCanvasNodeClick } from '../apps/dashboard-web/src/components/website-builder/components/canvas/canvasSelection';
import { runPreviewOnlyInteraction } from '../apps/dashboard-web/src/components/website-builder/components/canvas/previewInteraction';
import {
  resolvePageScopedSelection,
  updateNodePropsReducer,
} from '../apps/dashboard-web/src/components/website-builder/context/hooks/useBuilderComponentOperations';

const createEvent = () => ({ stopPropagation: jest.fn() });

describe('canvas component selection', () => {
  it.each([
    ['heading', 'heading_1'],
    ['button', 'button_1'],
    ['image', 'image_1'],
    ['container', 'container_1'],
  ])('selects the exact %s node in edit mode', (_type, nodeId) => {
    const event = createEvent();
    const selectNode = jest.fn();
    const handleInteraction = jest.fn();

    handleCanvasNodeClick(event, {
      nodeId,
      isInteractivePreview: false,
      selectNode,
      handleInteraction,
    });

    expect(event.stopPropagation).toHaveBeenCalledTimes(1);
    expect(selectNode).toHaveBeenCalledWith(nodeId);
    expect(handleInteraction).not.toHaveBeenCalled();
  });

  it('selects a nested child and stops its click from selecting the parent', () => {
    const event = createEvent();
    const selectNode = jest.fn();
    const handleInteraction = jest.fn();

    handleCanvasNodeClick(event, {
      nodeId: 'nested_button',
      isInteractivePreview: false,
      selectNode,
      handleInteraction,
    });

    if (!event.stopPropagation.mock.calls.length) {
      handleCanvasNodeClick(event, {
        nodeId: 'parent_container',
        isInteractivePreview: false,
        selectNode,
        handleInteraction,
      });
    }

    expect(selectNode.mock.calls).toEqual([['nested_button']]);
  });

  it('selects a parent when its own surface is clicked', () => {
    const selectNode = jest.fn();
    handleCanvasNodeClick(createEvent(), {
      nodeId: 'parent_container',
      isInteractivePreview: false,
      selectNode,
      handleInteraction: jest.fn(),
    });
    expect(selectNode).toHaveBeenCalledWith('parent_container');
  });

  it('routes interactive-preview clicks to preview behavior without changing selection', () => {
    const event = createEvent();
    const selectNode = jest.fn();
    const handleInteraction = jest.fn();

    handleCanvasNodeClick(event, {
      nodeId: 'button_1',
      isInteractivePreview: true,
      selectNode,
      handleInteraction,
    });

    expect(handleInteraction).toHaveBeenCalledWith(event);
    expect(selectNode).not.toHaveBeenCalled();
    expect(event.stopPropagation).not.toHaveBeenCalled();
  });

  it('lets product, FAQ, navigation, and mobile-header clicks bubble to selection in edit mode', () => {
    const event = createEvent();
    const action = jest.fn();

    expect(runPreviewOnlyInteraction(event, false, action)).toBe(false);
    expect(event.stopPropagation).not.toHaveBeenCalled();
    expect(action).not.toHaveBeenCalled();
  });

  it('stops the click and runs the action only in interactive preview', () => {
    const event = createEvent();
    const action = jest.fn();

    expect(runPreviewOnlyInteraction(event, true, action)).toBe(true);
    expect(event.stopPropagation).toHaveBeenCalledTimes(1);
    expect(action).toHaveBeenCalledTimes(1);
  });
});

describe('selection ownership and inspector data', () => {
  const website = {
    components: {
      home: { id: 'home', childrenIds: ['container'] },
      container: { id: 'container', childrenIds: ['heading', 'button', 'image'] },
      heading: { id: 'heading', childrenIds: [] },
      button: { id: 'button', childrenIds: [] },
      image: { id: 'image', childrenIds: [] },
      about: { id: 'about', childrenIds: ['about_heading'] },
      about_heading: { id: 'about_heading', childrenIds: [] },
    },
  } as any;

  it.each(['container', 'heading', 'button', 'image'])(
    'accepts %s only when it belongs to the active page tree',
    (nodeId) => {
      expect(resolvePageScopedSelection(website, 'home', nodeId)).toBe(nodeId);
      expect(resolvePageScopedSelection(website, 'about', nodeId)).toBeNull();
    }
  );

  it('clears selection for a deleted or detached node instead of resolving by a similar ID', () => {
    const afterDelete = {
      components: {
        home: { id: 'home', childrenIds: ['heading-copy'] },
        'heading-copy': { id: 'heading-copy', childrenIds: [] },
      },
    } as any;
    expect(resolvePageScopedSelection(afterDelete, 'home', 'heading')).toBeNull();
    expect(resolvePageScopedSelection(afterDelete, 'home', 'heading-copy')).toBe('heading-copy');
  });

  it('updates properties on the selected node only', () => {
    const reducer = updateNodePropsReducer('button', { label: 'احجز الآن' });
    const result = reducer({
      components: {
        heading: { id: 'heading', props: { text: 'قبل' } },
        button: { id: 'button', props: { label: 'احجز' } },
      },
    } as any);

    expect(result.components.button.props.label).toBe('احجز الآن');
    expect(result.components.heading.props.text).toBe('قبل');
  });
});
