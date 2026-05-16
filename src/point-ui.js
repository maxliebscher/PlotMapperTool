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
      const visible = PM.isPointVisible(point, settings) && (!revealInfo || PM.isPointRevealed(point, latestState.points, settings, revealInfo));
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
      element.querySelector(".point-icon").textContent = point.type === "route" ? "" : PM.getPointType(point.type).icon;
      element.querySelector(".point-number").textContent = point.type === "route" ? (routeInfo.displayById.get(point.id) || "") : "";
      const label = element.querySelector(".point-label");
      const location = element.querySelector(".point-location");
      const note = element.querySelector(".point-note");
      label.textContent = settings.showLabels ? point.label : "";
      const hidden = hiddenFor(point.id);
      location.textContent = settings.showLocation && !hidden.location ? point.location : "";
      note.textContent = settings.showNotes && !hidden.note ? point.note : "";
      element.querySelector(".point-duration").textContent = settings.showDuration ? point.duration : "";
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

    function updateMidpoints(routePoints) {
      midLayer.textContent = "";
      const settings = latestState.settings;
      const revealInfo = PM.getPresentationReveal ? PM.getPresentationReveal() : null;
      if ((revealInfo && revealInfo.active) || !settings.showLines || !settings.showEdit || !settings.filters.route) return;
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
    }

    function updateRouteLayer(routePoints) {
      routeLayer.textContent = "";
      const settings = latestState.settings;
      const width = Math.max(innerWidth, document.documentElement.clientWidth || 0);
      const height = Math.max(innerHeight, document.documentElement.clientHeight || 0);
      routeLayer.setAttribute("viewBox", `0 0 ${width} ${height}`);
      if (!settings.showLines || routePoints.length < 2) return;
      const pointsAttr = routePoints.map((point) => {
        const screen = renderer.mapToClient(point.x, point.y);
        return `${screen.x},${screen.y}`;
      }).join(" ");
      const shadow = document.createElementNS("http://www.w3.org/2000/svg", "polyline");
      shadow.setAttribute("points", pointsAttr);
      shadow.setAttribute("stroke", "rgba(0,0,0,.56)");
      shadow.setAttribute("stroke-width", String(Math.max(1, settings.routeWidth) + 2));
      const line = document.createElementNS("http://www.w3.org/2000/svg", "polyline");
      line.setAttribute("points", pointsAttr);
      line.setAttribute("stroke", settings.routeColor);
      line.setAttribute("stroke-width", String(Math.max(1, settings.routeWidth)));
      routeLayer.append(shadow, line);
    }

    function render(state) {
      latestState = state;
      document.documentElement.style.setProperty("--font-scale", String(state.settings.fontScale));
      const revealInfo = PM.getPresentationReveal ? PM.getPresentationReveal() : null;
      const routeInfo = revealInfo ? revealInfo.routeInfo : PM.computeRouteInfo(state.points, state.settings);
      const liveIds = new Set(state.points.map((point) => point.id));
      for (const [id, node] of pointNodes) {
        if (!liveIds.has(id)) {
          node.remove();
          pointNodes.delete(id);
        }
      }
      state.points.forEach((point) => updatePointNode(point, routeInfo, revealInfo));
      const visibleRoutes = revealInfo && revealInfo.active
        ? revealInfo.routePoints
        : state.points.filter((point) => point.type === "route" && PM.isPointVisible(point, state.settings));
      updateRouteLayer(visibleRoutes);
      updateMidpoints(visibleRoutes);
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
