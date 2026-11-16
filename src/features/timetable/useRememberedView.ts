import { useCallback, useState } from 'react';
import type { TimetableView } from './logic/layout';

const KEY = 'kompass:timeplan-visning';
const VIEWS: TimetableView[] = ['dag', 'uke', 'liste'];

function read(): TimetableView {
  try {
    const value = window.localStorage.getItem(KEY);
    return VIEWS.includes(value as TimetableView) ? (value as TimetableView) : 'dag';
  } catch {
    return 'dag';
  }
}

/** The chosen view (Dag / Uke / Liste), remembered between visits. */
export function useRememberedView(): [TimetableView, (view: TimetableView) => void] {
  const [view, setView] = useState<TimetableView>(read);
  const update = useCallback((next: TimetableView) => {
    setView(next);
    try {
      window.localStorage.setItem(KEY, next);
    } catch {
      // Private mode: the choice just is not remembered.
    }
  }, []);
  return [view, update];
}
