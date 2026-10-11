let current = "5.7";
const colorCache = new Map();
const HEX_RE = /^#[0-9a-f]{6}$/i;
const EXTRACTOR_KEYS = ["VIBRANT", "VIBRANT_NON_ALARMING", "PROMINENT", "LIGHT_VIBRANT", "DESATURATED", "DARK_VIBRANT"];
const isValidHex = (h) => typeof h === "string" && HEX_RE.test(h.trim());
/* Playback item resolver: Spotify 1.3.4 removed Spicetify.Player.data —
 * live state is Spicetify.Platform.PlayerAPI._state.item (same metadata
 * shape, verified via CDP). Old paths kept first for backward compat. */
function getPlaybackItem() {
    try {
        return Spicetify.Player?.data?.item ?? Spicetify.Player?.data?.track ?? Spicetify.Platform?.PlayerAPI?._state?.item ?? null;
    } catch {
        return null;
    }
}
function isSkippedUri(uri) {
    if (!uri || uri.startsWith("spotify:local") || uri.startsWith("spotify:ad")) return true;
    try {
        const item = getPlaybackItem();
        if (item?.isLocal || item?.provider === "ad") return true;
    } catch {
        /* ignore */
    }
    return false;
}
function setCachedColor(uri, hex) {
    try {
        if (colorCache.size >= 200) {
            const oldest = colorCache.keys().next().value;
            if (oldest !== undefined) colorCache.delete(oldest);
        }
        colorCache.set(uri, hex);
    } catch {
        /* ignore */
    }
}
function pickFromPalette(pal) {
    if (!pal) return null;
    const upper = {};
    for (const k of Object.keys(pal)) upper[k.toUpperCase()] = pal[k];
    for (const k of EXTRACTOR_KEYS) {
        const v = upper[k];
        if (typeof v === "string" && isValidHex(v.trim())) return v.trim();
    }
    return null;
}
async function tryExtractor(uri) {
    if (!uri || isSkippedUri(uri)) return null;
    if (colorCache.has(uri)) {
        const cached = colorCache.get(uri);
        if (isValidHex(cached)) return cached;
        colorCache.delete(uri);
    }
    if (!Spicetify.colorExtractor) return null;
    const pal = await Spicetify.colorExtractor(uri);
    const hex = pickFromPalette(pal);
    if (hex) setCachedColor(uri, hex);
    return hex;
}

/* Year-line hosts are alternatives that differ per Spotify build, so resolve
 * the first one that exists (waitForAny). Bounded, and it only feeds a
 * cosmetic line — it never blocks the background image. */
function waitForAny(els, func, timeout = 40) {
    const host = els.map((el) => document.querySelector(el)).find((a) => a);
    if (host) func(host);
    else if (timeout > 0) setTimeout(waitForAny, 300, els, func, --timeout);
}

/* Album/artist + year line. Legacy `.main-trackInfo-container` is gone in Spotify
 * 1.3.x (0 hits in xpui-snapshot.css) — verified live hosts, from
 * dwp-now-playing-bar.js, are the now-playing bar rows below. */
const YEAR_LINE_HOSTS = ['[data-testid="now-playing-widget-v2-byline"]', '[data-testid="now-playing-widget"]', ".main-trackInfo-container:not(#upcomingSongDiv)"];

/* Resolve the title/artist text column inside a year-line host. The host
 * ([data-testid="now-playing-widget"]) is a flex ROW — cover | text column |
 * spacer — so appending the year line to the host itself renders it BESIDE
 * the track instead of under it. The column is the first child div carrying
 * real text that is not the cover slot; appending inside it stacks the
 * album • year under title/artist. Falls back to the host (old behavior). */
function findTrackTextColumn(host) {
    try {
        for (const kid of host.children || []) {
            if (kid.id === "main-trackInfo-year") continue;
            try {
                const tid = (kid.getAttribute && kid.getAttribute("data-testid")) || "";
                if (/cover/i.test(tid)) continue;
            } catch (e) {}
            if ((kid.textContent || "").trim().length > 0) return kid;
        }
    } catch (e) {}
    return host;
}
function toHttpCover(u) {
    if (!u) return u;
    if (/^spotify:image:/i.test(u)) return u.replace(/^spotify:image:/i, "https://i.scdn.co/image/");
    return u;
}
function getCoverUrls() {
    const d = Spicetify.Player?.data ?? Spicetify.Platform?.PlayerAPI?._state;
    const md = d?.item?.metadata ?? d?.track?.metadata ?? {};
    return { uri: d?.item?.uri ?? d?.track?.uri ?? md.album_uri, urls: [md.image_xlarge_url, md.image_large_url, md.image_url].filter(Boolean), meta: md };
}

/* Inline the cover as a data: URL so it always paints as a CSS background.
 * Remote https:// URLs intermittently fail to paint from user.css in some
 * Spotify builds even though <img> loads them fine (CDP-verified). The 96px
 * thumb keeps the data URL small; cached per track URI. */
