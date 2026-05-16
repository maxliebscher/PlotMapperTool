(function presentationModule(PM) {
  "use strict";

  function normalizePresentationState(input, routeLength) {
    const max = Math.max(0, parseInt(routeLength, 10) || 0);
    const raw = input || {};
    const showAll = Boolean(raw.showAll);
    const step = max ? PM.clamp(parseInt(raw.step, 10) || 1, 1, max) : 0;
    return {
      active: Boolean(raw.active),
      step: showAll ? max : step,
      showAll
    };
  }

  function computePresentationReveal(points, settings, presentationState) {
    const routeInfo = PM.computeRouteInfo(points, settings);
    const normalized = normalizePresentationState(presentationState, routeInfo.numberedRoutes.length);
    if (!normalized.active) {
      return {
        ...normalized,
        routeInfo,
        routePoints: points.filter((point) => point.type === "route" && PM.isPointVisible(point, settings)),
        visibleIds: null
      };
    }

    const visibleIds = new Set();
    const routePoints = [];
    let revealedNumbered = 0;
    for (const point of points) {
      if (point.type !== "route" || !PM.isPointVisible(point, settings)) continue;
      if (!point.helper) {
        const step = Number(routeInfo.stepById.get(point.id)) || 0;
        if (normalized.showAll || step <= normalized.step) {
          visibleIds.add(point.id);
          routePoints.push(point);
          revealedNumbered = Math.max(revealedNumbered, step);
        }
        continue;
      }
      if (normalized.showAll || (revealedNumbered > 0 && revealedNumbered < normalized.step)) {
        visibleIds.add(point.id);
        routePoints.push(point);
      }
    }

    return { ...normalized, routeInfo, routePoints, visibleIds };
  }

  function isPointRevealed(point, points, settings, revealInfo) {
    if (!revealInfo || !revealInfo.active) return PM.isPointVisible(point, settings);
    if (revealInfo.showAll) return PM.isPointVisible(point, settings);
    return Boolean(revealInfo.visibleIds && revealInfo.visibleIds.has(point.id));
  }

  function isInputLike(target) {
    return Boolean(target && target.closest && target.closest("input, textarea, select, [contenteditable='true']"));
  }

  function createPresentationController(options) {
    const root = options.root;
    const store = options.store;
    const menu = options.menu;
    const onChange = typeof options.onChange === "function" ? options.onChange : function noop() {};
    const t = typeof options.t === "function" ? options.t : function identity(key) { return key; };
    const elements = {
      button: options.button,
      dock: options.dock,
      step: options.step,
      previousButton: options.previousButton,
      nextButton: options.nextButton,
      showAllButton: options.showAllButton,
      resetButton: options.resetButton,
      exitButton: options.exitButton
    };
    let state = normalizePresentationState({ active: false, step: 0, showAll: false }, 0);

    function routeLength() {
      const live = store.getLiveState();
      return PM.computeRouteInfo(live.points, live.settings).numberedRoutes.length;
    }

    function update() {
      const length = routeLength();
      state = normalizePresentationState(state, length);
      root.classList.toggle("presentation-mode", state.active);
      elements.dock.hidden = !state.active;
      const hasRoute = length > 0;
      elements.step.textContent = hasRoute ? `${state.step} / ${length}` : t("presentationEmpty");
      elements.previousButton.disabled = !state.active || !hasRoute || state.step <= 1;
      elements.nextButton.disabled = !state.active || !hasRoute || state.step >= length;
      elements.showAllButton.disabled = !state.active || !hasRoute || state.showAll;
      elements.resetButton.disabled = !state.active || !hasRoute || (!state.showAll && state.step <= 1);
      elements.exitButton.disabled = !state.active;
      onChange();
    }

    function enter() {
      const length = routeLength();
      if (menu && typeof menu.close === "function") menu.close();
      state = normalizePresentationState({ active: true, step: length ? 1 : 0, showAll: false }, length);
      update();
    }

    function exit() {
      state = normalizePresentationState({ active: false, step: 0, showAll: false }, routeLength());
      update();
    }

    function previous() {
      if (!state.active) return;
      state = normalizePresentationState({ ...state, step: state.step - 1, showAll: false }, routeLength());
      update();
    }

    function next() {
      if (!state.active) return;
      state = normalizePresentationState({ ...state, step: state.step + 1, showAll: false }, routeLength());
      update();
    }

    function showAll() {
      if (!state.active) return;
      state = normalizePresentationState({ ...state, showAll: true }, routeLength());
      update();
    }

    function reset() {
      if (!state.active) return;
      state = normalizePresentationState({ ...state, step: 1, showAll: false }, routeLength());
      update();
    }

    function getPresentationReveal() {
      const live = store.getLiveState();
      return computePresentationReveal(live.points, live.settings, state);
    }

    function handleKeydown(event) {
      if (!state.active || isInputLike(event.target)) return;
      const key = event.key;
      if (key === "Escape") {
        event.preventDefault();
        exit();
      } else if (key === "ArrowRight" || key === " " || key === "PageDown") {
        event.preventDefault();
        next();
      } else if (key === "ArrowLeft" || key === "Backspace" || key === "PageUp") {
        event.preventDefault();
        previous();
      } else if (key === "Home") {
        event.preventDefault();
        reset();
      } else if (key === "End") {
        event.preventDefault();
        showAll();
      }
    }

    elements.button.addEventListener("click", enter);
    elements.previousButton.addEventListener("click", previous);
    elements.nextButton.addEventListener("click", next);
    elements.showAllButton.addEventListener("click", showAll);
    elements.resetButton.addEventListener("click", reset);
    elements.exitButton.addEventListener("click", exit);
    document.addEventListener("keydown", handleKeydown);
    store.subscribe(update);

    PM.getPresentationReveal = getPresentationReveal;

    return {
      enter,
      exit,
      previous,
      next,
      showAll,
      reset,
      getPresentationReveal
    };
  }

  PM.normalizePresentationState = normalizePresentationState;
  PM.computePresentationReveal = computePresentationReveal;
  PM.isPointRevealed = isPointRevealed;
  PM.createPresentationController = createPresentationController;
})(globalThis.PM);
