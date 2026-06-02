(function viewPresetsModule(PM) {
  "use strict";

  const allFilters = {
    route: true,
    place: true,
    char: true,
    event: true,
    item: true
  };

  const VIEW_PRESETS = [
    {
      id: "all",
      labelKey: "viewPresetAll",
      titleKey: "viewPresetAllTitle",
      settings: {
        filters: allFilters,
        focusMode: false,
        showLines: true,
        showLabels: true,
        showLocation: true,
        showNotes: true,
        showDuration: true,
        showEdit: true
      }
    },
    {
      id: "route",
      labelKey: "viewPresetRoute",
      titleKey: "viewPresetRouteTitle",
      settings: {
        filters: {
          route: true,
          place: false,
          char: false,
          event: false,
          item: false
        },
        focusMode: false,
        showLines: true,
        showLabels: true,
        showLocation: false,
        showNotes: false,
        showDuration: true,
        showEdit: true
      }
    },
    {
      id: "cast",
      labelKey: "viewPresetCast",
      titleKey: "viewPresetCastTitle",
      settings: {
        filters: {
          route: false,
          place: true,
          char: true,
          event: false,
          item: false
        },
        focusMode: false,
        showLines: false,
        showLabels: true,
        showLocation: true,
        showNotes: true,
        showDuration: false,
        showEdit: true
      }
    },
    {
      id: "notes",
      labelKey: "viewPresetNotes",
      titleKey: "viewPresetNotesTitle",
      settings: {
        filters: allFilters,
        focusMode: false,
        showLines: true,
        showLabels: true,
        showLocation: true,
        showNotes: true,
        showDuration: true,
        showEdit: false
      }
    }
  ];

  function getViewPreset(id) {
    return VIEW_PRESETS.find((preset) => preset.id === id) || null;
  }

  function getViewPresetPatch(id) {
    const preset = getViewPreset(id);
    return preset ? PM.clone(preset.settings) : null;
  }

  function applyViewPreset(store, id) {
    const patch = getViewPresetPatch(id);
    if (!patch || !store || typeof store.setSettings !== "function") return false;
    store.setSettings(patch);
    return true;
  }

  function viewPresetMatchesState(state, id) {
    const patch = getViewPresetPatch(id);
    if (!patch || !state || !state.settings) return false;
    const settings = state.settings;
    if (patch.focusMode !== undefined && Boolean(settings.focusMode) !== Boolean(patch.focusMode)) return false;
    const keys = ["showLines", "showLabels", "showLocation", "showNotes", "showDuration", "showEdit"];
    if (keys.some((key) => patch[key] !== undefined && Boolean(settings[key]) !== Boolean(patch[key]))) return false;
    if (patch.filters) {
      return Object.entries(patch.filters).every(([type, value]) => Boolean(settings.filters && settings.filters[type]) === Boolean(value));
    }
    return true;
  }

  PM.VIEW_PRESETS = VIEW_PRESETS;
  PM.getViewPresetPatch = getViewPresetPatch;
  PM.applyViewPreset = applyViewPreset;
  PM.viewPresetMatchesState = viewPresetMatchesState;
})(globalThis.PM);
