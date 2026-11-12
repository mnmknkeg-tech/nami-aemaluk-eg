import {
  getViewportBreakpoint,
  subscribeToViewportChanges,
} from '../packages/shared/src/builder/responsiveViewport';

type Listener = () => void;

class FakeViewport {
  innerWidth = 1280;
  private listeners = new Map<string, Set<Listener>>();

  addEventListener(type: string, listener: EventListenerOrEventListenerObject): void {
    const callback = listener as Listener;
    const listeners = this.listeners.get(type) || new Set<Listener>();
    listeners.add(callback);
    this.listeners.set(type, listeners);
  }

  removeEventListener(type: string, listener: EventListenerOrEventListenerObject): void {
    this.listeners.get(type)?.delete(listener as Listener);
  }

  dispatch(type: string): void {
    this.listeners.get(type)?.forEach((listener) => listener());
  }
}

describe('shared responsive viewport detection', () => {
  it.each([
    [390, 'mobile'],
    [410, 'mobile'],
    [639, 'mobile'],
    [640, 'tablet'],
    [768, 'tablet'],
    [1023, 'tablet'],
    [1024, 'desktop'],
  ])('maps width %i to %s', (width, expected) => {
    expect(getViewportBreakpoint(width)).toBe(expected);
  });

  it('updates when the window is resized or the device is rotated, then cleans up listeners', () => {
    const target = new FakeViewport();
    const values: string[] = [];
    const unsubscribe = subscribeToViewportChanges(target as unknown as Window, (value) => {
      values.push(value);
    });

    target.innerWidth = 390;
    target.dispatch('resize');
    target.innerWidth = 410;
    target.dispatch('resize');
    target.innerWidth = 768;
    target.dispatch('orientationchange');
    target.innerWidth = 1280;
    target.dispatch('resize');
    unsubscribe();
    target.innerWidth = 390;
    target.dispatch('resize');

    expect(values).toEqual(['desktop', 'mobile', 'mobile', 'tablet', 'desktop']);
  });
});
