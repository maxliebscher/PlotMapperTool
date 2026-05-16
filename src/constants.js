(function constantsModule(PM) {
  "use strict";

  PM.POINT_TYPES = [
    { type: "route", icon: "", fallbackLabel: "Route" },
    { type: "place", icon: "📍", fallbackLabel: "Place" },
    { type: "char", icon: "👤", fallbackLabel: "Character" },
    { type: "event", icon: "★", fallbackLabel: "Event" },
    { type: "item", icon: "◆", fallbackLabel: "Item" }
  ];

  PM.DEFAULT_SETTINGS = {
    locale: "en",
    theme: "deep",
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
    fontScale: 1
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
})(globalThis.PM);
