(function menuModule(PM) {
  "use strict";

  function createMenuController(layer, store) {
    let menu = null;
    let editor = null;

    function close() {
      if (menu) menu.remove();
      menu = null;
    }

    function closeEditor() {
      if (editor) editor.remove();
      editor = null;
    }

    function place(element, x, y) {
      const pad = 8;
      document.body.appendChild(element);
      const rect = element.getBoundingClientRect();
      element.style.left = `${Math.min(x, innerWidth - rect.width - pad)}px`;
      element.style.top = `${Math.min(y, innerHeight - rect.height - pad)}px`;
    }

    function addButton(parent, label, action) {
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = label;
      button.addEventListener("click", (event) => {
        event.stopPropagation();
        action();
      });
      parent.appendChild(button);
      return button;
    }

    function showTextEditor({ title, label, value, multiline, onSave }) {
      close();
      closeEditor();
      const locale = store.getLiveState().settings.locale;
      const backdrop = document.createElement("div");
      backdrop.className = "point-editor-backdrop";
      const panel = document.createElement("form");
      panel.className = "point-editor";
      panel.innerHTML = [
        `<h2>${PM.escapeHtml(title)}</h2>`,
        `<label><span>${PM.escapeHtml(label || PM.I18n.t(locale, "value"))}</span>${multiline ? `<textarea name="value">${PM.escapeHtml(value || "")}</textarea>` : `<input name="value" value="${PM.escapeHtml(value || "")}">`}</label>`,
        "<div class=\"point-editor-actions\">",
        `<button class="btn small" type="submit">${PM.escapeHtml(PM.I18n.t(locale, "save"))}</button>`,
        `<button class="btn small" type="button" data-cancel>${PM.escapeHtml(PM.I18n.t(locale, "cancel"))}</button>`,
        "</div>"
      ].join("");
      editor = document.createElement("div");
      editor.append(backdrop, panel);
      document.body.appendChild(editor);
      const field = panel.elements.value;
      field.focus();
      if (field.select) field.select();
      const finish = () => closeEditor();
      backdrop.addEventListener("click", finish);
      panel.querySelector("[data-cancel]").addEventListener("click", finish);
      panel.addEventListener("submit", (event) => {
        event.preventDefault();
        onSave(field.value);
        finish();
      });
    }

    function showTypeMenu(x, y, onType) {
      close();
      const state = store.getLiveState();
      const locale = state.settings.locale;
      menu = document.createElement("div");
      menu.className = "context-menu";
      menu.setAttribute("role", "menu");
      for (const type of PM.POINT_TYPES) {
        addButton(menu, `${type.icon ? `${type.icon} ` : ""}${PM.I18n.pointLabel(locale, type.type)}`, () => {
          const selected = type.type;
          close();
          onType(selected);
        });
      }
      layer.appendChild(menu);
      place(menu, x, y);
    }

    function showPointMenu(x, y, pointId) {
      close();
      const state = store.getLiveState();
      const locale = state.settings.locale;
      const point = state.points.find((entry) => entry.id === pointId);
      if (!point) return;
      const locationVisible = Boolean(point.location) && !(PM.isPointFieldHidden && PM.isPointFieldHidden(pointId, "location"));
      const noteVisible = Boolean(point.note) && !(PM.isPointFieldHidden && PM.isPointFieldHidden(pointId, "note"));
      menu = document.createElement("div");
      menu.className = "context-menu";
      menu.setAttribute("role", "menu");

      addButton(menu, PM.I18n.t(locale, point.type === "route" ? "editChapter" : "editLabel"), () => {
        showTextEditor({
          title: PM.I18n.t(locale, point.type === "route" ? "editChapter" : "editLabel"),
          label: PM.I18n.t(locale, "labels"),
          value: point.label,
          onSave: (value) => store.patchPoint(pointId, { label: value })
        });
      });
      addButton(menu, PM.I18n.t(locale, "setLocation"), () => {
        showTextEditor({
          title: PM.I18n.t(locale, "setLocation"),
          label: PM.I18n.t(locale, "location"),
          value: point.location,
          onSave: (value) => store.patchPoint(pointId, { location: value.trim() })
        });
      });
      addButton(menu, PM.I18n.t(locale, locationVisible ? "hideLocation" : "showLocation"), () => {
        if (PM.setPointFieldHidden) PM.setPointFieldHidden(pointId, "location", locationVisible);
        else if (PM.togglePointField) PM.togglePointField(pointId, "location");
        close();
      });
      addButton(menu, PM.I18n.t(locale, "editNote"), () => {
        showTextEditor({
          title: PM.I18n.t(locale, "editNote"),
          label: PM.I18n.t(locale, "notes"),
          value: point.note,
          multiline: true,
          onSave: (value) => store.patchPoint(pointId, { note: value })
        });
      });
      addButton(menu, PM.I18n.t(locale, noteVisible ? "hideNote" : "showNote"), () => {
        if (PM.setPointFieldHidden) PM.setPointFieldHidden(pointId, "note", noteVisible);
        else if (PM.togglePointField) PM.togglePointField(pointId, "note");
        close();
      });
      if (point.type === "route") {
        addButton(menu, PM.I18n.t(locale, point.helper ? "helperOff" : "helperOn"), () => {
          store.patchPoint(pointId, { helper: !point.helper });
          close();
        });
      }
      addButton(menu, PM.I18n.t(locale, "changeType"), () => {
        showTypeMenu(x, y, (type) => store.patchPoint(pointId, { type, helper: type === "route" ? point.helper : false }));
      });
      addButton(menu, `⏳ ${PM.I18n.t(locale, "setDuration")}`, () => {
        showTextEditor({
          title: PM.I18n.t(locale, "setDuration"),
          label: PM.I18n.t(locale, "duration"),
          value: point.duration,
          onSave: (value) => store.patchPoint(pointId, { duration: value.trim() })
        });
      });
      addButton(menu, PM.I18n.t(locale, "deletePoint"), () => {
        if (confirm(PM.I18n.t(locale, "deleteConfirm"))) store.deletePoint(pointId);
        close();
      });

      layer.appendChild(menu);
      place(menu, x, y);
    }

    document.addEventListener("pointerdown", (event) => {
      if (menu && !menu.contains(event.target)) close();
    }, true);

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") close();
      if (event.key === "Escape") closeEditor();
    });

    return {
      close,
      showTypeMenu,
      showPointMenu
    };
  }

  PM.createMenuController = createMenuController;
})(globalThis.PM);
