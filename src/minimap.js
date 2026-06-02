(function minimapModule(PM) {
  "use strict";

  const PREF_KEY = "pmMinimapPrefsV1";

  function clampNumber(value, fallback, min, max) {
    return PM.clamp(Number.isFinite(Number(value)) ? Number(value) : fallback, min, max);
  }

  function normalizePrefs(input) {
    const raw = input || {};
    return {
      mode: ["auto", "pin", "off"].includes(raw.mode) ? raw.mode : "auto",
      showRoutes: raw.showRoutes !== false,
      width: clampNumber(raw.width, 270, 190, 420),
      x: raw.x === null || raw.x === undefined ? null : clampNumber(raw.x, 0, 0, innerWidth),
      y: raw.y === null || raw.y === undefined ? null : clampNumber(raw.y, 0, 0, innerHeight)
    };
  }

  function loadPrefs() {
    try {
      return normalizePrefs(JSON.parse(localStorage.getItem(PREF_KEY) || "{}"));
    } catch (_error) {
      return normalizePrefs();
    }
  }

  function savePrefs(prefs) {
    try {
      localStorage.setItem(PREF_KEY, JSON.stringify(prefs));
    } catch (_error) {
      // Minimap preferences are UI-only niceties; the app works without localStorage.
    }
  }

  function routeDash(route) {
    if (route.lineStyle === "dashed") return "12 8";
    if (route.lineStyle === "dotted") return `2 ${Math.max(5, route.width * 1.6)}`;
    return "";
  }

  function createSvgElement(name) {
    return document.createElementNS("http://www.w3.org/2000/svg", name);
  }

  function createMinimap(options) {
    const panel = options.panel;
    const canvas = options.canvas;
    const viewport = options.viewport;
    const svg = options.svg;
    const dragHandle = options.dragHandle;
    const resizeHandle = options.resizeHandle;
    const autoButton = options.autoButton;
    const pinButton = options.pinButton;
    const routesButton = options.routesButton;
    const closeButton = options.closeButton;
    const toggleButton = options.toggleButton;
    const store = options.store;
    const renderer = options.renderer;
    const mainCanvas = options.mainCanvas;
    let prefs = loadPrefs();
    let drag = null;
    let resize = null;
    let viewportDrag = null;
    let latestState = store.getState();

    function persist(patch) {
      prefs = normalizePrefs({ ...prefs, ...patch });
      savePrefs(prefs);
      render(latestState);
    }

    function clampPanelPosition() {
      if (prefs.x === null || prefs.y === null) return;
      const rect = panel.getBoundingClientRect();
      prefs.x = PM.clamp(prefs.x, 8, Math.max(8, innerWidth - rect.width - 8));
      prefs.y = PM.clamp(prefs.y, 8, Math.max(8, innerHeight - rect.height - 8));
      panel.style.left = `${prefs.x}px`;
      panel.style.top = `${prefs.y}px`;
      panel.style.right = "auto";
      panel.style.bottom = "auto";
    }

    function applyPanelPrefs() {
      panel.style.width = `${PM.clamp(prefs.width, 190, Math.min(420, Math.max(190, innerWidth - 16)))}px`;
      if (prefs.x === null || prefs.y === null) {
        panel.style.left = "auto";
        panel.style.top = "auto";
        panel.style.right = "18px";
        panel.style.bottom = innerWidth <= 760 ? "74px" : "18px";
      } else {
        clampPanelPosition();
      }
    }

    function visibleBounds() {
      const rect = renderer.getImageRect();
      const width = mainCanvas.clientWidth || innerWidth;
      const height = mainCanvas.clientHeight || innerHeight;
      if (!rect.w || !rect.h) return { left: 0, top: 0, width: 1, height: 1 };
      const left = PM.clamp((0 - rect.x) / rect.w, 0, 1);
      const top = PM.clamp((0 - rect.y) / rect.h, 0, 1);
      const right = PM.clamp((width - rect.x) / rect.w, 0, 1);
      const bottom = PM.clamp((height - rect.y) / rect.h, 0, 1);
      return {
        left,
        top,
        width: Math.max(0.04, right - left),
        height: Math.max(0.04, bottom - top)
      };
    }

    function drawRoutes(state) {
      svg.textContent = "";
      if (!prefs.showRoutes) return;
      const visibleRoutes = state.routes.filter((route) => route.visible);
      visibleRoutes.forEach((route) => {
        const points = state.points.filter((point) => point.type === "route" && point.routeId === route.id && PM.isPointVisible(point, state.settings, state.routes));
        if (points.length >= 2) {
          const path = createSvgElement("path");
          path.setAttribute("d", points.map((point, index) => `${index ? "L" : "M"}${(point.x * 1000).toFixed(1)} ${(point.y * 562.5).toFixed(1)}`).join(" "));
          path.setAttribute("stroke", route.color);
          path.setAttribute("stroke-width", String(Math.max(2.5, route.width * 1.2)));
          path.setAttribute("fill", "none");
          path.setAttribute("stroke-linecap", "round");
          path.setAttribute("stroke-linejoin", "round");
          const dash = routeDash(route);
          if (dash) path.setAttribute("stroke-dasharray", dash);
          svg.appendChild(path);
        }
        points.forEach((point) => {
          const circle = createSvgElement("circle");
          circle.setAttribute("cx", String(point.x * 1000));
          circle.setAttribute("cy", String(point.y * 562.5));
          circle.setAttribute("r", point.helper ? "7" : "9");
          circle.setAttribute("fill", point.helper ? "rgba(230,235,228,.82)" : route.color);
          circle.setAttribute("stroke", "rgba(0,0,0,.72)");
          circle.setAttribute("stroke-width", "3");
          svg.appendChild(circle);
        });
      });
    }

    function updateLabels(state) {
      const locale = state.settings.locale;
      panel.querySelector("#minimapTitle").textContent = PM.I18n.t(locale, "minimap");
      panel.querySelector("#minimapHint").textContent = prefs.mode === "auto"
        ? PM.I18n.t(locale, "minimapAuto")
        : prefs.mode === "pin"
          ? PM.I18n.t(locale, "minimapPinned")
          : PM.I18n.t(locale, "minimapOff");
      autoButton.textContent = PM.I18n.t(locale, "minimapAutoShort");
      pinButton.textContent = PM.I18n.t(locale, "minimapPinShort");
      routesButton.textContent = PM.I18n.t(locale, "minimapRoutesShort");
      closeButton.textContent = "x";
      autoButton.setAttribute("title", PM.I18n.t(locale, "minimapAuto"));
      pinButton.setAttribute("title", PM.I18n.t(locale, "minimapPinned"));
      routesButton.setAttribute("title", PM.I18n.t(locale, prefs.showRoutes ? "minimapRoutesHide" : "minimapRoutesShow"));
      routesButton.setAttribute("aria-label", PM.I18n.t(locale, prefs.showRoutes ? "minimapRoutesHide" : "minimapRoutesShow"));
      routesButton.setAttribute("aria-pressed", String(prefs.showRoutes));
      closeButton.setAttribute("title", PM.I18n.t(locale, "close"));
      resizeHandle.setAttribute("aria-label", PM.I18n.t(locale, "minimapResize"));
      canvas.setAttribute("aria-label", PM.I18n.t(locale, "minimapJump"));
      if (toggleButton) {
        toggleButton.setAttribute("aria-label", PM.I18n.t(locale, "minimap"));
        toggleButton.setAttribute("title", PM.I18n.t(locale, "minimap"));
        toggleButton.setAttribute("aria-pressed", String(prefs.mode !== "off"));
      }
    }

    function render(stateInput) {
      latestState = stateInput || latestState;
      const state = latestState;
      applyPanelPrefs();
      updateLabels(state);
      autoButton.classList.toggle("is-active", prefs.mode === "auto");
      pinButton.classList.toggle("is-active", prefs.mode === "pin");
      routesButton.classList.toggle("is-active", prefs.showRoutes);
      const hasMap = Boolean(state.map.dataUrl) && renderer.hasImage();
      const shouldShow = hasMap && (prefs.mode === "pin" || (prefs.mode === "auto" && state.settings.zoom >= 1.3));
      panel.hidden = !shouldShow;
      if (!hasMap) return;
      canvas.style.backgroundImage = `linear-gradient(rgba(3,7,9,.12), rgba(3,7,9,.12)), url("${state.map.dataUrl}")`;
      drawRoutes(state);
      const bounds = visibleBounds();
      viewport.style.left = `${bounds.left * 100}%`;
      viewport.style.top = `${bounds.top * 100}%`;
      viewport.style.width = `${bounds.width * 100}%`;
      viewport.style.height = `${bounds.height * 100}%`;
      panel.querySelector("#minimapMetric").textContent = `${Math.round(bounds.width * 100)}% x ${Math.round(bounds.height * 100)}%`;
    }

    function jumpTo(clientX, clientY) {
      if (!renderer.hasImage()) return;
      const rect = canvas.getBoundingClientRect();
      const x = PM.clamp((clientX - rect.left) / rect.width, 0, 1);
      const y = PM.clamp((clientY - rect.top) / rect.height, 0, 1);
      renderer.centerOnPoint({ x, y }, store.getLiveState().settings.zoom);
    }

    canvas.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      jumpTo(event.clientX, event.clientY);
    });
    viewport.addEventListener("pointerdown", (event) => {
      viewportDrag = {
        pointerId: event.pointerId
      };
      viewport.setPointerCapture(event.pointerId);
      viewport.classList.add("is-moving");
      jumpTo(event.clientX, event.clientY);
      event.preventDefault();
      event.stopPropagation();
    });
    viewport.addEventListener("pointermove", (event) => {
      if (!viewportDrag || event.pointerId !== viewportDrag.pointerId) return;
      jumpTo(event.clientX, event.clientY);
      event.preventDefault();
    });
    viewport.addEventListener("pointerup", (event) => {
      if (!viewportDrag || event.pointerId !== viewportDrag.pointerId) return;
      viewport.releasePointerCapture(event.pointerId);
      viewport.classList.remove("is-moving");
      viewportDrag = null;
      event.preventDefault();
    });
    viewport.addEventListener("pointercancel", () => {
      viewportDrag = null;
      viewport.classList.remove("is-moving");
    });
    canvas.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      const rect = canvas.getBoundingClientRect();
      jumpTo(rect.left + rect.width / 2, rect.top + rect.height / 2);
    });

    dragHandle.addEventListener("pointerdown", (event) => {
      if (event.target.closest("button")) return;
      const rect = panel.getBoundingClientRect();
      drag = {
        pointerId: event.pointerId,
        x: event.clientX,
        y: event.clientY,
        left: rect.left,
        top: rect.top
      };
      panel.setPointerCapture(event.pointerId);
      panel.classList.add("is-moving");
      event.preventDefault();
    });
    panel.addEventListener("pointermove", (event) => {
      if (drag && event.pointerId === drag.pointerId) {
        prefs.x = drag.left + event.clientX - drag.x;
        prefs.y = drag.top + event.clientY - drag.y;
        clampPanelPosition();
      }
      if (resize && event.pointerId === resize.pointerId) {
        prefs.width = PM.clamp(resize.width + event.clientX - resize.x, 190, Math.min(420, innerWidth - 16));
        panel.style.width = `${prefs.width}px`;
      }
    });
    panel.addEventListener("pointerup", (event) => {
      if (drag && event.pointerId === drag.pointerId) {
        panel.releasePointerCapture(event.pointerId);
        panel.classList.remove("is-moving");
        persist({ x: prefs.x, y: prefs.y });
        drag = null;
      }
      if (resize && event.pointerId === resize.pointerId) {
        panel.releasePointerCapture(event.pointerId);
        persist({ width: prefs.width });
        resize = null;
      }
    });
    panel.addEventListener("pointercancel", () => {
      drag = null;
      resize = null;
      panel.classList.remove("is-moving");
    });
    resizeHandle.addEventListener("pointerdown", (event) => {
      const rect = panel.getBoundingClientRect();
      resize = {
        pointerId: event.pointerId,
        x: event.clientX,
        width: rect.width
      };
      panel.setPointerCapture(event.pointerId);
      event.preventDefault();
      event.stopPropagation();
    });
    autoButton.addEventListener("click", () => persist({ mode: "auto" }));
    pinButton.addEventListener("click", () => persist({ mode: "pin" }));
    routesButton.addEventListener("click", () => persist({ showRoutes: !prefs.showRoutes }));
    closeButton.addEventListener("click", () => persist({ mode: "off" }));
    if (toggleButton) {
      toggleButton.addEventListener("click", () => {
        persist({ mode: prefs.mode === "off" ? "pin" : "off" });
      });
    }

    store.subscribe(render);
    globalThis.addEventListener("resize", () => {
      prefs = normalizePrefs(prefs);
      clampPanelPosition();
      render(latestState);
    });
    globalThis.addEventListener("pm:image-ready", () => render(store.getState()));

    return {
      render,
      setMode(mode) {
        persist({ mode });
      },
      getPrefs() {
        return { ...prefs };
      }
    };
  }

  PM.createMinimap = createMinimap;
})(globalThis.PM);