const bgDataCache = new Map();
function coverToDataURL(httpUrl, trackUri) {
    try {
        if (!httpUrl || !/^https?:/i.test(httpUrl)) return;
        const key = trackUri || httpUrl;
        if (bgDataCache.has(key)) {
            const hit = bgDataCache.get(key);
            if (hit) document.documentElement.style.setProperty("--image_url", `url("${hit}")`);
            return;
        }
        if (bgDataCache.size >= 20) bgDataCache.delete(bgDataCache.keys().next().value);
        bgDataCache.set(key, null); // mark in-flight so we don't stack loaders
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = function () {
            try {
                const S = 96;
                const cv = document.createElement("canvas");
                cv.width = S;
                cv.height = S;
                const cx = cv.getContext("2d");
                if (!cx) return;
                const iw = img.naturalWidth || S,
                    ih = img.naturalHeight || S;
                const sc = Math.max(S / iw, S / ih);
                const dw = iw * sc,
                    dh = ih * sc;
                cx.drawImage(img, (S - dw) / 2, (S - dh) / 2, dw, dh);
                const du = cv.toDataURL("image/jpeg", 0.82);
                bgDataCache.set(key, du);
                // Only apply if this track is still current.
                const now = getCoverUrls();
                if ((now.uri || now.urls[0]) === key || toHttpCover(now.urls[0]) === httpUrl) document.documentElement.style.setProperty("--image_url", `url("${du}")`);
            } catch (e) {
                try {
                    bgDataCache.delete(key);
                } catch (_e) {}
            }
        };
        img.onerror = function () {
            try {
                bgDataCache.delete(key);
            } catch (e) {}
        };
        img.src = httpUrl;
    } catch (e) {}
}

function getAlbumInfo(uri) {
    const Authorization = `Bearer ${Spicetify.Platform.AuthorizationAPI.getState().token.accessToken}`;
    const Headers = {
        Authorization,
        "Spotify-App-Version": Spicetify.Platform.version,
        "App-Platform": Spicetify.Platform.PlatformData.app_platform,
        "Content-Type": "application/json"
    };
    const Body = JSON.stringify({
        operationName: "getAlbum",
        variables: {
            uri: uri,
            locale: "",
            offset: 0,
            limit: 50
        },
        extensions: {
            persistedQuery: {
                version: 1,
                sha256Hash: "b9bfabef66ed756e5e13f68a942deb60bd4125ec1f1be8cc42769dc0259b4b10"
            }
        }
    });
    return fetch(`https://api-partner.spotify.com/pathfinder/v2/query`, { headers: Headers, method: "POST", body: Body })
        .then((res) => res.json())
        .then((d) => d.data.albumUnion);
}

function isLight(hex) {
    var [r, g, b] = hexToRgb(hex).map(Number);
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
    return brightness > 128;
}

function hexToRgb(hex) {
    var bigint = parseInt(hex.replace("#", ""), 16);
    var r = (bigint >> 16) & 255;
    var g = (bigint >> 8) & 255;
    var b = bigint & 255;
    return [r, g, b];
}

/* Red-wash guard: a red-dominant now-playing cover (e.g. "Caught Up") floods
 * the fullscreen warp canvas red even on unrelated blue/purple playlist
 * pages. Tint vars are achromatic and cannot create hue — the canvas is the
 * source. Detect from the already-computed palette hex. */
function __isRedDominantHex(hex) {
    try {
        if (!isValidHex(hex)) return false;
        const [r, g, b] = hexToRgb(hex);
        if (r > 1.4 * g && r > 1.4 * b) return true;
        const [h, s] = rgbToHsl([r, g, b]);
        const deg = h * 360;
        if (s > 0.5 && (deg >= 350 || deg <= 20)) return true;
        return false;
    } catch (e) {
        return false;
    }
}

function __neutralizeRedWashCanvas() {
    try {
        const canvas = document.getElementById("dynamic-bg-canvas");
        if (canvas) {
            canvas.style.opacity = "0.32";
            canvas.style.filter = "brightness(0.85) saturate(0.85)";
        }
    } catch (e) {}
}

function rgbToHex([r, g, b]) {
    const rgb = (r << 16) | (g << 8) | (b << 0);
    return "#" + (0x1000000 + rgb).toString(16).slice(1);
}

function lightenDarkenColor(h, p) {
    return (
        "#" +
        [1, 3, 5]
            .map((s) => parseInt(h.substr(s, 2), 16))
            .map((c) => parseInt((c * (100 + p)) / 100))
            .map((c) => (c < 255 ? c : 255))
            .map((c) => c.toString(16).padStart(2, "0"))
            .join("")
    );
}

function rgbToHsl([r, g, b]) {
    ((r /= 255), (g /= 255), (b /= 255));
    var max = Math.max(r, g, b),
        min = Math.min(r, g, b);
    var h,
        s,
        l = (max + min) / 2;
    if (max == min) {
        h = s = 0; // achromatic
    } else {
        var d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
            case r:
                h = (g - b) / d + (g < b ? 6 : 0);
                break;
            case g:
                h = (b - r) / d + 2;
                break;
            case b:
                h = (r - g) / d + 4;
                break;
        }
        h /= 6;
    }
    return [h, s, l];
}

