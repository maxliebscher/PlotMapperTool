(function readerModule(PM) {
  "use strict";

  function createReader(elements, store, renderer) {
    const {
      modal,
      backdrop,
      cards,
      closeButton,
      extrasToggle,
      exportHtmlButton,
      printPdfButton,
      title,
      hint,
      extrasLabel
    } = elements;

    function close() {
      modal.hidden = true;
      backdrop.hidden = true;
    }

    function open() {
      render();
      backdrop.hidden = false;
      modal.hidden = false;
    }

    function text(locale, key) {
      return PM.I18n.t(locale, key);
    }

    function editForm(point, locale) {
      const form = document.createElement("div");
      form.className = "reader-edit";
      form.innerHTML = [
        "<div class=\"row\">",
        `<input class="reader-edit-label" value="${PM.escapeHtml(point.label)}" aria-label="${PM.escapeHtml(text(locale, "editLabel"))}">`,
        `<input class="reader-edit-duration" value="${PM.escapeHtml(point.duration)}" aria-label="${PM.escapeHtml(text(locale, "duration"))}">`,
        "</div>",
        `<textarea class="reader-edit-note" aria-label="${PM.escapeHtml(text(locale, "notes"))}">${PM.escapeHtml(point.note)}</textarea>`,
        "<div class=\"actions\">",
        `<button class="btn small reader-save" type="button">${PM.escapeHtml(text(locale, "save"))}</button>`,
        `<button class="btn small reader-cancel" type="button">${PM.escapeHtml(text(locale, "cancel"))}</button>`,
        "</div>"
      ].join("");
      form.querySelector(".reader-save").addEventListener("click", () => {
        store.patchPoint(point.id, {
          label: form.querySelector(".reader-edit-label").value,
          duration: form.querySelector(".reader-edit-duration").value,
          note: form.querySelector(".reader-edit-note").value
        });
        render();
      });
      form.querySelector(".reader-cancel").addEventListener("click", () => {
        form.classList.remove("open");
      });
      return form;
    }

    function makeEditButton(form, locale) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "btn small";
      button.textContent = text(locale, "edit");
      button.addEventListener("click", () => form.classList.toggle("open"));
      return button;
    }

    function render() {
      const state = store.getState();
      const locale = state.settings.locale;
      title.textContent = text(locale, "reader");
      hint.textContent = text(locale, "readerHint");
      extrasLabel.textContent = text(locale, "contextPoints");
      exportHtmlButton.textContent = text(locale, "saveHtml");
      printPdfButton.textContent = text(locale, "printPdf");
      closeButton.textContent = "x";
      cards.textContent = "";
      const chapters = PM.Exporters.buildReaderChapters(state);
      if (!chapters.length) {
        const empty = document.createElement("div");
        empty.className = "reader-card";
        empty.textContent = text(locale, "noRoute");
        cards.appendChild(empty);
        return;
      }
      for (const chapter of chapters) {
        const point = chapter.point;
        const card = document.createElement("section");
        card.className = "reader-card";
        const head = document.createElement("div");
        head.className = "reader-step";
        const number = document.createElement("button");
        number.type = "button";
        number.className = "reader-num";
        number.title = text(locale, "jump");
        number.textContent = String(chapter.step);
        number.addEventListener("click", () => {
          close();
          renderer.centerOnPoint(point);
        });
        const heading = document.createElement("h3");
        heading.textContent = point.label || `${text(locale, "chapter")} ${chapter.step}`;
        head.append(number, heading);
        if (point.duration) {
          const pill = document.createElement("span");
          pill.className = "pill";
          pill.textContent = point.duration;
          head.appendChild(pill);
        }
        const form = editForm(point, locale);
        head.appendChild(makeEditButton(form, locale));
        card.append(head, form);
        if (point.note) {
          const note = document.createElement("div");
          note.className = "reader-note";
          note.textContent = point.note;
          card.appendChild(note);
        }
        if (extrasToggle.checked && chapter.extras.length) {
          const list = document.createElement("ul");
          list.className = "reader-extra-list";
          for (const extra of chapter.extras) {
            const item = document.createElement("li");
            item.className = "reader-extra";
            const type = document.createElement("span");
            type.className = "pill";
            type.textContent = PM.I18n.pointLabel(locale, extra.type);
            const body = document.createElement("div");
            const label = document.createElement("strong");
            label.textContent = extra.label || PM.I18n.pointLabel(locale, extra.type);
            body.appendChild(label);
            if (extra.note) {
              const note = document.createElement("div");
              note.className = "reader-extra-note";
              note.textContent = extra.note;
              body.appendChild(note);
            }
            if (extra.duration) {
              const dur = document.createElement("span");
              dur.className = "pill";
              dur.textContent = extra.duration;
              body.appendChild(dur);
            }
            const extraForm = editForm(extra, locale);
            item.append(type, body, makeEditButton(extraForm, locale), extraForm);
            list.appendChild(item);
          }
          card.appendChild(list);
        }
        cards.appendChild(card);
      }
    }

    function readerDocumentHtml() {
      const state = store.getState();
      const locale = state.settings.locale;
      const css = "body{font-family:system-ui,Segoe UI,sans-serif;margin:24px;color:#111;background:#fff}.cards{display:grid;gap:12px;max-width:900px;margin:0 auto}.card{border:1px solid #ddd;border-radius:8px;padding:12px}.step{display:flex;align-items:center;gap:10px}.num{display:inline-flex;align-items:center;justify-content:center;width:28px;height:28px;border-radius:50%;background:#111;color:#fff;font-weight:800}.pill{border:1px solid #ddd;border-radius:999px;padding:2px 8px;font-size:12px}.note{white-space:pre-wrap;line-height:1.4}.extras{list-style:none;padding:0;display:grid;gap:6px}.extras li{border-left:3px solid #ddd;padding-left:10px}";
      const chapters = PM.Exporters.buildReaderChapters(state);
      const body = chapters.map((chapter) => {
        const point = chapter.point;
        const extras = chapter.extras.map((extra) => `<li><span class="pill">${PM.escapeHtml(PM.I18n.pointLabel(locale, extra.type))}</span> <strong>${PM.escapeHtml(extra.label || PM.I18n.pointLabel(locale, extra.type))}</strong>${extra.note ? `<div class="note">${PM.escapeHtml(extra.note)}</div>` : ""}${extra.duration ? ` <span class="pill">${PM.escapeHtml(extra.duration)}</span>` : ""}</li>`).join("");
        return `<section class="card"><div class="step"><span class="num">${PM.escapeHtml(chapter.step)}</span><h2>${PM.escapeHtml(point.label || `${PM.I18n.t(locale, "chapter")} ${chapter.step}`)}</h2>${point.duration ? `<span class="pill">${PM.escapeHtml(point.duration)}</span>` : ""}</div>${point.note ? `<div class="note">${PM.escapeHtml(point.note)}</div>` : ""}${extras ? `<ul class="extras">${extras}</ul>` : ""}</section>`;
      }).join("");
      return `<!doctype html><html lang="${locale}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="source-app" content="PlotMapper Tool"><meta name="source-version" content="${PM.APP_VERSION}"><title>PlotReader Export</title><style>${css}</style></head><body><main class="cards">${body}</main></body></html>`;
    }

    function exportHtml() {
      const state = store.getState();
      const name = `${PM.safeFilename(state.map.name, "PlotReader")}_${PM.formatDateStamp()}.html`;
      PM.downloadText(name, readerDocumentHtml(), "text/html;charset=utf-8");
    }

    function printPdf() {
      const win = window.open("", "_blank");
      if (!win) {
        alert(PM.I18n.t(store.getLiveState().settings.locale, "popupBlocked"));
        return;
      }
      win.document.open();
      win.document.write(readerDocumentHtml());
      win.document.close();
      setTimeout(() => {
        win.focus();
        win.print();
      }, 150);
    }

    closeButton.addEventListener("click", close);
    backdrop.addEventListener("click", close);
    extrasToggle.addEventListener("change", render);
    exportHtmlButton.addEventListener("click", exportHtml);
    printPdfButton.addEventListener("click", printPdf);
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") close();
    });

    store.subscribe(() => {
      if (!modal.hidden) render();
    });

    return {
      open,
      close,
      render,
      exportHtml,
      printPdf
    };
  }

  PM.createReader = createReader;
})(globalThis.PM);
