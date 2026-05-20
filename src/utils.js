(function utilsModule(PM) {
  "use strict";

  PM.clamp = function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  };

  PM.round4 = function round4(value) {
    return Math.round((Number(value) || 0) * 10000) / 10000;
  };

  PM.clone = function clone(value) {
    return JSON.parse(JSON.stringify(value));
  };

  PM.uid = function uid(prefix) {
    const head = prefix || "pt";
    if (globalThis.crypto && typeof globalThis.crypto.randomUUID === "function") {
      return `${head}-${globalThis.crypto.randomUUID()}`;
    }
    return `${head}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  };

  PM.escapeHtml = function escapeHtml(value) {
    return String(value || "").replace(/[&<>"']/g, (char) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      "\"": "&quot;",
      "'": "&#39;"
    })[char]);
  };

  PM.downloadText = function downloadText(filename, content, type) {
    const blob = new Blob([content], { type: type || "text/plain;charset=utf-8" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(link.href), 3000);
  };

  PM.safeFilename = function safeFilename(name, fallback) {
    const cleaned = String(name || "").replace(/\.[^.]+$/, "").replace(/[^\w.-]+/g, "_").replace(/^_+|_+$/g, "");
    return cleaned || fallback || "PlotMap";
  };

  PM.formatDateStamp = function formatDateStamp(date) {
    return (date || new Date()).toISOString().slice(0, 10).replace(/-/g, "");
  };

  PM.formatDurationLabel = function formatDurationLabel(value) {
    const text = String(value || "").trim();
    if (!text) return "";
    return /^\u231b\s*/.test(text) ? text : `\u231b ${text}`;
  };
})(globalThis.PM);
