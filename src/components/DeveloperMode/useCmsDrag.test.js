import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import useCmsDrag from './useCmsDrag';

function Harness({ isOpen = true, callbacks }) {
  const { beginDrag, cancelDrag, drag } = useCmsDrag({
    isOpen,
    theme: 'apple',
    onNavigateToSection: jest.fn(),
    ...callbacks,
  });
  return (
    <>
      <button onPointerDown={(event) => beginDrag(event, 'project')}>Project</button>
      <button onClick={cancelDrag}>Cancel</button>
      <output data-testid="drag">{drag ? JSON.stringify(drag) : ''}</output>
      <div data-cms-zone="projects" data-cms-accepts="project"><span data-testid="project-child">Project zone</span></div>
      <div data-cms-zone="experience" data-cms-accepts="experience"><span data-testid="experience-child">Experience zone</span></div>
      <div data-cms-tray=""><span data-testid="tray-child">Tray</span></div>
    </>
  );
}

describe('useCmsDrag', () => {
  let hit;
  let originalElementFromPoint;
  let callbacks;

  beforeEach(() => {
    originalElementFromPoint = Object.getOwnPropertyDescriptor(document, 'elementFromPoint');
    document.elementFromPoint = jest.fn(() => hit);
    hit = null;
    callbacks = {
      onDragStateChange: jest.fn(),
      onHoverZoneChange: jest.fn(),
      onPlace: jest.fn(),
    };
  });

  afterEach(() => {
    if (originalElementFromPoint) Object.defineProperty(document, 'elementFromPoint', originalElementFromPoint);
    else delete document.elementFromPoint;
  });

  // jsdom does not provide PointerEvent, so make a MouseEvent with pointer fields.
  const pointer = (target, name, { pointerId = 1, pointerType = 'mouse', isPrimary = true, ...mouse } = {}) => {
    const event = new MouseEvent(name, { bubbles: true, cancelable: true, ...mouse });
    Object.assign(event, { pointerId, pointerType, isPrimary });
    fireEvent(target, event);
  };
  const down = (id = 1, options = {}) => pointer(screen.getByText('Project'), 'pointerdown', {
    pointerId: id, button: 0, clientX: 30, clientY: 100, ...options,
  });
  const move = (id, x, y = 100) => pointer(document, 'pointermove', { pointerId: id, clientX: x, clientY: y });
  const up = (id, x, y = 100) => pointer(document, 'pointerup', { pointerId: id, clientX: x, clientY: y });

  test('requires actual movement of at least six pixels before activating or placing', () => {
    render(<Harness callbacks={callbacks} />);
    hit = screen.getByTestId('project-child');
    down();
    move(1, 35);
    expect(screen.getByTestId('drag')).toBeEmptyDOMElement();
    expect(callbacks.onDragStateChange).not.toHaveBeenCalled();
    up(1, 35);
    expect(callbacks.onPlace).not.toHaveBeenCalled();

    down();
    move(1, 36);
    expect(JSON.parse(screen.getByTestId('drag').textContent)).toEqual({ type: 'project', x: 36, y: 100, active: true });
    expect(callbacks.onDragStateChange).toHaveBeenCalledWith('project');
    up(1, 36);
    expect(callbacks.onPlace).toHaveBeenCalledTimes(1);
    expect(callbacks.onPlace).toHaveBeenCalledWith('project', 'projects');
  });

  test('rejects mismatched zones and the tray using the element under the pointer', () => {
    render(<Harness callbacks={callbacks} />);
    hit = screen.getByTestId('experience-child');
    down();
    move(1, 45);
    up(1, 45);
    expect(callbacks.onPlace).not.toHaveBeenCalled();
    expect(callbacks.onHoverZoneChange).not.toHaveBeenCalled();

    hit = screen.getByTestId('tray-child');
    down();
    move(1, 45);
    up(1, 45);
    expect(callbacks.onPlace).not.toHaveBeenCalled();
  });

  test('tracks hover changes, ignores other pointers, and places exactly once', () => {
    render(<Harness callbacks={callbacks} />);
    hit = screen.getByTestId('project-child');
    down(7);
    move(8, 60);
    up(8, 60);
    expect(screen.getByTestId('drag')).toBeEmptyDOMElement();
    move(7, 40);
    move(7, 42);
    expect(callbacks.onHoverZoneChange).toHaveBeenCalledTimes(1);
    expect(callbacks.onHoverZoneChange).toHaveBeenCalledWith('projects');
    hit = null;
    move(7, 44);
    expect(callbacks.onHoverZoneChange).toHaveBeenLastCalledWith('');
    hit = screen.getByTestId('project-child');
    up(7, 44);
    up(7, 44);
    expect(callbacks.onPlace).toHaveBeenCalledTimes(1);
    expect(callbacks.onDragStateChange).toHaveBeenNthCalledWith(1, 'project');
    expect(callbacks.onDragStateChange).toHaveBeenNthCalledWith(2, '');
  });

  test('cancels on Escape, blur, pointercancel, close, and explicit cancel', () => {
    const { rerender } = render(<Harness callbacks={callbacks} />);
    hit = screen.getByTestId('project-child');
    const cancelWith = (action) => {
      down();
      move(1, 40);
      action();
      expect(screen.getByTestId('drag')).toBeEmptyDOMElement();
      up(1, 40);
    };
    cancelWith(() => fireEvent.keyDown(document, { key: 'Escape' }));
    cancelWith(() => fireEvent.blur(window));
    cancelWith(() => pointer(document, 'pointercancel', { pointerId: 1 }));
    cancelWith(() => fireEvent.click(screen.getByText('Cancel')));
    down();
    move(1, 40);
    rerender(<Harness isOpen={false} callbacks={callbacks} />);
    expect(screen.getByTestId('drag')).toBeEmptyDOMElement();
    up(1, 40);
    expect(callbacks.onPlace).not.toHaveBeenCalled();
  });

  test('ignores secondary mouse buttons and releases listeners on unmount', () => {
    const { unmount } = render(<Harness callbacks={callbacks} />);
    hit = screen.getByTestId('project-child');
    down(1, { button: 2 });
    move(1, 50);
    expect(callbacks.onDragStateChange).not.toHaveBeenCalled();
    down(2, { pointerType: 'touch', button: -1 });
    move(2, 50);
    expect(callbacks.onDragStateChange).toHaveBeenCalledWith('project');
    unmount();
    act(() => up(2, 50));
    expect(callbacks.onPlace).not.toHaveBeenCalled();
  });
});