function hslToRgb([h, s, l]) {
    var r, g, b;
    if (s == 0) {
        r = g = b = l; // achromatic
    } else {
        function hue2rgb(p, q, t) {
            if (t < 0) t += 1;
            if (t > 1) t -= 1;
            if (t < 1 / 6) return p + (q - p) * 6 * t;
            if (t < 1 / 2) return q;
            if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
            return p;
        }
        var q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        var p = 2 * l - q;
        r = hue2rgb(p, q, h + 1 / 3);
        g = hue2rgb(p, q, h);
        b = hue2rgb(p, q, h - 1 / 3);
    }
    return [r * 255, g * 255, b * 255];
}

function setLightness(hex, lightness) {
    hsl = rgbToHsl(hexToRgb(hex));
    hsl[2] = lightness;
    return rgbToHex(hslToRgb(hsl));
}

let textColor = "#1db954";
let textColorBg = getComputedStyle(document.documentElement).getPropertyValue("--spice-main");
let settingsDark = getComputedStyle(document.documentElement).getPropertyValue("--spice-dark") == "#010101";

/* Theme-write batching: toggleDark() + updateColors() issue ~35 setProperty
 * calls. Queue them and apply once in a single rAF — same final colors, one
 * recalc. The light-mode gate lives on html[data-theme] (equality selector,
 * cheap) instead of html[style*="--is_light"] (substring match on the style
 * attribute, re-evaluated against 40+ selectors on EVERY style mutation,
 * including non-mode recolors). It is applied AFTER all color vars in the
 * same flush so gated selectors restyle once, not twice. */
let _pendingThemeVars = null;
let _themeFlushQueued = false;
let _switchClearTimer = null;
let _pendingLightGate = null; // "light" | "dark" | null
function queueThemeVar(name, value) {
    if (!_pendingThemeVars) _pendingThemeVars = new Map();
    _pendingThemeVars.set(name, value);
    if (_themeFlushQueued) return;
    _themeFlushQueued = true;
    const schedule = window.requestAnimationFrame || ((cb) => setTimeout(cb, 16));
    schedule(() => {
        _themeFlushQueued = false;
        const batch = _pendingThemeVars;
        _pendingThemeVars = null;
        const gate = _pendingLightGate;
        _pendingLightGate = null;
        if ((!batch || batch.size === 0) && !gate) return;
        if (!document.documentElement) return;
        const rootStyle = document.documentElement.style;
        if (batch) for (const [k, v] of batch) rootStyle.setProperty(k, v);
        if (gate) {
            // --is_light var (drives the body::before opacity calc) and the
            // data-theme gate flip together, after the colors, in one frame.
            rootStyle.setProperty("--is_light", gate === "light" ? 1 : 0);
            document.documentElement.dataset.theme = gate;
        }
    });
}

function setRootColor(name, colHex) {
    if (!document.documentElement) return;
    queueThemeVar("--spice-" + name, colHex);
    queueThemeVar("--spice-rgb-" + name, hexToRgb(colHex).join(","));
}

let _lastToggleAt = 0;
let _lastToggleDark = null;

/* Adaptive kawarp tint: the lib's tint shader only blends pixels with
 * luma < 0.5 toward tintColor (darkMask = 1 - smoothstep(0, 0.5, luma)),
 * so bright covers sail through black/white tint untouched — that is the
 * light-gray wash (dark mode) / white flood (light mode). Cover luminance
 * comes from textColor (the per-track extracted color, refreshed in
 * updateColors on every track change). Brightness/opacity are one-pass
 * compositor ops — never a fullscreen blur() on the animated canvas. */
