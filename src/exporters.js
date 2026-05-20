(function exportersModule(PM) {
  "use strict";

  function distance(a, b) {
    const dx = (a.x || 0) - (b.x || 0);
    const dy = (a.y || 0) - (b.y || 0);
    return Math.sqrt(dx * dx + dy * dy);
  }

  function buildReaderChapters(project) {
    const state = PM.normalizeProject(project);
    const activeRoute = PM.getActiveRoute(state.settings, state.routes);
    if (!activeRoute || activeRoute.visible === false) return [];
    const routeInfo = PM.computeRouteInfo(state.points, state.settings, activeRoute);
    const routes = routeInfo.numberedRoutes;
    const chapters = routes.map((route) => ({
      point: route,
      step: routeInfo.displayById.get(route.id),
      extras: []
    }));

    const others = state.points.filter((point) => point.type !== "route");
    for (const point of others) {
      if (!routes.length) break;
      let bestIndex = 0;
      let bestDistance = Number.POSITIVE_INFINITY;
      routes.forEach((route, index) => {
        const current = distance(point, route);
        if (current < bestDistance) {
          bestDistance = current;
          bestIndex = index;
        }
      });
      chapters[bestIndex].extras.push(point);
    }

    return chapters;
  }

  PM.Exporters = {
    buildReaderChapters
  };
})(globalThis.PM);
