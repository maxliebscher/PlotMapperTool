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
    settings.routeColor = /^#[0-9a-f]{6}$/i.test(settings.routeColor || "") ? settings.routeColor : base.routeColor;
    return settings;
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
      helper: Boolean(input.helper)
    };
  }

  function createEmptyProject(settings) {
    return {
      schemaVersion: PM.SCHEMA_VERSION,
      appVersion: PM.APP_VERSION,
      map: PM.clone(PM.EMPTY_MAP),
      settings: normalizeSettings(settings),
      points: []
    };
  }

  function normalizeProject(input) {
    const raw = input || createEmptyProject();
    return {
      schemaVersion: PM.SCHEMA_VERSION,
      appVersion: String(raw.appVersion || PM.APP_VERSION),
      map: normalizeMap(raw.map),
      settings: normalizeSettings(raw.settings),
      points: Array.isArray(raw.points) ? raw.points.map(normalizePoint) : []
    };
  }

  function computeRouteInfo(points, settings) {
    const stepById = new Map();
    const displayById = new Map();
    const numberedRoutes = [];
    let step = 1;
    for (const point of points) {
      if (point.type !== "route") continue;
      if (point.helper) {
        stepById.set(point.id, "");
        displayById.set(point.id, "");
        continue;
      }
      const display = settings.chapterMode ? settings.chapterStart + step - 1 : step;
      stepById.set(point.id, step);
      displayById.set(point.id, display);
      numberedRoutes.push(point);
      step += 1;
    }
    return { stepById, displayById, numberedRoutes };
  }

  function isPointVisible(point, settings) {
    if (settings.focusMode && point.type !== "route") return false;
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
      addPoint(point) {
        let id = "";
        commit((draft) => {
          const next = normalizePoint(point);
          id = next.id;
          draft.points.push(next);
        });
        return id;
      },
      insertRoutePointAfter(pointId, x, y) {
        let id = "";
        commit((draft) => {
          const index = draft.points.findIndex((point) => point.id === pointId);
          const next = normalizePoint({ x, y, type: "route" });
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
  PM.normalizeMap = normalizeMap;
  PM.normalizePoint = normalizePoint;
  PM.createEmptyProject = createEmptyProject;
  PM.normalizeProject = normalizeProject;
  PM.computeRouteInfo = computeRouteInfo;
  PM.isPointVisible = isPointVisible;
  PM.createStore = createStore;
})(globalThis.PM);
