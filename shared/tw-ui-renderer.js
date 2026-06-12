(function () {
  const TEXT_CANVAS_BLEED = 4;
  const FONT_FAMILY = '"DaMingApk", "Microsoft YaHei", SimSun, serif';

  function applyRect(element, rect) {
    const [left, top, width, height] = rect;
    element.style.left = `${left}px`;
    element.style.top = `${top}px`;
    element.style.width = `${width}px`;
    element.style.height = `${height}px`;
  }

  function textCanvas(element) {
    let canvas = element.querySelector(".tw-text-canvas");
    if (!canvas) {
      canvas = document.createElement("canvas");
      canvas.className = "tw-text-canvas";
      element.appendChild(canvas);
    }
    return canvas;
  }

  function alignOffset(align, available, content) {
    const free = available - content;
    if (align === 1) return free;
    if (align === 2) return Math.trunc(free / 2);
    return 0;
  }

  function textLines(ctx, text, maxWidth, multiline) {
    if (!multiline || !text) return [text || ""];

    const lines = [];
    for (const paragraph of String(text).split(/\r?\n/)) {
      let line = "";
      for (const char of paragraph) {
        const next = `${line}${char}`;
        if (line && ctx.measureText(next).width > maxWidth) {
          lines.push(line);
          line = char;
        } else {
          line = next;
        }
      }
      lines.push(line);
    }
    return lines;
  }

  function drawLine(ctx, text, x, logicalTop, fontSize, color, underline, stroke) {
    const metrics = ctx.measureText(text);
    const ascent = metrics.actualBoundingBoxAscent || Math.round(fontSize * 0.8);
    const descent = metrics.actualBoundingBoxDescent || Math.round(fontSize * 0.2);
    const inkHeight = ascent + descent;
    const inkTopInset = Math.max(0, Math.trunc((fontSize - inkHeight) / 2));
    const baseline = logicalTop + inkTopInset + ascent;

    if (stroke) {
      ctx.strokeStyle = stroke.color;
      ctx.lineWidth = stroke.width;
      ctx.lineJoin = "round";
      ctx.strokeText(text, x, baseline);
    }

    ctx.fillStyle = color;
    ctx.fillText(text, x, baseline);

    if (underline) {
      const y = Math.round(logicalTop + fontSize - 2) + 0.5;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + metrics.width, y);
      ctx.strokeStyle = color;
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  }

  function applyTextControl(element, spec, options = {}) {
    const settings = {
      multiline: false,
      defaultAlignH: 0,
      defaultAlignV: 0,
      defaultColor: "",
      position: true,
      shadow: null,
      stroke: null,
      canvasBleed: TEXT_CANVAS_BLEED,
      ...options,
    };
    const fontSize = spec.fontSize || 20;
    const alignH = spec.alignH ?? settings.defaultAlignH;
    const alignV = spec.alignV ?? settings.defaultAlignV;
    const offset = spec.textOffset || [0, 0];
    const padding = spec.padding || [0, 0];
    const color = spec.color || settings.defaultColor || "#111";
    const rect = spec.rect;
    const canvas = textCanvas(element);
    const context = canvas.getContext("2d");
    const ratio = window.devicePixelRatio || 1;
    const width = rect[2];
    const height = rect[3];
    const canvasBleed = Math.max(0, Number(settings.canvasBleed) || 0);
    const canvasWidth = width + canvasBleed * 2;
    const canvasHeight = height + canvasBleed * 2;
    const originX = canvasBleed;
    const originY = canvasBleed;
    const insetX = padding[1] + offset[0];
    const insetY = padding[0] + offset[1];
    const availableWidth = Math.max(0, width - insetX * 2);
    const availableHeight = Math.max(0, height - insetY * 2);

    if (settings.position) applyRect(element, spec.rect);
    element.style.fontSize = `${fontSize}px`;
    element.style.color = color;
    element.style.backgroundColor = spec.backColor || element.style.backgroundColor || "";
    element.setAttribute("aria-label", spec.text || "");

    canvas.style.left = `${-canvasBleed}px`;
    canvas.style.top = `${-canvasBleed}px`;
    canvas.style.width = `${canvasWidth}px`;
    canvas.style.height = `${canvasHeight}px`;
    canvas.width = Math.max(1, Math.round(canvasWidth * ratio));
    canvas.height = Math.max(1, Math.round(canvasHeight * ratio));

    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    context.clearRect(0, 0, canvasWidth, canvasHeight);
    context.font = `${fontSize}px ${FONT_FAMILY}`;
    context.textBaseline = "alphabetic";
    context.textAlign = "left";

    if (settings.shadow) {
      context.shadowColor = settings.shadow.color;
      context.shadowBlur = settings.shadow.blur || 0;
      context.shadowOffsetX = settings.shadow.x || 0;
      context.shadowOffsetY = settings.shadow.y || 0;
    }

    const lineHeight = spec.lineHeight || fontSize;
    const lines = textLines(context, spec.text || "", availableWidth, settings.multiline);
    const contentHeight = lines.length * lineHeight;
    const baseY = originY + insetY + alignOffset(alignV, availableHeight, contentHeight);

    lines.forEach((line, index) => {
      const lineWidth = context.measureText(line).width;
      const alignX = alignOffset(alignH, availableWidth, lineWidth);
      const x = originX + insetX + alignX;
      const y = baseY + index * lineHeight;
      drawLine(context, line, x, y, fontSize, color, spec.underline, settings.stroke);
    });
  }

  function textColor(value) {
    if (!value) return "";
    const clean = String(value).replace(/^0x/i, "");
    if (clean.length === 8) return `#${clean.slice(2)}`;
    if (clean.length === 6) return `#${clean}`;
    return "";
  }

  function alphaColor(value) {
    if (!value) return "";
    const clean = String(value).replace(/^0x/i, "");
    if (clean.length !== 8) return textColor(value);

    const alpha = parseInt(clean.slice(0, 2), 16) / 255;
    const red = parseInt(clean.slice(2, 4), 16);
    const green = parseInt(clean.slice(4, 6), 16);
    const blue = parseInt(clean.slice(6, 8), 16);
    return `rgba(${red}, ${green}, ${blue}, ${alpha.toFixed(3)})`;
  }

  function textOffset(value) {
    if (!value) return [0, 0];
    const parts = String(value)
      .split(",")
      .map((part) => Number(part.trim()));
    if (parts.length !== 2 || parts.some(Number.isNaN)) return [0, 0];
    return parts;
  }

  function textSpecFromNode(node, rect) {
    const attrs = node.attrs || {};
    const [, , width, height] = rect || node.rect || [0, 0, 0, 0];
    return {
      rect: [0, 0, width, height],
      text: node.text || "",
      fontSize: attrs.FontSize ? Number(attrs.FontSize) : 20,
      color: textColor(attrs.TextColor),
      underline: attrs.Underline === "1",
      textOffset: textOffset(attrs.TextOffset),
      alignH: attrs.AlignH === undefined ? undefined : Number(attrs.AlignH),
      alignV: attrs.AlignV === undefined ? undefined : Number(attrs.AlignV),
    };
  }

  function backgroundDrawMode(visual, tag) {
    if (tag === "Button" || tag === "Check") return "center";
    if (visual?.mode === "4") return "nine-slice";
    if (visual?.mode === "5") return "repeat-x";
    if (visual?.mode === "2") return "center";
    return "fill";
  }

  function shouldAnimateFrames(visual, tag) {
    const frames = visual?.frames || [];
    if (frames.length <= 1) return false;
    if (tag === "Button" || tag === "Check") return false;
    if (visual?.mode === "4" || visual?.mode === "5") return false;
    return Boolean(visual?.serialTimeExplicit);
  }

  function applyFrameBackground(element, url, mode) {
    element.style.backgroundImage = `url("${url}")`;
    element.style.backgroundRepeat = mode === "repeat-x" ? "repeat-x" : "no-repeat";
    element.style.backgroundPosition = mode === "repeat-x" ? "left top" : "center center";
    element.style.backgroundSize = mode === "fill" ? "100% 100%" : "auto";
  }

  window.TwUiRenderer = {
    TEXT_CANVAS_BLEED,
    applyFrameBackground,
    applyRect,
    applyTextControl,
    alphaColor,
    backgroundDrawMode,
    shouldAnimateFrames,
    textColor,
    textOffset,
    textSpecFromNode,
  };
})();
