(function serializationModule(PM) {
  "use strict";

  function projectToJson(project) {
    const normalized = PM.normalizeProject(project);
    return JSON.stringify({
      schemaVersion: PM.SCHEMA_VERSION,
      appVersion: PM.APP_VERSION,
      map: normalized.map,
      settings: normalized.settings,
      points: normalized.points
    }, null, 2);
  }

  function parseProjectJson(text) {
    const parsed = JSON.parse(String(text || ""));
    if (!parsed || parsed.schemaVersion !== PM.SCHEMA_VERSION || !Array.isArray(parsed.points)) {
      throw new Error("Invalid clean PlotMapper project");
    }
    return PM.normalizeProject(parsed);
  }

  PM.Serialization = {
    projectToJson,
    parseProjectJson
  };
})(globalThis.PM);
