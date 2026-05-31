(function pointInspectorModule(PM) {
  "use strict";

  const PREFS_KEY = "pmPointInspectorPrefsV1";
  const DEFAULT_FLOAT = { left: 28, top: 120 };

  function loadPrefs() {
    try {
      const raw = JSON.parse(localStorage.getItem(PREFS_KEY) || "{}");
      return {
        mode: raw.mode === "dock" ? "dock" : "float",
        left: PM.clamp(parseInt(raw.left, 10) || DEFAULT_FLOAT.left, 8, Math.max(8, innerWidth - 320)),
        top: PM.clamp(parseInt(raw.top, 10) || DEFAULT_FLOAT.top, 8, Math.max(8, innerHeight - 260))
      };
    } catch (_error) {
      return { mode: "float", ...DEFAULT_FLOAT };
    }
  }

  function savePrefs(prefs) {
    try {
      localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
    } catch (_error) {
      // localStorage can be unavailable for hardened file URL setups.
    }
  }

  function createPointInspector(elements, store, renderer) {
    const {
      panel,
      dragHandle,
      title,
      sub,
      routeChip,
      routeSwatch,
      routeName,
      closeButton,
      modeButton,
      jumpButton,
      saveButton,
      deleteButton,
      typeSelect,
      routeField,
      routeSelect,
      helperField,
      helperInput,
      labelInput,
      locationInput,
      durationInput,
      noteInput
    } = elements;

    let activePointId = "";
    let dirty = false;
    let prefs = loadPrefs();
    let drag = null;

    function t(key) {
      return PM.I18n.t(store.getLiveState().settings.locale, key);
    }

    function activePoint() {
      return store.getLiveState().points.find((point) => point.id === activePointId) || null;
    }

    function pointTypeLabel(locale, type) {
      return type === "route" ? PM.I18n.t(locale, "routePoint") : PM.I18n.pointLabel(locale, type);
    }

    function currentIcon(point) {
      if (!point) return "";
      return point.type === "route" ? "\uD83D\uDDFA\uFE0F" : PM.getPointType(point.type).icon;
    }

    function clampFloatPosition() {
      const rect = panel.getBoundingClientRect();
      prefs.left = PM.clamp(prefs.left, 8, Math.max(8, innerWidth - rect.width - 8));
      prefs.top = PM.clamp(prefs.top, 8, Math.max(8, innerHeight - rect.height - 8));
    }

    function applyMode() {
      panel.dataset.mode = prefs.mode;
      panel.classList.toggle("is-docked", prefs.mode === "dock");
      panel.classList.toggle("is-floating", prefs.mode === "float");
      modeButton.textContent = prefs.mode === "dock" ? t("floatInspector") : t("dockInspector");
      modeButton.setAttribute("aria-label", modeButton.textContent);
      if (prefs.mode === "float") {
        clampFloatPosition();
        panel.style.left = `${prefs.left}px`;
        panel.style.top = `${prefs.top}px`;
        panel.style.right = "auto";
      } else {
        panel.style.left = "";
        panel.style.top = "";
        panel.style.right = "";
      }
      savePrefs(prefs);
    }

    function setDirty(value) {
      dirty = Boolean(value);
      panel.classList.toggle("is-dirty", dirty);
    }

    function renderTypeOptions(locale, selected) {
      typeSelect.textContent = "";
      for (const entry of PM.POINT_TYPES) {
        const option = document.createElement("option");
        option.value = entry.type;
        option.textContent = `${entry.type === "route" ? "\uD83D\uDDFA\uFE0F" : entry.icon} ${pointTypeLabel(locale, entry.type)}`;
        option.selected = entry.type === selected;
        typeSelect.appendChild(option);
      }
    }

    function renderRouteOptions(routes, selected) {
      routeSelect.textContent = "";
      for (const route of routes) {
        const option = document.createElement("option");
        option.value = route.id;
        option.textContent = route.name;
        option.selected = route.id === selected;
        routeSelect.appendChild(option);
      }
    }

    function syncConditionalFields() {
      const isRoute = typeSelect.value === "route";
      routeField.hidden = !isRoute;
      helperField.hidden = !isRoute;
    }

    function render(force) {
      if (panel.hidden) return;
      const state = store.getLiveState();
      const locale = state.settings.locale;
      const point = activePoint();
      if (!point) {
        close();
        return;
      }
      if (dirty && !force) return;
      const route = PM.routeForPoint(point, state.routes) || PM.getActiveRoute(state.settings, state.routes);
      title.textContent = `${currentIcon(point)} ${point.label || pointTypeLabel(locale, point.type)}`.trim();
      sub.textContent = point.type === "route" ? t(point.helper ? "helperPoint" : "routePoint") : pointTypeLabel(locale, point.type);
      routeChip.hidden = point.type !== "route";
      routeSwatch.style.background = route ? route.color : "#ffffff";
      routeName.textContent = route ? route.name : "";
      renderTypeOptions(locale, point.type);
      renderRouteOptions(state.routes, point.routeId || state.settings.activeRouteId);
      helperInput.checked = Boolean(point.helper);
      labelInput.value = point.label || "";
      locationInput.value = point.location || "";
      durationInput.value = point.duration || "";
      noteInput.value = point.note || "";
      syncConditionalFields();
      applyMode();
      setDirty(false);
    }

    function open(pointId, options) {
      const point = store.getLiveState().points.find((entry) => entry.id === pointId);
      if (!point) return;
      activePointId = pointId;
      if (options && (options.mode === "dock" || options.mode === "float")) prefs.mode = options.mode;
      if (options && options.anchor && prefs.mode === "float") {
        prefs.left = options.anchor.x + 12;
        prefs.top = options.anchor.y + 12;
      }
      panel.hidden = false;
      render(true);
      labelInput.focus();
      labelInput.select();
    }

    function close() {
      panel.hidden = true;
      activePointId = "";
      setDirty(false);
    }

    function save() {
      const point = activePoint();
      if (!point) return;
      const type = typeSelect.value;
      store.patchPoint(point.id, {
        type,
        routeId: type === "route" ? routeSelect.value : "",
        helper: type === "route" ? helperInput.checked : false,
        label: labelInput.value.trim(),
        location: locationInput.value.trim(),
        duration: durationInput.value.trim(),
        note: noteInput.value
      });
      setDirty(false);
      render(true);
    }

    function jump() {
      const point = activePoint();
      if (!point) return;
      const state = store.getLiveState();
      if (state.settings.filters[point.type] === false) {
        store.setFilter(point.type, true);
      }
      if (point.type === "route" && point.routeId) {
        store.setActiveRoute(point.routeId);
      }
      if (state.settings.focusMode && point.type !== "route") store.setSettings({ focusMode: false });
      renderer.centerOnPoint(point);
      setTimeout(() => {
        if (PM.flashPoint) PM.flashPoint(point.id);
      }, 80);
    }

    function removePoint() {
      const point = activePoint();
      if (!point) return;
      if (confirm(t("deleteConfirm"))) {
        store.deletePoint(point.id);
        close();
      }
    }

    function markDirty() {
      setDirty(true);
      syncConditionalFields();
    }

    [typeSelect, routeSelect, helperInput, labelInput, locationInput, durationInput, noteInput].forEach((input) => {
      input.addEventListener("input", markDirty);
      input.addEventListener("change", markDirty);
    });
    saveButton.addEventListener("click", save);
    jumpButton.addEventListener("click", jump);
    deleteButton.addEventListener("click", removePoint);
    closeButton.addEventListener("click", close);
    modeButton.addEventListener("click", () => {
      prefs.mode = prefs.mode === "dock" ? "float" : "dock";
      applyMode();
    });

    dragHandle.addEventListener("pointerdown", (event) => {
      if (event.target.closest("button")) return;
      event.preventDefault();
      prefs.mode = "float";
      applyMode();
      drag = {
        pointerId: event.pointerId,
        x: event.clientX,
        y: event.clientY,
        left: prefs.left,
        top: prefs.top
      };
      dragHandle.setPointerCapture(event.pointerId);
      panel.classList.add("is-moving");
    });
    dragHandle.addEventListener("pointermove", (event) => {
      if (!drag || event.pointerId !== drag.pointerId) return;
      prefs.left = drag.left + event.clientX - drag.x;
      prefs.top = drag.top + event.clientY - drag.y;
      applyMode();
    });
    function stopDrag(event) {
      if (!drag || (event && event.pointerId !== drag.pointerId)) return;
      if (event) dragHandle.releasePointerCapture(event.pointerId);
      drag = null;
      panel.classList.remove("is-moving");
    }
    dragHandle.addEventListener("pointerup", stopDrag);
    dragHandle.addEventListener("pointercancel", stopDrag);

    document.addEventListener("keydown", (event) => {
      if (panel.hidden) return;
      if (event.key === "Escape") close();
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") {
        event.preventDefault();
        save();
      }
    });

    window.addEventListener("resize", () => {
      if (!panel.hidden && prefs.mode === "float") applyMode();
    });

    store.subscribe(() => render(false));

    return {
      open,
      close,
      render,
      isOpen() {
        return !panel.hidden;
      }
    };
  }

  PM.createPointInspector = createPointInspector;
})(globalThis.PM);
