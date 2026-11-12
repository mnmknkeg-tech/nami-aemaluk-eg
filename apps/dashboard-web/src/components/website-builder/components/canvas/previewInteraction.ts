export interface PropagationEvent {
  stopPropagation: () => void;
}

/** Run preview-only behavior while leaving edit-mode clicks free to select their component. */
export const runPreviewOnlyInteraction = <TEvent extends PropagationEvent>(
  event: TEvent,
  isInteractivePreview: boolean,
  action: () => void
): boolean => {
  if (!isInteractivePreview) return false;
  event.stopPropagation();
  action();
  return true;
};
