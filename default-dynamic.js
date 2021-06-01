let current = '2.3'

function waitForElement(els, func, timeout = 100) {
    const queries = els.map(el => document.querySelector(el));
    if (queries.every(a => a)) {
        func(queries);
    } else if (timeout > 0) {
        setTimeout(waitForElement, 300, els, func, --timeout);
    }
}

function getAlbumInfo(uri) {
    return Spicetify.CosmosAsync.get(`hm://album/v1/album-app/album/${uri}/desktop`);
}

function getArtistHeader(artist) {
    return Spicetify.CosmosAsync.get(`https://api-partner.spotify.com/pathfinder/v1/query?operationName=queryFullscreenMode&variables={"artistUri":"${artist}"}&extensions={"persistedQuery":{"version":1,"sha256Hash":"a90a0143ba80bf9d08aa03c61c86d33d214b9871b604e191d3a63cbb2767dd20"}}`);
}

function isLight(hex) {
    var [r,g,b] = hexToRgb(hex).map(Number)
    const brightness = ((r * 299) + (g * 587) + (b * 114)) / 1000
    return brightness > 128
}

function hexToRgb(hex) {
    var bigint = parseInt(hex.replace("#",""), 16)
    var r = (bigint >> 16) & 255
    var g = (bigint >> 8) & 255
    var b = bigint & 255
    return [r, g, b]
}

function rgbToHex([r, g, b]) {
    const rgb = (r << 16) | (g << 8) | (b << 0);
    return '#' + (0x1000000 + rgb).toString(16).slice(1);
}

const LightenDarkenColor = (h, p) => '#' + [1, 3, 5].map(s => parseInt(h.substr(s, 2), 16)).map(c => parseInt((c * (100 + p)) / 100)).map(c => (c < 255 ? c : 255)).map(c => c.toString(16).padStart(2, '0')).join('');

function rgbToHsl([r, g, b]) {
  r /= 255, g /= 255, b /= 255;
  var max = Math.max(r, g, b), min = Math.min(r, g, b);
  var h, s, l = (max + min) / 2;
  if (max == min) {
    h = s = 0; // achromatic
  } else {
    var d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
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
      if (t < 1/6) return p + (q - p) * 6 * t;
      if (t < 1/2) return q;
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
      return p;
    }
    var q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    var p = 2 * l - q;
    r = hue2rgb(p, q, h + 1/3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1/3);
  }
  return [r * 255, g * 255, b * 255];
}

function setLightness(hex, lightness) {
    hsl = rgbToHsl(hexToRgb(hex))
    hsl[2] = lightness
    return rgbToHex(hslToRgb(hsl))
}

let nearArtistSpan = null
let mainColor = getComputedStyle(document.documentElement).getPropertyValue('--spice-text')
let mainColorBg = getComputedStyle(document.documentElement).getPropertyValue('--spice-main')

waitForElement([".main-trackInfo-container"], (queries) => {
    nearArtistSpan = document.createElement("div")
    nearArtistSpan.classList.add("main-trackInfo-artists", "ellipsis-one-line", "main-type-finale")
    queries[0].append(nearArtistSpan)
});

function setRootColor(name, colHex) {
    let root = document.documentElement
    if (root===null) return
    root.style.setProperty('--spice-' + name, colHex)
    root.style.setProperty('--spice-rgb-' + name, hexToRgb(colHex).join(','))
}

function toggleDark(setDark) {
    if (setDark===undefined) setDark = isLight(mainColorBg)

    document.documentElement.style.setProperty('--is_light', setDark ? 0 : 1)
    mainColorBg = setDark ? "#0A0A0A" : "#FAFAFA"

    setRootColor('main', mainColorBg)
    setRootColor('sidebar', mainColorBg)
    setRootColor('player', mainColorBg)
    setRootColor('card', setDark ? "#040404" : "#ECECEC")
    setRootColor('subtext', setDark ? "#EAEAEA" : "#3D3D3D")
    setRootColor('notification', setDark ? "#303030" : "#DDDDDD")

    updateColors(mainColor)
}

/* Init with current system light/dark mode */
let systemDark = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--system_is_dark'))==1
toggleDark(systemDark)

waitForElement([".main-topBar-indicators"], (queries) => {
    // Add activator on top bar
    const div = document.createElement("div")
    div.id = 'main-topBar-moon-div'
    div.classList.add("main-topBarStatusIndicator-TopBarStatusIndicatorContainer")
    queries[0].append(div)

    const button = document.createElement("button")
    button.id = 'main-topBar-moon-button'
    button.classList.add("main-topBarStatusIndicator-TopBarStatusIndicator", "main-topBarStatusIndicator-hasTooltip")
    button.setAttribute("title", "Light/Dark")
    button.onclick = () => { toggleDark(); };
    button.innerHTML = `<svg role="img" viewBox="0 0 16 16" height="16" width="16"><path fill="currentColor" d="M9.598 1.591a.75.75 0 01.785-.175 7 7 0 11-8.967 8.967.75.75 0 01.961-.96 5.5 5.5 0 007.046-7.046.75.75 0 01.175-.786zm1.616 1.945a7 7 0 01-7.678 7.678 5.5 5.5 0 107.678-7.678z"></path>
</svg>`
    div.append(button)
});

