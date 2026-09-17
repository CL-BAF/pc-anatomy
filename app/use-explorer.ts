'use client';
import { useCallback, useEffect, useState } from 'react';
import { byId, categories, openLevel, type Category } from '@/lib/manifest';
import {
  initialState,
  selectSearch,
  type ExplorerState,
  type Selection,
} from '@/lib/explorer-state';
import {
  isPhysical,
  levelPath,
  levels,
  menuRoot,
  submenuRoot,
  type LevelId,
} from '@/lib/levels';

/** Graphics cards whose chip diagrams open directly, without a dive. */
const gpuRoots = new Set<LevelId>(['card', 'rx9070', 'arcb580']);

/**
 * Every move the explorer can make, in one place.
 *
 * The page is a composition of panels and this is the vocabulary they share.
 * A panel asks for a named move — navigate, isolate, hide — rather than
 * writing its own patch of explorer state at the button that triggers it.
 */
export function useExplorer() {
  const [state, setState] = useState<ExplorerState>(initialState);
  const [playing, setPlaying] = useState(false);
  const [layers, setLayers] = useState(false);
  const [hiddenMenuOpen, setHiddenMenuOpen] = useState(false);
  // The subsystem whose menu is open. Follows wherever you are unless you
  // deliberately open another one.
  const [openMenu, setOpenMenu] = useState<LevelId | null>(null);
  // The card dropdown open inside the GPU menu. `null` follows wherever you
  // are; `'none'` means you deliberately folded it away.
  const [openSubmenu, setOpenSubmenu] = useState<LevelId | 'none' | null>(null);
  const shownMenu = openMenu ?? menuRoot(state.level);
  const shownSubmenu =
    openSubmenu === 'none' ? null : (openSubmenu ?? submenuRoot(state.level));
  // While a dive is in flight the selection exists only to aim the camera at
  // the part being opened. Showing its panel would flash the outer component's
  // description, and its "Take apart" button, for a few hundred milliseconds
  // before the deeper scale replaces it. The panel appears on arrival instead.
  const selected =
    state.selection && !state.diveInto ? byId[state.selection.concept] : null;
  const logical = !isPhysical(state.level);

  const navigate = useCallback(
    (level: LevelId, selection: Selection | null = null) => {
      setPlaying(false);
      setHiddenMenuOpen(false);
      setOpenMenu(menuRoot(level));
      setOpenSubmenu(null);
      setState((s) => ({
        ...s,
        level,
        diveInto: null,
        explode: 0,
        selection,
        isolated: false,
        focusRevision: 0,
        cameraRevision: s.cameraRevision + 1,
        visible: [...categories],
        hidden: [],
        view: 'perspective',
      }));
      setLayers(false);
    },
    [],
  );

  const reset = useCallback(() => {
    setPlaying(false);
    setHiddenMenuOpen(false);
    setOpenMenu(null);
    setOpenSubmenu(null);
    setState((s) => ({
      ...initialState,
      cameraRevision: s.cameraRevision + 1,
    }));
    setLayers(false);
  }, []);

  // Physical disassembly is one continuous move owned by the scene: the stage clears
  // around the part you clicked while the camera closes in on it, and when the
  // scene reports the stage is clear we swap in the deeper scale, which then
  // grows back out of the same spot. Nothing cuts to black, and no timer here
  // can drift out of step with the animation. `diveInto` is the whole record of
  // a dive in flight, so cancelling one is just clearing it.
  const dive = useCallback(
    (conceptId: string) => {
      const target = openLevel(conceptId);
      if (!target) return false;
      // GPU diagrams open directly. The outgoing isolation animation selected
      // every repeated block and tinted the old scale green before replacing it.
      if (
        levelPath(target).some((id) => gpuRoots.has(id)) &&
        !isPhysical(target)
      ) {
        navigate(target, { concept: levels[target].concept });
        return true;
      }
      setPlaying(false);
      setLayers(false);
      setState((s) =>
        s.diveInto
          ? s
          : {
              ...s,
              selection: { concept: conceptId },
              isolated: false,
              diveInto: conceptId,
              diveRevision: s.diveRevision + 1,
              focusRevision: s.focusRevision + 1,
              cameraRevision: s.cameraRevision + 1,
            },
      );
      return true;
    },
    [navigate],
  );

  const arrive = useCallback(() => {
    const arrivedLevel = state.diveInto ? openLevel(state.diveInto) : null;
    if (!arrivedLevel) return;
    setHiddenMenuOpen(false);
    setOpenMenu(menuRoot(arrivedLevel));
    setOpenSubmenu(null);
    setState((s) => {
      const target = s.diveInto ? openLevel(s.diveInto) : null;
      if (!target || target !== arrivedLevel) return s;
      return {
        ...s,
        level: target,
        explode: 0,
        visible: [...categories],
        hidden: [],
        isolated: false,
        view: 'perspective',
        diveInto: null,
        focusRevision: 0,
        cameraRevision: s.cameraRevision + 1,
        // Arrive with the thing you opened already described.
        selection: { concept: levels[target].concept },
      };
    });
  }, [state.diveInto]);

  const choose = useCallback(
    (selection: Selection | null, intent: 'open' | 'inspect' = 'inspect') => {
      if (selection && intent === 'open' && dive(selection.concept)) return;
      setState((s) => ({
        ...s,
        selection,
        isolated: false,
        focusRevision: 0,
      }));
      setLayers(false);
    },
    [dive],
  );

  /** Jump to a component found by search, or named in another panel. */
  const selectConcept = useCallback((id: string) => {
    setOpenMenu(menuRoot(byId[id].level));
    setOpenSubmenu(null);
    setState((s) => selectSearch(s, id));
    setLayers(false);
  }, []);

  // Runs the disassembly slowly enough to follow, and hands control straight
  // back the moment the viewer touches the slider or changes scale.
  useEffect(() => {
    if (!playing) return;
    let frame = 0,
      last = performance.now();
    const step = (now: number) => {
      // Clamp the step so one stalled frame (a slow machine, a background
      // tab, a heavy rebuild) cannot teleport the disassembly to the end.
      // The run then takes a little longer on slow hardware but stays watchable.
      const delta = Math.min(0.1, (now - last) / 1000);
      last = now;
      setState((s) => {
        const next = Math.min(100, s.explode + delta * 11);
        if (next >= 100) setPlaying(false);
        return { ...s, explode: next, focusRevision: 0 };
      });
      frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [playing]);

  const setExplode = useCallback((value: number) => {
    setPlaying(false);
    setState((s) => ({ ...s, explode: value, focusRevision: 0 }));
  }, []);

  const toggleAuto = () => {
    if (playing) {
      setPlaying(false);
      return;
    }
    // Someone who has asked for less motion gets the end state, not a
    // nine-second animation they did not want.
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setState((s) => ({ ...s, explode: 100, focusRevision: 0 }));
      return;
    }
    setState((s) => ({
      ...s,
      explode: s.explode >= 99 ? 0 : s.explode,
      focusRevision: 0,
    }));
    setPlaying(true);
  };

  const toggleCategory = (category: Category) =>
    setState((s) => ({
      ...s,
      visible: s.visible.includes(category)
        ? s.visible.filter((c) => c !== category)
        : [...s.visible, category],
      selection:
        s.selection && byId[s.selection.concept].category === category
          ? null
          : s.selection,
      isolated: false,
      focusRevision: 0,
    }));

  const toggleAllCategories = () =>
    setState((s) => ({
      ...s,
      visible: s.visible.length === categories.length ? [] : [...categories],
      hidden: [],
      selection: null,
      isolated: false,
      focusRevision: 0,
    }));

  const setConceptVisible = (
    id: string,
    category: Category,
    checked: boolean,
  ) =>
    setState((s) => ({
      ...s,
      visible:
        checked && !s.visible.includes(category)
          ? [...s.visible, category]
          : s.visible,
      hidden: checked ? s.hidden.filter((x) => x !== id) : [...s.hidden, id],
      selection: null,
      isolated: false,
      focusRevision: 0,
    }));

  /** Everything back on screen, without disturbing the selection. */
  const showEverything = () =>
    setState((s) => ({
      ...s,
      visible: [...categories],
      hidden: [],
      isolated: false,
    }));

  const unhide = useCallback((id: string) => {
    const category = byId[id]?.category;
    setState((s) => ({
      ...s,
      visible:
        category && !s.visible.includes(category)
          ? [...s.visible, category]
          : s.visible,
      hidden: s.hidden.filter((hiddenId) => hiddenId !== id),
      focusRevision: 0,
    }));
  }, []);

  const clearHidden = () =>
    setState((s) => ({ ...s, hidden: [], focusRevision: 0 }));

  const setView = (view: ExplorerState['view']) =>
    setState((s) => ({
      ...s,
      view,
      focusRevision: 0,
      cameraRevision: s.cameraRevision + 1,
    }));

  const toggleIsolate = () =>
    setState((s) => ({
      ...s,
      isolated: !s.isolated,
      focusRevision: s.focusRevision + 1,
      cameraRevision: s.cameraRevision + 1,
    }));

  const refocus = () =>
    setState((s) => ({
      ...s,
      focusRevision: s.focusRevision + 1,
      cameraRevision: s.cameraRevision + 1,
    }));

  const hide = (id: string) => {
    setHiddenMenuOpen(true);
    setState((s) => ({
      ...s,
      hidden: s.hidden.includes(id) ? s.hidden : [...s.hidden, id],
      selection: null,
      isolated: false,
      focusRevision: 0,
    }));
  };

  return {
    state,
    selected,
    logical,
    playing,
    layers,
    setLayers,
    hiddenMenuOpen,
    setHiddenMenuOpen,
    shownMenu,
    showMenu: setOpenMenu,
    shownSubmenu,
    showSubmenu: setOpenSubmenu,
    navigate,
    reset,
    dive,
    arrive,
    choose,
    selectConcept,
    setExplode,
    toggleAuto,
    toggleCategory,
    toggleAllCategories,
    setConceptVisible,
    showEverything,
    unhide,
    clearHidden,
    setView,
    toggleIsolate,
    refocus,
    hide,
  };
}

export type Explorer = ReturnType<typeof useExplorer>;
