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

    function drawLineSet(targetCtx, state, rect) {
      if (!state.settings.showLines) return;
      const routePoints = state.points.filter((point) => point.type === "route" && PM.isPointVisible(point, state.settings));
      if (routePoints.length < 2) return;
      targetCtx.save();
      targetCtx.lineCap = "round";
      targetCtx.lineJoin = "round";
      targetCtx.lineWidth = state.settings.routeWidth + 2;
      targetCtx.strokeStyle = "rgba(0, 0, 0, 0.55)";
      targetCtx.beginPath();
      routePoints.forEach((point, index) => {
        const px = rect.x + point.x * rect.w;
        const py = rect.y + point.y * rect.h;
        if (index) targetCtx.lineTo(px, py);
        else targetCtx.moveTo(px, py);
      });
      targetCtx.stroke();
      targetCtx.lineWidth = state.settings.routeWidth;
      targetCtx.strokeStyle = state.settings.routeColor;
      targetCtx.beginPath();
      routePoints.forEach((point, index) => {
        const px = rect.x + point.x * rect.w;
        const py = rect.y + point.y * rect.h;
        if (index) targetCtx.lineTo(px, py);
        else targetCtx.moveTo(px, py);
      });
      targetCtx.stroke();
      targetCtx.restore();
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
    }

    function drawWrappedText(targetCtx, text, x, y, maxWidth, lineHeight) {
      const words = String(text || "").split(/\s+/);
      const lines = [];
      let line = "";
      for (const word of words) {
        const test = line ? `${line} ${word}` : word;
        if (targetCtx.measureText(test).width > maxWidth && line) {
          lines.push(line);
          line = word;
        } else {
          line = test;
        }
      }
      if (line) lines.push(line);
      lines.forEach((entry, index) => targetCtx.fillText(entry, x, y + index * lineHeight));
      return lines.length * lineHeight;
    }

    function drawPngOverlay(targetCtx, state, rect) {
      const routeInfo = PM.computeRouteInfo(state.points, state.settings);
      targetCtx.textAlign = "center";
      targetCtx.textBaseline = "middle";
      for (const point of state.points) {
        if (!PM.isPointVisible(point, state.settings)) continue;
        const px = rect.x + point.x * rect.w;
        const py = rect.y + point.y * rect.h;
        targetCtx.beginPath();
        targetCtx.arc(px, py, 16, 0, Math.PI * 2);
        targetCtx.fillStyle = point.helper ? "#d7d2c7" : "#fbfaf5";
        targetCtx.fill();
        targetCtx.lineWidth = 2;
        targetCtx.strokeStyle = "#111";
        targetCtx.stroke();
        targetCtx.fillStyle = "#111";
        if (point.type === "route") {
          const step = routeInfo.displayById.get(point.id) || "";
          targetCtx.font = "700 15px system-ui, sans-serif";
          targetCtx.fillText(String(step), px, py + 1);
        } else {
          targetCtx.font = "20px system-ui, sans-serif";
          targetCtx.fillText(PM.getPointType(point.type).icon, px, py + 1);
        }

        let labelY = py + 28;
        const drawBubble = (value, enabled, fill) => {
          if (!enabled || !value) return;
          targetCtx.font = "600 12px system-ui, sans-serif";
          const text = String(value);
          const width = Math.min(320, Math.max(40, targetCtx.measureText(text).width + 14));
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
          targetCtx.font = "500 12px system-ui, sans-serif";
          const linesHeight = drawWrappedText(targetCtx, point.note, -9999, -9999, 300, 15);
          const bubbleHeight = Math.max(22, linesHeight + 8);
          targetCtx.fillStyle = "rgba(0,0,0,.72)";
          targetCtx.fillRect(px - 160, labelY - 10, 320, bubbleHeight);
          targetCtx.fillStyle = "#fff";
          targetCtx.textBaseline = "top";
          drawWrappedText(targetCtx, point.note, px, labelY - 5, 300, 15);
          targetCtx.textBaseline = "middle";
          labelY += bubbleHeight + 4;
        }
        drawBubble(point.duration, state.settings.showDuration, "rgba(74,57,30,.86)");
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
