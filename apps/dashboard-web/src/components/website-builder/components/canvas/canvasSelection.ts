export interface CanvasSelectionEvent {
  stopPropagation: () => void;
}

export interface CanvasSelectionHandlers<TEvent extends CanvasSelectionEvent> {
  nodeId: string;
  isInteractivePreview: boolean;
  selectNode: (nodeId: string) => void;
  handleInteraction: (event: TEvent) => void;
}

/** Route a component-root click to selection in edit mode or preview behavior. */
export const handleCanvasNodeClick = <TEvent extends CanvasSelectionEvent>(
  event: TEvent,
  { nodeId, isInteractivePreview, selectNode, handleInteraction }: CanvasSelectionHandlers<TEvent>
) => {
  if (isInteractivePreview) {
    handleInteraction(event);
    return;
  }

  event.stopPropagation();
  selectNode(nodeId);
};
