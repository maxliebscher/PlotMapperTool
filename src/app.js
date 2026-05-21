(function appModule(PM) {
  "use strict";

  function $(id) {
    return document.getElementById(id);
  }

  function readFileAsDataUrl(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(reader.error || new Error("File read failed"));
      reader.onload = () => resolve(String(reader.result || ""));
      reader.readAsDataURL(file);
    });
  }

  function getImageSize(dataUrl) {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve({ width: image.naturalWidth, height: image.naturalHeight });
      image.onerror = () => reject(new Error("Image load failed"));
      image.src = dataUrl;
    });
  }

  function readFileAsText(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(reader.error || new Error("File read failed"));
      reader.onload = () => resolve(String(reader.result || ""));
      reader.readAsText(file);
    });
  }

  function boot() {
    const initialLocale = PM.I18n.normalizeLocale(new URLSearchParams(location.search).get("lang") || navigator.language || "en");
    const initialTheme = PM.Theme.savedTheme() || "deep";
    const UI_PREFS_KEY = "pmUiPrefsV1";
    function normalizeUiPrefs(input) {
      const raw = input || {};
      return {
        toolbarCollapsed: Boolean(raw.toolbarCollapsed),
        toolbarOpacity: PM.clamp(parseInt(raw.toolbarOpacity, 10) || 86, 55, 100)
      };
    }
    function loadUiPrefs() {
      try {
        return normalizeUiPrefs(JSON.parse(localStorage.getItem(UI_PREFS_KEY) || "{}"));
      } catch (_error) {
        return normalizeUiPrefs();
      }
    }
    function saveUiPrefs(prefs) {
      try {
        localStorage.setItem(UI_PREFS_KEY, JSON.stringify(prefs));
      } catch (_error) {
        // localStorage may be unavailable for file URLs in hardened browser setups.
      }
    }
    const store = PM.createStore(PM.createEmptyProject({ locale: initialLocale, theme: initialTheme }));
    const renderer = PM.createRenderer($("mapCanvas"), store);
    const menu = PM.createMenuController($("menuLayer"), store);
    const pointUi = PM.createPointUi($("pointLayer"), $("midLayer"), $("routeLayer"), store, renderer, menu);
    const reader = PM.createReader({
      modal: $("readerModal"),
      backdrop: $("readerBackdrop"),
      cards: $("readerCards"),
      closeButton: $("readerClose"),
      extrasToggle: $("readerExtras"),
      exportHtmlButton: $("readerExportHtml"),
      printPdfButton: $("readerPrintPdf"),
      title: $("readerTitle"),
      hint: $("readerHint"),
      extrasLabel: $("readerExtras").nextElementSibling
    }, store, renderer);

    PM.store = store;
    PM.renderer = renderer;
    let uiPrefs = loadUiPrefs();

    const controls = {
      imageLoadLabel: document.querySelector("label[for='imageInput']"),
      imageInput: $("imageInput"),
      projectInput: $("projectInput"),
      fileName: $("fileName"),
      pointTypesLabel: $("pointTypesLabel"),
      visibilityLabel: $("visibilityLabel"),
      langToggle: $("langToggle"),
      themeToggle: $("themeToggle"),
      toolbarCollapse: $("toolbarCollapse"),
      toolbarRestore: $("toolbarRestore"),
      toolbarRestoreLabel: $("toolbarRestoreLabel"),
      helpButton: $("helpButton"),
      infoPanel: $("infoPanel"),
      infoButton: $("infoButton"),
      infoClose: $("infoClose"),
      badgeVersion: $("badgeVersion"),
      emptySub: $("emptySub"),
      emptyStep1: $("emptyStep1"),
      emptyStep2: $("emptyStep2"),
      emptyStep3: $("emptyStep3"),
      helpModal: $("helpModal"),
      helpBackdrop: $("helpBackdrop"),
      helpClose: $("helpClose"),
      helpBody: $("helpBody"),
      emptyHint: $("emptyHint"),
      saveProject: $("saveProject"),
      loadProject: $("loadProject"),
      exportPng: $("exportPng"),
      clearAll: $("clearAll"),
      undo: $("undoButton"),
      redo: $("redoButton"),
      readerButton: $("readerButton"),
      presentationButton: $("presentationButton"),
      presentationDock: $("presentationDock"),
      presentationRoutes: $("presentationRoutes"),
      presentationStep: $("presentationStep"),
      presentationPrev: $("presentationPrev"),
      presentationNext: $("presentationNext"),
      presentationShowAll: $("presentationShowAll"),
      presentationReset: $("presentationReset"),
      presentationFogToggle: $("presentationFogToggle"),
      presentationFogPanel: $("presentationFogPanel"),
      presentationFogTitle: $("presentationFogTitle"),
      presentationFogClose: $("presentationFogClose"),
      presentationFogMode: $("presentationFogMode"),
      presentationFogModeLabel: $("presentationFogModeLabel"),
      presentationFogOutside: $("presentationFogOutside"),
      presentationFogOutsideLabel: $("presentationFogOutsideLabel"),
      presentationFogFocus: $("presentationFogFocus"),
      presentationFogFocusLabel: $("presentationFogFocusLabel"),
      presentationFogTrail: $("presentationFogTrail"),
      presentationFogTrailLabel: $("presentationFogTrailLabel"),
      presentationFogSoftness: $("presentationFogSoftness"),
      presentationFogSoftnessLabel: $("presentationFogSoftnessLabel"),
      presentationFogMemory: $("presentationFogMemory"),
      presentationFogMemoryLabel: $("presentationFogMemoryLabel"),
      presentationExit: $("presentationExit"),
      focusMode: $("focusMode"),
      chapterMode: $("chapterMode"),
      chapterStart: $("chapterStart"),
      routePanelToggle: $("routePanelToggle"),
      activeRouteLabel: $("activeRouteLabel"),
      routePanel: $("routePanel"),
      routePanelTitle: $("routePanelTitle"),
      routePanelCaret: $("routePanelCaret"),
      routeRows: $("routeRows"),
      addRouteButton: $("addRouteButton"),
      routeActiveHead: $("routeActiveHead"),
      routeColorHead: $("routeColorHead"),
      routeVisibleHead: $("routeVisibleHead"),
      routeNumbersHead: $("routeNumbersHead"),
      routeArrowsHead: $("routeArrowsHead"),
      routeStartHead: $("routeStartHead"),
      routeStyleHead: $("routeStyleHead"),
      routeWidthHead: $("routeWidthHead"),
      routeDeleteHead: $("routeDeleteHead"),
      routeNameHead: $("routeNameHead"),
      routeColorPopover: $("routeColorPopover"),
      routeColorPopoverLabel: $("routeColorPopoverLabel"),
      routeColorPicker: $("routeColorPicker"),
      routeColorOk: $("routeColorOk"),
      routeColorCancel: $("routeColorCancel"),
      showLines: $("showLines"),
      showLabels: $("showLabels"),
      showLocation: $("showLocation"),
      showNotes: $("showNotes"),
      showDuration: $("showDuration"),
      showEdit: $("showEdit"),
      zoom: $("zoomControl"),
      opacity: $("opacityControl"),
      pointSize: $("pointSizeControl"),
      helperPointSize: $("helperPointSizeControl"),
      toolbarOpacity: $("toolbarOpacityControl"),
      fontScale: $("fontScale"),
      filters: {
        route: $("filter-route"),
        place: $("filter-place"),
        char: $("filter-char"),
        event: $("filter-event"),
        item: $("filter-item")
      }
    };

    function t(key) {
      return PM.I18n.t(store.getLiveState().settings.locale, key);
    }

    let routePanelOpen = false;
    let routeColorEdit = null;

    function applyUiPrefs() {
      const root = document.documentElement;
      root.classList.toggle("toolbar-collapsed", uiPrefs.toolbarCollapsed);
      root.style.setProperty("--toolbar-opacity", String(uiPrefs.toolbarOpacity / 100));
      controls.toolbarOpacity.value = String(uiPrefs.toolbarOpacity);
      controls.toolbarRestore.hidden = !uiPrefs.toolbarCollapsed;
    }

    function persistUiPrefs(patch) {
      uiPrefs = normalizeUiPrefs({ ...uiPrefs, ...patch });
      saveUiPrefs(uiPrefs);
      applyUiPrefs();
    }

    function activeRoute() {
      const state = store.getLiveState();
      return PM.getActiveRoute(state.settings, state.routes);
    }

    function patchActiveRoute(patch) {
      const route = activeRoute();
      if (route) store.patchRoute(route.id, patch, { history: false });
    }

    function routeStyleOptions(locale, selected) {
      return PM.LINE_STYLES.map((style) => `<option value="${style}"${style === selected ? " selected" : ""}>${PM.escapeHtml(PM.I18n.t(locale, `route${style[0].toUpperCase()}${style.slice(1)}`))}</option>`).join("");
    }

    function routeArrowOptions(locale, selected) {
      return PM.ARROW_MODES.map((mode) => `<option value="${mode}"${mode === selected ? " selected" : ""}>${PM.escapeHtml(PM.I18n.t(locale, `routeArrow${mode[0].toUpperCase()}${mode.slice(1)}`))}</option>`).join("");
    }

    function routeHeadHtml(label, iconHtml) {
      if (!iconHtml) return `<strong>${PM.escapeHtml(label)}</strong>`;
      return `<span class="route-head-icon" aria-hidden="true">${iconHtml}</span><span>${PM.escapeHtml(label)}</span>`;
    }

    function setRouteHead(control, label, iconHtml) {
      control.innerHTML = routeHeadHtml(label, iconHtml);
    }

    function routeTrashIcon() {
      return [
        `<svg class="route-trash-icon" aria-hidden="true" viewBox="0 0 24 24">`,
        `<path d="M4 7h16"></path>`,
        `<path d="M10 11v6"></path>`,
        `<path d="M14 11v6"></path>`,
        `<path d="M6 7l1 14h10l1-14"></path>`,
        `<path d="M9 7V4h6v3"></path>`,
        `</svg>`
      ].join("");
    }

    function routeWidthValue(value, fallback) {
      return PM.clamp(parseInt(value, 10) || fallback || 2, 1, 12);
    }

    function validColor(value, fallback) {
      return /^#[0-9a-f]{6}$/i.test(value || "") ? String(value) : fallback;
    }

    function setRouteColorPreview(value) {
      const color = validColor(value, "#cc3333");
      controls.routeColorPicker.value = color;
    }

    function closeRouteColorPopover() {
      controls.routeColorPopover.hidden = true;
      routeColorEdit = null;
    }

    function commitRouteColorPopover() {
      if (routeColorEdit) {
        store.patchRoute(routeColorEdit.routeId, { color: controls.routeColorPicker.value }, { history: false });
      }
      closeRouteColorPopover();
    }

    function openRouteColorPopover(routeId, color, trigger) {
      routeColorEdit = { routeId, trigger };
      setRouteColorPreview(color);
      controls.routeColorPopover.hidden = false;
      const rect = trigger.getBoundingClientRect();
      const popover = controls.routeColorPopover;
      const left = Math.max(8, Math.min(rect.left, innerWidth - popover.offsetWidth - 8));
      const top = Math.max(8, Math.min(rect.bottom + 6, innerHeight - popover.offsetHeight - 8));
      popover.style.left = `${left}px`;
      popover.style.top = `${top}px`;
      controls.routeColorPicker.focus();
    }

    function renderRoutePanel(state) {
      const locale = state.settings.locale;
      const active = PM.getActiveRoute(state.settings, state.routes);
      controls.routePanel.hidden = !routePanelOpen;
      controls.routePanelToggle.setAttribute("aria-expanded", String(routePanelOpen));
      controls.routePanelCaret.textContent = routePanelOpen ? "\u25b4" : "\u25be";
      controls.activeRouteLabel.textContent = `${PM.I18n.t(locale, "activeRoute")}: ${active.name}`;
      controls.routePanelToggle.querySelector(".active-route-swatch").style.background = active.color;
      controls.routeRows.textContent = "";
      state.routes.forEach((route) => {
        const row = document.createElement("div");
        row.className = `route-row${route.id === state.settings.activeRouteId ? " is-active" : ""}`;
        row.dataset.routeId = route.id;
        row.innerHTML = [
          `<label class="route-active-cell"><input type="radio" name="activeRoute" value="${PM.escapeHtml(route.id)}"${route.id === state.settings.activeRouteId ? " checked" : ""}><span></span></label>`,
          `<button class="route-color-button" type="button" style="--swatch-color:${PM.escapeHtml(route.color)}" aria-label="${PM.escapeHtml(PM.I18n.t(locale, "colorChoice"))}" title="${PM.escapeHtml(PM.I18n.t(locale, "colorChoice"))}"></button>`,
          `<label class="route-check"><input class="route-visible-input" type="checkbox"${route.visible ? " checked" : ""}><span>${PM.escapeHtml(PM.I18n.t(locale, "routeVisible"))}</span></label>`,
          `<label class="route-check"><input class="route-numbers-input" type="checkbox"${route.showNumbers ? " checked" : ""}><span>${PM.escapeHtml(PM.I18n.t(locale, "routeNumbers"))}</span></label>`,
          `<select class="route-arrow-mode-input" aria-label="${PM.escapeHtml(PM.I18n.t(locale, "routeArrows"))}">${routeArrowOptions(locale, route.arrowMode)}</select>`,
          `<input class="route-start-input" type="number" min="1" step="1" value="${PM.escapeHtml(route.startNumber)}" aria-label="${PM.escapeHtml(PM.I18n.t(locale, "routeStart"))}">`,
          `<select class="route-style-input" aria-label="${PM.escapeHtml(PM.I18n.t(locale, "routeLineStyle"))}">${routeStyleOptions(locale, route.lineStyle)}</select>`,
          `<div class="route-width-stepper" aria-label="${PM.escapeHtml(PM.I18n.t(locale, "width"))}"><button class="route-width-button route-width-decrease" type="button" aria-label="${PM.escapeHtml(PM.I18n.t(locale, "routeWidthDown"))}">&#8249;</button><input class="route-width-input" type="number" min="1" max="12" step="1" value="${PM.escapeHtml(route.width)}" aria-label="${PM.escapeHtml(PM.I18n.t(locale, "width"))}"><button class="route-width-button route-width-increase" type="button" aria-label="${PM.escapeHtml(PM.I18n.t(locale, "routeWidthUp"))}">&#8250;</button></div>`,
          `<input class="route-name-input" value="${PM.escapeHtml(route.name)}" aria-label="${PM.escapeHtml(PM.I18n.t(locale, "routeName"))}">`,
          `<button class="route-delete-input" type="button" aria-label="${PM.escapeHtml(PM.I18n.t(locale, "routeDelete"))}" title="${PM.escapeHtml(PM.I18n.t(locale, "routeDelete"))}">${routeTrashIcon()}</button>`
        ].join("");
        row.querySelector("input[name='activeRoute']").addEventListener("change", () => store.setActiveRoute(route.id));
        row.querySelector(".route-color-button").addEventListener("click", (event) => openRouteColorPopover(route.id, route.color, event.currentTarget));
        row.querySelector(".route-visible-input").addEventListener("change", (event) => store.patchRoute(route.id, { visible: event.target.checked }));
        row.querySelector(".route-numbers-input").addEventListener("change", (event) => store.patchRoute(route.id, { showNumbers: event.target.checked }));
        row.querySelector(".route-arrow-mode-input").addEventListener("change", (event) => store.patchRoute(route.id, { arrowMode: event.target.value }));
        row.querySelector(".route-start-input").addEventListener("change", (event) => store.patchRoute(route.id, { startNumber: event.target.value }));
        row.querySelector(".route-style-input").addEventListener("change", (event) => store.patchRoute(route.id, { lineStyle: event.target.value }));
        const widthInput = row.querySelector(".route-width-input");
        const setRouteWidth = (value) => {
          const width = routeWidthValue(value, route.width);
          widthInput.value = String(width);
          store.patchRoute(route.id, { width }, { history: false });
        };
        widthInput.addEventListener("change", (event) => setRouteWidth(event.target.value));
        row.querySelector(".route-width-decrease").addEventListener("click", () => setRouteWidth(Number(widthInput.value) - 1));
        row.querySelector(".route-width-increase").addEventListener("click", () => setRouteWidth(Number(widthInput.value) + 1));
        row.querySelector(".route-name-input").addEventListener("change", (event) => store.patchRoute(route.id, { name: event.target.value.trim() || route.name }));
        row.querySelector(".route-delete-input").addEventListener("click", () => {
          if (store.getLiveState().routes.length <= 1) {
            alert(PM.I18n.t(locale, "routeLastDeleteBlocked"));
            return;
          }
          if (confirm(PM.I18n.t(locale, "deleteRouteConfirm"))) store.deleteRoute(route.id);
        });
        controls.routeRows.appendChild(row);
      });
    }

    PM.createPresentationController({
      root: document.documentElement,
      button: controls.presentationButton,
      dock: controls.presentationDock,
      routeList: controls.presentationRoutes,
      step: controls.presentationStep,
      previousButton: controls.presentationPrev,
      nextButton: controls.presentationNext,
      showAllButton: controls.presentationShowAll,
      resetButton: controls.presentationReset,
      fogToggleButton: controls.presentationFogToggle,
      fogPanel: controls.presentationFogPanel,
      fogCloseButton: controls.presentationFogClose,
      fogMode: controls.presentationFogMode,
      fogOutside: controls.presentationFogOutside,
      fogFocus: controls.presentationFogFocus,
      fogTrail: controls.presentationFogTrail,
      fogSoftness: controls.presentationFogSoftness,
      fogMemory: controls.presentationFogMemory,
      exitButton: controls.presentationExit,
      store,
      menu,
      onChange: () => {
        renderer.draw();
        pointUi.render(store.getState());
      },
      t
    });

    function setButtonText() {
      const locale = store.getLiveState().settings.locale;
      controls.fileName.textContent = store.getLiveState().map.name || PM.I18n.t(locale, "noProject");
      controls.imageLoadLabel.querySelector("span").textContent = PM.I18n.t(locale, "loadMap");
      controls.saveProject.textContent = PM.I18n.t(locale, "saveProject");
      controls.loadProject.textContent = PM.I18n.t(locale, "loadProject");
      controls.pointTypesLabel.textContent = PM.I18n.t(locale, "pointTypesFilter");
      controls.visibilityLabel.textContent = PM.I18n.t(locale, "visibility");
      controls.helpButton.textContent = PM.I18n.t(locale, "help");
      controls.toolbarCollapse.setAttribute("aria-label", PM.I18n.t(locale, "collapseMenu"));
      controls.toolbarCollapse.setAttribute("title", PM.I18n.t(locale, "collapseMenu"));
      controls.toolbarRestore.setAttribute("aria-label", PM.I18n.t(locale, "expandMenu"));
      controls.toolbarRestore.setAttribute("title", PM.I18n.t(locale, "expandMenu"));
      controls.undo.textContent = PM.I18n.t(locale, "undo");
      controls.redo.textContent = PM.I18n.t(locale, "redo");
      controls.readerButton.textContent = `\uD83D\uDCD6 ${PM.I18n.t(locale, "reader")}`;
      controls.presentationButton.textContent = PM.I18n.t(locale, "present");
      controls.presentationDock.setAttribute("aria-label", PM.I18n.t(locale, "presentation"));
      controls.presentationRoutes.setAttribute("aria-label", PM.I18n.t(locale, "routes"));
      controls.presentationPrev.setAttribute("aria-label", PM.I18n.t(locale, "presentationPrevious"));
      controls.presentationNext.setAttribute("aria-label", PM.I18n.t(locale, "presentationNext"));
      controls.presentationShowAll.textContent = PM.I18n.t(locale, "presentationShowAll");
      controls.presentationReset.textContent = PM.I18n.t(locale, "presentationReset");
      controls.presentationFogToggle.setAttribute("aria-label", PM.I18n.t(locale, "presentationFogSettings"));
      controls.presentationFogPanel.setAttribute("aria-label", PM.I18n.t(locale, "presentationFogSettings"));
      controls.presentationFogTitle.textContent = PM.I18n.t(locale, "presentationFog");
      controls.presentationFogClose.setAttribute("aria-label", PM.I18n.t(locale, "close"));
      controls.presentationFogModeLabel.textContent = PM.I18n.t(locale, "presentationFogMode");
      controls.presentationFogMode.options[0].textContent = PM.I18n.t(locale, "presentationFogOff");
      controls.presentationFogMode.options[1].textContent = PM.I18n.t(locale, "presentationFogFocus");
      controls.presentationFogMode.options[2].textContent = PM.I18n.t(locale, "presentationFogAll");
      controls.presentationFogOutsideLabel.textContent = PM.I18n.t(locale, "presentationFogOutside");
      controls.presentationFogFocusLabel.textContent = PM.I18n.t(locale, "presentationFogCurrent");
      controls.presentationFogTrailLabel.textContent = PM.I18n.t(locale, "presentationFogTrail");
      controls.presentationFogSoftnessLabel.textContent = PM.I18n.t(locale, "presentationFogSoftness");
      controls.presentationFogMemoryLabel.textContent = PM.I18n.t(locale, "presentationFogMemory");
      controls.presentationExit.textContent = PM.I18n.t(locale, "presentationExit");
      controls.routePanelToggle.setAttribute("aria-label", PM.I18n.t(locale, "routes"));
      controls.routePanel.setAttribute("aria-label", PM.I18n.t(locale, "routes"));
      controls.routePanelTitle.textContent = PM.I18n.t(locale, "routes");
      controls.addRouteButton.textContent = PM.I18n.t(locale, "addRoute");
      setRouteHead(controls.routeActiveHead, PM.I18n.t(locale, "routeActive"));
      setRouteHead(controls.routeColorHead, PM.I18n.t(locale, "routeColor"));
      setRouteHead(controls.routeVisibleHead, PM.I18n.t(locale, "routeVisible"), "&#128065;");
      setRouteHead(controls.routeNumbersHead, PM.I18n.t(locale, "routeNumbers"), "&#128290;");
      setRouteHead(controls.routeArrowsHead, PM.I18n.t(locale, "routeArrows"), "&#8599;");
      setRouteHead(controls.routeStartHead, PM.I18n.t(locale, "routeStart"));
      setRouteHead(controls.routeStyleHead, PM.I18n.t(locale, "routeLineStyle"));
      setRouteHead(controls.routeWidthHead, PM.I18n.t(locale, "width"));
      setRouteHead(controls.routeNameHead, PM.I18n.t(locale, "routeName"));
      setRouteHead(controls.routeDeleteHead, PM.I18n.t(locale, "routeDelete"), routeTrashIcon());
      controls.routeColorPopover.setAttribute("aria-label", PM.I18n.t(locale, "colorChoice"));
      controls.routeColorPopoverLabel.textContent = PM.I18n.t(locale, "colorChoice");
      controls.routeColorPicker.setAttribute("aria-label", PM.I18n.t(locale, "colorChoice"));
      controls.routeColorOk.textContent = PM.I18n.t(locale, "ok");
      controls.routeColorCancel.textContent = PM.I18n.t(locale, "cancel");
      controls.exportPng.textContent = PM.I18n.t(locale, "png");
      controls.clearAll.textContent = PM.I18n.t(locale, "clear");
      controls.langToggle.textContent = locale === "en" ? "DE" : "EN";
      controls.themeToggle.textContent = "\uD83C\uDFA8";
      const labelMap = {
        "filter-route": "route",
        "filter-place": "place",
        "filter-char": "char",
        "filter-event": "event",
        "filter-item": "item",
        showLines: "lines",
        showLabels: "labelsToggle",
        showLocation: "location",
        showNotes: "notesToggle",
        showDuration: "durationToggle",
        showEdit: "editToggle",
        focusMode: "focus",
        chapterMode: "chapterStart"
      };
      Object.entries(labelMap).forEach(([id, key]) => {
        const input = $(id);
        const span = input && input.parentElement && input.parentElement.querySelector("span");
        if (span) span.textContent = PM.I18n.t(locale, key);
      });
      const fieldLabels = [
        [controls.zoom, "zoom", "zoom"],
        [controls.opacity, "opacity", "opacity"],
        [controls.pointSize, "pointSize", "pointSizeFull"],
        [controls.helperPointSize, "helperPointSize", "helperPointSizeFull"],
        [controls.toolbarOpacity, "menuOpacity", "menuOpacity"],
        [controls.fontScale, "font", "font"]
      ];
      fieldLabels.forEach(([input, key, titleKey]) => {
        if (!input || !input.parentElement) return;
        const label = input.parentElement.querySelector(".control-field-label");
        const title = PM.I18n.t(locale, titleKey || key);
        if (label) label.textContent = PM.I18n.t(locale, key);
        input.setAttribute("aria-label", title);
        input.parentElement.setAttribute("title", title);
      });
      controls.emptySub.textContent = PM.I18n.t(locale, "empty");
      controls.emptyStep1.textContent = PM.I18n.t(locale, "emptyStep1");
      controls.emptyStep2.textContent = PM.I18n.t(locale, "emptyStep2");
      controls.emptyStep3.textContent = PM.I18n.t(locale, "emptyStep3");
      controls.helpModal.querySelector("h2").textContent = PM.I18n.t(locale, "helpTitle");
      controls.helpClose.textContent = PM.I18n.t(locale, "close");
      controls.helpBody.innerHTML = PM.I18n.t(locale, "helpHtml");
      controls.badgeVersion.textContent = `v${PM.APP_VERSION}`;
    }

    function syncControls(state) {
      document.documentElement.lang = state.settings.locale;
      document.documentElement.classList.toggle("focus-mode", state.settings.focusMode);
      document.documentElement.style.setProperty("--point-size", `${state.settings.pointSizePx}px`);
      document.documentElement.style.setProperty("--helper-point-size", `${state.settings.helperPointSizePx}px`);
      PM.Theme.applyTheme(state.settings.theme);
      controls.emptyHint.hidden = Boolean(state.map.dataUrl);
      controls.fileName.textContent = state.map.name || t("noProject");
      for (const [type, input] of Object.entries(controls.filters)) input.checked = Boolean(state.settings.filters[type]);
      controls.showLines.checked = state.settings.showLines;
      controls.showLabels.checked = state.settings.showLabels;
      controls.showLocation.checked = state.settings.showLocation;
      controls.showNotes.checked = state.settings.showNotes;
      controls.showDuration.checked = state.settings.showDuration;
      controls.showEdit.checked = state.settings.showEdit;
      controls.focusMode.checked = state.settings.focusMode;
      const route = PM.getActiveRoute(state.settings, state.routes);
      controls.chapterMode.checked = route.showNumbers !== false;
      controls.chapterStart.value = String(route.startNumber);
      controls.zoom.value = String(state.settings.zoom);
      controls.opacity.value = String(state.settings.opacity);
      controls.pointSize.value = String(state.settings.pointSizePx);
      controls.helperPointSize.value = String(state.settings.helperPointSizePx);
      controls.fontScale.value = String(state.settings.fontScale);
      controls.undo.disabled = !store.canUndo();
      controls.redo.disabled = !store.canRedo();
      controls.toolbarRestore.querySelector(".active-route-swatch").style.background = route.color;
      controls.toolbarRestoreLabel.textContent = `${PM.I18n.t(state.settings.locale, "expandMenu")}: ${route.name}`;
      applyUiPrefs();
      setButtonText();
      renderRoutePanel(state);
    }

    store.subscribe(syncControls);

    controls.imageInput.addEventListener("change", async () => {
      const file = controls.imageInput.files && controls.imageInput.files[0];
      if (!file) return;
      try {
        const dataUrl = await readFileAsDataUrl(file);
        const size = await getImageSize(dataUrl);
        store.setMap({ name: file.name, dataUrl, width: size.width, height: size.height });
      } catch (_error) {
        alert(t("loadFailed"));
      } finally {
        controls.imageInput.value = "";
      }
    });
    controls.imageLoadLabel.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      controls.imageInput.click();
    });

    controls.saveProject.addEventListener("click", () => {
      const project = store.getState();
      const name = `${PM.safeFilename(project.map.name, "PlotMap")}_${PM.formatDateStamp()}.plotmap.json`;
      PM.downloadText(name, PM.Serialization.projectToJson(project), "application/json;charset=utf-8");
      store.markSaved();
    });

    controls.loadProject.addEventListener("click", () => controls.projectInput.click());
    controls.projectInput.addEventListener("change", async () => {
      const file = controls.projectInput.files && controls.projectInput.files[0];
      if (!file) return;
      try {
        const text = await readFileAsText(file);
        store.setProject(PM.Serialization.parseProjectJson(text));
      } catch (_error) {
        alert(t("invalidProject"));
      } finally {
        controls.projectInput.value = "";
      }
    });

    controls.exportPng.addEventListener("click", async () => {
      try {
        const blob = await renderer.exportPng();
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = `${PM.safeFilename(store.getLiveState().map.name, "PlotMap")}_${PM.formatDateStamp()}.png`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        setTimeout(() => URL.revokeObjectURL(link.href), 3000);
      } catch (_error) {
        alert(t("exportFailed"));
      }
    });

    controls.clearAll.addEventListener("click", () => {
      if (confirm(t("clearConfirm"))) store.clearPoints();
    });
    controls.undo.addEventListener("click", () => store.undo());
    controls.redo.addEventListener("click", () => store.redo());
    controls.readerButton.addEventListener("click", () => reader.open());
    controls.langToggle.addEventListener("click", () => {
      const next = store.getLiveState().settings.locale === "en" ? "de" : "en";
      store.setSettings({ locale: next });
      history.replaceState(null, "", `?lang=${next}`);
    });
    controls.themeToggle.addEventListener("click", () => {
      const current = store.getLiveState().settings.theme;
      store.setSettings({ theme: PM.Theme.nextTheme(current) });
    });
    controls.infoButton.addEventListener("click", () => {
      controls.infoPanel.hidden = !controls.infoPanel.hidden;
    });
    controls.infoClose.addEventListener("click", () => {
      controls.infoPanel.hidden = true;
    });
    controls.toolbarCollapse.addEventListener("click", () => {
      closeRouteColorPopover();
      persistUiPrefs({ toolbarCollapsed: true });
    });
    controls.toolbarRestore.addEventListener("click", () => persistUiPrefs({ toolbarCollapsed: false }));
    controls.routeColorPicker.addEventListener("input", () => setRouteColorPreview(controls.routeColorPicker.value));
    controls.routeColorOk.addEventListener("click", commitRouteColorPopover);
    controls.routeColorCancel.addEventListener("click", closeRouteColorPopover);
    document.addEventListener("pointerdown", (event) => {
      if (controls.routeColorPopover.hidden) return;
      if (controls.routeColorPopover.contains(event.target)) return;
      if (event.target.closest(".route-color-button")) return;
      closeRouteColorPopover();
    });
    document.addEventListener("keydown", (event) => {
      if (controls.routeColorPopover.hidden) return;
      if (event.key === "Escape") {
        event.preventDefault();
        closeRouteColorPopover();
      }
      if (event.key === "Enter") {
        event.preventDefault();
        commitRouteColorPopover();
      }
    });

    function bindSettingCheckbox(input, key) {
      input.addEventListener("change", () => store.setSettings({ [key]: input.checked }));
    }
    bindSettingCheckbox(controls.showLines, "showLines");
    bindSettingCheckbox(controls.showLabels, "showLabels");
    bindSettingCheckbox(controls.showLocation, "showLocation");
    bindSettingCheckbox(controls.showNotes, "showNotes");
    bindSettingCheckbox(controls.showDuration, "showDuration");
    bindSettingCheckbox(controls.showEdit, "showEdit");
    bindSettingCheckbox(controls.focusMode, "focusMode");
    controls.chapterMode.addEventListener("change", () => patchActiveRoute({ showNumbers: controls.chapterMode.checked }));
    controls.chapterStart.addEventListener("input", () => patchActiveRoute({ startNumber: controls.chapterStart.value }));
    controls.routePanelToggle.addEventListener("click", () => {
      routePanelOpen = !routePanelOpen;
      renderRoutePanel(store.getState());
    });
    controls.addRouteButton.addEventListener("click", () => {
      routePanelOpen = true;
      store.addRoute();
    });
    controls.zoom.addEventListener("input", () => store.setSettings({ zoom: controls.zoom.value }));
    controls.opacity.addEventListener("input", () => store.setSettings({ opacity: controls.opacity.value }));
    controls.pointSize.addEventListener("input", () => store.setSettings({ pointSizePx: controls.pointSize.value }));
    controls.helperPointSize.addEventListener("input", () => store.setSettings({ helperPointSizePx: controls.helperPointSize.value }));
    controls.toolbarOpacity.addEventListener("input", () => persistUiPrefs({ toolbarOpacity: controls.toolbarOpacity.value }));
    controls.fontScale.addEventListener("input", () => store.setSettings({ fontScale: controls.fontScale.value }));
    Object.entries(controls.filters).forEach(([type, input]) => {
      input.addEventListener("change", () => store.setFilter(type, input.checked));
    });

    function openHelp() {
      controls.helpBackdrop.hidden = false;
      controls.helpModal.hidden = false;
    }
    function closeHelp() {
      controls.helpBackdrop.hidden = true;
      controls.helpModal.hidden = true;
    }
    controls.helpButton.addEventListener("click", openHelp);
    controls.helpClose.addEventListener("click", closeHelp);
    controls.helpBackdrop.addEventListener("click", closeHelp);

    const canvas = $("mapCanvas");
    let pan = null;
    canvas.addEventListener("pointerdown", (event) => {
      if (!store.getLiveState().map.dataUrl) return;
      if (event.button !== 0) return;
      menu.close();
      canvas.classList.add("dragging");
      canvas.setPointerCapture(event.pointerId);
      const settings = store.getLiveState().settings;
      pan = {
        pointerId: event.pointerId,
        x: event.clientX,
        y: event.clientY,
        panX: settings.panX,
        panY: settings.panY
      };
    });
    canvas.addEventListener("pointermove", (event) => {
      if (!pan || event.pointerId !== pan.pointerId) return;
      store.setSettings({
        panX: pan.panX + event.clientX - pan.x,
        panY: pan.panY + event.clientY - pan.y
      });
    });
    canvas.addEventListener("pointerup", (event) => {
      if (pan && event.pointerId === pan.pointerId) {
        canvas.releasePointerCapture(event.pointerId);
        canvas.classList.remove("dragging");
        pan = null;
      }
    });
    canvas.addEventListener("pointercancel", () => {
      canvas.classList.remove("dragging");
      pan = null;
    });
    canvas.addEventListener("dblclick", (event) => {
      const state = store.getLiveState();
      if (!state.map.dataUrl) return;
      const pos = renderer.clientToMap(event.clientX, event.clientY);
      menu.showTypeMenu(event.clientX, event.clientY, (type) => store.addPoint({ ...pos, type }));
    });

    window.addEventListener("beforeunload", (event) => {
      if (!store.isDirty()) return;
      event.preventDefault();
      event.returnValue = "";
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        closeRouteColorPopover();
        menu.close();
        closeHelp();
        $("pmSplash").classList.add("hide");
      }
      if (event.key.toLowerCase() === "t" && !event.target.matches("input, textarea")) {
        const current = store.getLiveState().settings.theme;
        store.setSettings({ theme: PM.Theme.nextTheme(current) });
      }
    });

    function randomizeSplash() {
      const splash = $("pmSplash");
      const backgrounds = [
        "radial-gradient(1000px 520px at 50% 18%, rgba(210,120,60,.28), transparent 60%), linear-gradient(180deg, #1b1210 0%, #120d12 100%)",
        "radial-gradient(1100px 540px at 50% 20%, rgba(28,110,96,.28), transparent 60%), linear-gradient(180deg, #0e1516 0%, #0a0f14 100%)",
        "radial-gradient(1100px 520px at 50% 20%, rgba(15,38,66,.35), transparent 60%), linear-gradient(180deg, #0b1f33 0%, #061426 100%)",
        "radial-gradient(1000px 500px at 50% 18%, rgba(87,35,120,.30), transparent 60%), linear-gradient(180deg, #1a0e2a 0%, #0d122a 100%)",
        "radial-gradient(1000px 500px at 50% 18%, rgba(130,32,68,.28), transparent 60%), linear-gradient(180deg, #1a0e16 0%, #0a0a14 100%)",
        "radial-gradient(1100px 540px at 50% 22%, rgba(26,102,120,.28), transparent 60%), linear-gradient(180deg, #0A1823 0%, #08131C 100%)"
      ];
      let last = -1;
      try {
        last = parseInt(localStorage.getItem("pmLastSplashVariant") || "-1", 10);
      } catch (_error) {
        last = -1;
      }
      let index = Math.floor(Math.random() * backgrounds.length);
      if (backgrounds.length > 1 && index === last) {
        index = (index + 1 + Math.floor(Math.random() * (backgrounds.length - 1))) % backgrounds.length;
      }
      splash.dataset.splashVariant = String(index);
      splash.style.background = backgrounds[index];
      try {
        localStorage.setItem("pmLastSplashVariant", String(index));
      } catch (_error) {
        // localStorage may be unavailable for file URLs in hardened browser setups.
      }
    }
    randomizeSplash();
    $("pmSplash").addEventListener("click", () => $("pmSplash").classList.add("hide"));
    setTimeout(() => $("pmSplash").classList.add("hide"), 3000);
    $("splashVersion").textContent = `v${PM.APP_VERSION}`;
    setButtonText();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})(globalThis.PM);
