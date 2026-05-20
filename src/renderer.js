(function rendererModule(PM) {
  "use strict";

  function createRenderer(canvas, store) {
    const ctx = canvas.getContext("2d");
    const image = new Image();
    let imageReady = false;
    let activeSrc = "";
    let latestState = store.getState();

    function resize() {
      const dpr = Math.max(1, Math.min(2, globalThis.devicePixelRatio || 1));
      const width = Math.floor(canvas.clientWidth * dpr);
      const height = Math.floor(canvas.clientHeight * dpr);
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      draw();
    }

    function getViewportSize() {
      return { width: canvas.clientWidth || innerWidth, height: canvas.clientHeight || innerHeight };
    }

    function ensureImage(state) {
      const src = state.map.dataUrl || "";
      if (!src) {
        activeSrc = "";
        imageReady = false;
        return;
      }
      if (src === activeSrc) return;
      activeSrc = src;
      imageReady = false;
      image.onload = () => {
        imageReady = true;
        draw();
        globalThis.dispatchEvent(new CustomEvent("pm:image-ready"));
      };
      image.onerror = () => {
        imageReady = false;
        draw();
      };
      image.src = src;
    }

    function getImageRect(width, height, state) {
      const target = state || latestState;
      const viewportWidth = width || getViewportSize().width;
      const viewportHeight = height || getViewportSize().height;
      const imgWidth = imageReady ? image.naturalWidth : target.map.width;
      const imgHeight = imageReady ? image.naturalHeight : target.map.height;
      if (!imgWidth || !imgHeight) {
        return { x: viewportWidth / 2, y: viewportHeight / 2, w: 0, h: 0 };
      }
      const scale = Math.min(viewportWidth / imgWidth, viewportHeight / imgHeight) * target.settings.zoom;
      const w = imgWidth * scale;
      const h = imgHeight * scale;
      return {
        x: (viewportWidth - w) / 2 + target.settings.panX,
        y: (viewportHeight - h) / 2 + target.settings.panY,
        w,
        h
      };
    }

    function mapToClient(x, y) {
      const rect = getImageRect();
      return {
        x: rect.x + x * rect.w,
        y: rect.y + y * rect.h
      };
    }

    function clientToMap(clientX, clientY) {
      const rect = canvas.getBoundingClientRect();
      const imgRect = getImageRect();
      return {
        x: PM.clamp((clientX - rect.left - imgRect.x) / imgRect.w, 0, 1),
        y: PM.clamp((clientY - rect.top - imgRect.y) / imgRect.h, 0, 1)
      };
    }

    function centerOnPoint(point, targetZoom) {
      if (!point) return;
      const size = getViewportSize();
      const zoom = targetZoom || Math.max(latestState.settings.zoom, 1.8);
      const imgWidth = imageReady ? image.naturalWidth : latestState.map.width;
      const imgHeight = imageReady ? image.naturalHeight : latestState.map.height;
      if (!imgWidth || !imgHeight) return;
      const scale = Math.min(size.width / imgWidth, size.height / imgHeight) * zoom;
      const w = imgWidth * scale;
      const h = imgHeight * scale;
      store.setSettings({
        zoom,
        panX: size.width / 2 - ((size.width - w) / 2 + point.x * w),
        panY: size.height / 2 - ((size.height - h) / 2 + point.y * h)
      });
    }

    function dashForRoute(route) {
      if (!route) return [];
      if (route.lineStyle === "dashed") return [14, 10];
      if (route.lineStyle === "dotted") return [2, Math.max(6, route.width * 2)];
      return [];
    }

    function routePointSets(state) {
      return state.routes
        .filter((route) => route.visible)
        .map((route) => ({
          route,
          points: state.points.filter((point) => point.type === "route" && point.routeId === route.id && PM.isPointVisible(point, state.settings, state.routes))
        }))
        .filter((set) => set.points.length >= 2);
    }

    function strokeRoutePath(targetCtx, rect, points) {
      targetCtx.beginPath();
      points.forEach((point, index) => {
        const px = rect.x + point.x * rect.w;
        const py = rect.y + point.y * rect.h;
        if (index) targetCtx.lineTo(px, py);
        else targetCtx.moveTo(px, py);
      });
      targetCtx.stroke();
    }

    function canvasPoint(rect, point) {
      return {
        x: rect.x + point.x * rect.w,
        y: rect.y + point.y * rect.h
      };
    }

    function routeArrowMode(route) {
      return route.arrowMode || (route.showArrows ? "middle" : "none");
    }

    function arrowPlacements(from, to, mode) {
      const dx = to.x - from.x;
      const dy = to.y - from.y;
      const length = Math.hypot(dx, dy);
      if (!length || mode === "none") return [];
      const angle = Math.atan2(dy, dx);
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

    function drawTriangleArrow(targetCtx, placement, size) {
      const side = size * 0.62;
      targetCtx.beginPath();
      targetCtx.moveTo(size * 0.85, 0);
      targetCtx.lineTo(-size, -side);
      targetCtx.lineTo(-size, side);
      targetCtx.closePath();
      targetCtx.fill();
      if (targetCtx.strokeStyle) targetCtx.stroke();
    }

    function drawChevronArrow(targetCtx, placement, size) {
      const side = size * 0.62;
      targetCtx.beginPath();
      targetCtx.moveTo(-size * 0.48, -side);
      targetCtx.lineTo(size * 0.26, 0);
      targetCtx.lineTo(-size * 0.48, side);
      targetCtx.stroke();
    }

    function drawArrowPlacement(targetCtx, placement, route, shadow) {
      const size = Math.max(8, route.width * 1.9 + 7);
      targetCtx.save();
      targetCtx.translate(placement.x + (shadow ? 2 : 0), placement.y + (shadow ? 2 : 0));
      targetCtx.rotate(placement.angle);
      if (placement.kind === "chevron") {
        targetCtx.fillStyle = "transparent";
        targetCtx.strokeStyle = shadow ? "rgba(0, 0, 0, 0.62)" : route.color;
        targetCtx.lineWidth = shadow ? 5 : 3;
        targetCtx.lineCap = "round";
        targetCtx.lineJoin = "round";
        drawChevronArrow(targetCtx, placement, size);
      } else {
        targetCtx.fillStyle = shadow ? "rgba(0, 0, 0, 0.62)" : route.color;
        targetCtx.strokeStyle = shadow ? "transparent" : "rgba(255, 255, 255, 0.62)";
        targetCtx.lineWidth = shadow ? 0 : 1;
        drawTriangleArrow(targetCtx, placement, size);
      }
      targetCtx.restore();
    }

    function drawRouteArrows(targetCtx, rect, route, points) {
      const mode = routeArrowMode(route);
      if (mode === "none" || points.length < 2) return;
      const placements = [];
      for (let index = 1; index < points.length; index += 1) {
        placements.push(...arrowPlacements(canvasPoint(rect, points[index - 1]), canvasPoint(rect, points[index]), mode));
      }
      targetCtx.save();
      targetCtx.setLineDash([]);
      placements.forEach((placement) => drawArrowPlacement(targetCtx, placement, route, true));
      placements.forEach((placement) => drawArrowPlacement(targetCtx, placement, route, false));
      targetCtx.restore();
    }

    function drawLineSet(targetCtx, state, rect) {
      if (!state.settings.showLines) return;
      targetCtx.save();
      targetCtx.lineCap = "round";
      targetCtx.lineJoin = "round";
      routePointSets(state).forEach(({ route, points }) => {
        targetCtx.setLineDash([]);
        targetCtx.lineWidth = route.width + 2;
        targetCtx.strokeStyle = "rgba(0, 0, 0, 0.55)";
        strokeRoutePath(targetCtx, rect, points);
        targetCtx.setLineDash(dashForRoute(route));
        targetCtx.lineWidth = route.width;
        targetCtx.strokeStyle = route.color;
        strokeRoutePath(targetCtx, rect, points);
        drawRouteArrows(targetCtx, rect, route, points);
      });
      targetCtx.restore();
    }

    function drawFogRevealShape(targetCtx, rect, routePoints, currentPoint, fogSettings) {
      const scale = Math.max(1, Math.min(rect.w, rect.h));
      const trailWidth = Math.max(16, fogSettings.trailRadius * scale * (fogSettings.trailMemory ? 0.72 : 1));
      const focusRadius = Math.max(28, fogSettings.focusRadius * scale);
      const edgeBlur = Math.max(2, fogSettings.edgeSoftness * scale);
      targetCtx.save();
      targetCtx.globalCompositeOperation = "destination-out";
      targetCtx.shadowColor = "#000";
      targetCtx.shadowBlur = edgeBlur;
      targetCtx.lineCap = "round";
      targetCtx.lineJoin = "round";
      targetCtx.strokeStyle = "#000";
      targetCtx.fillStyle = "#000";
      if (routePoints.length) {
        targetCtx.lineWidth = trailWidth;
        targetCtx.beginPath();
        routePoints.forEach((point, index) => {
          const px = rect.x + point.x * rect.w;
          const py = rect.y + point.y * rect.h;
          if (index) targetCtx.lineTo(px, py);
          else targetCtx.moveTo(px, py);
        });
        targetCtx.stroke();
      }
      if (currentPoint) {
        const px = rect.x + currentPoint.x * rect.w;
        const py = rect.y + currentPoint.y * rect.h;
        targetCtx.beginPath();
        targetCtx.arc(px, py, focusRadius, 0, Math.PI * 2);
        targetCtx.fill();
      }
      targetCtx.restore();
    }

    function drawPresentationFog(size, rect) {
      if (!PM.getPresentationReveal || !PM.getPresentationFogSettings) return;
      const revealInfo = PM.getPresentationReveal();
      const fogSettings = PM.getPresentationFogSettings();
      if (!revealInfo || !revealInfo.active || fogSettings.mode === "off") return;
      const routeReveals = fogSettings.mode === "all"
        ? latestState.routes
          .filter((route) => route.visible)
          .map((route) => {
            const routeInfo = PM.computeRouteInfo(latestState.points, latestState.settings, route);
            const routePoints = latestState.points.filter((point) => point.type === "route" && point.routeId === route.id && PM.isPointVisible(point, latestState.settings, latestState.routes));
            return { routePoints, currentPoint: routeInfo.numberedRoutes.at(-1) || routePoints.at(-1) || null };
          })
        : (revealInfo.routeReveals || [{ routePoints: revealInfo.routePoints, currentPoint: revealInfo.routeInfo.numberedRoutes[Math.max(0, revealInfo.step - 1)] || revealInfo.routePoints[revealInfo.routePoints.length - 1] }]);
      if (!routeReveals.some((entry) => entry.routePoints && entry.routePoints.length)) return;
      const overlay = document.createElement("canvas");
      overlay.width = Math.max(1, Math.floor(size.width));
      overlay.height = Math.max(1, Math.floor(size.height));
      const overlayCtx = overlay.getContext("2d");
      const brightness = 0.34 + fogSettings.outsideVisibility * 0.9;
      overlayCtx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue("--bg") || "#101112";
      overlayCtx.fillRect(0, 0, overlay.width, overlay.height);
      overlayCtx.save();
      overlayCtx.filter = `grayscale(1) brightness(${brightness})`;
      overlayCtx.drawImage(image, rect.x, rect.y, rect.w, rect.h);
      overlayCtx.restore();
      overlayCtx.fillStyle = `rgba(0, 0, 0, ${PM.clamp(0.76 - fogSettings.outsideVisibility, 0.28, 0.74)})`;
      overlayCtx.fillRect(0, 0, overlay.width, overlay.height);
      routeReveals.forEach((entry) => {
        if (entry.routePoints && entry.routePoints.length) drawFogRevealShape(overlayCtx, rect, entry.routePoints, entry.currentPoint, fogSettings);
      });
      ctx.drawImage(overlay, 0, 0);
    }

    function draw() {
      const size = getViewportSize();
      ctx.clearRect(0, 0, size.width, size.height);
      ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue("--bg") || "#101112";
      ctx.fillRect(0, 0, size.width, size.height);
      if (!imageReady) return;
      const rect = getImageRect(size.width, size.height, latestState);
      ctx.save();
      ctx.globalAlpha = latestState.settings.opacity;
      ctx.drawImage(image, rect.x, rect.y, rect.w, rect.h);
      ctx.restore();
      drawPresentationFog(size, rect);
    }

    function wrapTextLines(targetCtx, text, maxWidth) {
      const lines = [];
      const pushWord = (word) => {
        if (!word) return;
        if (targetCtx.measureText(word).width <= maxWidth) {
          lines.push(word);
          return;
        }
        let chunk = "";
        for (const char of word) {
          const test = `${chunk}${char}`;
          if (chunk && targetCtx.measureText(test).width > maxWidth) {
            lines.push(chunk);
            chunk = char;
          } else {
            chunk = test;
          }
        }
        if (chunk) lines.push(chunk);
      };
      String(text || "").split(/\n/).forEach((paragraph) => {
        const words = paragraph.trim().split(/\s+/).filter(Boolean);
        if (!words.length) {
          lines.push("");
          return;
        }
        let line = "";
        for (const word of words) {
          const test = line ? `${line} ${word}` : word;
          if (targetCtx.measureText(test).width > maxWidth && line) {
            lines.push(line);
            line = "";
            if (targetCtx.measureText(word).width > maxWidth) {
              pushWord(word);
            } else {
              line = word;
            }
          } else if (targetCtx.measureText(test).width > maxWidth) {
            pushWord(word);
          } else {
            line = test;
          }
        }
        if (line) lines.push(line);
      });
      return lines;
    }

    function drawWrappedText(targetCtx, text, x, y, maxWidth, lineHeight) {
      const lines = wrapTextLines(targetCtx, text, maxWidth);
      lines.forEach((entry, index) => targetCtx.fillText(entry, x, y + index * lineHeight));
      return lines.length * lineHeight;
    }

    function parseHexColor(value, fallback) {
      const match = String(value || fallback || "#fbfaf5").match(/^#([0-9a-f]{6})$/i);
      const hex = match ? match[1] : "fbfaf5";
      return [0, 2, 4].map((index) => parseInt(hex.slice(index, index + 2), 16));
    }

    function mixColor(color, base, ratio) {
      const a = parseHexColor(color, "#fbfaf5");
      const b = parseHexColor(base, "#d7d2c7");
      const parts = a.map((value, index) => Math.round(value * ratio + b[index] * (1 - ratio)));
      return `rgb(${parts[0]}, ${parts[1]}, ${parts[2]})`;
    }

    function pointRadiusFor(point, settings) {
      if (point.type === "route" && point.helper) {
        return Math.max(6, Math.min(16, (parseInt(settings.helperPointSizePx, 10) || 24) / 2));
      }
      return Math.max(11, Math.min(24, (parseInt(settings.pointSizePx, 10) || 32) / 2));
    }

    function drawPngOverlay(targetCtx, state, rect) {
      const routeInfo = PM.computeRoutesInfo ? PM.computeRoutesInfo(state.points, state.settings, state.routes) : PM.computeRouteInfo(state.points, state.settings);
      targetCtx.textAlign = "center";
      targetCtx.textBaseline = "middle";
      for (const point of state.points) {
        if (!PM.isPointVisible(point, state.settings, state.routes)) continue;
        const route = PM.routeForPoint ? PM.routeForPoint(point, state.routes) : null;
        const px = rect.x + point.x * rect.w;
        const py = rect.y + point.y * rect.h;
        const pointRadius = pointRadiusFor(point, state.settings);
        const fontScale = Number(state.settings.fontScale) || 1;
        targetCtx.beginPath();
        targetCtx.arc(px, py, pointRadius, 0, Math.PI * 2);
        targetCtx.fillStyle = point.type === "route" && route
          ? (point.helper ? mixColor(route.color, "#d7d2c7", 0.48) : route.color)
          : (point.helper ? "#d7d2c7" : "#fbfaf5");
        targetCtx.fill();
        targetCtx.lineWidth = 2;
        targetCtx.strokeStyle = "#111";
        targetCtx.stroke();
        targetCtx.fillStyle = "#111";
        if (point.type === "route") {
          const step = routeInfo.displayById.get(point.id) || "";
          targetCtx.font = `700 ${Math.max(10, Math.round(pointRadius * 0.95 * fontScale))}px system-ui, sans-serif`;
          targetCtx.fillText(String(step), px, py + 1);
        } else {
          targetCtx.font = `${Math.max(14, Math.round(pointRadius * 1.22 * fontScale))}px system-ui, sans-serif`;
          targetCtx.fillText(PM.getPointType(point.type).icon, px, py + 1);
        }

        let labelY = py + pointRadius + 12;
        const drawBubble = (value, enabled, fill) => {
          if (!enabled || !value) return;
          targetCtx.font = `600 ${Math.max(10, Math.round(12 * fontScale))}px system-ui, sans-serif`;
          const text = String(value);
          const width = Math.min(260, Math.max(40, targetCtx.measureText(text).width + 14));
          const height = 20;
          targetCtx.fillStyle = fill;
          targetCtx.fillRect(px - width / 2, labelY - 10, width, height);
          targetCtx.fillStyle = "#fff";
          targetCtx.fillText(text, px, labelY);
          labelY += 23;
        };
        drawBubble(point.label, state.settings.showLabels, "rgba(0,0,0,.72)");
        drawBubble(point.location, state.settings.showLocation, "rgba(36,62,78,.82)");
        if (state.settings.showNotes && point.note) {
          const noteWidth = 230;
          const noteLineHeight = Math.max(13, Math.round(15 * fontScale));
          targetCtx.font = `500 ${Math.max(10, Math.round(12 * fontScale))}px system-ui, sans-serif`;
          const linesHeight = wrapTextLines(targetCtx, point.note, noteWidth).length * noteLineHeight;
          const bubbleHeight = Math.max(22, linesHeight + 8);
          targetCtx.fillStyle = "rgba(0,0,0,.72)";
          targetCtx.fillRect(px - (noteWidth + 20) / 2, labelY - 10, noteWidth + 20, bubbleHeight);
          targetCtx.fillStyle = "#fff";
          targetCtx.textBaseline = "top";
          drawWrappedText(targetCtx, point.note, px, labelY - 5, noteWidth, noteLineHeight);
          targetCtx.textBaseline = "middle";
          labelY += bubbleHeight + 4;
        }
        drawBubble(PM.formatDurationLabel(point.duration), state.settings.showDuration, "rgba(74,57,30,.86)");
      }
    }

    function exportPng() {
      if (!imageReady) throw new Error("Image not ready");
      const size = getViewportSize();
      const out = document.createElement("canvas");
      out.width = Math.max(1, Math.floor(size.width));
      out.height = Math.max(1, Math.floor(size.height));
      const outCtx = out.getContext("2d");
      outCtx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue("--bg") || "#101112";
      outCtx.fillRect(0, 0, out.width, out.height);
      const rect = getImageRect(out.width, out.height, latestState);
      outCtx.save();
      outCtx.globalAlpha = latestState.settings.opacity;
      outCtx.drawImage(image, rect.x, rect.y, rect.w, rect.h);
      outCtx.restore();
      drawLineSet(outCtx, latestState, rect);
      drawPngOverlay(outCtx, latestState, rect);
      return new Promise((resolve, reject) => {
        out.toBlob((blob) => blob ? resolve(blob) : reject(new Error("PNG export failed")), "image/png");
      });
    }

    store.subscribe((state) => {
      latestState = state;
      ensureImage(state);
      draw();
    });

    globalThis.addEventListener("resize", resize);
    resize();

    return {
      resize,
      draw,
      mapToClient,
      clientToMap,
      centerOnPoint,
      getImageRect,
      exportPng,
      hasImage() {
        return imageReady;
      }
    };
  }

  PM.createRenderer = createRenderer;
})(globalThis.PM);