function __kawarpCoverLuma() {
    try {
        if (!isValidHex(textColor)) return 0.5;
        const [r, g, b] = hexToRgb(textColor);
        return Math.min(1, Math.max(0, (r * 299 + g * 587 + b * 114) / 1000 / 255));
    } catch (e) {
        return 0.5;
    }
}
function __kawarpApplyTint(explicitDark) {
    try {
        /* Red-wash guard: palette is fresh here (called from updateColors on
         * every palette resolution) — red-dominant cover keeps the canvas
         * neutral instead of flooding the page red. */
        if (__isRedDominantHex(textColor)) {
            __neutralizeRedWashCanvas();
            return;
        }
        /* A cover withheld by the red-wash guard in __dynamicBgSetCover now
         * has a fresh non-red verdict — paint it (one-shot). */
        try {
            const pending = window.__pendingBgCover;
            if (pending) {
                window.__pendingBgCover = null;
                if (typeof __kawarpInstance !== "undefined" && __kawarpInstance && __kawarpInstance.loadImage) __kawarpInstance.loadImage(pending);
            }
        } catch (e) {}
        const dark = typeof explicitDark === "boolean" ? explicitDark : !isLight(textColorBg);
        const luma = __kawarpCoverLuma();
        // Dark: bright covers need max dark-area tint; dark covers less.
        // Light: white stays low so hue survives (0.6 still flooded).
        const intensity = dark ? 0.55 + 0.45 * luma : 0.3;
        if (typeof __kawarpInstance !== "undefined" && __kawarpInstance) {
            __kawarpInstance.tintColor = dark ? [0.0, 0.0, 0.0] : [1.0, 1.0, 1.0];
            try {
                __kawarpInstance.tintIntensity = intensity;
            } catch (_e) {}
        }
        // Bright-pixel compensation the tint shader cannot do: darken and
        // fade light covers in dark mode; quiet the canvas in light mode.
        try {
            const canvas = document.getElementById("dynamic-bg-canvas");
            if (canvas) {
                if (dark) {
                    canvas.style.opacity = (0.55 - 0.2 * luma).toFixed(2);
                    canvas.style.filter = `brightness(${(1 - 0.45 * luma).toFixed(2)}) saturate(0.9)`;
                } else {
                    canvas.style.opacity = "0.3";
                    canvas.style.filter = "saturate(1.15) brightness(0.92)";
                }
            }
        } catch (_e) {}
    } catch (e) {}
}
function toggleDark(setDark) {
    if (setDark === undefined) setDark = isLight(textColorBg);

    /* Skip redundant same-mode passes (e.g. the Config proxy re-read firing
     * right after a moon-button toggle): same mode within 800ms is a no-op —
     * opposite-mode double-clicks still apply. */
    try {
        const now = performance.now();
        if (setDark === _lastToggleDark && now - _lastToggleAt < 800) return;
        _lastToggleAt = now;
        _lastToggleDark = setDark;
    } catch (e) {}

    /* Switch blackout: every crossfade frame would otherwise repaint the
     * fullscreen blurred bleed + all backdrop-filter layers. Flag the switch
     * synchronously so user.css drops those filters for ~350ms (0.25s
     * crossfade + margin); flat colors crossfade cheaply, blur pops back. */
    try {
        document.documentElement.dataset.switching = "1";
        if (_switchClearTimer) clearTimeout(_switchClearTimer);
        _switchClearTimer = setTimeout(() => {
            try {
                document.documentElement.removeAttribute("data-switching");
            } catch (e) {}
            _switchClearTimer = null;
        }, 350);
    } catch (e) {}

    // Light-mode gate flips in the rAF flush AFTER all color vars
    // (see queueThemeVar) so gated selectors restyle once, not twice.
    _pendingLightGate = setDark ? "dark" : "light";
    textColorBg = setDark ? "#0A0A0A" : "#FFFFFF";
    /* Kawarp tint follows the mode (same as the radioking reference
     * applyTheme): black in dark, white in light. The tint shader only
     * blends DARK pixels (darkMask = 1-smoothstep(0,.5,luma)), so bright
     * covers ignore tintColor entirely — __kawarpApplyTint() compensates
     * with tintIntensity + canvas brightness/opacity from cover luminance
     * (cheap compositor ops, never a fullscreen blur()). */
    try {
        __kawarpApplyTint(setDark);
    } catch (e) {}

    setRootColor("main", textColorBg);
    setRootColor("sidebar", textColorBg);
    setRootColor("player", textColorBg);
    setRootColor("shadow", textColorBg);
    setRootColor("card", setDark ? "#040404" : "#F5F5F5");
    setRootColor("subtext", setDark ? "#EAEAEA" : "#3D3D3D");
    setRootColor("selected-row", setDark ? "#EAEAEA" : "#3D3D3D");
    setRootColor("main-elevated", setDark ? "#303030" : "#EDEDED");
    setRootColor("notification", setDark ? "#303030" : "#EDEDED");
    setRootColor("highlight-elevated", setDark ? "#303030" : "#EDEDED");

    updateColors(textColor);
}

/* Init with light/dark mode from settings */
toggleDark(settingsDark);

/* Hook user changes to toggle using a proxy for Spicetify.Config */
let _proxyTimer = null;
Spicetify.Config = new Proxy(Spicetify.Config, {
    set(target, property, value) {
        if (property === "color_scheme") {
            // Debounced: rapid successive sets coalesce into one re-read, and
            // toggleDark() itself skips the pass if the mode is unchanged, so
            // a settings change can never double-apply the full theme write.
            // getComputedStyle forces a sync style recalc — do it once, after
            // Spotify's own scheme variables have settled.
            if (_proxyTimer) clearTimeout(_proxyTimer);
            _proxyTimer = setTimeout(() => {
                _proxyTimer = null;
                let dark = getComputedStyle(document.documentElement).getPropertyValue("--spice-dark").trim() === "#010101";
                toggleDark(dark);
            }, 150);
        }
        target[property] = value;
        return true;
    }
});

/* Spotify 1.3.x dropped .main-actionButtons, .main-topBar-* , .Root__globalNav and
 * .Root__top-container: all of them are 0 hits in xpui-snapshot.css / dwp-top-bar.css
 * (they only exist in our own files). Handles that ARE real in this build, taken from
 * dwp-top-bar.js (module 20628 "TopBar"), which renders:
 *     <header data-testid="topbar">
 *       <div class=…background>
 *       <div class=…contentContainer><div data-testid="topbar-content-wrapper">
 * and portals each route's <div data-testid="topbar-content"> into that wrapper.
 * NOTE: that wrapper is `pointer-events:none` (dwp-top-bar.css), so the button
 * re-enables it in user.css.
 */
const MOON_HOST_SELECTORS = ['[data-testid="topbar-content-wrapper"]', '[data-testid="topbar-content"]', '[data-testid="topbar"]'];

/* Resolve the topbar row that hosts the moon button: prefer the icon row holding
 * the avatar/user-widget (top-right, next to bell+buddy), verified live via CDP;
 * fall back to the topbar testids, then to a structural button-parent walk. */
