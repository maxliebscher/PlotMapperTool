(function constantsModule(PM) {
  "use strict";

  PM.POINT_TYPES = [
    { type: "route", icon: "", fallbackLabel: "Route" },
    { type: "place", icon: "\uD83D\uDCCD", fallbackLabel: "Place" },
    { type: "char", icon: "\uD83D\uDC64", fallbackLabel: "Character" },
    { type: "event", icon: "\u2605", fallbackLabel: "Event" },
    { type: "item", icon: "\uD83D\uDDDD\uFE0F", fallbackLabel: "Item" }
  ];

  PM.DEFAULT_SETTINGS = {
    locale: "en",
    theme: "deep",
    activeRouteId: "route-default",
    filters: {
      route: true,
      place: true,
      char: true,
      event: true,
      item: true
    },
    showLines: true,
    showLabels: true,
    showLocation: true,
    showNotes: true,
    showDuration: true,
    showEdit: true,
    focusMode: false,
    chapterMode: false,
    chapterStart: 1,
    zoom: 1,
    opacity: 1,
    panX: 0,
    panY: 0,
    routeColor: "#cc3333",
    routeWidth: 2,
    fontScale: 1,
    pointSizePx: 32,
    helperPointSizePx: 24
  };

  PM.DEFAULT_ROUTE_ID = "route-default";
  PM.LINE_STYLES = ["solid", "dashed", "dotted"];
  PM.ARROW_MODES = ["none", "middle", "repeated", "target"];

  PM.DEFAULT_ROUTE = {
    id: PM.DEFAULT_ROUTE_ID,
    name: "Route",
    color: PM.DEFAULT_SETTINGS.routeColor,
    visible: true,
    showNumbers: true,
    showArrows: false,
    arrowMode: "none",
    startNumber: 1,
    lineStyle: "solid",
    width: PM.DEFAULT_SETTINGS.routeWidth
  };

  PM.EMPTY_MAP = {
    name: "",
    dataUrl: "",
    width: 0,
    height: 0
  };

  PM.THEMES = ["deep", "bright", "contrast", "burgund", "autumn"];

  PM.getPointType = function getPointType(type) {
    return PM.POINT_TYPES.find((entry) => entry.type === type) || PM.POINT_TYPES[0];
  };

  PM.routePalette = function routePalette(index) {
    const colors = ["#cc3333", "#0d7040", "#d8f51d", "#2f77cc", "#d76f2a", "#8a55d7", "#111111"];
    return colors[Math.abs(parseInt(index, 10) || 0) % colors.length];
  };
})(globalThis.PM);
