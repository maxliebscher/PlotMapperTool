(function finderModule(PM) {
  "use strict";

  const RESULT_LIMIT = 48;

  function issueForPoint(point) {
    if (!point) return "";
    if (!String(point.label || "").trim() && point.type !== "route") return "missingLabel";
    if (point.type === "route" && point.helper && !String(point.label || "").trim()) return "unnamedHelper";
    if (String(point.note || "").length > 180) return "longNote";
    return "";
  }

  function issueLabel(issue, locale) {
    const keys = {
      missingLabel: "finderIssueMissingLabel",
      unnamedHelper: "finderIssueUnnamedHelper",
      longNote: "finderIssueLongNote"
    };
    return keys[issue] ? PM.I18n.t(locale, keys[issue]) : "";
  }

  function entryType(entry, state) {
    if (entry.kind !== "point") return entry.kind;
    const point = state.points.find((candidate) => candidate.id === entry.pointId);
    return point ? point.type : "point";
  }

  function entryIssue(entry, state) {
    if (entry.kind !== "point") return "";
    return issueForPoint(state.points.find((candidate) => candidate.id === entry.pointId));
  }

  function pointInBounds(point, bounds) {
    if (!point || !bounds) return true;
    const right = bounds.left + bounds.width;
    const bottom = bounds.top + bounds.height;
    return point.x >= bounds.left && point.x <= right && point.y >= bounds.top && point.y <= bottom;
  }

  function entryInBounds(entry, state, bounds) {
    if (!bounds) return true;
    if (entry.kind === "point") {
      return pointInBounds(state.points.find((candidate) => candidate.id === entry.pointId), bounds);
    }
    if (entry.kind === "route") {
      return state.points.some((point) => point.type === "route" && point.routeId === entry.routeId && pointInBounds(point, bounds));
    }
    return false;
  }

  function filterMatches(entry, state, activeFilter, bounds) {
    if (activeFilter === "all") return true;
    if (activeFilter === "issue") return Boolean(entryIssue(entry, state));
    if (activeFilter === "view") return entryInBounds(entry, state, bounds);
    if (activeFilter === "note") {
      if (entry.kind !== "point") return false;
      const point = state.points.find((candidate) => candidate.id === entry.pointId);
      return Boolean(point && (point.note || point.duration || point.location));
    }
    return entryType(entry, state) === activeFilter;
  }

  function filterCounts(entries, state, bounds) {
    const filters = ["all", "view", "issue", "route", "place", "char", "event", "item", "note"];
    return filters.reduce((counts, filter) => {
      counts[filter] = (entries || []).filter((entry) => filterMatches(entry, state, filter, bounds)).length;
      return counts;
    }, {});
  }

  function groupLabel(entry, state, locale) {
    if (entry.kind === "route") return PM.I18n.t(locale, "routes");
    const issue = entryIssue(entry, state);
    if (issue) return PM.I18n.t(locale, "finderIssues");
    return PM.I18n.t(locale, entryType(entry, state)) || PM.I18n.t(locale, "commandKindPoint");
  }

  function resultActionLabel(entry, locale) {
    if (entry.kind === "route") return PM.I18n.t(locale, "routes");
    return PM.I18n.t(locale, "jump");
  }

  function resultDetail(entry, state, locale) {
    const issue = entryIssue(entry, state);
    return [issueLabel(issue, locale), entry.detail].filter(Boolean).join(" - ");
  }

  function limitText(total, visible, locale) {
    const hidden = Math.max(0, total - visible);
    if (!hidden) return PM.I18n.t(locale, "finderLimit");
    return PM.I18n.t(locale, "finderLimitOverflow").replace("{count}", String(hidden));
  }

  function filterLabel(filter, locale) {
    if (filter === "all") return PM.I18n.t(locale, "finderAll");
    if (filter === "issue") return PM.I18n.t(locale, "finderIssues");
    if (filter === "view") return PM.I18n.t(locale, "finderInView");
    if (filter === "note") return PM.I18n.t(locale, "notes");
    return PM.I18n.t(locale, filter);
  }

  function createFinderDrawer(elements, store, options) {
    const hooks = options || {};
    const {
      panel,
      title,
      hint,
      closeButton,
      input,
      filters,
      summary,
      actionHint,
      results,
      empty,
      limitLabel
    } = elements;

    let activeFilter = "all";
    let matches = [];
    let selection = 0;
    let lastKeyboardMoveAt = 0;

    function t(key) {
      return PM.I18n.t(store.getLiveState().settings.locale, key);
    }

    function searchableEntries() {
      const state = store.getLiveState();
      return PM.buildCommandPaletteEntries(state, state.settings.locale)
        .filter((entry) => entry.kind === "point" || entry.kind === "route");
    }

    function iconHtml(entry, state) {
      if (entry.kind === "route" && entry.color) {
        return `<span class="finder-route-swatch" style="--route-color:${PM.escapeHtml(entry.color)}"></span>`;
      }
      const issue = entryIssue(entry, state);
      if (issue) return "<span class=\"finder-issue-mark\">!</span>";
      return `<span aria-hidden="true">${PM.escapeHtml(entry.icon || "")}</span>`;
    }

    function renderFilters(locale, counts) {
      filters.forEach((button) => {
        const label = filterLabel(button.dataset.filter, locale);
        const count = counts[button.dataset.filter] || 0;
        button.innerHTML = [
          `<span>${PM.escapeHtml(label)}</span>`,
          `<span class="finder-filter-count">${PM.escapeHtml(String(count))}</span>`
        ].join("");
        button.setAttribute("aria-label", `${label} ${count}`);
        button.classList.toggle("is-active", button.dataset.filter === activeFilter);
        button.setAttribute("aria-pressed", String(button.dataset.filter === activeFilter));
      });
    }

    function syncSelection() {
      const resultButtons = Array.from(results.querySelectorAll(".finder-result[role='option']"));
      resultButtons.forEach((button, index) => {
        const selected = index === selection;
        button.classList.toggle("is-selected", selected);
        button.setAttribute("aria-selected", String(selected));
        if (selected) button.scrollIntoView({ block: "nearest" });
      });
      if (typeof hooks.onPreviewPoint === "function") {
        const selected = currentSelection();
        hooks.onPreviewPoint(selected && selected.kind === "point" ? selected.pointId : "");
      }
    }

    function render() {
      if (panel.hidden) return;
      const state = store.getLiveState();
      const locale = state.settings.locale;
      title.textContent = t("finder");
      hint.textContent = t("finderHint");
      closeButton.textContent = "x";
      input.placeholder = t("finderPlaceholder");
      input.setAttribute("aria-label", t("finderPlaceholder"));
      empty.textContent = t("finderEmpty");
      const entries = searchableEntries();
      const query = input.value;
      const baseMatches = PM.filterCommandPaletteEntries(entries, query, state.points.length + state.routes.length + 8);
      const bounds = typeof hooks.visibleBounds === "function" ? hooks.visibleBounds() : null;
      renderFilters(locale, filterCounts(baseMatches, state, bounds));
      matches = baseMatches.filter((entry) => filterMatches(entry, state, activeFilter, bounds));
      const visibleMatches = matches.slice(0, RESULT_LIMIT);
      limitLabel.textContent = limitText(matches.length, visibleMatches.length, locale);
      selection = PM.clamp(selection, 0, Math.max(0, visibleMatches.length - 1));
      const countSummary = `${matches.length} ${t("finderMatches")} - ${visibleMatches.length} ${t("finderVisible")}`;
      summary.textContent = activeFilter === "all" ? countSummary : `${filterLabel(activeFilter, locale)}: ${countSummary}`;
      actionHint.innerHTML = [
        `<kbd>↑↓</kbd>`,
        `<span>${PM.escapeHtml(t("finderJumpHint"))}</span>`,
        typeof hooks.onInspect === "function" ? `<span class="finder-inspect-shortcut"><kbd>Ctrl</kbd>+<kbd>Enter</kbd> ${PM.escapeHtml(t("finderInspectHint"))}</span>` : ""
      ].filter(Boolean).join(" ");
      results.textContent = "";
      empty.hidden = matches.length > 0;
      let lastGroup = "";
      visibleMatches.forEach((entry, index) => {
        const group = groupLabel(entry, state, locale);
        if (group !== lastGroup) {
          const heading = document.createElement("div");
          heading.className = "finder-group-title";
          heading.textContent = group;
          results.appendChild(heading);
          lastGroup = group;
        }
        const button = document.createElement("button");
        button.type = "button";
        button.className = `finder-result${index === selection ? " is-selected" : ""}`;
        button.setAttribute("role", "option");
        button.setAttribute("aria-selected", String(index === selection));
        button.innerHTML = [
          `<span class="finder-result-icon">${iconHtml(entry, state)}</span>`,
          `<span class="finder-result-copy"><strong>${PM.escapeHtml(entry.label)}</strong><span>${PM.escapeHtml(resultDetail(entry, state, locale))}</span></span>`,
          `<span class="finder-result-action">${PM.escapeHtml(resultActionLabel(entry, locale))}</span>`,
          entry.kind === "point" && typeof hooks.onInspect === "function" ? `<span class="finder-result-inspect">${PM.escapeHtml(PM.I18n.t(locale, "inspectPoint"))}</span>` : ""
        ].join("");
        button.addEventListener("mouseenter", () => {
          if (Date.now() - lastKeyboardMoveAt < 220) return;
          if (selection === index) return;
          selection = index;
          syncSelection();
        });
        button.addEventListener("click", () => execute(entry, "jump"));
        const inspect = button.querySelector(".finder-result-inspect");
        if (inspect) {
          inspect.addEventListener("click", (event) => {
            event.stopPropagation();
            execute(entry, "inspect");
          });
        }
        results.appendChild(button);
      });
      if (typeof hooks.onPreviewPoint === "function") {
        const selected = visibleMatches[selection];
        hooks.onPreviewPoint(selected && selected.kind === "point" ? selected.pointId : "");
      }
    }

    function open(seed, filter) {
      panel.hidden = false;
      document.documentElement.classList.add("finder-open");
      if (seed !== undefined) input.value = seed || "";
      if (filter) activeFilter = filter;
      selection = 0;
      render();
      input.focus();
      input.select();
    }

    function close() {
      panel.hidden = true;
      document.documentElement.classList.remove("finder-open");
      if (typeof hooks.onPreviewPoint === "function") hooks.onPreviewPoint("");
    }

    function execute(entry, action) {
      if (!entry) return;
      if (entry.kind === "point") {
        if (action === "inspect" && typeof hooks.onInspect === "function") {
          close();
          hooks.onInspect(entry.pointId, { mode: "dock" });
          return;
        }
        close();
        if (typeof hooks.onJumpPoint === "function") hooks.onJumpPoint(entry.pointId);
        return;
      }
      if (entry.kind === "route" && typeof hooks.onRoute === "function") {
        close();
        hooks.onRoute(entry.routeId);
      }
    }

    function currentSelection() {
      return matches.slice(0, RESULT_LIMIT)[selection];
    }

    function moveSelection(delta) {
      lastKeyboardMoveAt = Date.now();
      selection = PM.clamp(selection + delta, 0, Math.max(0, Math.min(matches.length, RESULT_LIMIT) - 1));
      syncSelection();
    }

    function setSelection(index) {
      lastKeyboardMoveAt = Date.now();
      selection = PM.clamp(index, 0, Math.max(0, Math.min(matches.length, RESULT_LIMIT) - 1));
      syncSelection();
    }

    input.addEventListener("input", () => {
      selection = 0;
      render();
    });
    input.addEventListener("keydown", (event) => {
      if (event.key === "ArrowDown") {
        event.preventDefault();
        moveSelection(1);
      }
      if (event.key === "ArrowUp") {
        event.preventDefault();
        moveSelection(-1);
      }
      if (event.key === "PageDown") {
        event.preventDefault();
        moveSelection(8);
      }
      if (event.key === "PageUp") {
        event.preventDefault();
        moveSelection(-8);
      }
      if (event.key === "Home") {
        event.preventDefault();
        setSelection(0);
      }
      if (event.key === "End") {
        event.preventDefault();
        setSelection(Math.min(matches.length, RESULT_LIMIT) - 1);
      }
      if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
        event.preventDefault();
        execute(currentSelection(), "inspect");
      } else if (event.key === "Enter") {
        event.preventDefault();
        execute(currentSelection(), "jump");
      }
      if (event.key === "Escape") {
        event.preventDefault();
        close();
      }
    });
    filters.forEach((button) => {
      button.addEventListener("click", () => {
        activeFilter = button.dataset.filter || "all";
        selection = 0;
        render();
        input.focus();
      });
    });
    closeButton.addEventListener("click", close);
    document.addEventListener("keydown", (event) => {
      if (!panel.hidden && event.key === "Escape") close();
    });
    store.subscribe(() => render());

    return {
      open,
      close,
      render,
      isOpen() {
        return !panel.hidden;
      },
      resultCount() {
        return matches.length;
      }
    };
  }

  PM.finderIssueForPoint = issueForPoint;
  PM.finderIssueLabel = issueLabel;
  PM.finderFilterCounts = filterCounts;
  PM.finderLimitText = limitText;
  PM.createFinderDrawer = createFinderDrawer;
})(globalThis.PM);