function findMoonHost() {
    try {
        const avatar = document.querySelector('[data-testid="user-widget-link"]');
        if (avatar) {
            let p = avatar.parentElement;
            let depth = 0;
            while (p && depth < 6) {
                try {
                    if (p.querySelectorAll("button").length >= 2) return p;
                } catch (e) {}
                p = p.parentElement;
                depth++;
            }
        }
    } catch (e) {}
    for (const sel of MOON_HOST_SELECTORS) {
        const el = document.querySelector(sel);
        if (el) return el;
    }
    const header = document.querySelector('[data-testid="topbar"]');
    if (!header) return null;
    let best = null;
    for (const btn of header.querySelectorAll('button, [role="button"]')) {
        const row = btn.parentElement;
        if (!row || row === header) continue;
        const count = row.querySelectorAll(':scope > button, :scope > [role="button"]').length;
        if (count >= 2 && (!best || count > best.count)) best = { el: row, count: count };
    }
    return best ? best.el : header;
}

let topbarButtonHost = null;
function ensureMoonButton() {
    try {
        if (document.getElementById("main-topBar-moon-button")) return true;
        const host = findMoonHost();
        if (!host) return false;
        topbarButtonHost = host;

        const button = document.createElement("button");
        button.id = "main-topBar-moon-button";
        button.type = "button";
        // Styling hook only (.main-topBar-buddyFeed is ours, not a Spotify class) —
        // do not use it to locate a host, it matches nothing in Spotify's bundle.
        button.className = "main-topBar-buddyFeed";
        button.setAttribute("aria-label", "Light/Dark");
        button.onclick = () => {
            toggleDark();
        };
        button.innerHTML = `<svg role="img" viewBox="0 0 16 16" height="16" width="16"><path fill="currentColor" d="M9.598 1.591a.75.75 0 01.785-.175 7 7 0 11-8.967 8.967.75.75 0 01.961-.96 5.5 5.5 0 007.046-7.046.75.75 0 01.175-.786zm1.616 1.945a7 7 0 01-7.678 7.678 5.5 5.5 0 107.678-7.678z"></path></svg>`;

        try {
            Spicetify.Tippy(button, {
                ...Spicetify.TippyProps,
                content: "Light/Dark"
            });
        } catch (e) {}

        // Leftmost in the topbar row (before the history buttons / route actions).
        host.insertBefore(button, host.firstChild);
        return true;
    } catch (e) {
        return false;
    }
}
// Spotify 1.3.x removed .main-actionButtons; retry on route changes and re-insert
// after React re-renders the topbar (bounded so it cannot poll forever).
function waitForMoonHost(retries = 0) {
    if (ensureMoonButton()) return;
    if (retries >= 100) return;
    setTimeout(() => waitForMoonHost(retries + 1), 300);
}
waitForMoonHost();
try {
    ["pushstate", "popstate", "popstateend"].forEach((ev) => document.addEventListener(ev, () => setTimeout(ensureMoonButton, 300)));
} catch (e) {}

function updateColors(textColHex) {
    if (textColHex == undefined) return registerCoverListener();

    let isLightBg = isLight(textColorBg);
    if (isLightBg)
        textColHex = lightenDarkenColor(textColHex, -15); // vibrant color is always too bright for white bg mode
    else textColHex = setLightness(textColHex, 0.45);

    let darkColHex = lightenDarkenColor(textColHex, isLightBg ? 12 : -20);
    let darkerColHex = lightenDarkenColor(textColHex, isLightBg ? 30 : -40);
    let softHighlightHex = setLightness(textColHex, isLightBg ? 0.9 : 0.14);
    setRootColor("text", textColHex);
    setRootColor("button", darkerColHex);
    setRootColor("button-active", darkColHex);
    setRootColor("tab-active", softHighlightHex);
    setRootColor("button-disabled", softHighlightHex);
    let softerHighlightHex = setLightness(textColHex, isLightBg ? 0.9 : 0.1);
    setRootColor("highlight", softerHighlightHex);

    // compute hue rotation to change spotify green to main color
    let rgb = hexToRgb(textColHex);
    let m = `url('data:image/svg+xml;utf8,
      <svg xmlns="http://www.w3.org/2000/svg">
        <filter id="recolor" color-interpolation-filters="sRGB">
          <feColorMatrix type="matrix" values="
            0 0 0 0 ${rgb[0] / 255}
            0 0 0 0 ${rgb[1] / 255}
            0 0 0 0 ${rgb[2] / 255}
            0 0 0 1 0
          "/>
        </filter>
      </svg>
      #recolor')`;
    // Batched with the rest of the theme vars so toggleDark()+updateColors()
    // flush in a single rAF (one style recalc instead of ~17 synchronous ones).
    queueThemeVar("--colormatrix", encodeURI(m));
    /* Per-track tint re-adapt: textColor just changed, so cover luminance
     * changed — re-derive tintIntensity + canvas brightness/opacity.
     * Synchronous lib writes only (no style recalc); the vars above still
     * flush once in rAF. No-op until the async kawarp import resolves. */
    try {
        __kawarpApplyTint();
    } catch (e) {}
}