function updateColors(colHex) {
    let isLightBg = isLight(mainColorBg)
    if( isLightBg ) colHex = LightenDarkenColor(colHex, -15) // vibrant color is always too bright for white bg mode

    let darkColHex = LightenDarkenColor(colHex, isLightBg ? 12 : -20)
    let darkerColHex = LightenDarkenColor(colHex, isLightBg ? 30 : -40)
    let buttonBgColHex = setLightness(colHex, isLightBg ? 0.90 : 0.14)
    setRootColor('text', colHex)
    setRootColor('button', darkerColHex)
    setRootColor('button-active', darkColHex)
    setRootColor('selected-row', darkerColHex)
    setRootColor('tab-active', buttonBgColHex)
    setRootColor('button-disabled', buttonBgColHex)
}

async function songchange() {
    // warning popup
    if (Spicetify.PlaybackControl.featureVersion < "1.1.57")
        Spicetify.showNotification("Your version of Spotify (" + Spicetify.PlaybackControl.featureVersion + ") is un-supported")
    
    let album_uri = Spicetify.Player.data.track.metadata.album_uri
    let bgImage = Spicetify.Player.data.track.metadata.image_url

    if (album_uri !== undefined && !album_uri.includes('spotify:show')) {
        const artistHeader = await getArtistHeader(Spicetify.Player.data.track.metadata.artist_uri)
        if (!artistHeader.error && artistHeader?.data?.artist?.visuals?.headerImage?.sources) {
            const headerImages = artistHeader.data.artist.visuals.headerImage.sources
            const headerImg = headerImages.length === 1 ? headerImages[0] : headerImages[headerImages.length * Math.random() | 0]
            
            bgImage = headerImg.url
        }
        const albumInfo = await getAlbumInfo(album_uri.replace("spotify:album:", ""))

        let album_date = new Date(albumInfo.year, (albumInfo.month || 1)-1, albumInfo.day|| 0)
        let recent_date = new Date()
        recent_date.setMonth(recent_date.getMonth() - 6)
        album_date = album_date.toLocaleString('default', album_date>recent_date ? { year: 'numeric', month: 'short' } : { year: 'numeric' })
        album_link = "<a title=\""+Spicetify.Player.data.track.metadata.album_title+"\" href=\""+album_uri+"\" data-uri=\""+album_uri+"\" data-interaction-target=\"album-name\" class=\"tl-cell__content\">"+Spicetify.Player.data.track.metadata.album_title+"</a>"
        
        if (nearArtistSpan!==null)
            nearArtistSpan.innerHTML = album_link + " — " + album_date
        else
            setTimeout(songchange, 200)
    } else if (Spicetify.Player.data.track.uri.includes('spotify:episode')) {
        // podcast
        bgImage = bgImage.replace('spotify:image:', 'https://i.scdn.co/image/')
        if (nearArtistSpan?.innerText) nearArtistSpan.innerText = Spicetify.Player.data.track.metadata.album_title
    } else if (Spicetify.Player.data.track.metadata.is_local=="true") {
        // local file
        if (nearArtistSpan?.innerText) nearArtistSpan.innerText = Spicetify.Player.data.track.metadata.album_title
    } else {
        // When clicking a song from the homepage, songChange is fired with half empty metadata
        // todo: retry only once?
        setTimeout(songchange, 200)
    }

    document.documentElement.style.setProperty('--image_url', 'url("' + bgImage + '")')

    if (!Spicetify.Player.data.track.metadata.image_url || Spicetify.Player.data.track.uri.includes('spotify:local')) return // dont bother extracting colours if the image doesnt exist or is local
    Spicetify.colorExtractor(Spicetify.Player.data.track.uri)
        .then((colors) => {
            mainColor = colors['LIGHT_VIBRANT']

            // Spotify returns hex colors with improper length
            while( mainColor.length!=4 && mainColor.length<7 )
                { mainColor = mainColor.replace("#", "#0") }

            // main app
            updateColors(mainColor)

        }, (err) => {
            console.log(err)
            // On startup we receive songChange too soon and colorExtractor will fail
            // todo: retry only colorExtract
            setTimeout(songchange, 200)
        })
}

Spicetify.Player.addEventListener("songchange", songchange)
document.documentElement.style.setProperty('--warning_message', ' ');

(function Startup() {
    if (!Spicetify.showNotification) {
        setTimeout(Startup, 300)
        return
    }
    // Check latest release
    fetch('https://api.github.com/repos/JulienMaille/spicetify-dynamic-theme/releases/latest').then(response => {
      return response.json();
    }).then(data => {
      if( data.tag_name > current ) {
          document.querySelector("#main-topBar-moon-div").classList.add("main-topBarUpdateAvailable")
          document.querySelector("#main-topBar-moon-button").append(`NEW v${data.tag_name} available`)
          document.querySelector("#main-topBar-moon-button").setAttribute("title", `Changes: ${data.name}`)
      }
    }).catch(err => {
      // Do something for an error here
    });
    Spicetify.showNotification("Applied system " + (systemDark ? "dark" : "light") + " theme.")
})()