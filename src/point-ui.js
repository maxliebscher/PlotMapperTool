(function pointUiModule(PM) {
  "use strict";

  function createPointUi(pointLayer, midLayer, routeLayer, store, renderer, menuController) {
    const pointNodes = new Map();
    const fieldHidden = new Map();
    let latestState = store.getState();

    function hiddenFor(pointId) {
      if (!fieldHidden.has(pointId)) {
        fieldHidden.set(pointId, { location: false, note: false });
      }
      return fieldHidden.get(pointId);
    }

    function makePointNode(point) {
      const element = document.createElement("div");
      element.className = "point";
      element.dataset.id = point.id;
      element.innerHTML = [
        "<span class=\"point-icon\"></span>",
        "<span class=\"point-number\"></span>",
        "<button class=\"point-menu-button\" type=\"button\" title=\"Menu\">≡</button>",
        "<span class=\"point-label\"></span>",
        "<span class=\"point-location\"></span>",
        "<span class=\"point-note\"></span>",
        "<span class=\"point-duration\"></span>"
      ].join("");
      pointLayer.appendChild(element);

      element.querySelector(".point-menu-button").addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        menuController.showPointMenu(event.clientX, event.clientY, point.id);
      });

      let drag = null;
      element.addEventListener("pointerdown", (event) => {
        if (event.target.closest("button")) return;
        event.preventDefault();
        event.stopPropagation();
        menuController.close();
        drag = {
          checkpoint: store.createCheckpoint(),
          pointerId: event.pointerId
        };
        element.setPointerCapture(event.pointerId);
      });

      element.addEventListener("pointermove", (event) => {
        if (!drag || event.pointerId !== drag.pointerId) return;
        const pos = renderer.clientToMap(event.clientX, event.clientY);
        store.patchPoint(point.id, pos, { history: false, dirty: true });
      });

      element.addEventListener("pointerup", (event) => {
        if (!drag || event.pointerId !== drag.pointerId) return;
        element.releasePointerCapture(event.pointerId);
        store.commitCheckpoint(drag.checkpoint);
        drag = null;
      });

      element.addEventListener("pointercancel", () => {
        drag = null;
      });

      return element;
    }

    function updatePointNode(point, routeInfo, revealInfo) {
      const element = pointNodes.get(point.id) || makePointNode(point);
      pointNodes.set(point.id, element);
      const settings = latestState.settings;
      const route = PM.routeForPoint ? PM.routeForPoint(point, latestState.routes) : null;
      const visible = PM.isPointVisible(point, settings, latestState.routes) && (!revealInfo || PM.isPointRevealed(point, latestState.points, settings, revealInfo, latestState.routes));
      element.classList.toggle("hidden", !visible);
      element.classList.toggle("helper", point.helper);
      element.classList.toggle("route", point.type === "route");
      element.classList.toggle("place", point.type === "place");
      element.classList.toggle("char", point.type === "char");
      element.classList.toggle("event", point.type === "event");
      element.classList.toggle("item", point.type === "item");
      const screen = renderer.mapToClient(point.x, point.y);
      element.style.left = `${screen.x}px`;
      element.style.top = `${screen.y}px`;
      element.style.setProperty("--route-color", route ? route.color : "#fbfaf5");
      element.querySelector(".point-icon").textContent = point.type === "route" ? "" : PM.getPointType(point.type).icon;
      element.querySelector(".point-number").textContent = point.type === "route" ? (routeInfo.displayById.get(point.id) || "") : "";
      const label = element.querySelector(".point-label");
      const location = element.querySelector(".point-location");
      const note = element.querySelector(".point-note");
      label.textContent = settings.showLabels ? point.label : "";
      const hidden = hiddenFor(point.id);
      location.textContent = settings.showLocation && !hidden.location ? point.location : "";
      note.textContent = settings.showNotes && !hidden.note ? point.note : "";
      element.querySelector(".point-duration").textContent = settings.showDuration ? PM.formatDurationLabel(point.duration) : "";
      element.querySelector(".point-menu-button").hidden = !settings.showEdit;
      updateStackVars(element, label, location, note);
    }

    function stackHeight(element) {
      if (!element || !element.textContent) return 0;
      const style = getComputedStyle(element);
      if (style.display === "none" || style.visibility === "hidden") return 0;
      return element.getBoundingClientRect().height;
    }

    function updateStackVars(element, label, location, note) {
      element.style.setProperty("--lbl-h", `${stackHeight(label)}px`);
      element.style.setProperty("--loc-h", `${stackHeight(location)}px`);
      element.style.setProperty("--note-h", `${stackHeight(note)}px`);
    }

    function updateMidpoints(routeSets) {
      midLayer.textContent = "";
      const settings = latestState.settings;
      const revealInfo = PM.getPresentationReveal ? PM.getPresentationReveal() : null;
      if ((revealInfo && revealInfo.active) || !settings.showLines || !settings.showEdit || !settings.filters.route) return;
      routeSets.forEach(({ points: routePoints }) => {
        for (let index = 1; index < routePoints.length; index += 1) {
          const a = routePoints[index - 1];
          const b = routePoints[index];
          const mx = (a.x + b.x) / 2;
          const my = (a.y + b.y) / 2;
          const screen = renderer.mapToClient(mx, my);
          const midpoint = document.createElement("button");
          midpoint.type = "button";
          midpoint.className = "midpoint";
          midpoint.title = "Insert route point";
          midpoint.style.left = `${screen.x}px`;
          midpoint.style.top = `${screen.y}px`;
          midpoint.addEventListener("click", (event) => {
            event.preventDefault();
            event.stopPropagation();
            store.insertRoutePointAfter(a.id, mx, my);
          });
          midLayer.appendChild(midpoint);
        }
      });
    }

    function routeDash(route) {
      if (route.lineStyle === "dashed") return "14 10";
      if (route.lineStyle === "dotted") return `1 ${Math.max(6, route.width * 2)}`;
      return "";
    }

    function routeArrowMode(route) {
      return route.arrowMode || (route.showArrows ? "middle" : "none");
    }

    function arrowPlacements(from, to, mode) {
      const dx = to.x - from.x;
      const dy = to.y - from.y;
      const length = Math.hypot(dx, dy);
      if (!length || mode === "none") return [];
      const angle = Math.atan2(dy, dx) * 180 / Math.PI;
      const at = (t, kind) => ({ x: from.x + dx * t, y: from.y + dy * t, angle, kind });
      if (mode === "target") {
        return [at(Math.max(0.34, Math.min(0.82, 1 - 28 / length)), "triangle")];
      }
      if (mode === "repeated") {
        const count = Math.max(1, Math.min(4, Math.floor(length / 84)));
        return Array.from({ length: count }, (_value, index) => at((index + 1) / (count + 1), "chevron"));
      }
      return [at(0.5, "triangle")];
    }

    function appendArrowPath(parent, route, placement, shadow) {
      const size = Math.max(8, route.width * 1.9 + 7);
      const side = size * 0.62;
      const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
      if (placement.kind === "chevron") {
        path.setAttribute("d", `M${-size * 0.48},${-side} L${size * 0.26},0 L${-size * 0.48},${side}`);
        path.setAttribute("fill", "none");
        path.setAttribute("stroke", shadow ? "rgba(0,0,0,.64)" : route.color);
        path.setAttribute("stroke-width", shadow ? "5" : "3");
        path.setAttribute("stroke-linecap", "round");
        path.setAttribute("stroke-linejoin", "round");
      } else {
        path.setAttribute("d", `M${-size},${-side} L${size * 0.85},0 L${-size},${side} Z`);
        path.setAttribute("fill", shadow ? "rgba(0,0,0,.64)" : route.color);
        if (!shadow) {
          path.setAttribute("stroke", "rgba(255,255,255,.65)");
          path.setAttribute("stroke-width", "1");
        }
      }
      path.setAttribute(
        "transform",
        `translate(${placement.x + (shadow ? 2 : 0)} ${placement.y + (shadow ? 2 : 0)}) rotate(${placement.angle})`
      );
      parent.appendChild(path);
    }

    function appendRouteArrows(parent, route, routePoints) {
      const mode = routeArrowMode(route);
      if (mode === "none" || routePoints.length < 2) return;
      for (let index = 1; index < routePoints.length; index += 1) {
        const from = renderer.mapToClient(routePoints[index - 1].x, routePoints[index - 1].y);
        const to = renderer.mapToClient(routePoints[index].x, routePoints[index].y);
        arrowPlacements(from, to, mode).forEach((placement) => appendArrowPath(parent, route, placement, true));
        arrowPlacements(from, to, mode).forEach((placement) => appendArrowPath(parent, route, placement, false));
      }
    }

    function updateRouteLayer(routeSets) {
      routeLayer.textContent = "";
      const settings = latestState.settings;
      const width = Math.max(innerWidth, document.documentElement.clientWidth || 0);
      const height = Math.max(innerHeight, document.documentElement.clientHeight || 0);
      routeLayer.setAttribute("viewBox", `0 0 ${width} ${height}`);
      if (!settings.showLines) return;
      routeSets.forEach(({ route, points: routePoints }) => {
        if (routePoints.length < 2) return;
        const pointsAttr = routePoints.map((point) => {
          const screen = renderer.mapToClient(point.x, point.y);
          return `${screen.x},${screen.y}`;
        }).join(" ");
        const shadow = document.createElementNS("http://www.w3.org/2000/svg", "polyline");
        shadow.setAttribute("points", pointsAttr);
        shadow.setAttribute("stroke", "rgba(0,0,0,.56)");
        shadow.setAttribute("stroke-width", String(Math.max(1, route.width) + 2));
        const line = document.createElementNS("http://www.w3.org/2000/svg", "polyline");
        line.setAttribute("points", pointsAttr);
        line.setAttribute("stroke", route.color);
        line.setAttribute("stroke-width", String(Math.max(1, route.width)));
        const dash = routeDash(route);
        if (dash) line.setAttribute("stroke-dasharray", dash);
        routeLayer.append(shadow, line);
        appendRouteArrows(routeLayer, route, routePoints);
      });
    }

    function render(state) {
      latestState = state;
      document.documentElement.style.setProperty("--font-scale", String(state.settings.fontScale));
      document.documentElement.style.setProperty("--point-size", `${state.settings.pointSizePx}px`);
      document.documentElement.style.setProperty("--helper-point-size", `${state.settings.helperPointSizePx}px`);
      const revealInfo = PM.getPresentationReveal ? PM.getPresentationReveal() : null;
      const routeInfo = revealInfo ? revealInfo.routeInfo : PM.computeRoutesInfo(state.points, state.settings, state.routes);
      const liveIds = new Set(state.points.map((point) => point.id));
      for (const [id, node] of pointNodes) {
        if (!liveIds.has(id)) {
          node.remove();
          pointNodes.delete(id);
        }
      }
      state.points.forEach((point) => updatePointNode(point, routeInfo, revealInfo));
      const routeSets = revealInfo && revealInfo.active
        ? (revealInfo.routeReveals || [{ route: revealInfo.activeRoute || PM.getActiveRoute(state.settings, state.routes), points: revealInfo.routePoints }])
          .map((entry) => ({ route: entry.route, points: entry.routePoints || entry.points || [] }))
        : state.routes
          .filter((route) => route.visible)
          .map((route) => ({
            route,
            points: state.points.filter((point) => point.type === "route" && point.routeId === route.id && PM.isPointVisible(point, state.settings, state.routes))
          }));
      updateRouteLayer(routeSets);
      updateMidpoints(routeSets);
    }

    store.subscribe(render);
    globalThis.addEventListener("resize", () => render(store.getState()));
    globalThis.addEventListener("pm:image-ready", () => render(store.getState()));
    PM.isPointFieldHidden = function isPointFieldHidden(pointId, field) {
      return Boolean(hiddenFor(pointId)[field]);
    };
    PM.togglePointField = function togglePointField(pointId, field) {
      const hidden = hiddenFor(pointId);
      hidden[field] = !hidden[field];
      render(store.getState());
    };
    PM.setPointFieldHidden = function setPointFieldHidden(pointId, field, isHidden) {
      hiddenFor(pointId)[field] = Boolean(isHidden);
      render(store.getState());
    };

    return {
      render
    };
  }

  PM.createPointUi = createPointUi;
})(globalThis.PM);