let nearArtistSpanText = "";
let nearArtistSpan = null;
async function songchange(event, retries = 0) {
    const dataItem = event?.data?.item ?? getPlaybackItem();
    const meta = dataItem?.metadata;
    if (!dataItem || !meta) {
        if (retries >= 20) return;
        return setTimeout(() => songchange(event, retries + 1), 300);
    }
    try {
        // warning popup
        if (Spicetify.Platform.PlatformData.client_version_triple < "1.1.68") Spicetify.showNotification(`Your version of Spotify ${Spicetify.Platform.PlatformData.client_version_triple}) is un-supported`);
    } catch (err) {
        console.error(err);
    }

    const album_uri = meta.album_uri;
    const trackUri = dataItem.uri ?? meta.album_uri;
    const FALLBACK_IMAGE = "https://cdn.jsdelivr.net/gh/JulienMaille/spicetify-dynamic-theme@main/images/tracklist-row-song-fallback.svg";
    let bgImageRaw = meta.image_xlarge_url || meta.image_large_url || meta.image_url;
    let bgImage = toHttpCover(bgImageRaw);
    if (!bgImage) {
        bgImage = FALLBACK_IMAGE;
        textColor = "#1db954";
        updateColors(textColor);
    }

    /* Background first: set --image_url before any DOM-dependent work so the
     * fullscreen body::before layer can never be blocked by a missing node.
     * Remote cover URLs do not always paint as CSS backgrounds in Spotify's
     * build (verified: gradient paints, https:// image does not), so convert
     * to an inline data: URL via an anonymous-CORS canvas (i.scdn.co sends
     * ACAO:*, keeping the canvas clean). Falls back to the remote URL. */
    document.documentElement.style.setProperty("--image_url", `url("${bgImage}")`);
    try {
        coverToDataURL(bgImage, trackUri);
    } catch (e) {}

    /* Feed the warp canvas the raw HTTP cover (not the 96px data URL): it
     * draws at 240px with its own slice warp, so it needs full-resolution
     * pixels. --image_url above keeps the CSS backfill path in sync. */
    try {
        if (window.__dynamicBgSetCover) window.__dynamicBgSetCover(bgImage);
    } catch (e) {}

    if (album_uri && !album_uri.includes("spotify:show")) {
        try {
            const albumInfo = await getAlbumInfo(album_uri);
            let album_date = new Date(albumInfo?.date?.isoString);
            if (isNaN(album_date)) throw new Error("Invalid album date");
            let recent_date = new Date();
            recent_date.setMonth(recent_date.getMonth() - 6);
            album_date = album_date.toLocaleString("default", album_date > recent_date ? { year: "numeric", month: "short" } : { year: "numeric" });
            nearArtistSpanText = `
            <span>
                <span draggable="true">
                    <a draggable="false" dir="auto" href="${album_uri}">${meta.album_title}</a>
                </span>
            </span>
            <span> • ${album_date}</span>
        `;
        } catch (err) {
            console.error(err);
            nearArtistSpanText = `
            <span>
                <span draggable="true">
                    <a draggable="false" dir="auto" href="${album_uri}">${meta.album_title}</a>
                </span>
            </span>
        `;
        }
    } else if (dataItem.type === "episode") {
        // podcast
        let added_at = Number(meta.added_at); // Sometimes added_at is in seconds, sometimes in milliseconds
        if (added_at < 1e10) added_at *= 1000;

        let podcast_date = new Date(added_at);
        podcast_date = podcast_date.toLocaleString("default", { year: "numeric", month: "short" });
        bgImage = toHttpCover(bgImageRaw) || FALLBACK_IMAGE;
        nearArtistSpanText = `
            <span>
                <span draggable="true">
                    <a draggable="false" dir="auto" href="${album_uri}">${meta["show.publisher"]}</a>
                </span>
            </span>
            <span> • ${podcast_date}</span>
        `;
    } else if (dataItem.isLocal) {
        // local file
        nearArtistSpanText = meta.album_title;
    } else if (dataItem.provider == "ad") {
        // ad
        nearArtistSpanText = "Advertisement";
        document.documentElement.style.setProperty("--image_url", `url("${FALLBACK_IMAGE}")`);
        try {
            if (window.__dynamicBgSetCover) window.__dynamicBgSetCover(FALLBACK_IMAGE);
        } catch (e) {}
        textColor = "#1db954";
        updateColors(textColor);
        return;
    } else {
        // When clicking a song from the homepage, songChange is fired with half empty metadata
        if (retries < 5) setTimeout(() => songchange(event, retries + 1), 200);
    }

    /* Album/artist + year line: purely cosmetic, must never gate or break the
     * background/colour work above and below. .main-trackInfo-container is gone
     * in Spotify 1.3.x, so wait for a host that actually exists. */
    try {
        if (document.getElementById("main-trackInfo-year")) {
            const yearLine = document.getElementById("main-trackInfo-year");
            yearLine.innerHTML = nearArtistSpanText;
            nearArtistSpan = yearLine;
            /* Reparent if misplaced: the host is a flex ROW, so a year line
             * appended to the host renders BESIDE the track. Move it into
             * the title/artist text column so it stacks underneath. */
            try {
                const scope = yearLine.closest('[data-testid="now-playing-widget"], [data-testid="now-playing-widget-v2-byline"]') || yearLine.parentElement;
                if (scope) {
                    const col = findTrackTextColumn(scope);
                    if (col && col !== yearLine.parentElement) col.append(yearLine);
                }
            } catch (_e) {}
        } else {
            waitForAny(YEAR_LINE_HOSTS, (host) => {
                nearArtistSpan = document.createElement("div");
                nearArtistSpan.id = "main-trackInfo-year";
                nearArtistSpan.classList.add("main-trackInfo-release", "standalone-ellipsis-one-line", "main-type-finale");
                nearArtistSpan.innerHTML = nearArtistSpanText;
                try {
                    findTrackTextColumn(host).append(nearArtistSpan);
                } catch (_e) {
                    host.append(nearArtistSpan);
                }
            });
        }
    } catch (err) {
        console.error(err);
    }
    pickCoverColor(bgImage, trackUri, 0, album_uri);
}

