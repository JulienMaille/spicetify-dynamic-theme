function waitForElement(els, func, timeout = 100) {
    const queries = els.map(el => document.querySelector(el));
    if (queries.every(a => a)) {
        func(queries);
    } else if (timeout > 0) {
        setTimeout(waitForElement, 300, els, func, --timeout);
    }
}

var big_album_cover = document.querySelector('#now-playing-image-small');

var observer = new MutationObserver(function(mutations) {
    mutations.forEach(function(mutation) {
        if (mutation.type == "attributes") {
            if(big_album_cover.getAttribute("data-log-context") === "cover-large"){
                document.documentElement.style.setProperty('--move_buddy_list', "250px");
            }else{
                document.documentElement.style.setProperty('--move_buddy_list', "0px");
            }
        }
    });
});

function getAlbumInfo(uri) {
    return Spicetify.CosmosAsync.get(`hm://album/v1/album-app/album/${uri}/desktop`);
}

function isLight(hex) {
    var [r,g,b] = hexToRgb(hex).split(',').map(Number);
    const brightness = ((r * 299) + (g * 587) + (b * 114)) / 1000;
    return brightness > 128;
}

function hexToRgb(hex) {
    var bigint = parseInt(hex.replace("#",""), 16);
    var r = (bigint >> 16) & 255;
    var g = (bigint >> 8) & 255;
    var b = bigint & 255;
    return r + "," + g + "," + b;
}

const LightenDarkenColor = (h, p) => '#' + [1, 3, 5].map(s => parseInt(h.substr(s, 2), 16)).map(c => parseInt((c * (100 + p)) / 100)).map(c => (c < 255 ? c : 255)).map(c => c.toString(16).padStart(2, '0')).join('');

let nearArtistSpan = null
let mainColor = getComputedStyle(document.documentElement).getPropertyValue('--modspotify_main_fg')
let mainColor2 = getComputedStyle(document.documentElement).getPropertyValue('--modspotify_main_bg')
let isLightBg = isLight(mainColor2)

waitForElement([".main-trackInfo-artists"], (queries) => {
    nearArtistSpan = document.createElement("span");
    nearArtistSpan.id = "dribbblish-album-info";
    queries[0].append(nearArtistSpan);
});

function updateColors(root) {
    if( root===null) return;
    let colHex = mainColor
    if( isLightBg ) colHex = LightenDarkenColor(colHex, -5) // vibrant color is always too bright for white bg mode
    let colRGB = hexToRgb(colHex)
    let darkerColHex = LightenDarkenColor(colHex, isLightBg ? 45 : -40)
    let darkerColRGB = hexToRgb(darkerColHex)

    let sliderColHex = LightenDarkenColor(colHex, isLightBg ? 40 : -65)
    let sliderColRGB = hexToRgb(sliderColHex)    
    let buttonBgColHex = isLightBg ? "#FFFFFF" : LightenDarkenColor(colHex, -80)
    let buttonBgColRGB = hexToRgb(buttonBgColHex)

    root.style.setProperty('--is_light', isLightBg ? 1 : 0)
    
    root.style.setProperty('--modspotify_main_fg', colHex)
    root.style.setProperty('--modspotify_active_control_fg', colHex)
    root.style.setProperty('--modspotify_secondary_bg', colHex)
    root.style.setProperty('--modspotify_pressing_button_bg', buttonBgColHex)
    root.style.setProperty('--modspotify_indicator_fg_and_button_bg', darkerColHex)
    root.style.setProperty('--modspotify_pressing_fg', colHex)
    root.style.setProperty('--modspotify_sidebar_indicator_and_hover_button_bg', colHex)
    root.style.setProperty('--modspotify_scrollbar_fg_and_selected_row_bg', buttonBgColHex)
    root.style.setProperty('--modspotify_selected_button', darkerColHex)
    //root.style.setProperty('--modspotify_miscellaneous_hover_bg', colHex)
    root.style.setProperty('--modspotify_slider_bg', sliderColHex)
    
    root.style.setProperty('--modspotify_rgb_main_fg', colRGB)
    root.style.setProperty('--modspotify_rgb_active_control_fgg', colRGB)
    root.style.setProperty('--modspotify_rgb_secondary_bg', colRGB)
    root.style.setProperty('--modspotify_rgb_pressing_button_bg', buttonBgColRGB)
    root.style.setProperty('--modspotify_rgb_indicator_fg_and_button_bg', darkerColRGB)    
    root.style.setProperty('--modspotify_rgb_pressing_fg', colRGB)
    root.style.setProperty('--modspotify_rgb_sidebar_indicator_and_hover_button_bg', colRGB)
    root.style.setProperty('--modspotify_rgb_scrollbar_fg_and_selected_row_bg', buttonBgColRGB)
    root.style.setProperty('--modspotify_rgb_selected_button', darkerColRGB)
    //root.style.setProperty('--modspotify_rgb_miscellaneous_hover_bg', colRGB)
    root.style.setProperty('--modspotify_rgb_slider_bg', sliderColRGB)

    // Also update the color of the icons for bright and white backgrounds to remain readable.
    let isLightFg = isLight(colHex);
    if( isLightBg ) isLightFg = !isLightFg;
    iconCol = getComputedStyle(document.documentElement).getPropertyValue(isLightFg ? '--modspotify_main_bg' : '--modspotify_secondary_fg');
    root.style.setProperty('--modspotify_preserve_1', iconCol);
}

