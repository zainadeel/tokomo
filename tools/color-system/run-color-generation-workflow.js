const fs = require("fs");
const path = require("path");
const {
  compositeOverlayRgb,
  contrastFromY,
  contrastRatioP3,
  fitOklchToP3Gamut,
  formatOklch,
  hexToRgbEncoded,
  isDisplayP3InGamut,
  oklchToHex,
  oklchToXyz,
  parseOklch,
  relativeLuminanceFromHex,
  rgbEncodedToY,
  solveBoldLightnessForContrast,
} = require("./oklch-utils");

const DEFAULT_HUE_ORDER = [
  "grey",
  "blue",
  "purple",
  "magenta",
  "pink",
  "red",
  "orange",
  "yellow",
  "olive",
  "green",
  "teal",
  "cyan",
];

const DEFAULT_CORE_TONES = ["strong", "bold", "medium", "faint"];
const DEFAULT_REPORT_TARGETS = [7, 4.5, 3, 1.4, 1.2];

const DEFAULT_PHASES = {
  retuneCoreTones: true,
  legacyLightBoldOnly: false,
  clampP3: true,
  rebalanceLightBoldAfterClamp: false,
  annotateFaintContrast: true,
  reorderReferenceTokens: true,
  writeContrastOpacityReports: true,
  writeFaintExtremesReport: true,
};

const DEFAULT_CONSTRAINTS = {
  darkSurfaceHex: "#161616",
  faintContrast: 1.2,
  boldContrast: 4.5,
  boldContrastCapDark: 4.7,
  strongMediumContrast: 4.5,
  lightStrongVsBlack: 1.4,
  darkStrongVsWhite: 1.2,
  faintCaps: { light: 0.05, dark: 0.05 },
  faintMinimums: { light: 0.05, dark: 0.05 },
  boldCaps: { light: 0.2, dark: 0.2 },
  mediumCaps: { dark: 0.17 },
};

const DEFAULT_REPORT_GROUPS = [
  { group: "light-bold", tone: "bold", theme: "light", against: "white", againstY: 1 },
  { group: "light-medium", tone: "medium", theme: "light", against: "black", againstY: 0 },
  { group: "light-strong", tone: "strong", theme: "light", against: "white", againstY: 1 },
  { group: "dark-bold", tone: "bold", theme: "dark", against: "black", againstY: 0 },
  { group: "dark-medium", tone: "medium", theme: "dark", against: "white", againstY: 1 },
  { group: "dark-strong", tone: "strong", theme: "dark", against: "black", againstY: 0 },
];

const DEFAULT_FAINT_REPORT_GROUPS = [
  { group: "light-faint", tone: "faint", theme: "light", against: "black", againstY: 0 },
  { group: "dark-faint", tone: "faint", theme: "dark", against: "white", againstY: 1 },
];

const TOKEN_LINE_REGEX =
  /^(\s*--color-reference-(light|dark)-([a-z0-9-]+)-([a-z0-9-]+):\s*)oklch\(([^\s]+)\s+([^\s]+)\s+([^\s\)]+)\)(;)(.*)$/i;

function toDisplayNumber(value, decimals = 4) {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return null;
  }
  return Number(value.toFixed(decimals));
}

function normalizeHueName(hue) {
  return String(hue).replace(/-\d+$/, "");
}

function mergeToneOrder(coreTones, extraTones, explicitToneOrder) {
  if (Array.isArray(explicitToneOrder) && explicitToneOrder.length > 0) {
    return [...explicitToneOrder];
  }

  const seen = new Set();
  const merged = [];
  for (const tone of [...coreTones, ...extraTones]) {
    if (!seen.has(tone)) {
      seen.add(tone);
      merged.push(tone);
    }
  }
  return merged;
}

function parseTokenLine(line) {
  const match = line.match(TOKEN_LINE_REGEX);
  if (!match) {
    return null;
  }

  return {
    raw: line,
    prefix: match[1],
    theme: match[2],
    hue: match[3],
    tone: match[4],
    l: Number(match[5]),
    c: Number(match[6]),
    h: Number(match[7]),
    semicolon: match[8],
    suffix: match[9] || "",
  };
}