function getVibrant(image) {
    try {
        var swatches = new Vibrant(image, 12).swatches();
        const cols = isLight(textColorBg) ? ["Vibrant", "DarkVibrant", "Muted", "LightVibrant"] : ["Vibrant", "LightVibrant", "Muted", "DarkVibrant"];
        for (const col of cols)
            if (swatches[col]) {
                textColor = swatches[col].getHex();
                break;
            }
    } catch (err) {
        console.error(err);
    }
}

async function pickCoverColor(httpCoverUrl, trackUri, retryCount = 0, albumUri) {
    if (!httpCoverUrl || !trackUri) {
        const cover = getCoverUrls();
        if (!httpCoverUrl) httpCoverUrl = toHttpCover(cover.urls[0]);
        if (!trackUri) trackUri = cover.uri;
        if (!albumUri) albumUri = cover.meta.album_uri;
    }

    const prevColor = textColor;

    if (!httpCoverUrl && !trackUri) {
        updateColors(textColor);
        return;
    }

    if (trackUri && isSkippedUri(trackUri)) {
        updateColors(textColor || "#1db954");
        return;
    }

    // Primary: CORS-free extractor via spclient (trackUri, then album_uri fallback)
    try {
        if (Spicetify.colorExtractor && trackUri && !isSkippedUri(trackUri)) {
            const hex = await tryExtractor(trackUri);
            if (hex) {
                textColor = hex;
                updateColors(textColor);
                return;
            }
            // album_uri fallback before giving up (closure value from songchange)
            try {
                if (albumUri && albumUri !== trackUri && !isSkippedUri(albumUri)) {
                    const albumHex = await tryExtractor(albumUri);
                    if (albumHex) {
                        textColor = albumHex;
                        updateColors(textColor);
                        return;
                    }
                }
            } catch (err) {
                console.error(err);
            }
        }
    } catch (err) {
        console.error(err);
    }

    // Secondary: GraphQL extracted color for track entity
    try {
        if (trackUri && !isSkippedUri(trackUri) && Spicetify.GraphQL?.Request && Spicetify.GraphQL?.Definitions?.fetchExtractedColorForTrackEntity) {
            const res = await Spicetify.GraphQL.Request(Spicetify.GraphQL.Definitions.fetchExtractedColorForTrackEntity, { uri: trackUri });
            const hex = res?.data?.trackUnion?.albumOfTrack?.coverArt?.extractedColors?.colorDark?.hex;
            if (isValidHex(hex)) {
                textColor = hex.trim();
                setCachedColor(trackUri, textColor);
                updateColors(textColor);
                return;
            }
        }
    } catch (err) {
        console.error(err);
    }

    // Tertiary: Vibrant from cover URL (bounded DOM-img wait, then proceed regardless)
    if (typeof Vibrant === "undefined") {
        if (!isValidHex(textColor)) textColor = "#1db954";
        updateColors(textColor);
        return;
    }

    if (!httpCoverUrl) {
        if (!isValidHex(textColor)) textColor = "#1db954";
        updateColors(textColor);
        return;
    }

    const img = document.querySelector(".main-image-image.cover-art-image") || document.querySelector("img.cover-art-image") || document.querySelector(".main-nowPlayingWidget-coverArt img");
    if ((!img || !img.complete) && retryCount < 10) return setTimeout(() => pickCoverColor(httpCoverUrl, trackUri, retryCount + 1, albumUri), 250);

    const _pbItem = getPlaybackItem();
    if (img && _pbItem?.isLocal) {
        try {
            img.src = toHttpCover(_pbItem.metadata.image_url);
        } catch (err) {
            console.error(err);
        }
    }

    let imageUrl = httpCoverUrl;

    var imgCORS = new Image();
    imgCORS.crossOrigin = "anonymous";
    imgCORS.src = imageUrl;

    imgCORS.onload = function () {
        getVibrant(imgCORS);
        imgCORS = null;
        if (!isValidHex(textColor)) textColor = isValidHex(prevColor) ? prevColor : "#1db954";
        updateColors(textColor);
    };

    imgCORS.onerror = function () {
        imgCORS = null;
        if (img && img.src && !img.src.startsWith("spotify:")) {
            getVibrant(img);
        }
        if (!isValidHex(textColor)) textColor = isValidHex(prevColor) ? prevColor : "#1db954";
        updateColors(textColor);
    };
}