async function songchange() {
    let album_uri = Spicetify.Player.data.track.metadata.album_uri
    
    if (album_uri!==undefined) {
        const albumInfo = await getAlbumInfo(album_uri.replace("spotify:album:", ""))

        let album_date = new Date(albumInfo.year, (albumInfo.month || 1)-1, albumInfo.day|| 0)
        let recent_date = new Date()
        recent_date.setMonth(recent_date.getMonth() - 6)
        album_date = album_date.toLocaleString('default', album_date>recent_date ? { year: 'numeric', month: 'short' } : { year: 'numeric' })
        album_link = "<a title=\""+Spicetify.Player.data.track.metadata.album_title+"\" href=\""+album_uri+"\" data-uri=\""+album_uri+"\" data-interaction-target=\"album-name\" class=\"tl-cell__content\">"+Spicetify.Player.data.track.metadata.album_title+"</a>"
        
        if (nearArtistSpan!==null)
            nearArtistSpan.innerHTML = " — " + album_link + " • " + album_date
        else
            setTimeout(songchange, 200)
    } else if (Spicetify.Player.data.track.metadata.album_track_number==0) {
        // podcast
        nearArtistSpan.innerText = Spicetify.Player.data.track.metadata.album_title
    } else if (Spicetify.Player.data.track.metadata.is_local=="true") {
        // local file
        nearArtistSpan.innerText = " — " + Spicetify.Player.data.track.metadata.album_title
    } else {
        // When clicking a song from the homepage, songChange is fired with half empty metadata
        // todo: retry only once?
        setTimeout(songchange, 200)
    }

    document.documentElement.style.setProperty('--image_url', 'url("'+Spicetify.Player.data.track.metadata.image_url+'")')

    Spicetify.colorExtractor(Spicetify.Player.data.track.uri)
        .then((colors) => {
            mainColor = colors['LIGHT_VIBRANT']

            // Spotify returns hex colors with improper length
            while( mainColor.length!=4 && mainColor.length<7 )
                { mainColor = mainColor.replace("#", "#0"); }

            // main app
            updateColors(document.documentElement)

        }, (err) => {
            console.log(err)
            // On startup we receive songChange too soon and colorExtractor will fail
            // todo: retry only colorExtract
            setTimeout(songchange, 200)
        })
}

Spicetify.Player.addEventListener("songchange", songchange)