function formatTokenLine(token, { decimals = 4, suffix } = {}) {
  const nextSuffix = typeof suffix === "string" ? suffix : token.suffix || "";
  return `${token.prefix}${formatOklch(token.l, token.c, token.h, decimals)}${token.semicolon}${nextSuffix}`;
}

function listComments(suffix) {
  return suffix.match(/\/\*[^*]*\*+(?:[^/*][^*]*\*+)*\//g) || [];
}

function replaceComment(suffix, newComment, matcher) {
  const preserved = listComments(suffix).filter((comment) => !matcher.test(comment));
  if (newComment) {
    preserved.push(newComment);
  }
  return preserved.length > 0 ? ` ${preserved.join(" ")}` : "";
}

function readLines(filePath) {
  return fs.readFileSync(filePath, "utf8").split("\n");
}

function writeLines(filePath, lines) {
  fs.writeFileSync(filePath, lines.join("\n"), "utf8");
}

function buildTokenMap(lines) {
  const tokenMap = new Map();

  lines.forEach((line, index) => {
    const token = parseTokenLine(line);
    if (!token) {
      return;
    }

    const key = `${token.theme}:${token.hue}`;
    if (!tokenMap.has(key)) {
      tokenMap.set(key, {});
    }

    tokenMap.get(key)[token.tone] = {
      ...token,
      index,
    };
  });

  return tokenMap;
}

function findFaintTone({ h, cCap, cMin, bgY, minContrast, preferHigherL }) {
  const cMaxInt = Math.round(cCap * 100);
  const cMinInt = Math.round(cMin * 100);

  function findBestInRange(startCInt, endCInt) {
    let best = null;
    for (let cInt = startCInt; cInt >= endCInt; cInt -= 1) {
      const c = cInt / 100;
      for (let lInt = 0; lInt <= 100; lInt += 1) {
        const l = lInt / 100;
        if (!isDisplayP3InGamut(l, c, h)) {
          continue;
        }

        const y = oklchToXyz(l, c, h).y;
        const contrast = contrastFromY(y, bgY);
        if (contrast < minContrast) {
          continue;
        }

        const candidate = { l, c, excess: contrast - minContrast };
        if (!best) {
          best = candidate;
          continue;
        }

        if (candidate.excess < best.excess - 1e-9) {
          best = candidate;
          continue;
        }

        if (Math.abs(candidate.excess - best.excess) < 1e-9) {
          if (candidate.c > best.c + 1e-9) {
            best = candidate;
            continue;
          }

          if (Math.abs(candidate.c - best.c) < 1e-9) {
            if (preferHigherL ? candidate.l > best.l : candidate.l < best.l) {
              best = candidate;
            }
          }
        }
      }
    }
    return best;
  }

  const preferred = findBestInRange(cMaxInt, cMinInt);
  if (preferred) {
    return { l: preferred.l, c: preferred.c };
  }

  if (cMinInt > 0) {
    const fallback = findBestInRange(cMinInt - 1, 0);
    if (fallback) {
      return { l: fallback.l, c: fallback.c };
    }
  }

  return { l: 0, c: 0 };
}

function findBoldTone({ h, cCap, faintY, faintL, minContrast, isLightTheme, maxContrastCap }) {
  const cMaxInt = Math.round(cCap * 100);
  const allCandidates = [];

  for (let cInt = cMaxInt; cInt >= 0; cInt -= 1) {
    const c = cInt / 100;
    for (let lInt = 0; lInt <= 100; lInt += 1) {
      const l = lInt / 100;

      if (isLightTheme && l > faintL) {
        continue;
      }
      if (!isLightTheme && l < faintL) {
        continue;
      }
      if (!isDisplayP3InGamut(l, c, h)) {
        continue;
      }

      const y = oklchToXyz(l, c, h).y;
      const contrast = contrastFromY(y, faintY);
      if (contrast < minContrast) {
        continue;
      }

      allCandidates.push({ l, c, contrast, excess: contrast - minContrast });
    }
  }

  if (allCandidates.length === 0) {
    return { l: isLightTheme ? 0 : 1, c: 0 };
  }

  const capped = allCandidates.filter((candidate) => candidate.contrast <= maxContrastCap + 1e-9);
  const pool = capped.length > 0 ? capped : allCandidates;
  const maxC = pool.reduce((best, candidate) => Math.max(best, candidate.c), -1);
  const sameChroma = pool.filter((candidate) => Math.abs(candidate.c - maxC) < 1e-9);

  let best = sameChroma[0];
  for (const candidate of sameChroma) {
    if (candidate.excess < best.excess - 1e-9) {
      best = candidate;
      continue;
    }
    if (Math.abs(candidate.excess - best.excess) < 1e-9) {
      if (isLightTheme ? candidate.l > best.l : candidate.l < best.l) {
        best = candidate;
      }
    }
  }

  return { l: best.l, c: best.c };
}

function retuneCoreReferenceTones(lines, options) {
  const tokenMap = buildTokenMap(lines);
  const darkSurfaceY = relativeLuminanceFromHex(options.constraints.darkSurfaceHex);
  const results = new Map();

  for (const [key, tones] of tokenMap.entries()) {
    if (!tones.faint || !tones.bold) {
      continue;
    }

    const [theme, hue] = key.split(":");
    const isGrey = normalizeHueName(hue) === "grey";
    const faintBgY = theme === "light" ? 1 : darkSurfaceY;
    const faintCap = isGrey ? 0 : options.constraints.faintCaps[theme];
    const faintMin = isGrey ? 0 : options.constraints.faintMinimums[theme];
    const faintSafe = findFaintTone({
      h: tones.faint.h,
      cCap: faintCap,
      cMin: faintMin,
      bgY: faintBgY,
      minContrast: options.constraints.faintContrast,
      preferHigherL: theme === "light",
    });

    const faintY = oklchToXyz(faintSafe.l, faintSafe.c, tones.faint.h).y;
    const faintContrast = contrastFromY(faintY, faintBgY);
    const boldCap = isGrey ? 0 : options.constraints.boldCaps[theme];
    const boldSafe = findBoldTone({
      h: tones.bold.h,
      cCap: boldCap,
      faintY,
      faintL: faintSafe.l,
      minContrast: options.constraints.boldContrast,
      isLightTheme: theme === "light",
      maxContrastCap:
        theme === "dark" ? options.constraints.boldContrastCapDark : Number.POSITIVE_INFINITY,
    });
    const boldY = oklchToXyz(boldSafe.l, boldSafe.c, tones.bold.h).y;
    const boldContrast = contrastFromY(boldY, faintY);

    results.set(key, {
      faint: {
        l: faintSafe.l,
        c: faintSafe.c,
        h: tones.faint.h,
        contrast: faintContrast,
        background: theme === "light" ? "white" : options.constraints.darkSurfaceHex,
        hex: oklchToHex(faintSafe.l, faintSafe.c, tones.faint.h),
      },
      bold: {
        l: boldSafe.l,
        c: boldSafe.c,
        h: tones.bold.h,
        contrastToFaint: boldContrast,
        hex: oklchToHex(boldSafe.l, boldSafe.c, tones.bold.h),
      },
    });
  }

  return lines.map((line) => {
    const token = parseTokenLine(line);
    if (!token || (token.tone !== "faint" && token.tone !== "bold")) {
      return line;
    }

    const result = results.get(`${token.theme}:${token.hue}`);
    if (!result) {
      return line;
    }

    if (token.tone === "faint") {
      const next = result.faint;
      const suffix = ` /* contrast on ${next.background}≈${next.contrast.toFixed(2)} hex ${next.hex} */`;
      return formatTokenLine({ ...token, ...next }, { decimals: 2, suffix });
    }

    const next = result.bold;
    const suffix = ` /* contrast to faint≈${next.contrastToFaint.toFixed(2)} hex ${next.hex} */`;
    return formatTokenLine({ ...token, ...next }, { decimals: 2, suffix });
  });
}

function generateLegacyLightBoldOnly(lines) {
  const tokenMap = buildTokenMap(lines);
  const results = new Map();

  for (const [key, tones] of tokenMap.entries()) {
    const [theme] = key.split(":");
    if (theme !== "light" || !tones.faint || !tones.bold) {
      continue;
    }

    const solvedL = solveBoldLightnessForContrast({
      faint: { l: tones.faint.l, c: tones.faint.c, h: tones.faint.h },
      bold: { l: tones.bold.l, c: tones.bold.c, h: tones.bold.h },
      targetContrast: 4.5,
    });

    const contrast = contrastRatioP3(
      { l: solvedL, c: tones.bold.c, h: tones.bold.h },
      { l: tones.faint.l, c: tones.faint.c, h: tones.faint.h }
    );

    results.set(key, {
      l: solvedL,
      c: tones.bold.c,
      h: tones.bold.h,
      contrast,
      hex: oklchToHex(solvedL, tones.bold.c, tones.bold.h),
    });
  }

  return lines.map((line) => {
    const token = parseTokenLine(line);
    if (!token || token.theme !== "light" || token.tone !== "bold") {
      return line;
    }

    const next = results.get(`${token.theme}:${token.hue}`);
    if (!next) {
      return line;
    }

    const suffix = ` /* contrast≈${next.contrast.toFixed(2)} hex ${next.hex} */`;
    return formatTokenLine({ ...token, ...next }, { decimals: 4, suffix });
  });
}

function clampP3Chroma(lines) {
  return lines.map((line) => {
    const token = parseTokenLine(line);
    if (!token) {
      return line;
    }

    const fitted = fitOklchToP3Gamut(token.l, token.c, token.h);
    const nextC = Number(fitted.c.toFixed(4));
    if (nextC + 1e-6 >= token.c) {
      return line;
    }

    const suffix = replaceComment(
      token.suffix,
      `/* p3-clamped from ${token.c.toFixed(4)} */`,
      /p3-clamped from/i
    );

    return formatTokenLine({ ...token, c: nextC }, { decimals: 4, suffix });
  });
}

function rebalanceLightBoldAfterClamp(lines, options) {
  const tokenMap = buildTokenMap(lines);
  const results = new Map();

  for (const [key, tones] of tokenMap.entries()) {
    const [theme] = key.split(":");
    if (theme !== "light" || !tones.faint || !tones.bold) {
      continue;
    }

    let low = 0;
    let high = tones.faint.l;
    let best = { l: tones.bold.l, c: tones.bold.c, h: tones.bold.h };

    for (let i = 0; i < 36; i += 1) {
      const midL = (low + high) / 2;
      const fitted = fitOklchToP3Gamut(midL, tones.bold.c, tones.bold.h);
      const ratio = contrastRatioP3(
        { l: fitted.l, c: fitted.c, h: fitted.h },
        { l: tones.faint.l, c: tones.faint.c, h: tones.faint.h }
      );

      if (ratio >= options.constraints.boldContrast) {
        best = { l: fitted.l, c: fitted.c, h: fitted.h };
        low = midL;
      } else {
        high = midL;
      }
    }

    results.set(key, {
      ...best,
      contrast: contrastRatioP3(best, { l: tones.faint.l, c: tones.faint.c, h: tones.faint.h }),
      hex: oklchToHex(best.l, best.c, best.h),
    });
  }

  return lines.map((line) => {
    const token = parseTokenLine(line);
    if (!token || token.theme !== "light" || token.tone !== "bold") {
      return line;
    }

    const next = results.get(`${token.theme}:${token.hue}`);
    if (!next) {
      return line;
    }

    const clampNote = next.c + 1e-6 < token.c ? ` /* p3-clamped from ${token.c.toFixed(4)} */` : "";
    const suffix = ` /* contrast≈${next.contrast.toFixed(2)} hex ${next.hex} */${clampNote}`;
    return formatTokenLine({ ...token, ...next }, { decimals: 4, suffix });
  });
}

function annotateFaintContrast(lines, options) {
  const darkSurfaceY = relativeLuminanceFromHex(options.constraints.darkSurfaceHex);
  const darkSurface = { l: Math.cbrt(darkSurfaceY), c: 0, h: 0 };
  const white = { l: 1, c: 0, h: 0 };

  return lines.map((line) => {
    const token = parseTokenLine(line);
    if (!token || token.tone !== "faint") {
      return line;
    }

    const compareColor = token.theme === "dark" ? darkSurface : white;
    const ratio = contrastRatioP3({ l: token.l, c: token.c, h: token.h }, compareColor);
    const targetLabel = token.theme === "dark" ? options.constraints.darkSurfaceHex : "white";
    const suffix = replaceComment(
      token.suffix,
      `/* contrast on ${targetLabel}≈${ratio.toFixed(2)} */`,
      /contrast\s+on\s+(white|#161616)/i
    );

    return formatTokenLine(token, { decimals: 4, suffix });
  });
}

function reorderReferenceTokens(lines, options) {
  const toneRank = new Map(options.toneOrder.map((tone, index) => [tone, index]));

  function reorderTheme(theme) {
    const indexesByHue = new Map();

    lines.forEach((line, index) => {
      const token = parseTokenLine(line);
      if (!token || token.theme !== theme) {
        return;
      }

      if (!indexesByHue.has(token.hue)) {
        indexesByHue.set(token.hue, []);
      }

      indexesByHue.get(token.hue).push(index);
    });

    const allIndexes = [...indexesByHue.values()].flat().sort((a, b) => a - b);
    if (allIndexes.length === 0) {
      return;
    }

    const hueOrder = [
      ...options.hueOrder,
      ...[...indexesByHue.keys()]
        .filter((hue) => !options.hueOrder.includes(normalizeHueName(hue)) && !options.hueOrder.includes(hue))
        .sort((a, b) => a.localeCompare(b)),
    ];

    const reorderedLines = [];
    for (const desiredHue of hueOrder) {
      const matchingHues = [...indexesByHue.keys()].filter(
        (hue) => hue === desiredHue || normalizeHueName(hue) === desiredHue
      );

      matchingHues.sort((a, b) => a.localeCompare(b));
      for (const hue of matchingHues) {
        const block = indexesByHue.get(hue)
          .map((index) => ({ index, line: lines[index], token: parseTokenLine(lines[index]) }))
          .sort((left, right) => {
            const leftRank = toneRank.has(left.token.tone) ? toneRank.get(left.token.tone) : Number.MAX_SAFE_INTEGER;
            const rightRank = toneRank.has(right.token.tone) ? toneRank.get(right.token.tone) : Number.MAX_SAFE_INTEGER;
            if (leftRank !== rightRank) {
              return leftRank - rightRank;
            }
            return left.token.tone.localeCompare(right.token.tone);
          })
          .map((entry) => entry.line);

        reorderedLines.push(...block);
      }
    }

    allIndexes.forEach((lineIndex, orderIndex) => {
      lines[lineIndex] = reorderedLines[orderIndex];
    });
  }

  reorderTheme("light");
  reorderTheme("dark");
  return lines;
}

function parseColorTokens(cssSource) {
  const tokenMap = new Map();
  const tokenRegex = /--color-reference-(light|dark)-([a-z0-9-]+)-([a-z0-9-]+):\s*(oklch\([^\)]+\));/g;

  for (const match of cssSource.matchAll(tokenRegex)) {
    const theme = match[1];
    const hue = match[2];
    const tone = match[3];
    const parsed = parseOklch(match[4]);
    const fitted = fitOklchToP3Gamut(parsed.l, parsed.c, parsed.h);
    const hex = oklchToHex(fitted.l, fitted.c, fitted.h);
    const rgb = hexToRgbEncoded(hex);
    const y = rgbEncodedToY(rgb);

    const key = `${theme}:${hue}`;
    if (!tokenMap.has(key)) {
      tokenMap.set(key, {});
    }

    tokenMap.get(key)[tone] = {
      theme,
      hue,
      tone,
      oklch: parsed,
      fitted,
      hex,
      rgb,
      y,
      tokenName: `--color-reference-${theme}-${hue}-${tone}`,
    };
  }

  return tokenMap;
}

function collectGroupCandidates(tokenMap, config) {
  const candidates = [];

  for (const tones of tokenMap.values()) {
    const token = tones[config.tone];
    if (!token || token.theme !== config.theme) {
      continue;
    }

    candidates.push({
      ...token,
      contrastAgainstReference: contrastFromY(token.y, config.againstY),
    });
  }

  return candidates;
}

function pickMinimumContrast(candidates) {
  if (candidates.length === 0) {
    return null;
  }

  return [...candidates].sort((left, right) => {
    if (left.contrastAgainstReference !== right.contrastAgainstReference) {
      return left.contrastAgainstReference - right.contrastAgainstReference;
    }
    return left.hue.localeCompare(right.hue);
  })[0];
}

function solveOverlayAlphaForContrast({ backgroundRgb, backgroundY, overlay, target }) {
  const yAt0 = backgroundY;
  const yAt1 = rgbEncodedToY(compositeOverlayRgb(backgroundRgb, overlay, 1));
  const minContrast = Math.min(contrastFromY(backgroundY, yAt0), contrastFromY(backgroundY, yAt1));
  const maxContrast = Math.max(contrastFromY(backgroundY, yAt0), contrastFromY(backgroundY, yAt1));

  if (target < minContrast || target > maxContrast) {
    return {
      reachable: false,
      alpha: null,
      maxAchievableContrast: maxContrast,
      minAchievableContrast: minContrast,
    };
  }

  let low = 0;
  let high = 1;
  let bestAlpha = null;
  let bestDiff = Number.POSITIVE_INFINITY;

  for (let i = 0; i < 64; i += 1) {
    const mid = (low + high) / 2;
    const mixedRgb = compositeOverlayRgb(backgroundRgb, overlay, mid);
    const mixedY = rgbEncodedToY(mixedRgb);
    const ratio = contrastFromY(backgroundY, mixedY);
    const diff = Math.abs(ratio - target);

    if (diff < bestDiff) {
      bestDiff = diff;
      bestAlpha = mid;
    }

    if (ratio < target) {
      low = mid;
    } else {
      high = mid;
    }
  }

  const finalMixedY = rgbEncodedToY(compositeOverlayRgb(backgroundRgb, overlay, bestAlpha));
  const finalContrast = contrastFromY(backgroundY, finalMixedY);

  return {
    reachable: true,
    alpha: bestAlpha,
    contrast: finalContrast,
    error: Math.abs(finalContrast - target),
    maxAchievableContrast: maxContrast,
    minAchievableContrast: minContrast,
  };
}

function solveAllTargets(backgroundRgb, backgroundY, targets) {
  const result = { blackOverlay: {}, whiteOverlay: {} };

  for (const target of targets) {
    result.blackOverlay[String(target)] = solveOverlayAlphaForContrast({
      backgroundRgb,
      backgroundY,
      overlay: "black",
      target,
    });

    result.whiteOverlay[String(target)] = solveOverlayAlphaForContrast({
      backgroundRgb,
      backgroundY,
      overlay: "white",
      target,
    });
  }

  return result;
}

function buildOpacityMarkdown(report, title, scope, method) {
  const lines = [];
  lines.push(`# ${title}`);
  lines.push("");
  lines.push(`Scope: ${scope}`);
  lines.push(`Method: ${method}`);
  lines.push("");

  const blackHeaders = report.targets.map((target) => `Black a@${target}`);
  const whiteHeaders = report.targets.map((target) => `White a@${target}`);
  lines.push(
    `| Group | Selected token | Base contrast | Against | Y | ${blackHeaders.join(" | ")} | ${whiteHeaders.join(" | ")} |`
  );
  lines.push(
    `|---|---|---:|---|---:| ${report.targets.map(() => "---:").join(" | ")} | ${report.targets
      .map(() => "---:")
      .join(" | ")} |`
  );

  for (const entry of report.groups) {
    const valueOrNA = (solverResult) => (solverResult.reachable ? solverResult.alphaDisplay.toFixed(3) : "n/a");
    const blackValues = report.targets.map((target) => valueOrNA(entry.opacityThresholds.blackOverlay[String(target)]));
    const whiteValues = report.targets.map((target) => valueOrNA(entry.opacityThresholds.whiteOverlay[String(target)]));
    lines.push(
      `| ${entry.group} | ${entry.selectedToken} | ${entry.baseContrastDisplay.toFixed(3)} | ${entry.baseContrastAgainst} | ${entry.backgroundYDisplay.toFixed(4)} | ${blackValues.join(" | ")} | ${whiteValues.join(" | ")} |`
    );
  }

  lines.push("");
  lines.push("Unreachable means that overlay color cannot achieve the target contrast for that background, even at alpha 1.");
  lines.push("");
  return lines.join("\n");
}

function writeOpacityReport({ cssSource, groupConfigs, targets, jsonPath, markdownPath, title, scope, method }) {
  const tokenMap = parseColorTokens(cssSource);
  const groups = [];

  for (const config of groupConfigs) {
    const candidates = collectGroupCandidates(tokenMap, config);
    if (candidates.length === 0) {
      throw new Error(`No candidates found for group '${config.group}'.`);
    }

    const minCandidate = pickMinimumContrast(candidates);
    const thresholdResults = solveAllTargets(minCandidate.rgb, minCandidate.y, targets);
    const mappedThresholds = { blackOverlay: {}, whiteOverlay: {} };

    for (const target of targets) {
      const key = String(target);
      const black = thresholdResults.blackOverlay[key];
      const white = thresholdResults.whiteOverlay[key];

      mappedThresholds.blackOverlay[key] = {
        ...black,
        alphaDisplay: toDisplayNumber(black.alpha, 6),
        contrastDisplay: toDisplayNumber(black.contrast, 6),
        errorDisplay: toDisplayNumber(black.error, 8),
        maxAchievableContrastDisplay: toDisplayNumber(black.maxAchievableContrast, 6),
      };

      mappedThresholds.whiteOverlay[key] = {
        ...white,
        alphaDisplay: toDisplayNumber(white.alpha, 6),
        contrastDisplay: toDisplayNumber(white.contrast, 6),
        errorDisplay: toDisplayNumber(white.error, 8),
        maxAchievableContrastDisplay: toDisplayNumber(white.maxAchievableContrast, 6),
      };
    }

    groups.push({
      group: config.group,
      selectedToken: minCandidate.tokenName,
      hue: minCandidate.hue,
      tone: minCandidate.tone,
      theme: minCandidate.theme,
      fittedOklch: minCandidate.fitted,
      fittedHex: minCandidate.hex,
      originalOklch: minCandidate.oklch,
      fittedRgb: minCandidate.rgb,
      backgroundY: minCandidate.y,
      backgroundYDisplay: toDisplayNumber(minCandidate.y, 6),
      baseContrastAgainst: config.against,
      baseContrast: minCandidate.contrastAgainstReference,
      baseContrastDisplay: toDisplayNumber(minCandidate.contrastAgainstReference, 6),
      opacityThresholds: mappedThresholds,
      candidateCount: candidates.length,
    });
  }

  const report = {
    generatedAt: new Date().toISOString(),
    method,
    targets,
    groups,
  };

  fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2), "utf8");
  fs.writeFileSync(markdownPath, buildOpacityMarkdown(report, title, scope, method), "utf8");
  return report;
}

function resolveOptions(rawOptions) {
  if (!rawOptions || !rawOptions.workingFile) {
    throw new Error("runColorGenerationWorkflow requires a 'workingFile' option.");
  }

  const workingFile = path.resolve(rawOptions.workingFile);
  const outputFile = path.resolve(rawOptions.outputFile || workingFile);
  const reportsDir = path.resolve(rawOptions.reportsDir || path.dirname(outputFile));
  const extraTones = Array.isArray(rawOptions.extraTones) ? rawOptions.extraTones : [];
  const phases = { ...DEFAULT_PHASES, ...(rawOptions.phases || {}) };
  const constraints = {
    ...DEFAULT_CONSTRAINTS,
    ...(rawOptions.constraints || {}),
    faintCaps: { ...DEFAULT_CONSTRAINTS.faintCaps, ...(rawOptions.constraints?.faintCaps || {}) },
    faintMinimums: { ...DEFAULT_CONSTRAINTS.faintMinimums, ...(rawOptions.constraints?.faintMinimums || {}) },
    boldCaps: { ...DEFAULT_CONSTRAINTS.boldCaps, ...(rawOptions.constraints?.boldCaps || {}) },
    mediumCaps: { ...DEFAULT_CONSTRAINTS.mediumCaps, ...(rawOptions.constraints?.mediumCaps || {}) },
  };

  return {
    workingFile,
    outputFile,
    reportsDir,
    hueOrder: rawOptions.hueOrder || DEFAULT_HUE_ORDER,
    coreTones: rawOptions.coreTones || DEFAULT_CORE_TONES,
    extraTones,
    toneOrder: mergeToneOrder(rawOptions.coreTones || DEFAULT_CORE_TONES, extraTones, rawOptions.toneOrder),
    reportTargets: rawOptions.reportTargets || DEFAULT_REPORT_TARGETS,
    phases,
    constraints,
  };
}

function runColorGenerationWorkflow(rawOptions) {
  const options = resolveOptions(rawOptions);
  let lines = readLines(options.workingFile);

  if (options.phases.retuneCoreTones) {
    lines = retuneCoreReferenceTones(lines, options);
  }
  if (options.phases.legacyLightBoldOnly) {
    lines = generateLegacyLightBoldOnly(lines);
  }
  if (options.phases.clampP3) {
    lines = clampP3Chroma(lines);
  }
  if (options.phases.rebalanceLightBoldAfterClamp) {
    lines = rebalanceLightBoldAfterClamp(lines, options);
  }
  if (options.phases.annotateFaintContrast) {
    lines = annotateFaintContrast(lines, options);
  }
  if (options.phases.reorderReferenceTokens) {
    lines = reorderReferenceTokens(lines, options);
  }

  writeLines(options.outputFile, lines);
  const cssSource = lines.join("\n");
  const reports = {};

  if (options.phases.writeContrastOpacityReports) {
    reports.contrastOpacity = writeOpacityReport({
      cssSource,
      groupConfigs: DEFAULT_REPORT_GROUPS,
      targets: options.reportTargets,
      jsonPath: path.join(options.reportsDir, "contrast-opacity-report.json"),
      markdownPath: path.join(options.reportsDir, "contrast-opacity-report.md"),
      title: "Contrast Opacity Analysis",
      scope: "6 minimum-contrast selections across light/dark and bold/medium/strong.",
      method: "WCAG 2.1 contrast ratio with sRGB alpha-composited black/white overlays over each selected background.",
    });
  }

  if (options.phases.writeFaintExtremesReport) {
    reports.faintExtremes = writeOpacityReport({
      cssSource,
      groupConfigs: DEFAULT_FAINT_REPORT_GROUPS,
      targets: options.reportTargets,
      jsonPath: path.join(options.reportsDir, "faint-extremes-report.json"),
      markdownPath: path.join(options.reportsDir, "faint-extremes-report.md"),
      title: "Faint Extremes Contrast Opacity Analysis",
      scope: "minimum contrast faint tokens for light vs black and dark vs white.",
      method: "WCAG 2.1 contrast ratio with sRGB alpha-composited black/white overlays.",
    });
  }

  return {
    outputFile: options.outputFile,
    reportsDir: options.reportsDir,
    toneOrder: options.toneOrder,
    reports,
  };
}

function loadConfigFromCli(argv) {
  const configArg = argv[2];
  if (!configArg) {
    return null;
  }

  const configPath = path.resolve(process.cwd(), configArg);
  return JSON.parse(fs.readFileSync(configPath, "utf8"));
}

if (require.main === module) {
  const config = loadConfigFromCli(process.argv);
  if (!config) {
    console.error("Usage: node tools/color-system/run-color-generation-workflow.js <config.json>");
    process.exit(1);
  }

  const result = runColorGenerationWorkflow(config);
  console.log(`Updated ${result.outputFile}`);
  console.log(`Reports written to ${result.reportsDir}`);
}

module.exports = {
  DEFAULT_CONSTRAINTS,
  DEFAULT_CORE_TONES,
  DEFAULT_HUE_ORDER,
  DEFAULT_PHASES,
  DEFAULT_REPORT_TARGETS,
  runColorGenerationWorkflow,
};