/* Animated background: the real @kawarp/core WebGL warp, same geometry as the
 * radioking reference (warpIntensity 1.0, blurPasses 8, animationSpeed 1.0,
 * transitionDuration 2000, saturation 1.5, tint black/white). Intensity is
 * adaptive, NOT 1.0: the tint shader only blends dark pixels
 * (darkMask = 1-smoothstep(0,.5,luma)), so 1.0 merely maxes dark-area tint
 * while bright covers wash through — see __kawarpApplyTint().
 * Loaded via dynamic ESM import (same pattern as the reference); every step
 * is guarded so a failed import can never break the extension — the static
 * theme simply stays. */
var __kawarpInstance = null;
function __kawarpTint() {
    try {
        var dark = getComputedStyle(document.documentElement).getPropertyValue("--is_light").trim() !== "1";
        return dark ? [0.0, 0.0, 0.0] : [1.0, 1.0, 1.0];
    } catch (e) {
        return [0.0, 0.0, 0.0];
    }
}
async function initDynamicBgKawarp() {
    try {
        if (window.__dynamicBgInit) return;
        window.__dynamicBgInit = true;
        var canvas = document.getElementById("dynamic-bg-canvas");
        if (!canvas) {
            canvas = document.createElement("canvas");
            canvas.id = "dynamic-bg-canvas";
            try {
                if (document.body && document.body.firstChild) document.body.insertBefore(canvas, document.body.firstChild);
                else if (document.body) document.body.appendChild(canvas);
                else document.documentElement.appendChild(canvas);
            } catch (e) {
                try {
                    document.documentElement.appendChild(canvas);
                } catch (_e) {
                    return;
                }
            }
        }
        function fitKawarpCanvas() {
            try {
                var w = window.innerWidth || 1280,
                    h = window.innerHeight || 720;
                var dpr = Math.min(2, window.devicePixelRatio || 1);
                canvas.width = Math.round((w * dpr) / 2);
                canvas.height = Math.round((h * dpr) / 2);
                if (__kawarpInstance && __kawarpInstance.resize) __kawarpInstance.resize();
            } catch (e) {}
        }
        fitKawarpCanvas();
        try {
            window.addEventListener("resize", fitKawarpCanvas);
        } catch (e) {}
        const mod = await import("https://cdn.jsdelivr.net/npm/@kawarp/core/+esm");
        const tint = __kawarpTint();
        const _initDark = tint[0] < 0.5;
        const _initLuma = __kawarpCoverLuma();
        __kawarpInstance = new mod.Kawarp(canvas, {
            warpIntensity: 1.0,
            blurPasses: 8,
            animationSpeed: 1.0,
            transitionDuration: 2000,
            saturation: 1.2,
            tintColor: tint,
            tintIntensity: _initDark ? 0.55 + 0.45 * _initLuma : 0.3
        });
        /* Theme may have toggled while the async import resolved. */
        try {
            __kawarpInstance.tintColor = __kawarpTint();
        } catch (e) {}
        try {
            __kawarpApplyTint();
        } catch (e) {}
        /* Backfill: songchange() may have run before the import resolved. */
        try {
            var v = getComputedStyle(document.documentElement).getPropertyValue("--image_url") || "";
            var m = v.match(/url\(["']?(.*?)["']?\)/);
            if (m && m[1] && __kawarpInstance.loadImage) __kawarpInstance.loadImage(m[1]);
        } catch (e) {}
        try {
            __kawarpInstance.start();
        } catch (e) {}
    } catch (e) {
        try {
            console.warn("kawarp", e);
        } catch (_e) {}
    }
}
initDynamicBgKawarp();
window.__dynamicBgSetCover = function (url) {
    try {
        if (!url) return;
        /* Red-wash guard (last-known-palette fast path): withhold a cover
         * while the palette reads red-dominant — __kawarpApplyTint paints the
         * stashed URL once the fresh palette clears it as non-red. */
        if (__isRedDominantHex(textColor)) {
            try {
                window.__pendingBgCover = url;
            } catch (e) {}
            __neutralizeRedWashCanvas();
            return;
        }
        try {
            window.__pendingBgCover = null;
        } catch (e) {}
        if (__kawarpInstance && __kawarpInstance.loadImage) __kawarpInstance.loadImage(url);
    } catch (e) {}
};

Spicetify.Player.addEventListener("songchange", songchange);
songchange();

(function Startup() {
    if (!Spicetify.showNotification) {
        setTimeout(Startup, 300);
        return;
    }
    // Check latest release
    fetch("https://api.github.com/repos/JulienMaille/spicetify-dynamic-theme/releases/latest")
        .then((response) => {
            return response.json();
        })
        .then((data) => {
            if (data.tag_name > current) {
                const button = document.querySelector("#main-topBar-moon-button");
                button.classList.remove("main-topBar-buddyFeed");
                button.classList.add("main-actionButtons-button", "main-noConnection-isNotice");
                let updateLink = document.createElement("a");
                updateLink.setAttribute("href", "https://github.com/JulienMaille/spicetify-dynamic-theme/releases/latest");
                updateLink.innerHTML = `v${data.tag_name} available`;
                button.append(updateLink);
                button._tippy.setProps({
                    allowHTML: true,
                    content: `Changes: ${data.name}`
                });
            }
        })
        .catch((err) => {
            // Do something for an error here
        });
    Spicetify.showNotification("Applied " + (settingsDark ? "dark" : "light") + " theme.");
})();

document.documentElement.style.setProperty("--warning_message", " ");
