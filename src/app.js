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
    const store = PM.createStore(PM.createEmptyProject({ locale: initialLocale, theme: initialTheme }));
    const renderer = PM.createRenderer($("mapCanvas"), store);
    const menu = PM.createMenuController($("menuLayer"), store);
    PM.createPointUi($("pointLayer"), $("midLayer"), $("routeLayer"), store, renderer, menu);
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

    const controls = {
      imageLoadLabel: document.querySelector("label[for='imageInput']"),
      imageInput: $("imageInput"),
      projectInput: $("projectInput"),
      fileName: $("fileName"),
      pointTypesLabel: $("pointTypesLabel"),
      visibilityLabel: $("visibilityLabel"),
      langToggle: $("langToggle"),
      themeToggle: $("themeToggle"),
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
      focusMode: $("focusMode"),
      chapterMode: $("chapterMode"),
      chapterStart: $("chapterStart"),
      showLines: $("showLines"),
      showLabels: $("showLabels"),
      showLocation: $("showLocation"),
      showNotes: $("showNotes"),
      showDuration: $("showDuration"),
      showEdit: $("showEdit"),
      zoom: $("zoomControl"),
      opacity: $("opacityControl"),
      routeColor: $("routeColor"),
      routeWidth: $("routeWidth"),
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

    function setButtonText() {
      const locale = store.getLiveState().settings.locale;
      controls.fileName.textContent = store.getLiveState().map.name || PM.I18n.t(locale, "noProject");
      controls.imageLoadLabel.querySelector("span").textContent = PM.I18n.t(locale, "loadMap");
      controls.saveProject.textContent = PM.I18n.t(locale, "saveProject");
      controls.loadProject.textContent = PM.I18n.t(locale, "loadProject");
      controls.pointTypesLabel.textContent = PM.I18n.t(locale, "pointTypesFilter");
      controls.visibilityLabel.textContent = PM.I18n.t(locale, "visibility");
      controls.helpButton.textContent = PM.I18n.t(locale, "help");
      controls.undo.textContent = PM.I18n.t(locale, "undo");
      controls.redo.textContent = PM.I18n.t(locale, "redo");
      controls.readerButton.textContent = `\uD83D\uDCD6 ${PM.I18n.t(locale, "reader")}`;
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
        [controls.zoom, "zoom"],
        [controls.opacity, "opacity"],
        [controls.routeColor, "line"],
        [controls.routeWidth, "width"],
        [controls.fontScale, "font"]
      ];
      fieldLabels.forEach(([input, key]) => {
        if (input && input.parentElement) input.parentElement.firstChild.nodeValue = PM.I18n.t(locale, key);
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
      controls.chapterMode.checked = state.settings.chapterMode;
      controls.chapterStart.value = String(state.settings.chapterStart);
      controls.zoom.value = String(state.settings.zoom);
      controls.opacity.value = String(state.settings.opacity);
      controls.routeColor.value = state.settings.routeColor;
      controls.routeWidth.value = String(state.settings.routeWidth);
      controls.fontScale.value = String(state.settings.fontScale);
      controls.undo.disabled = !store.canUndo();
      controls.redo.disabled = !store.canRedo();
      setButtonText();
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
    bindSettingCheckbox(controls.chapterMode, "chapterMode");
    controls.chapterStart.addEventListener("input", () => store.setSettings({ chapterStart: controls.chapterStart.value }));
    controls.zoom.addEventListener("input", () => store.setSettings({ zoom: controls.zoom.value }));
    controls.opacity.addEventListener("input", () => store.setSettings({ opacity: controls.opacity.value }));
    controls.routeColor.addEventListener("input", () => store.setSettings({ routeColor: controls.routeColor.value }));
    controls.routeWidth.addEventListener("input", () => store.setSettings({ routeWidth: controls.routeWidth.value }));
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
      if (state.settings.focusMode) {
        store.addPoint({ ...pos, type: "route" });
      } else {
        menu.showTypeMenu(event.clientX, event.clientY, (type) => store.addPoint({ ...pos, type }));
      }
    });

    window.addEventListener("beforeunload", (event) => {
      if (!store.isDirty()) return;
      event.preventDefault();
      event.returnValue = "";
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
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
