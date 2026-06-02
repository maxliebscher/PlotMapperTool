(function commandPaletteModule(PM) {
  "use strict";

  function normalizeSearchText(value) {
    return String(value || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  function paletteAction(id, label, detail, icon, keywords) {
    return {
      id: `action:${id}`,
      kind: "action",
      action: id,
      icon,
      label,
      detail,
      keywords: keywords || ""
    };
  }

  function pointLabel(point, locale) {
    const type = PM.getPointType(point.type);
    if (point.label) return point.label;
    if (point.location) return point.location;
    return PM.I18n.t(locale, point.type) || type.fallbackLabel || PM.I18n.t(locale, "untitled");
  }

  function pointDetail(point, project, locale) {
    const typeLabel = PM.I18n.t(locale, point.type);
    if (point.type !== "route") {
      return [typeLabel, point.location, PM.formatDurationLabel(point.duration)].filter(Boolean).join(" · ");
    }
    const route = PM.routeForPoint(point, project.routes);
    const routeInfo = route ? PM.computeRouteInfo(project.points, project.settings, route) : PM.computeRoutesInfo(project.points, project.settings, project.routes);
    const step = routeInfo.displayById.get(point.id) || "";
    const helper = point.helper ? PM.I18n.t(locale, "helperPointSize") : "";
    return [route ? route.name : PM.I18n.t(locale, "route"), step ? `#${step}` : helper].filter(Boolean).join(" · ");
  }

  function buildCommandPaletteEntries(project, localeInput) {
    const locale = PM.I18n.normalizeLocale(localeInput || (project && project.settings && project.settings.locale) || "en");
    const state = PM.normalizeProject(project);
    const actions = [
      paletteAction("reader", PM.I18n.t(locale, "reader"), locale === "de" ? "Lineare Story-Ansicht öffnen" : "Open linear story view", "\uD83D\uDCD6", "read lesen kapitel chapter"),
      paletteAction("present", PM.I18n.t(locale, "present"), locale === "de" ? "Präsentationsmodus starten" : "Start presentation mode", "\u25B6", "presentation reveal fog präsentation"),
      paletteAction("export-png", PM.I18n.t(locale, "png"), locale === "de" ? "Aktuelle Ansicht als Bild exportieren" : "Export current view as image", "\uD83D\uDCF7", "export png bild image"),
      paletteAction("routes", PM.I18n.t(locale, "routes"), locale === "de" ? "Routenverwaltung öffnen" : "Open route management", "\u21C4", "route pfad panel farbe linie"),
      paletteAction("finder", PM.I18n.t(locale, "finder"), locale === "de" ? "Große Punktliste durchsuchen und zur Karte springen" : "Search large point lists and jump to the map", "\u2315", "finder suchen search punkte points hinweise"),
      paletteAction("finder-issues", PM.I18n.t(locale, "finderIssues"), locale === "de" ? "Projekt-Hinweise im Finder prüfen" : "Review project hints in Finder", "!", "hinweise hints probleme problems check fehlende labels lange notizen"),
      paletteAction("finder-view", PM.I18n.t(locale, "finderInView"), locale === "de" ? "Finder auf aktuellen Kartenausschnitt begrenzen" : "Limit Finder to the current map view", "\u25A7", "finder ausschnitt view viewport sichtbar visible current"),
      paletteAction("minimap", PM.I18n.t(locale, "minimap"), locale === "de" ? "Orientierungs-Minimap ein- oder ausschalten" : "Toggle orientation minimap", "\uD83D\uDDFA\uFE0F", "minimap overview ausschnitt viewport orientierung"),
      paletteAction("collapse-menu", PM.I18n.t(locale, "collapseMenu"), locale === "de" ? "Mehr Karte, weniger Menü" : "More map, less menu", "\u25B4", "collapse menu einklappen")
    ];
    if (Array.isArray(PM.VIEW_PRESETS)) {
      PM.VIEW_PRESETS.forEach((preset) => {
        actions.push(paletteAction(
          `view-${preset.id}`,
          PM.I18n.t(locale, preset.labelKey),
          `${PM.I18n.t(locale, "viewPresets")} - ${PM.I18n.t(locale, preset.titleKey)}`,
          "\u25A4",
          `view ansicht ansichten preset filter ${preset.id} ${PM.I18n.t(locale, preset.labelKey)} ${PM.I18n.t(locale, preset.titleKey)}`
        ));
        actions[actions.length - 1].action = `view:${preset.id}`;
      });
    }

    const points = state.points.map((point) => {
      const type = PM.getPointType(point.type);
      const route = PM.routeForPoint(point, state.routes);
      const label = pointLabel(point, locale);
      return {
        id: `point:${point.id}`,
        kind: "point",
        pointId: point.id,
        icon: point.type === "route" ? "\uD83D\uDDFA\uFE0F" : type.icon,
        label,
        detail: pointDetail(point, state, locale),
        keywords: [
          point.type,
          PM.I18n.t(locale, point.type),
          point.label,
          point.location,
          point.note,
          point.duration,
          route && route.name,
          point.helper ? "helper hilfspunkt" : ""
        ].filter(Boolean).join(" ")
      };
    });

    const routes = state.routes.map((route) => ({
      id: `route:${route.id}`,
      kind: "route",
      routeId: route.id,
      icon: "\u25A0",
      label: route.name,
      detail: [
        PM.I18n.t(locale, "route"),
        route.visible ? PM.I18n.t(locale, "routeVisible") : PM.I18n.t(locale, "presentationFogOff"),
        PM.I18n.t(locale, `routeArrow${(route.arrowMode || "none")[0].toUpperCase()}${(route.arrowMode || "none").slice(1)}`)
      ].filter(Boolean).join(" · "),
      color: route.color,
      keywords: [route.name, PM.I18n.t(locale, "route"), PM.I18n.t(locale, "activeRoute"), route.lineStyle, route.arrowMode].filter(Boolean).join(" ")
    }));

    return [...actions, ...points, ...routes].map((entry, index) => ({
      ...entry,
      rank: entry.kind === "action" ? index : entry.kind === "point" ? 100 + index : 200 + index,
      searchText: normalizeSearchText([entry.label, entry.detail, entry.keywords].filter(Boolean).join(" "))
    }));
  }

  function scoreEntry(entry, query) {
    if (!query) return -entry.rank / 1000;
    const haystack = entry.searchText || normalizeSearchText([entry.label, entry.detail, entry.keywords].join(" "));
    const terms = normalizeSearchText(query).split(" ").filter(Boolean);
    let score = 0;
    for (const term of terms) {
      const index = haystack.indexOf(term);
      if (index < 0) return -Infinity;
      score += index === 0 ? 40 : haystack.includes(` ${term}`) ? 24 : 12;
    }
    if (normalizeSearchText(entry.label).startsWith(normalizeSearchText(query))) score += 50;
    if (entry.kind === "action") score += 4;
    return score - entry.rank / 1000;
  }

  function filterCommandPaletteEntries(entries, query, limit) {
    const max = limit || 12;
    return (entries || [])
      .map((entry) => ({ entry, score: scoreEntry(entry, query) }))
      .filter((item) => item.score > -Infinity)
      .sort((a, b) => b.score - a.score)
      .slice(0, max)
      .map((item) => item.entry);
  }

  function countCommandPaletteMatches(entries, query) {
    return (entries || [])
      .map((entry) => scoreEntry(entry, query))
      .filter((score) => score > -Infinity)
      .length;
  }

  PM.normalizeSearchText = normalizeSearchText;
  PM.buildCommandPaletteEntries = buildCommandPaletteEntries;
  PM.filterCommandPaletteEntries = filterCommandPaletteEntries;
  PM.countCommandPaletteMatches = countCommandPaletteMatches;
})(globalThis.PM);
