let current = "5.7";
const colorCache = new Map();
const HEX_RE = /^#[0-9a-f]{6}$/i;
const EXTRACTOR_KEYS = ["VIBRANT", "VIBRANT_NON_ALARMING", "PROMINENT", "LIGHT_VIBRANT", "DESATURATED", "DARK_VIBRANT"];
const isValidHex = (h) => typeof h === "string" && HEX_RE.test(h.trim());
function isSkippedUri(uri) {
    if (!uri || uri.startsWith("spotify:local") || uri.startsWith("spotify:ad")) return true;
    try {
        const item = Spicetify.Player?.data?.item;
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

function waitForElement(els, func, timeout = 100) {
    const queries = els.map((el) => document.querySelector(el));
    if (queries.every((a) => a)) {
        func(queries);
    } else if (timeout > 0) {
        setTimeout(waitForElement, 300, els, func, --timeout);
    }
}

function toHttpCover(u) {
    if (!u) return u;
    if (/^spotify:image:/i.test(u)) return u.replace(/^spotify:image:/i, "https://i.scdn.co/image/");
    return u;
}
function getCoverUrls() {
    const d = Spicetify.Player?.data;
    const md = d?.item?.metadata ?? d?.track?.metadata ?? {};
    return { uri: d?.item?.uri ?? d?.track?.uri ?? md.album_uri, urls: [md.image_xlarge_url, md.image_large_url, md.image_url].filter(Boolean), meta: md };
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

function setRootColor(name, colHex) {
    let root = document.documentElement;
    if (root === null) return;
    root.style.setProperty("--spice-" + name, colHex);
    root.style.setProperty("--spice-rgb-" + name, hexToRgb(colHex).join(","));
}

function toggleDark(setDark) {
    if (setDark === undefined) setDark = isLight(textColorBg);

    document.documentElement.style.setProperty("--is_light", setDark ? 0 : 1);
    textColorBg = setDark ? "#0A0A0A" : "#FAFAFA";

    setRootColor("main", textColorBg);
    setRootColor("sidebar", textColorBg);
    setRootColor("player", textColorBg);
    setRootColor("shadow", textColorBg);
    setRootColor("card", setDark ? "#040404" : "#ECECEC");
    setRootColor("subtext", setDark ? "#EAEAEA" : "#3D3D3D");
    setRootColor("selected-row", setDark ? "#EAEAEA" : "#3D3D3D");
    setRootColor("main-elevated", setDark ? "#303030" : "#DDDDDD");
    setRootColor("notification", setDark ? "#303030" : "#DDDDDD");
    setRootColor("highlight-elevated", setDark ? "#303030" : "#DDDDDD");

    updateColors(textColor);
}

/* Init with light/dark mode from settings */
toggleDark(settingsDark);

/* Hook user changes to toggle using a proxy for Spicetify.Config */
Spicetify.Config = new Proxy(Spicetify.Config, {
    set(target, property, value) {
        if (property === "color_scheme") {
            // Wait 100ms for CSS variables to update
            setTimeout(() => {
                let dark = getComputedStyle(document.documentElement).getPropertyValue("--spice-dark").trim() === "#010101";
                toggleDark(dark);
            }, 100);
        }
        target[property] = value;
        return true;
    }
});

waitForElement([".main-actionButtons"], (queries) => {
    // Add activator on top bar
    const buttonContainer = queries[0];

    const button = document.createElement("button");
    button.id = "main-topBar-moon-button";
    button.type = "button";
    // Use the transparent topbar icon-button style (bell / buddy-feed),
    // not the dark nav pill from .main-actionButtons-button.
    button.className = "main-topBar-buddyFeed";
    button.setAttribute("aria-label", "Light/Dark");
    button.onclick = () => {
        toggleDark();
    };
    button.innerHTML = `<svg role="img" viewBox="0 0 16 16" height="16" width="16"><path fill="currentColor" d="M9.598 1.591a.75.75 0 01.785-.175 7 7 0 11-8.967 8.967.75.75 0 01.961-.96 5.5 5.5 0 007.046-7.046.75.75 0 01.175-.786zm1.616 1.945a7 7 0 01-7.678 7.678 5.5 5.5 0 107.678-7.678z"></path></svg>`;

    const tooltip = Spicetify.Tippy(button, {
        ...Spicetify.TippyProps,
        content: "Light/Dark"
    });

    buttonContainer.insertBefore(button, buttonContainer.firstChild);
});

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
    document.documentElement.style.setProperty("--colormatrix", encodeURI(m));
}

let nearArtistSpanText = "";
let nearArtistSpan = null;
async function songchange(event, retries = 0) {
    const dataItem = event?.data?.item ?? Spicetify.Player?.data?.item ?? Spicetify.Player?.data?.track;
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
        textColor = "#1db954";
        updateColors(textColor);
        return;
    } else {
        // When clicking a song from the homepage, songChange is fired with half empty metadata
        if (retries < 5) setTimeout(() => songchange(event, retries + 1), 200);
    }

    if (!document.querySelector("#main-trackInfo-year")) {
        waitForElement([".main-trackInfo-container:not(#upcomingSongDiv)"], (queries) => {
            nearArtistSpan = document.createElement("div");
            nearArtistSpan.id = "main-trackInfo-year";
            nearArtistSpan.classList.add("main-trackInfo-release", "standalone-ellipsis-one-line", "main-type-finale");
            nearArtistSpan.innerHTML = nearArtistSpanText;
            queries[0].append(nearArtistSpan);
        });
    } else if (nearArtistSpan) {
        nearArtistSpan.innerHTML = nearArtistSpanText;
    } else {
        const existingYear = document.querySelector("#main-trackInfo-year");
        if (existingYear) existingYear.innerHTML = nearArtistSpanText;
    }
    document.documentElement.style.setProperty("--image_url", `url("${bgImage}")`);
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

    if (img && Spicetify.Player?.data?.item?.isLocal) {
        try {
            img.src = toHttpCover(Spicetify.Player.data.item.metadata.image_url);
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
