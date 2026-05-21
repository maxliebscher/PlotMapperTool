(function stateModule(PM) {
  "use strict";

  function normalizeSettings(input) {
    const base = PM.clone(PM.DEFAULT_SETTINGS);
    const raw = input || {};
    const settings = { ...base, ...raw };
    settings.locale = PM.I18n.normalizeLocale(settings.locale);
    settings.theme = PM.THEMES.includes(settings.theme) ? settings.theme : base.theme;
    settings.filters = { ...base.filters, ...(raw.filters || {}) };
    settings.chapterStart = Math.max(1, parseInt(settings.chapterStart, 10) || 1);
    settings.zoom = PM.clamp(Number(settings.zoom) || 1, 1, 5);
    settings.opacity = PM.clamp(Number(settings.opacity) || 1, 0.1, 1);
    settings.panX = Number(settings.panX) || 0;
    settings.panY = Number(settings.panY) || 0;
    settings.routeWidth = PM.clamp(parseInt(settings.routeWidth, 10) || 2, 1, 12);
    settings.fontScale = PM.clamp(Number(settings.fontScale) || 1, 0.75, 1.6);
    settings.pointSizePx = PM.clamp(parseInt(settings.pointSizePx, 10) || base.pointSizePx, 22, 48);
    const helperPointSize = raw.helperPointSizePx === undefined ? raw.midpointSizePx : raw.helperPointSizePx;
    settings.helperPointSizePx = PM.clamp(parseInt(helperPointSize, 10) || base.helperPointSizePx, 12, 32);
    delete settings.midpointSizePx;
    settings.routeColor = /^#[0-9a-f]{6}$/i.test(settings.routeColor || "") ? settings.routeColor : base.routeColor;
    settings.activeRouteId = String(settings.activeRouteId || base.activeRouteId);
    return settings;
  }

  function validColor(value, fallback) {
    return /^#[0-9a-f]{6}$/i.test(value || "") ? String(value) : fallback;
  }

  function normalizeArrowMode(input, base) {
    if (PM.ARROW_MODES.includes(input.arrowMode)) return input.arrowMode;
    if (input.showArrows !== undefined) return input.showArrows ? "middle" : "none";
    if (PM.ARROW_MODES.includes(base.arrowMode)) return base.arrowMode;
    return base.showArrows ? "middle" : "none";
  }

  function normalizeRoute(raw, fallback, usedIds) {
    const base = { ...PM.DEFAULT_ROUTE, ...(fallback || {}) };
    const input = raw || {};
    let id = String(input.id || base.id || PM.uid("route"));
    if (!id || usedIds.has(id)) {
      const root = id || PM.uid("route");
      let index = 2;
      while (usedIds.has(`${root}-${index}`)) index += 1;
      id = `${root}-${index}`;
    }
    usedIds.add(id);
    const arrowMode = normalizeArrowMode(input, base);
    return {
      id,
      name: String(input.name || base.name || "Route"),
      color: validColor(input.color, base.color),
      visible: input.visible === undefined ? Boolean(base.visible) : Boolean(input.visible),
      showNumbers: input.showNumbers === undefined ? Boolean(base.showNumbers) : Boolean(input.showNumbers),
      showArrows: arrowMode !== "none",
      arrowMode,
      startNumber: Math.max(1, parseInt(input.startNumber, 10) || base.startNumber || 1),
      lineStyle: PM.LINE_STYLES.includes(input.lineStyle) ? input.lineStyle : base.lineStyle,
      width: PM.clamp(parseInt(input.width, 10) || base.width || 2, 1, 12)
    };
  }

  function defaultRouteFromSettings(settings) {
    return {
      ...PM.DEFAULT_ROUTE,
      id: PM.DEFAULT_ROUTE_ID,
      name: settings.locale === "de" ? "Route" : "Route",
      color: settings.routeColor,
      width: settings.routeWidth,
      startNumber: settings.chapterMode ? settings.chapterStart : 1
    };
  }

  function normalizeMap(input) {
    const raw = input || {};
    return {
      name: String(raw.name || ""),
      dataUrl: String(raw.dataUrl || ""),
      width: Math.max(0, parseInt(raw.width, 10) || 0),
      height: Math.max(0, parseInt(raw.height, 10) || 0)
    };
  }

  function normalizePoint(raw) {
    const input = raw || {};
    const type = PM.POINT_TYPES.some((entry) => entry.type === input.type) ? input.type : "route";
    return {
      id: String(input.id || PM.uid("pt")),
      x: PM.clamp(Number(input.x) || 0, 0, 1),
      y: PM.clamp(Number(input.y) || 0, 0, 1),
      type,
      label: String(input.label || ""),
      note: String(input.note || ""),
      location: String(input.location || ""),
      duration: String(input.duration || ""),
      helper: Boolean(input.helper),
      routeId: type === "route" ? String(input.routeId || PM.DEFAULT_ROUTE_ID) : ""
    };
  }

  function createEmptyProject(settings) {
    const normalizedSettings = normalizeSettings(settings);
    return {
      schemaVersion: PM.SCHEMA_VERSION,
      appVersion: PM.APP_VERSION,
      map: PM.clone(PM.EMPTY_MAP),
      settings: normalizedSettings,
      routes: [normalizeRoute(PM.DEFAULT_ROUTE, defaultRouteFromSettings(normalizedSettings), new Set())],
      points: []
    };
  }

  function ensureActiveRouteVisible(settings, routes) {
    let activeRoute = routes.find((route) => route.id === settings.activeRouteId) || routes[0];
    if (!activeRoute) return null;
    if (activeRoute.visible === false) {
      const visibleRoute = routes.find((route) => route.visible !== false);
      if (visibleRoute) {
        settings.activeRouteId = visibleRoute.id;
        activeRoute = visibleRoute;
      } else {
        activeRoute.visible = true;
      }
    }
    return activeRoute;
  }

  function normalizeProject(input) {
    const raw = input || createEmptyProject();
    const settings = normalizeSettings(raw.settings);
    const rawSettings = raw.settings || {};
    const hasHelperSize = rawSettings.helperPointSizePx !== undefined || rawSettings.midpointSizePx !== undefined;
    if (!hasHelperSize && Array.isArray(raw.points) && raw.points.length) {
      settings.helperPointSizePx = PM.DEFAULT_SETTINGS.pointSizePx;
    }
    const usedIds = new Set();
    const routeFallback = defaultRouteFromSettings(settings);
    const routes = Array.isArray(raw.routes) && raw.routes.length
      ? raw.routes.map((route) => normalizeRoute(route, routeFallback, usedIds))
      : [normalizeRoute(routeFallback, routeFallback, usedIds)];
    const routeIds = new Set(routes.map((route) => route.id));
    if (!routeIds.has(settings.activeRouteId)) {
      settings.activeRouteId = routes[0].id;
    }
    const activeRoute = ensureActiveRouteVisible(settings, routes) || routes[0];
    settings.routeColor = activeRoute.color;
    settings.routeWidth = activeRoute.width;
    settings.chapterStart = activeRoute.startNumber;
    return {
      schemaVersion: PM.SCHEMA_VERSION,
      appVersion: String(raw.appVersion || PM.APP_VERSION),
      map: normalizeMap(raw.map),
      settings,
      routes,
      points: Array.isArray(raw.points)
        ? raw.points.map((point) => {
          const normalized = normalizePoint(point);
          if (normalized.type === "route" && !routeIds.has(normalized.routeId)) {
            normalized.routeId = routes[0].id;
          }
          if (normalized.type !== "route") normalized.routeId = "";
          return normalized;
        })
        : []
    };
  }

  function getRouteById(routes, routeId) {
    return (routes || []).find((route) => route.id === routeId) || null;
  }

  function getActiveRoute(settings, routes) {
    const list = Array.isArray(routes) && routes.length ? routes : [PM.DEFAULT_ROUTE];
    return getRouteById(list, settings && settings.activeRouteId) || list[0];
  }

  function routeForPoint(point, routes) {
    return point && point.type === "route" ? getRouteById(routes, point.routeId) : null;
  }

  function computeRouteInfo(points, settings, route) {
    const stepById = new Map();
    const displayById = new Map();
    const numberedRoutes = [];
    const routeId = route && route.id ? route.id : (settings && settings.activeRouteId);
    const startNumber = route && route.startNumber ? route.startNumber : (settings && settings.chapterMode ? settings.chapterStart : 1);
    const showNumbers = !route || route.showNumbers !== false;
    let step = 1;
    for (const point of points) {
      if (point.type !== "route") continue;
      if (routeId && point.routeId && point.routeId !== routeId) continue;
      if (point.helper) {
        stepById.set(point.id, "");
        displayById.set(point.id, "");
        continue;
      }
      const display = showNumbers ? startNumber + step - 1 : "";
      stepById.set(point.id, step);
      displayById.set(point.id, display);
      numberedRoutes.push(point);
      step += 1;
    }
    return { stepById, displayById, numberedRoutes };
  }

  function computeRoutesInfo(points, settings, routes) {
    const stepById = new Map();
    const displayById = new Map();
    const numberedRoutes = [];
    const list = Array.isArray(routes) && routes.length ? routes : [getActiveRoute(settings, routes)];
    for (const route of list) {
      const info = computeRouteInfo(points, settings, route);
      info.stepById.forEach((value, key) => stepById.set(key, value));
      info.displayById.forEach((value, key) => displayById.set(key, value));
      numberedRoutes.push(...info.numberedRoutes);
    }
    return { stepById, displayById, numberedRoutes };
  }

  function isPointVisible(point, settings, routes) {
    if (settings.focusMode && point.type !== "route") return false;
    if (point.type === "route") {
      const route = routeForPoint(point, routes);
      if (route && !route.visible) return false;
    }
    return Boolean(settings.filters[point.type]);
  }

  function createStore(project) {
    let state = normalizeProject(project);
    let dirty = false;
    const listeners = new Set();
    const undoStack = [];
    const redoStack = [];

    function snapshot() {
      return JSON.stringify({
        map: state.map,
        settings: state.settings,
        routes: state.routes,
        points: state.points
      });
    }

    function restoreSnapshot(serialized) {
      const parsed = JSON.parse(serialized);
      state = normalizeProject({
        schemaVersion: PM.SCHEMA_VERSION,
        appVersion: state.appVersion,
        map: parsed.map,
        settings: parsed.settings,
        routes: parsed.routes,
        points: parsed.points
      });
    }

    function emit() {
      const exposed = api.getState();
      listeners.forEach((listener) => listener(exposed));
    }

    function commit(mutator, options) {
      const opts = { history: true, dirty: true, emit: true, ...(options || {}) };
      const before = opts.history ? snapshot() : "";
      mutator(state);
      state = normalizeProject(state);
      if (opts.history && before !== snapshot()) {
        undoStack.push(before);
        redoStack.length = 0;
      }
      if (opts.dirty) dirty = true;
      if (opts.emit) emit();
    }

    const api = {
      getState() {
        return PM.clone(state);
      },
      getLiveState() {
        return state;
      },
      subscribe(listener) {
        listeners.add(listener);
        listener(api.getState());
        return () => listeners.delete(listener);
      },
      isDirty() {
        return dirty;
      },
      markSaved() {
        dirty = false;
      },
      createCheckpoint() {
        return snapshot();
      },
      commitCheckpoint(checkpoint) {
        if (checkpoint && checkpoint !== snapshot()) {
          undoStack.push(checkpoint);
          redoStack.length = 0;
          dirty = true;
          emit();
        }
      },
      setProject(projectInput) {
        state = normalizeProject(projectInput);
        undoStack.length = 0;
        redoStack.length = 0;
        dirty = false;
        emit();
      },
      reset() {
        state = createEmptyProject({ locale: state.settings.locale, theme: state.settings.theme });
        undoStack.length = 0;
        redoStack.length = 0;
        dirty = false;
        emit();
      },
      setMap(map) {
        commit((draft) => {
          draft.map = normalizeMap(map);
          draft.settings.zoom = 1;
          draft.settings.opacity = 1;
          draft.settings.panX = 0;
          draft.settings.panY = 0;
        }, { history: false });
      },
      setSettings(patch) {
        commit((draft) => {
          draft.settings = normalizeSettings({ ...draft.settings, ...patch });
        }, { history: false });
      },
      setFilter(type, value) {
        commit((draft) => {
          draft.settings.filters[type] = Boolean(value);
        }, { history: false });
      },
      setActiveRoute(routeId) {
        commit((draft) => {
          const route = draft.routes.find((entry) => entry.id === routeId);
          if (route) {
            route.visible = true;
            draft.settings.activeRouteId = route.id;
          }
        });
      },
      addRoute(route) {
        let id = "";
        commit((draft) => {
          const index = draft.routes.length + 1;
          const usedIds = new Set(draft.routes.map((entry) => entry.id));
          const next = normalizeRoute({
            id: PM.uid("route"),
            name: route && route.name ? route.name : `Route ${index}`,
            color: route && route.color ? route.color : PM.routePalette(index - 1),
            ...(route || {})
          }, PM.DEFAULT_ROUTE, usedIds);
          id = next.id;
          draft.routes.push(next);
          draft.settings.activeRouteId = id;
        });
        return id;
      },
      patchRoute(routeId, patch, options) {
        commit((draft) => {
          const index = draft.routes.findIndex((route) => route.id === routeId);
          if (index < 0) return;
          const usedIds = new Set(draft.routes.map((route) => route.id).filter((id) => id !== routeId));
          draft.routes[index] = normalizeRoute({ ...draft.routes[index], ...patch, id: routeId }, draft.routes[index], usedIds);
        }, options);
      },
      deleteRoute(routeId) {
        commit((draft) => {
          if (draft.routes.length <= 1) return;
          const index = draft.routes.findIndex((route) => route.id === routeId);
          if (index < 0) return;
          draft.routes.splice(index, 1);
          draft.points = draft.points.filter((point) => point.type !== "route" || point.routeId !== routeId);
          if (draft.settings.activeRouteId === routeId) {
            draft.settings.activeRouteId = draft.routes[Math.max(0, index - 1)].id;
          }
        });
      },
      addPoint(point) {
        let id = "";
        commit((draft) => {
          const next = normalizePoint({
            ...point,
            routeId: point && point.type === "route" ? (point.routeId || draft.settings.activeRouteId) : ""
          });
          id = next.id;
          draft.points.push(next);
        });
        return id;
      },
      insertRoutePointAfter(pointId, x, y) {
        let id = "";
        commit((draft) => {
          const index = draft.points.findIndex((point) => point.id === pointId);
          const previous = draft.points[index];
          const next = normalizePoint({ x, y, type: "route", routeId: previous && previous.routeId ? previous.routeId : draft.settings.activeRouteId });
          id = next.id;
          draft.points.splice(index >= 0 ? index + 1 : draft.points.length, 0, next);
        });
        return id;
      },
      patchPoint(pointId, patch, options) {
        commit((draft) => {
          const point = draft.points.find((entry) => entry.id === pointId);
          if (!point) return;
          Object.assign(point, patch);
          if (point.type === "route" && !point.routeId) point.routeId = draft.settings.activeRouteId;
          if (point.type !== "route") {
            point.routeId = "";
            point.helper = false;
          }
        }, options);
      },
      deletePoint(pointId) {
        commit((draft) => {
          draft.points = draft.points.filter((point) => point.id !== pointId);
        });
      },
      clearPoints() {
        commit((draft) => {
          draft.points = [];
        });
      },
      replacePoints(points) {
        commit((draft) => {
          draft.points = Array.isArray(points) ? points : [];
        });
      },
      undo() {
        if (!undoStack.length) return;
        const before = snapshot();
        const previous = undoStack.pop();
        redoStack.push(before);
        restoreSnapshot(previous);
        dirty = true;
        emit();
      },
      redo() {
        if (!redoStack.length) return;
        const before = snapshot();
        const next = redoStack.pop();
        undoStack.push(before);
        restoreSnapshot(next);
        dirty = true;
        emit();
      },
      canUndo() {
        return undoStack.length > 0;
      },
      canRedo() {
        return redoStack.length > 0;
      }
    };

    return api;
  }

  PM.normalizeSettings = normalizeSettings;
  PM.normalizeRoute = normalizeRoute;
  PM.normalizeMap = normalizeMap;
  PM.normalizePoint = normalizePoint;
  PM.createEmptyProject = createEmptyProject;
  PM.normalizeProject = normalizeProject;
  PM.getRouteById = getRouteById;
  PM.getActiveRoute = getActiveRoute;
  PM.routeForPoint = routeForPoint;
  PM.computeRouteInfo = computeRouteInfo;
  PM.computeRoutesInfo = computeRoutesInfo;
  PM.isPointVisible = isPointVisible;
  PM.createStore = createStore;
})(globalThis.PM);
