import { useCallback, useEffect, useRef, useState } from 'react';

const ACTIVATION_DISTANCE = 6;
const EDGE_SIZE = 72;
const MAX_SCROLL_STEP = 12;

/** Pointer-only CMS dragging. The caller renders the ghost from `drag`. */
export default function useCmsDrag({
  isOpen,
  theme,
  onDragStateChange,
  onHoverZoneChange,
  onPlace,
  onNavigateToSection,
}) {
  const [drag, setDrag] = useState(null);
  const session = useRef(null);
  const hoverElement = useRef(null);
  const hoverZone = useRef('');
  const frame = useRef(null);
  const callbacks = useRef({ onDragStateChange, onHoverZoneChange, onPlace });
  callbacks.current = { onDragStateChange, onHoverZoneChange, onPlace };

  // theme and onNavigateToSection are accepted for the shared caller contract.
  // Navigation is deliberately an explicit UI action, never a drag side effect.
  void theme;
  void onNavigateToSection;

  const resolveTarget = useCallback((x, y, type) => {
    const element = document.elementFromPoint?.(x, y);
    const tray = element?.closest?.('[data-cms-tray]');
    if (tray) return null;
    const zone = element?.closest?.('[data-cms-zone]');
    return zone?.dataset.cmsAccepts === type ? zone : null;
  }, []);

  const updateHover = useCallback((x, y, type) => {
    const element = resolveTarget(x, y, type);
    if (element === hoverElement.current) return;
    hoverElement.current = element;
    const zone = element?.dataset.cmsZone || '';
    if (zone !== hoverZone.current) {
      hoverZone.current = zone;
      callbacks.current.onHoverZoneChange?.(zone);
    }
  }, [resolveTarget]);

  const stopScroll = useCallback(() => {
    if (frame.current !== null) {
      window.cancelAnimationFrame(frame.current);
      frame.current = null;
    }
  }, []);

  const scrollStep = useCallback((y) => {
    const trayTop = document.querySelector('[data-cms-tray]')?.getBoundingClientRect().top;
    const liveBottom = Math.min(window.innerHeight, trayTop ?? window.innerHeight);
    const navBottom = document.querySelector('[data-cms-nav], nav, [role="navigation"]')?.getBoundingClientRect().bottom;
    const liveTop = Math.max(0, Math.min(navBottom ?? 0, liveBottom));
    if (y < liveTop || y >= liveBottom) return 0;
    if (y < liveTop + EDGE_SIZE) {
      return -MAX_SCROLL_STEP * (1 - (y - liveTop) / EDGE_SIZE);
    }
    if (y > liveBottom - EDGE_SIZE) {
      return MAX_SCROLL_STEP * (1 - (liveBottom - y) / EDGE_SIZE);
    }
    return 0;
  }, []);

  const scheduleScroll = useCallback(() => {
    if (frame.current !== null || !session.current?.active) return;
    if (!scrollStep(session.current.y)) return;
    frame.current = window.requestAnimationFrame(() => {
      frame.current = null;
      const current = session.current;
      if (!current?.active) return;
      const step = scrollStep(current.y);
      if (!step) return;
      window.scrollBy(0, step);
      updateHover(current.x, current.y, current.type);
      scheduleScroll();
    });
  }, [scrollStep, updateHover]);

  const finish = useCallback((place = false, updateState = true) => {
    const current = session.current;
    if (!current) return;
    session.current = null;
    stopScroll();
    document.removeEventListener('pointermove', current.move, true);
    document.removeEventListener('pointerup', current.up, true);
    document.removeEventListener('pointercancel', current.cancel, true);
    document.removeEventListener('dragstart', current.nativeDrag, true);
    document.removeEventListener('keydown', current.keydown, true);
    window.removeEventListener('blur', current.cancel);
    try {
      if (current.source?.hasPointerCapture?.(current.pointerId)) {
        current.source.releasePointerCapture(current.pointerId);
      }
    } catch (_) {
      // Implicit touch capture may already have been released by the browser.
    }
    if (hoverZone.current) callbacks.current.onHoverZoneChange?.('');
    hoverElement.current = null;
    hoverZone.current = '';
    if (current.active) callbacks.current.onDragStateChange?.('');
    if (updateState) setDrag(null);
    if (place && current.active) {
      const target = resolveTarget(current.x, current.y, current.type);
      if (target?.dataset.cmsZone) callbacks.current.onPlace?.(current.type, target.dataset.cmsZone);
    }
  }, [resolveTarget, stopScroll]);

  const cancelDrag = useCallback(() => finish(), [finish]);

  const beginDrag = useCallback((event, type) => {
    if (!isOpen || session.current || !type || event.isPrimary === false ||
        (event.pointerType !== 'touch' && event.button !== 0)) return;
    if (event.cancelable) event.preventDefault();
    const current = {
      pointerId: event.pointerId,
      source: event.currentTarget,
      type,
      startX: event.clientX,
      startY: event.clientY,
      x: event.clientX,
      y: event.clientY,
      active: false,
    };
    current.move = (moveEvent) => {
      if (moveEvent.pointerId !== current.pointerId || session.current !== current) return;
      current.x = moveEvent.clientX;
      current.y = moveEvent.clientY;
      if (!current.active) {
        const distance = Math.hypot(current.x - current.startX, current.y - current.startY);
        if (distance < ACTIVATION_DISTANCE) return;
        current.active = true;
        callbacks.current.onDragStateChange?.(type);
      }
      setDrag({ type, x: current.x, y: current.y, active: true });
      updateHover(current.x, current.y, type);
      if (scrollStep(current.y)) scheduleScroll();
      else stopScroll();
    };
    current.up = (upEvent) => {
      if (upEvent.pointerId !== current.pointerId || session.current !== current) return;
      current.x = upEvent.clientX;
      current.y = upEvent.clientY;
      finish(true);
    };
    current.cancel = (cancelEvent) => {
      if (cancelEvent?.pointerId !== undefined && cancelEvent.pointerId !== current.pointerId) return;
      finish();
    };
    current.keydown = (keyEvent) => {
      if (keyEvent.key === 'Escape') finish();
    };
    current.nativeDrag = (dragEvent) => dragEvent.preventDefault();
    session.current = current;
    document.addEventListener('pointermove', current.move, true);
    document.addEventListener('pointerup', current.up, true);
    document.addEventListener('pointercancel', current.cancel, true);
    document.addEventListener('dragstart', current.nativeDrag, true);
    document.addEventListener('keydown', current.keydown, true);
    window.addEventListener('blur', current.cancel);
  }, [finish, isOpen, scheduleScroll, scrollStep, stopScroll, updateHover]);

  useEffect(() => {
    if (!isOpen) finish();
  }, [isOpen, finish]);

  useEffect(() => () => finish(false, false), [finish]);

  return { beginDrag, cancelDrag, drag };
}
