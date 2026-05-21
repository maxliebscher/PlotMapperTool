(function presentationModule(PM) {
  "use strict";

  const FOG_MODES = ["off", "focus", "all"];
  const CONTEXT_REVEAL_RADIUS = 0.065;
  const DEFAULT_FOG_SETTINGS = {
    mode: "focus",
    outsideVisibility: 0.22,
    trailRadius: 0.07,
    focusRadius: 0.18,
    edgeSoftness: 0.06,
    trailMemory: true
  };

  function numberOrFallback(value, fallback) {
    const number = Number(value);
    return Number.isFinite(number) ? number : fallback;
  }

  function normalizePresentationFogSettings(input) {
    const raw = input || {};
    const mode = FOG_MODES.includes(raw.mode) ? raw.mode : DEFAULT_FOG_SETTINGS.mode;
    return {
      mode,
      outsideVisibility: PM.clamp(numberOrFallback(raw.outsideVisibility, DEFAULT_FOG_SETTINGS.outsideVisibility), 0.02, 0.45),
      trailRadius: PM.clamp(numberOrFallback(raw.trailRadius, DEFAULT_FOG_SETTINGS.trailRadius), 0.03, 0.18),
      focusRadius: PM.clamp(numberOrFallback(raw.focusRadius, DEFAULT_FOG_SETTINGS.focusRadius), 0.08, 0.28),
      edgeSoftness: PM.clamp(numberOrFallback(raw.edgeSoftness, DEFAULT_FOG_SETTINGS.edgeSoftness), 0.01, 0.14),
      trailMemory: raw.trailMemory === undefined ? DEFAULT_FOG_SETTINGS.trailMemory : Boolean(raw.trailMemory)
    };
  }

  function normalizePresentationState(input, routeLength) {
    const max = Math.max(0, parseInt(routeLength, 10) || 0);
    const raw = input || {};
    const showAll = Boolean(raw.showAll);
    const step = max ? PM.clamp(parseInt(raw.step, 10) || 1, 1, max) : 0;
    const routeSteps = {};
    if (raw.routeSteps && typeof raw.routeSteps === "object") {
      Object.entries(raw.routeSteps).forEach(([routeId, value]) => {
        const parsed = parseInt(value, 10);
        if (routeId && Number.isFinite(parsed)) routeSteps[routeId] = Math.max(0, parsed);
      });
    }
    return {
      active: Boolean(raw.active),
      activeRouteId: raw.activeRouteId ? String(raw.activeRouteId) : "",
      step: showAll ? max : step,
      showAll,
      routeSteps
    };
  }

  function visibleRoutes(settings, routes) {
    const list = Array.isArray(routes) && routes.length ? routes : [PM.getActiveRoute(settings, routes)];
    const visible = list.filter((route) => route && route.visible !== false);
    return visible.length ? visible : list.filter(Boolean).slice(0, 1);
  }

  function routeContainsPoint(route, point, settings) {
    if (!point || point.type !== "route") return false;
    const routeId = route && route.id ? route.id : settings && settings.activeRouteId;
    if (!routeId) return true;
    return !point.routeId || point.routeId === routeId;
  }

  function routeRevealFor(points, settings, routes, route, requestedStep, showAll) {
    const routeInfo = PM.computeRouteInfo(points, settings, route);
    const length = routeInfo.numberedRoutes.length;
    const step = length ? (showAll ? length : PM.clamp(parseInt(requestedStep, 10) || 1, 1, length)) : 0;
    const visibleIds = new Set();
    const routePoints = [];
    let revealedNumbered = 0;

    for (const point of points) {
      if (!routeContainsPoint(route, point, settings) || !PM.isPointVisible(point, settings, routes)) continue;
      if (!point.helper) {
        const pointStep = Number(routeInfo.stepById.get(point.id)) || 0;
        if (showAll || pointStep <= step) {
          visibleIds.add(point.id);
          routePoints.push(point);
          revealedNumbered = Math.max(revealedNumbered, pointStep);
        }
        continue;
      }
      if (showAll || (revealedNumbered > 0 && revealedNumbered < step)) {
        visibleIds.add(point.id);
        routePoints.push(point);
      }
    }

    return {
      route,
      routeInfo,
      routePoints,
      visibleIds,
      step,
      length,
      currentPoint: routeInfo.numberedRoutes[Math.max(0, step - 1)] || routePoints[routePoints.length - 1] || null
    };
  }

  function distanceSquared(a, b) {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return dx * dx + dy * dy;
  }

  function pointToSegmentDistance(point, start, end) {
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const lengthSquared = dx * dx + dy * dy;
    if (!lengthSquared) return Math.sqrt(distanceSquared(point, start));
    const t = PM.clamp(((point.x - start.x) * dx + (point.y - start.y) * dy) / lengthSquared, 0, 1);
    return Math.sqrt(distanceSquared(point, { x: start.x + dx * t, y: start.y + dy * t }));
  }

  function distanceToRevealPath(point, routePoints) {
    if (!routePoints.length) return Infinity;
    if (routePoints.length === 1) return Math.sqrt(distanceSquared(point, routePoints[0]));
    let best = Infinity;
    for (let index = 1; index < routePoints.length; index += 1) {
      best = Math.min(best, pointToSegmentDistance(point, routePoints[index - 1], routePoints[index]));
    }
    return best;
  }

  function isNearRevealedRoute(point, routeReveals) {
    return routeReveals.some((entry) => distanceToRevealPath(point, entry.routePoints) <= CONTEXT_REVEAL_RADIUS);
  }

  function computePresentationReveal(points, settings, presentationState, routes) {
    const routesVisible = visibleRoutes(settings, routes);
    const combinedRouteInfo = PM.computeRoutesInfo ? PM.computeRoutesInfo(points, settings, routes) : PM.computeRouteInfo(points, settings, routesVisible[0]);
    const fallbackActive = PM.getActiveRoute ? PM.getActiveRoute(settings, routesVisible) : routesVisible[0];
    const fallbackLength = PM.computeRouteInfo(points, settings, fallbackActive).numberedRoutes.length;
    const normalized = normalizePresentationState(presentationState, fallbackLength);
    const activeRoute = routesVisible.find((route) => route.id === normalized.activeRouteId)
      || routesVisible.find((route) => route.id === (settings && settings.activeRouteId))
      || fallbackActive;

    if (!normalized.active) {
      const inactiveRouteReveals = routesVisible.map((route) => {
        const routeInfo = PM.computeRouteInfo(points, settings, route);
        const routePoints = points.filter((point) => routeContainsPoint(route, point, settings) && PM.isPointVisible(point, settings, routes));
        return {
          route,
          routeInfo,
          routePoints,
          visibleIds: new Set(routePoints.map((point) => point.id)),
          step: routeInfo.numberedRoutes.length,
          length: routeInfo.numberedRoutes.length,
          currentPoint: routeInfo.numberedRoutes.at(-1) || routePoints.at(-1) || null
        };
      });
      return {
        ...normalized,
        activeRouteId: activeRoute ? activeRoute.id : "",
        routeInfo: combinedRouteInfo,
        activeRoute,
        routePoints: inactiveRouteReveals.find((entry) => entry.route === activeRoute)?.routePoints || [],
        routeReveals: inactiveRouteReveals,
        visibleIds: null
      };
    }

    const routeReveals = routesVisible.map((route) => {
      const requestedStep = normalized.routeSteps[route.id] || (route === activeRoute ? normalized.step : 1);
      return routeRevealFor(points, settings, routes, route, requestedStep, normalized.showAll);
    });
    const activeReveal = routeReveals.find((entry) => entry.route === activeRoute) || routeReveals[0] || null;
    const visibleIds = new Set();
    routeReveals.forEach((entry) => entry.visibleIds.forEach((id) => visibleIds.add(id)));

    for (const point of points) {
      if (point.type === "route" || !PM.isPointVisible(point, settings, routes)) continue;
      if (normalized.showAll || isNearRevealedRoute(point, routeReveals)) visibleIds.add(point.id);
    }

    return {
      ...normalized,
      activeRouteId: activeRoute ? activeRoute.id : "",
      step: activeReveal ? activeReveal.step : normalized.step,
      routeInfo: combinedRouteInfo,
      activeRoute,
      routePoints: activeReveal ? activeReveal.routePoints : [],
      routeReveals,
      visibleIds
    };
  }

  function isPointRevealed(point, points, settings, revealInfo, routes) {
    if (!revealInfo || !revealInfo.active) return PM.isPointVisible(point, settings, routes);
    if (revealInfo.showAll) return PM.isPointVisible(point, settings, routes);
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
      routeList: options.routeList,
      step: options.step,
      previousButton: options.previousButton,
      nextButton: options.nextButton,
      showAllButton: options.showAllButton,
      resetButton: options.resetButton,
      fogToggleButton: options.fogToggleButton,
      fogPanel: options.fogPanel,
      fogCloseButton: options.fogCloseButton,
      fogMode: options.fogMode,
      fogOutside: options.fogOutside,
      fogFocus: options.fogFocus,
      fogTrail: options.fogTrail,
      fogSoftness: options.fogSoftness,
      fogMemory: options.fogMemory,
      exitButton: options.exitButton
    };
    let state = normalizePresentationState({ active: false, step: 0, showAll: false }, 0);
    let fogSettings = normalizePresentationFogSettings();
    let fogPanelOpen = false;

    function routeSummaries() {
      const live = store.getLiveState();
      return visibleRoutes(live.settings, live.routes).map((route) => {
        const routeInfo = PM.computeRouteInfo(live.points, live.settings, route);
        return { route, length: routeInfo.numberedRoutes.length };
      });
    }

    function activeSummary(summaries) {
      return summaries.find((entry) => entry.route.id === state.activeRouteId)
        || summaries.find((entry) => entry.route.id === store.getLiveState().settings.activeRouteId)
        || summaries[0]
        || null;
    }

    function normalizeForSummaries(rawState, summaries) {
      const active = summaries.find((entry) => entry.route.id === rawState.activeRouteId)
        || activeSummary(summaries);
      const normalized = normalizePresentationState({
        ...rawState,
        activeRouteId: active ? active.route.id : rawState.activeRouteId
      }, active ? active.length : 0);
      const routeSteps = {};
      summaries.forEach(({ route, length }) => {
        const rawStep = rawState.routeSteps && rawState.routeSteps[route.id];
        routeSteps[route.id] = length ? (normalized.showAll ? length : PM.clamp(parseInt(rawStep, 10) || 1, 1, length)) : 0;
      });
      return {
        ...normalized,
        activeRouteId: active ? active.route.id : "",
        routeSteps,
        step: active ? routeSteps[active.route.id] : 0
      };
    }

    function renderRouteControls(summaries) {
      if (!elements.routeList) return;
      elements.routeList.textContent = "";
      summaries.forEach(({ route, length }) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = `presentation-route-pill${route.id === state.activeRouteId ? " is-active" : ""}`;
        button.style.setProperty("--route-color", route.color);
        button.disabled = !state.active || length < 1;
        button.setAttribute("aria-pressed", String(route.id === state.activeRouteId));
        button.setAttribute("title", route.name);
        button.innerHTML = [
          "<span class=\"presentation-route-swatch\" aria-hidden=\"true\"></span>",
          `<span class="presentation-route-name">${PM.escapeHtml(route.name)}</span>`,
          `<span class="presentation-route-count">${PM.escapeHtml(String(state.routeSteps[route.id] || 0))}/${PM.escapeHtml(String(length))}</span>`
        ].join("");
        button.addEventListener("click", () => {
          state = normalizeForSummaries({ ...state, activeRouteId: route.id, showAll: false }, routeSummaries());
          update();
        });
        elements.routeList.appendChild(button);
      });
    }

    function update() {
      const summaries = routeSummaries();
      state = normalizeForSummaries(state, summaries);
      root.classList.toggle("presentation-mode", state.active);
      elements.dock.hidden = !state.active;
      elements.fogPanel.hidden = !state.active || !fogPanelOpen;
      const active = activeSummary(summaries);
      const hasRoute = Boolean(active && active.length > 0);
      elements.step.textContent = hasRoute ? `${state.routeSteps[active.route.id]} / ${active.length}` : t("presentationEmpty");
      elements.previousButton.disabled = !state.active || !hasRoute || state.routeSteps[active.route.id] <= 1;
      elements.nextButton.disabled = !state.active || !hasRoute || state.routeSteps[active.route.id] >= active.length;
      elements.showAllButton.disabled = !state.active || !summaries.some((entry) => entry.length > 0) || state.showAll;
      elements.resetButton.disabled = !state.active || !summaries.some((entry) => entry.length > 0) || (!state.showAll && summaries.every((entry) => state.routeSteps[entry.route.id] <= 1));
      elements.fogToggleButton.disabled = !state.active;
      elements.exitButton.disabled = !state.active;
      elements.fogMode.value = fogSettings.mode;
      elements.fogOutside.value = String(fogSettings.outsideVisibility);
      elements.fogFocus.value = String(fogSettings.focusRadius);
      elements.fogTrail.value = String(fogSettings.trailRadius);
      elements.fogSoftness.value = String(fogSettings.edgeSoftness);
      elements.fogMemory.checked = fogSettings.trailMemory;
      renderRouteControls(summaries);
      onChange();
    }

    function enter() {
      const summaries = routeSummaries();
      const preferred = summaries.find((entry) => entry.route.id === store.getLiveState().settings.activeRouteId) || summaries[0] || null;
      if (menu && typeof menu.close === "function") menu.close();
      state = normalizeForSummaries({ active: true, activeRouteId: preferred ? preferred.route.id : "", step: 1, showAll: false }, summaries);
      update();
    }

    function exit() {
      fogPanelOpen = false;
      state = normalizeForSummaries({ active: false, step: 0, showAll: false }, routeSummaries());
      update();
    }

    function patchActiveStep(delta) {
      if (!state.active) return;
      const summaries = routeSummaries();
      const active = activeSummary(summaries);
      if (!active || active.length < 1) return;
      state = normalizeForSummaries({
        ...state,
        showAll: false,
        routeSteps: {
          ...state.routeSteps,
          [active.route.id]: (state.routeSteps[active.route.id] || 1) + delta
        }
      }, summaries);
      update();
    }

    function previous() {
      patchActiveStep(-1);
    }

    function next() {
      patchActiveStep(1);
    }

    function showAll() {
      if (!state.active) return;
      const summaries = routeSummaries();
      const routeSteps = {};
      summaries.forEach(({ route, length }) => {
        routeSteps[route.id] = length;
      });
      state = normalizeForSummaries({ ...state, routeSteps, showAll: true }, summaries);
      update();
    }

    function reset() {
      if (!state.active) return;
      const summaries = routeSummaries();
      const routeSteps = {};
      summaries.forEach(({ route, length }) => {
        routeSteps[route.id] = length ? 1 : 0;
      });
      state = normalizeForSummaries({ ...state, routeSteps, showAll: false }, summaries);
      update();
    }

    function getPresentationReveal() {
      const live = store.getLiveState();
      return computePresentationReveal(live.points, live.settings, state, live.routes);
    }

    function getPresentationFogSettings() {
      return state.active ? fogSettings : normalizePresentationFogSettings({ mode: "off" });
    }

    function patchFogSettings(patch) {
      fogSettings = normalizePresentationFogSettings({ ...fogSettings, ...patch });
      update();
    }

    function toggleFogPanel() {
      if (!state.active) return;
      fogPanelOpen = !fogPanelOpen;
      update();
    }

    function closeFogPanel() {
      fogPanelOpen = false;
      update();
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
    elements.fogToggleButton.addEventListener("click", toggleFogPanel);
    elements.fogCloseButton.addEventListener("click", closeFogPanel);
    elements.fogMode.addEventListener("change", () => patchFogSettings({ mode: elements.fogMode.value }));
    elements.fogOutside.addEventListener("input", () => patchFogSettings({ outsideVisibility: elements.fogOutside.value }));
    elements.fogFocus.addEventListener("input", () => patchFogSettings({ focusRadius: elements.fogFocus.value }));
    elements.fogTrail.addEventListener("input", () => patchFogSettings({ trailRadius: elements.fogTrail.value }));
    elements.fogSoftness.addEventListener("input", () => patchFogSettings({ edgeSoftness: elements.fogSoftness.value }));
    elements.fogMemory.addEventListener("change", () => patchFogSettings({ trailMemory: elements.fogMemory.checked }));
    elements.exitButton.addEventListener("click", exit);
    document.addEventListener("keydown", handleKeydown);
    PM.getPresentationReveal = getPresentationReveal;
    PM.getPresentationFogSettings = getPresentationFogSettings;
    store.subscribe(update);

    return {
      enter,
      exit,
      previous,
      next,
      showAll,
      reset,
      getPresentationReveal,
      getPresentationFogSettings
    };
  }

  PM.normalizePresentationState = normalizePresentationState;
  PM.normalizePresentationFogSettings = normalizePresentationFogSettings;
  PM.computePresentationReveal = computePresentationReveal;
  PM.isPointRevealed = isPointRevealed;
  PM.createPresentationController = createPresentationController;
})(globalThis.PM);
