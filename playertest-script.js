const albumtext = document.getElementById('albumInfo')
const st = document.getElementById("songTitle")
const artistInformation = document.getElementById("artistInfo")
const ftbar = document.getElementById("featuringSetting")
const blurbg = document.getElementById("blurEffect")
const bdf = document.getElementById("buildinfo")
const Message = document.getElementsByClassName('msg')
const alert = document.getElementById("Alertbox")
const clock = document.getElementById("clock")
const subclock = document.getElementById("subclock")
const circleProgress = document.getElementById("circleProgress")



const IsAutoPlay = false;
const searchLimit = 30;

let AnimationBlurInit = true;
let isTextcutoff = false;

let spctext = "";
let titleExtraPrompt = "";
let titlepr = "";
let info = ""
let savedAudioInfo = "";
let vg = 0;
let progress = 1;
let titleLabel = '';
let settingTab = "clock";

let isAnimating = false;
let searchResultsList;
let isFullscreen = false;
let isPlaylist = false;
let isTimer = false;
let isFocus = true;
let isTimerRunning = false;
let isTimerStarted = false;
let isRainSound = false;
let isimg;


bdf.innerText = "v1.21dev-alpha-realese\nYOOJUN Music player, All rights reserved."
document.getElementById("audioInfo").innerText = "\n\n\n\n\n"
// setting
if (localStorage.getItem("featSetting") === null){
  localStorage.setItem("featSetting", 'new')
}

if (localStorage.getItem("songListening") === null){
  localStorage.setItem("songListening", 'yikes ye')
}

let featSetting = localStorage.getItem('featSetting')
let songListening = localStorage.getItem("songListening")
ftbar.value = featSetting

function ChangeSettingValue(force=false){
  if (!info && !force) return;

  if (force){
    featSetting = force
  }
  else{
    featSetting = ftbar.value
  }

  localStorage.setItem("featSetting", featSetting)

  if (featSetting === "new"){
    artistInformation.innerHTML = info.artist
    st.innerHTML = info.title + titleExtraPrompt;
  }
  else if (featSetting === "hidden"){
    st.innerHTML = info.title.replace(titlepr, "")
    artistInformation.innerHTML = info.artist;
  }
  else if (featSetting === "artist"){
    st.innerHTML = info.title.replace(titlepr, "")
    artistInformation.innerText = info.artist + " " + titlepr
  }

  else {
    artistInformation.innerHTML = info.artist
    st.innerHTML = info.title + titlepr;
  }
}

let db = null;

// Open IndexedDB
function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("myDatabase", 1);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains("files")) {
        db.createObjectStore("files", { keyPath: "name" });
      }
    };

    request.onsuccess = (event) => {
      db = event.target.result;
      resolve(db);
    };

    request.onerror = (event) => {
      reject(event.target.error);
    };
  });
}

// Add these constants near the top with other globals
const BG_KEYS = {
  FOCUS: 'bg-focus',
  AMBIENT: 'bg-ambient'
};

// Add this new constant for the default video URL
const DEFAULT_VIDEO_URL = 'train.mp4';

// Modify saveFileAs to support both modes
async function saveFileAs(input, customName) {
  // ...existing code...
  const tx = db.transaction("files", "readwrite");
  const store = tx.objectStore("files");
  const blob = input instanceof Blob ? input : await (await fetch(input)).blob();
  
  return new Promise((resolve, reject) => {
    const req = store.put({ name: customName, blob });
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

// Get URL of file by custom name
function getFileURL(customName) {
  return new Promise(resolve => {
    const tx = db.transaction('files', 'readonly');
    const store = tx.objectStore('files');
    store.get(customName).onsuccess = e => {
      const data = e.target.result;
      if (data) resolve(URL.createObjectURL(data.blob));
      else resolve(null); // file not found
    };
  });
}

function removeFile(customName) {
  const tx = db.transaction('files', 'readwrite');
  const store = tx.objectStore('files');
  const request = store.delete(customName);

  request.onsuccess = () => console.log(`Removed: ${customName}`);
  request.onerror = () => console.error(`Failed to remove: ${customName}`);
}

function randomChoice(arr) {
    const randomIndex = Math.floor(Math.random() * arr.length);
    return arr[randomIndex];
}

async function askGemini(question) {
  const model = "gemini-2.5-flash";
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=AIzaSyDeIyri-Z3LEbEX0_H5KWlUAlC2SXPY8UY`;

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      contents: [{
        parts: [{ text: question }]
      }],
      generationConfig: {
        temperature: 0.7
      }
    })
  });

  const data = await response.json();

  return (
    data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ||
    JSON.stringify(data) ||
    "No response"
  );
}

function formatTime(seconds) {
  let h = Math.floor(seconds / 3600);
  let m = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
  let s = (seconds % 60).toString().padStart(2, '0');

  return h > 0 ? `${h}:${m}:${s}` : `${m}:${s}`;
}

function animationBlur(){
  if (AnimationBlurInit){
    blurbg.style.visibility = "visible"
    vg = 0;
    AnimationBlurInit = false;
  }
  vg = vg + 0.5;
  blurbg.style.backdropFilter = `blur(${vg}px)`;
  blurbg.style.backgroundColor = `rgba(0, 0, 0, ${vg / 10})`

  if (vg < 3.9){
    requestAnimationFrame(animationBlur)
  }
  else{
      AnimationBlurInit = true;
  }
}

async function getYouTubeInfo(url) {
  const oembed = `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`;
  const res = await fetch(oembed);
  const data = await res.json();
  return {
    title: data.title,
    creator: data.author_name,
    thumbnail: data.thumbnail_url
  };
}

function TurnOffanimationBlur(){
  if (AnimationBlurInit){
    blurbg.style.visibility = "visible"
    vg = 3 + 1;
    AnimationBlurInit = false;
  }
  vg = vg - 0.5;
  blurbg.style.backdropFilter = `blur(${vg}px)`;
  blurbg.style.backgroundColor = `rgba(0, 0, 0, ${vg / 10})`

  if (vg > 0.1){
    requestAnimationFrame(TurnOffanimationBlur)
  }
  else{
      AnimationBlurInit = true;
  }
}

function trimText(text, maxLength) {
  if (text.length > maxLength) {
    return text.slice(0, maxLength).trim() + '...';
  }
  return text;
}

async function fetchSongInfo(query, ikr=false, dontApply=false, FIRST_TIME=false) {
  let track;
  if (!ikr && query){
    if (query.toLowerCase() === "thick of it"){
      Messagebox("too bad song", "awch! no, not that song! don't- don't try that song. try, uhh.. other song! do you want me to pick one? i mean, no not that song, that's too bad!")
      return -1;
    }
  }
  titlepr = "";
  titleExtraPrompt = "";
  spctext = "";
  
  const url = `https://itunes.apple.com/search?term=${encodeURIComponent(query)}&entity=song&limit=${searchLimit}&media=music`;

  try {
    if (!ikr){
      const res = await fetch(url)
      if (!res.ok) throw new Error(`iTunes API error: ${res.status}`)
      const data = await res.json()
      const setData = data?.results.sort((a, b) => {
        const aIsRemix = a.trackName?.toLowerCase().includes("remix");
        const bIsRemix = b.trackName?.toLowerCase().includes("remix");

        if (aIsRemix && !bIsRemix) return 1;
        if (!aIsRemix && bIsRemix) return -1;
        return 0;
      });

      track = setData[0]
      searchResultsList = setData
      if (!track) {
        nofalert("No Song Found", `no song found for "${query}". would you check if you typed right?`)
        console.log('No song found for:', query);
        return -1;
      }
      else{
        if (IsAutoPlay){
          songListening = query
          localStorage.setItem("songListening",query)
        }
      }
      if (!FIRST_TIME){searchResult()}
      if (dontApply){
        if (IsAutoPlay){
          songListening = query
          localStorage.setItem("songListening",query)
        }
          return -1;
      }
    }
    else{
        track = ikr
        songListening = track.trackName + " " + track.artistName + " " + track.collectionName
        localStorage.setItem("songListening",songListening)
    }
    document.getElementById("audioInfo").innerText = "\n\n\n\n\n"

    // detecting if theres featuring included in track name

    if (track.trackName.includes(" (feat.")){
      let f = track.trackName.indexOf(' (feat.')
      titlepr = track.trackName.slice(f)
      titleExtraPrompt = `<span id='spacialtitle'>${track.trackName.slice(f)}</span>`
      track.trackName = track.trackName.slice(0,f)
    }
    else if (track.trackName.includes(" [feat.")){
      let f = track.trackName.indexOf(' [feat.')
      titlepr = track.trackName.slice(f)
      titleExtraPrompt = `<span id='spacialtitle'>${track.trackName.slice(f)}</span>`
      track.trackName = track.trackName.slice(0,f)
    }

    if (track.collectionName.includes(" - Single")){
      spctext = "<span id='spacialtext'>single</span>";
      track.collectionName = track.collectionName.replace(" - Single", "")
    }

    else if (track.collectionName.includes(" (Deluxe)") || track.collectionName.includes(" (Deluxe Version)") || track.collectionName.includes(" (Deluxe Edition)")){
      spctext = "<span id='spacialtext'>deluxe</span>";
      track.collectionName = track.collectionName.replace(" (Deluxe)", "")
      track.collectionName = track.collectionName.replace(" (Deluxe Version)", "")
      track.collectionName = track.collectionName.replace(" (Deluxe Edition)", "")
    } 

    else if (track.collectionName.includes(" - EP")){
      spctext = "<span id='spacialtext'>(EP)</span>";
      track.collectionName = track.collectionName.replace(" - EP", "")
    } 
    
    info = {
      title:       track.trackName,
      artist:      track.artistName,
      album:       track.collectionName,
      albumartist: track.collectionArtistName || track.artistName,
      date:        track.releaseDate.slice(0, 4),
      artworkUrl:  track.artworkUrl100.replace('100x100', '600x600')
    };

    document.documentElement.style.setProperty('--album', `url("${info.artworkUrl}")`);
    if (!isTimer) document.title = `${info.artist} - ${info.title}`
    st.innerHTML = info.title + titleExtraPrompt;
    artistInformation.innerHTML = info.artist;
    document.getElementById("albumInfo").innerHTML = info.album + " " + spctext
    document.getElementById("PBtitle").innerHTML = `<span class='hoverd'>${info.title}</span>`
    document.getElementById("PBartist").innerHTML = `<span class='hoverd'>${info.artist}</span>`

    if (!isPlaylist){
      document.getElementById("PBartistBg").innerHTML = `<span class='hoverd'>${info.artist}</span>`
      document.getElementById("PBtitleBg").innerHTML = `<span class='hoverd'>${info.title}</span>`
    }

    document.getElementById("albumArtistInfo").innerHTML = `<span class='hoverd'>${info.albumartist}</span>, ${info.date}`;
    if (info.album.length > 28){
      albumtext.style.fontSize = "13px"
    }
    if (info.album.length > 42){
      albumtext.style.fontSize = "11px"
    }

    ChangeSettingValue()

    const wikiTitle = await findWikipediaTitle(`${info.album} ${info.artist}`);
    
    if (!wikiTitle) {
      const fallbackTitle = await findWikipediaTitle(info.album);
      if (!fallbackTitle) {
        return;
      }
      await fetchWikipediaSummary(fallbackTitle);
    } else {
      await fetchWikipediaSummary(wikiTitle);
    }

  } catch (err) {
    console.error('Error fetching song info:', err);
  }
}

async function findWikipediaTitle(searchQuery) {
  const searchURL = `https://en.wikipedia.org/w/api.php?action=opensearch&search=${encodeURIComponent(searchQuery)}&limit=1&format=json&origin=*`;

  try {
    const res = await fetch(searchURL);
    const data = await res.json();
    return data[1]?.[0] || null;
  } catch (err) {
    console.error('Wikipedia search failed:', err);
    return null;
  }
}

async function fetchWikipediaSummary(title) {
  const summaryURL = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`;
  try {
    const res = await fetch(summaryURL);
    const data = await res.json();

    if (data.extract) {
      const wikiLink = `https://en.wikipedia.org/wiki/${encodeURIComponent(title)}`;
      document.getElementById("audioInfo").innerHTML = `${trimText(data.extract, 310)} <a href="${wikiLink}" target="_blank">wikipedia</a>`;
        } 
        else {
      document.getElementById("audioInfo").innerText = "";
    }
  } catch (err) {
    console.error('Wikipedia summary fetch failed:', err);
    document.getElementById("audioInfo").innerText = "";
  }
}

setInterval(() => {
  if (st.scrollWidth > st.clientWidth) {
    isTextcutoff = true;
  }
  else {
    isTextcutoff = false;
  }
}, 500);

async function Messagebox(title = "title will be shown hereS", text = "example text of some example texts. this text will be used for test only.") {
    
    // The key change: return a new Promise.
    // The 'await' keyword will 'wait' for this Promise to 'resolve'.
    return new Promise((resolve) => {
        
        // === Your existing code to SHOW the message box ===
        document.getElementById("msgTopic").innerText = title;
        document.getElementById("msgText").innerText = text;
        document.getElementById('blackBg').style.display = 'block';

        for (let r of Message) {
            r.style.display = 'block';
        }
        requestAnimationFrame(function () {
            for (let r of Message) {
                r.style.opacity = 1;
            }
        });
        // === End of your existing show code ===

        // Get references to the buttons
        const accButton = document.getElementById('accButton');
        const decButton = document.getElementById('decButton');

        // We need named functions so we can *remove* them later
        const acceptHandler = () => {
            // === Your existing HIDE logic ===
            for (let r of Message) {
                r.style.opacity = 0;
            }
            setTimeout(function () {
                for (let r of Message) {
                    r.style.display = 'none';
                }
                document.getElementById('blackBg').style.display = 'none';
            }, 500);
            
            // --- The important changes ---
            // 1. Remove listeners to prevent memory leaks
            accButton.removeEventListener('click', acceptHandler);
            decButton.removeEventListener('click', declineHandler);
            
            // 2. Resolve the promise with 'true'
            // This is what the 'await' will receive
            resolve(true);
        };

        const declineHandler = () => {
            // === Your existing HIDE logic ===
            for (let r of Message) {
                r.style.opacity = 0;
            }
            setTimeout(function () {
                for (let r of Message) {
                    r.style.display = 'none';
                }
                document.getElementById('blackBg').style.display = 'none';
            }, 500);
            
            // --- The important changes ---
            // 1. Remove listeners
            accButton.removeEventListener('click', acceptHandler);
            decButton.removeEventListener('click', declineHandler);

            // 2. Resolve the promise with 'false'
            resolve(false);
        };

        // Add the event listeners
        accButton.addEventListener('click', acceptHandler);
        decButton.addEventListener('click', declineHandler);
    });
}
ftbar.addEventListener("change", ChangeSettingValue)
// keyPress
let pr;
document.addEventListener('keydown', function(event) {

  if (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA' || document.activeElement.isContentEditable) {
    return
  }
  
    if (event.key === 'y'){
    let youtubeLink = prompt("yt link:");
    // youtubeLink must be a video URL, NOT a thumbnail URL
    getYouTubeInfo(youtubeLink).then(info => {
      console.log(info);
      document.getElementById('albCoverBg').style.backgroundImage = `url(${info.thumbnail})`;
      document.getElementById('PBtitleBg').innerHTML = info.title
      document.getElementById('PBartistBg').innerHTML = info.creator
    }).catch(err => console.error(err));
  }
})


/*

TODO:
* add "White Noise" on sounds tab
* complete AI Analyze System
* add more features in "analyze" tab, such as Tab feature

* ambient Tab
- a clock
- widgets movable, e.g: weather, timer, clock

* stopwatch?
*/

document.addEventListener('keydown', function(event) {
  if (event.key === "Escape"){
    SRvalue("hidden")
    }
})

document.addEventListener('keydown', function(event) {
  if (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA' || document.activeElement.isContentEditable) {
    return
  }

  if (event.key === "m"){
    pr = prompt("paste the image link of your custom album cover:")
    if (pr){
      const imgTest = new Image()
      imgTest.onload = function(){
        document.documentElement.style.setProperty('--album', `url("${pr}")`);
        nofalert("Album Cover Changed", "you're new custom album cover has been successfully applied, this will work on local only.", time=3,check=true)
      }
      imgTest.onerror = function(){
        nofalert("Image Error", "we got an error while loading your image link. would you check if it's a vaild link?",time=3.5)
      }
      imgTest.src = pr
    }
  }
})

let af, zxa;
document.addEventListener('keydown', async function(event) {
  if (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA' || document.activeElement.isContentEditable) {
    return
  }
  
  if (event.key === "g"){
    prz = prompt("what song you wanna hear today:")
    if (prz){
      af = await askGemini(`Recommend a best song for user's prompt: ${prz}, in this format: "{artist} {song name} {album}", 
for direct api usage to find. so no other words or speeches; no '-' too. (album can be excepted if no album), however just pick one / or the system will be error`)
      zxa = fetchSongInfo(af, false, false, true)
      if (zxa){
        nofalert("Song Chosen", `Artificial Intelligence chose the song, "${af}"`, 2, check=true)
      }
      }
    }
  }
)


document.getElementById("testbt").onclick = function(){
  
  }
  
function donate(){
  Messagebox(title="support small business ♥", text="this player is being serviced for FREE, because this service is not made for just money earning. however if you want help us, you can be a Helper to get some more features. :D")
}



function nofalert(title='test alert', text='i think developer forgot to write text.', time=2, check=false) {
  document.getElementById("alertTopic").innerText = title
  document.getElementById("alertText").innerText = text

  if (check){
    document.getElementById("excicon").style.display = 'none'
    document.getElementById('checkicon').style.display = 'block'
  }
  else if (!check){
    document.getElementById("excicon").style.display = 'block'
    document.getElementById('checkicon').style.display = 'none'
  }
  if (!isAnimating){
    isAnimating = true;
    alert.style.visibility = 'visible'
    alert.classList.remove("slide-bottom")
    alert.classList.remove("slide-top")
    void alert.offsetWidth
    alert.classList.add("slide-bottom")
    setTimeout(() => {
      alert.classList.add("slide-top")
      isAnimating = false;
    }, time*1000);
  }
}

function searchResult(){
  const items = document.getElementsByClassName("Prr");
  while(items.length > 0) {
      items[0].remove();
  }
  SRvalue("visible")
  for (let track of searchResultsList){
    let info = {
        title:       track.trackName,
        artist:      track.artistName,
        album:       track.collectionName,
        albumartist: track.collectionArtistName || track.artistName,
        date:        track.releaseDate.slice(0, 4),
        artworkUrl:  track.artworkUrl100.replace('100x100', '600x600')
      };
    
    let itembox = document.createElement("div")
    itembox.className = "Smth SR Prr"
    itembox.onclick = function(){
      fetchSongInfo(null, track);
      SRvalue("hidden");
    }

    let cover = document.createElement("div")
    cover.className = "smthCover SR Prr"
    cover.style.backgroundColor = ''
    cover.style.backgroundImage = `url("${info.artworkUrl}")`

    let name = document.createElement("p")
    name.innerHTML = info.title
    name.className = "smthName SR Prr"

    let artist = document.createElement("p")
    artist.innerHTML = info.artist
    artist.className = "smthBy SR Prr"
    
    document.getElementById("Searchbox").appendChild(itembox)
    itembox.appendChild(cover)
    itembox.appendChild(name)
    itembox.appendChild(artist)
    }
}

function SRvalue(value){
  for (let q of document.getElementsByClassName("SR")){
    q.style.visibility = value
  }
}

let fk;
function mouseTimeout(){
  document.body.style.cursor = "default"
  document.getElementById('wallPaper').style.filter = `brightness(${document.getElementById("brsetText").value / 100})`
  document.getElementById('wallPaperVideo').style.filter = `brightness(${document.getElementById("brsetText").value / 100})`
      for (let i of document.getElementsByClassName("rem")){
        i.style.animation = "none"
        i.offsetWidth;
        i.style.opacity = 1
      }
      if (true){
        for (let i of document.getElementsByClassName("pbb")){
          i.style.animation = "none"
          i.offsetWidth;
          i.style.opacity = 1
        }
      }

  clearTimeout(fk)
  if (isTimerRunning && document.getElementById("focusedui").checked){
    fk = setTimeout(() => {
      if (document.getElementById('scrr').checked){
        document.getElementById('wallPaper').style.filter = `brightness(0.2)`
        document.getElementById('wallPaperVideo').style.filter = `brightness(0.2)`
      }
      document.body.style.cursor = "none"
      for (let i of document.getElementsByClassName("rem")){
        i.style.animation = "none"
        i.offsetWidth;
        i.style.animation = "disappear 0.5s ease forwards"
      }
      if (document.getElementById("alsomusic").checked){
        for (let i of document.getElementsByClassName("pbb")){
          i.style.animation = "none"
          i.offsetWidth;
          i.style.animation = "disappear 0.5s ease forwards"
        }
      }

    }, Number(document.getElementById("inactiveTime").value) * 1000);
  }
}

// clock
function clocks(){
  if (!isTimer){
      const now = new Date()
      const monthName = now.toLocaleString("en-US", { month: "long" });

      let hour = now.getHours()
      if (hour > 12){
        hour = hour - 12
      }
      if (hour === 0){
        hour = 12
      }
      clock.innerText = (hour.toString().padStart(2, "0") + ":" + now.getMinutes().toString().padStart(2, "0"))
      document.getElementById('clockWidgetDisplay').innerHTML = (hour.toString().padStart(2, "0") + ":" + now.getMinutes().toString().padStart(2, "0"))

      subclock.innerText = `${now.getFullYear()}, ${monthName} ${now.getDate()}th`
      document.getElementById('clockWidgetDay').innerHTML = `${now.getFullYear()}, ${monthName} ${now.getDate()}th`
  }
  else if (isTimerRunning) { // timer stuff
    timeRemain--;
    if (isFocus) localstudy++;
    progress = (timeRemain / setTime)
    document.title = `${isFocus ? '[focus 📖]':'[break 🎧]'} ⏰ ${formatTime(timeRemain)}`

    clock.innerHTML = formatTime(timeRemain)
    subclock.innerHTML = isFocus ? "Focusing time": "Break time"
    circleProgress.style.transform = `scale(${progress})`

    if (timeRemain < 1){
      isFocus = !isFocus
      if (isFocus){
        document.getElementById("timerUIText").innerHTML = "Force End"
        timeRemain = setTime;
      }
      else{
        document.getElementById("timerUIText").innerHTML = "Skip Break"
        timeRemain = setbreakTime;
      }
    }
}
}

let setTime = 25 * 60 
let setbreakTime = 5 * 60
let timeRemain = setTime;

clocks()
setInterval(() => {
  clocks()
}, 1000);


setInterval(() => {
  if (document.fullscreenElement){
    isFullscreen = true;
  }
  else{
    isFullscreen = false;
  }
}, 100);

document.addEventListener("mousemove", mouseTimeout)
mouseTimeout()
  document.getElementById("clock").style.fontSize = "150px"
  document.getElementById("subclock").style.fontSize = "30px"
  document.getElementById("subclock").style.marginBottom = "200px"

if (isTimer){
  document.title = "🌆 Yoojun Clock"
  clock.innerHTML = formatTime(timeRemain)
  subclock.innerHTML = `${formatTime(setTime)} focus | ${formatTime(setbreakTime)} break`
}
else{
  document.getElementById('timerUI').style.display = 'none'
  document.getElementById('timerButton').style.display = 'none'
}

if (isPlaylist){
  document.getElementById("PBtitleBg").innerHTML = "Songs to play on study"
  document.getElementById("PBartistBg").innerHTML = "Playlist"
}

document.getElementById("timerButton").onclick = function(){
  isTimerRunning = !isTimerRunning
  document.getElementById("resetButton").style.visibility = "visible"
  isTimerStarted = true;
  document.getElementById("timerButtonText").innerHTML = isTimerRunning ? "Stop":"Start"
  if (!isTimerRunning) document.title = `[paused ⌛] ⏰ ${formatTime(timeRemain)}`
}

document.addEventListener("keydown", function(event){
  if (event.key === " "){
    isTimerRunning = !isTimerRunning
    document.getElementById("timerButtonText").innerHTML = isTimerRunning ? "Stop":"Start"
  }
})

document.getElementById("playerboxBg").onclick = function(){
    pr = prompt("song name:")
    if (pr){
    fetchSongInfo(pr, false, true)
    }
}

document.getElementById("timerUI").onclick = function(){
  if (isTimerStarted){
    timeRemain = 1
    setTimeout(() => {
      nofalert("Timer Force Ended", "Timer has been force ended.", 1.5, true)
    }, 700);
  if (!isTimerRunning){ 
    isTimerRunning = true
    document.getElementById("timerButtonText").innerHTML = 'Stop'
  }

  }
}

document.getElementById("resetButton").onclick = function(){
  timeRemain = setTime
  clock.innerHTML = formatTime(setTime)
  document.getElementById("resetButton").style.visibility = 'hidden'
  document.getElementById("timerButtonText").innerHTML = 'Start'
  subclock.innerHTML = `${formatTime(setTime)} focus | ${formatTime(setbreakTime)} break`
  document.title = "🌆 Yoojun Clock"
  isTimerRunning = false
  isTimerStarted = false

  isFocus = true
}

const settingItems = [...document.getElementById("setting-mix").children]

document.getElementById("settingClose").onclick = function(){
  for (let k of settingItems){
    k.style.animation = 'disappear 0.27s ease forwards'
  }
    requestAnimationFrame(() => {
    document.getElementById('settingBox').style.transform = "translateY(-30%)";
  });

  setTimeout(() => {
    for (let a of settingItems){
      a.style.display = 'none'
      a.style.animation = 'none'
      a.style.offsetWidth;
    }
  }, 270);
}

function ayo(obj) {
  const keys = Object.keys(obj);
  let lastKeys = keys.slice(-7); // keep last 7 if more
  const result = {};

  // fill zeros for missing keys
  while (lastKeys.length < 7) {
    lastKeys.unshift(''); // placeholder key
  }

  lastKeys.forEach(k => {
    result[k] = k ? obj[k] : 0; // if empty key, value = 0
  });

  return result;
}


function padArrayRight(arr, length = 7, filler = 0) {
  arr = arr.slice(-length);      // keep last `length` items if more
  while (arr.length < length) arr.push(filler); // add zeros at the end
  return arr;
}

function resetCanvas(canvas) {
  const parent = canvas.parentNode;
  const newCanvas = canvas.cloneNode(true); // clone canvas
  parent.replaceChild(newCanvas, canvas);  // replace old canvas
  return newCanvas; // return new context
}

// chart
function chart() {
    let ctx = document.getElementById('myChart');
    
    // Get last 7 values, pad zeros on the right
    let valueList = Object.values(studies).map(v => Math.round(v / 12) / 5);
    valueList = padArrayRight(valueList, 7, 0);

    // Get last 7 labels, pad empty strings on the right
    const labelKeys = Object.keys(studies);
    let lastLabels = labelKeys.slice(-7);
    while (lastLabels.length < 7) lastLabels.push('');

    Chart.defaults.color = 'rgba(255,255,255,0.89)';
    Chart.defaults.font.size = 15;
    Chart.defaults.font.family = 'Inter';

    window.Mychart = new Chart(ctx, {
        type: 'line', // bar, line,  radar, polarArea, bubble, pie
        data: {
            labels: lastLabels,
            datasets: [{
                label: 'Focusing time (minutes)',
                data: valueList,
                backgroundColor: 'skyblue',
                borderColor: 'rgba(255, 255, 255, 1)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            animation: {
                duration: 1000,
                easing: 'easeOutQuart',
                animateScale: true,
                animateRotate: true
            },
            scales: { 
                y: { 
                    suggestedMax: 90,
                    beginAtZero: true,
                    grid: {
                        color: 'rgba(255, 255, 255, 0)'
                    }
                },
                x: {
                    grid: {
                        color: 'rgba(255, 255, 255, 0)'
                    }
                }
            }
        }
    });
}

// setting opened :D
document.getElementById("settingIconBox").onclick = function(){
  for (let k of settingItems){
    k.style.display = "block"
    k.style.animation = 'appear 0.27s ease forwards'
  }
    requestAnimationFrame(() => {
    document.getElementById('settingBox').style.transform = "translateY(0%)";
  });
  switchTab('clock')  
  document.getElementById('labelInput').placeholder = 'e.g, ' + randomChoice(['math is too hard..', '🌆 nice day', 'homework time', 'math time', 'science time'])
}

document.getElementById("settingIconBox").addEventListener("mouseenter", function(){
  document.getElementById("settingIcon").style.transform = 'scale(0.9) rotate(90deg)'
})

document.getElementById("settingIconBox").addEventListener("mouseleave", function(){
  document.getElementById("settingIcon").style.transform = 'scale(0.9) rotate(0deg)'
})

document.getElementById("font-choice").addEventListener('change', function(){
  clock.style.fontFamily = this.value
  this.style.fontFamily = this.value
})

document.getElementById("isfontBold").addEventListener('change', function(){
  clock.style.fontWeight = this.checked ? "bold":"normal"
})

// time set
document.getElementById("focusing-min").addEventListener('blur', function(){
  setTime = Number(this.value) * 60 + Number(document.getElementById("focusing-sec").value)

  if (!isTimerStarted){
    timeRemain = setTime
    clock.innerHTML = formatTime(setTime)
    subclock.innerHTML = `${formatTime(setTime)} focus | ${formatTime(setbreakTime)} break`
  }
})

document.getElementById("focusing-sec").addEventListener('blur', function(){
  setTime = Number(document.getElementById("focusing-min").value) * 60 + Number(this.value)

  if (!isTimerStarted){
    timeRemain = setTime
    clock.innerHTML = formatTime(setTime)
    subclock.innerHTML = `${formatTime(setTime)} focus | ${formatTime(setbreakTime)} break`
  }
})

document.getElementById("break-min").addEventListener('blur', function(){
  setbreakTime = Number(this.value) * 60 + Number(document.getElementById("break-sec").value)
  if (!isTimerStarted){
    subclock.innerHTML = `${formatTime(setTime)} focus | ${formatTime(setbreakTime)} break`
  } 
})

document.getElementById("break-sec").addEventListener('blur', function(){
  setbreakTime = Number(document.getElementById("break-min").value) * 60 + Number(this.value)
  if (!isTimerStarted){
    subclock.innerHTML = `${formatTime(setTime)} focus | ${formatTime(setbreakTime)} break`
  } 
})

document.getElementById("colorValue").addEventListener('change', function(){
  clock.style.color = this.value
  document.getElementById("colorlabel").innerHTML = this.value
})

document.getElementById("brsetText").addEventListener('change', function(){
  document.getElementById('wallPaper').style.filter = `brightness(${this.value / 100})`
  document.getElementById('wallPaperVideo').style.filter = `brightness(${this.value / 100})`

  document.getElementById('brsetSlider').value = this.value
})

document.getElementById("brsetSlider").addEventListener('change', function(){
  document.getElementById('wallPaper').style.filter = `brightness(${this.value / 100})`
  document.getElementById('wallPaperVideo').style.filter = `brightness(${this.value / 100})`

  document.getElementById("brsetText").value = this.value
})

//document.getElementById('wallPaper').style.filter = `brightness(${this.value / 100})`
//document.getElementById('wallPaperVideo').style.filter = `brightness(${this.value / 100})`

document.getElementById("focusedui").addEventListener('change',function(){
  document.getElementById("inactiveTime").disabled = !this.checked
  document.getElementById("alsomusic").disabled = !this.checked

  document.getElementById("inactiveTime").style.color = this.checked ? "white" : "#999c9cff"
  document.getElementById("alsomusic").style.color = this.checked ? "white" : "#999c9cff"
  document.getElementById("alsomusictext").style.color = this.checked ? "white" : "#999c9cff"
  document.getElementById("js-a").style.color = this.checked ? "white" : "#999c9cff"
  document.getElementById("js-b").style.color = this.checked ? "white" : "#999c9cff"
})

function switchTab(tab){
  // init
  settingTab = tab
  document.getElementById("tab-clock").style.display = 'none'
  document.getElementById("tab-wallpaper").style.display = 'none'
  document.getElementById("tab-credit").style.display = 'none'

  document.getElementById("stClock").style.backgroundColor = "rgba(128, 128, 128, 0.125)"
  document.getElementById("stWallpaper").style.backgroundColor = "rgba(128, 128, 128, 0.125)"
  document.getElementById("stCredit").style.backgroundColor = "rgba(128, 128, 128, 0.125)"

  // then, change
  document.getElementById(`tab-${tab}`).style.display = 'block'
  document.getElementById(`st${tab.slice(0, 1).toUpperCase()}${tab.slice(1)}`).style.backgroundColor = "rgba(128, 128, 128, 0.35)"
}

document.getElementById("stWallpaper").onclick = function(){
  switchTab('wallpaper')
}

document.getElementById("stCredit").onclick = function(){
  switchTab('credit')
}

document.getElementById("stClock").onclick = function(){
  switchTab('clock')
}

// start :D
switchTab('clock')

document.getElementById("videoUploader").onclick = function(){
  document.getElementById("fileUploader-video").click()
}

document.getElementById("imageUploader").onclick = function(){
  document.getElementById("fileUploader-image").click()
}

document.getElementById("fileUploader-video").addEventListener('change', async function() {
  const file = this.files[0];
  if (!file) return;

  const allowedExt = ['.mp4', '.webm'];
  const fileExt = file.name.slice(file.name.lastIndexOf('.')).toLowerCase();
  if (!allowedExt.includes(fileExt)) return;

  const bgKey = isambient ? BG_KEYS.AMBIENT : BG_KEYS.FOCUS;
  
  document.getElementById("wallPaperVideo").style.display = 'block';
  document.getElementById("wallPaper").style.display = 'none';
  isimg = false;
  localStorage.setItem('isphoto-' + bgKey, false);

  await saveFileAs(file, bgKey);
  await loadWallpaper(isambient);
  nofalert("Change Successful", `${isambient ? 'Ambient' : 'Focus'} wallpaper was successfully changed!`, 1, true);
});

document.getElementById("imgurl-upload").addEventListener("click", function () {
  const url = document.getElementById("imgurl").value.trim();
  if (!url) return;

  const img = new Image();
  img.onload = function () {
    document.getElementById("wallPaperVideo").pause();
    document.getElementById("wallPaperVideo").style.display = 'none';
    document.getElementById("wallPaper").style.backgroundImage = `url(${url})`;
    document.getElementById("wallPaper").style.display = 'block';
    isimg = true;
    saveFileAs(url, 'bg');
    localStorage.setItem('isphoto', isimg);
    nofalert("Change Successful", "Wallpaper was successfully changed!", 1, true)

  };
  img.src = url;
});

// goal system
let goalbar = false

document.getElementById('goalIcon').addEventListener('click',function(){
  if (!goalbar){
    this.style.backgroundColor = "rgba(0, 0, 0, 0);"
    this.style.transform = "scale(1.0)"

    this.style.width = "350px"
    this.style.height = "180px"
    document.getElementById('goalhidder').style.visibility = 'visible'
    document.getElementById('gText').style.display = 'none'
    document.getElementById('progressBar').style.display = 'none'
    document.getElementById('progressBar-charged').style.display = 'none'
    document.getElementById("goal-items").style.display = 'contents'
    goalbar = true
  }
})

document.getElementById('goalhidder').addEventListener('click',function(){
  document.getElementById('goalIcon').style.width = "150px"
  document.getElementById('goalIcon').style.height = "45px"
  document.getElementById('goalhidder').style.visibility = 'hidden'
  document.getElementById("goal-items").style.display = 'none'
  setTimeout(() => {
    goalbar = false
    document.getElementById('gText').style.display = 'block'
    document.getElementById('progressBar').style.display = 'block'
    document.getElementById('progressBar-charged').style.display = 'block'
  }, (100));
})


document.getElementById('goalIcon').addEventListener('mouseenter',function(){
  if (!goalbar){
    this.style.backgroundColor = "rgba(90, 89, 89, 0.151);"
    this.style.transform = "scale(1.05)"
  }
})

document.getElementById('goalIcon').addEventListener('mouseleave',function(){
  this.style.backgroundColor = "rgba(0, 0, 0, 0);"
  this.style.transform = "scale(1.0)"
})

async function loadWallpaper(isAmbientMode) {
  const bgKey = isAmbientMode ? BG_KEYS.AMBIENT : BG_KEYS.FOCUS;
  const isPhoto = localStorage.getItem('isphoto-' + bgKey) === 'true';
  
  try {
    const url = await getFileURL(bgKey);
    const videoEl = document.getElementById("wallPaperVideo");
    const sourceEl = document.getElementById("videoSourse");
    const wallPaperDiv = document.getElementById("wallPaper");

    if (!url) {
      // No wallpaper set: Load and save the default video
      videoEl.style.display = 'block';
      wallPaperDiv.style.display = 'none';
      sourceEl.src = DEFAULT_VIDEO_URL;
      videoEl.load();
      videoEl.currentTime = 0;
      
      // Mark as video (not photo) in localStorage
      localStorage.setItem('isphoto-' + bgKey, false);
      
      // Save the default to IndexedDB for persistence (fetches and stores the blob)
      await saveFileAs(DEFAULT_VIDEO_URL, bgKey);
      nofalert("Default Wallpaper Set", "A default video wallpaper has been loaded for the first time!", 2, true);
      return;
    }

    if (isPhoto) {
      videoEl.style.display = 'none';
      wallPaperDiv.style.backgroundImage = `url(${url})`;
      wallPaperDiv.style.display = 'block';
    } else {
      videoEl.style.display = 'block';
      wallPaperDiv.style.display = 'none';
      sourceEl.src = url;
      videoEl.load();
      videoEl.currentTime = 0;
    }
  } catch (err) {
    console.error(`Failed to load ${isAmbientMode ? 'ambient' : 'focus'} wallpaper:`, err);
  }
}

document.getElementById("alsomusic").addEventListener('change',function(){
  if (document.getElementById("alsomusic").checked){
    for (let r of document.getElementsByClassName('pbb')){
      r.style.visibility = 'hidden'
    }
  }
  else{
    for (let r of document.getElementsByClassName('pbb')){
      r.style.visibility = 'visible'
    }
  }
})
// Modify image uploader too
document.getElementById("fileUploader-image").addEventListener('change', async function() {
  const file = this.files[0];
  if (!file) return;

  const allowedExt = ['.png','.jpg','.jpeg','.gif'];
  const fileExt = file.name.slice(file.name.lastIndexOf('.')).toLowerCase();
  if (!allowedExt.includes(fileExt)) return;

  const bgKey = isambient ? BG_KEYS.AMBIENT : BG_KEYS.FOCUS;

  document.getElementById("wallPaperVideo").pause();
  document.getElementById("wallPaperVideo").style.display = 'none';
  document.getElementById("wallPaper").style.display = 'block';

  isimg = true;
  localStorage.setItem('isphoto-' + bgKey, true);
  await saveFileAs(file, bgKey);
  await loadWallpaper(isambient);
  nofalert("Change Successful", `${isambient ? 'Ambient' : 'Focus'} wallpaper was successfully changed!`, 1, true);
});

//setup
if (localStorage.getItem('settings') === null){
  localStorage.setItem('settings',JSON.stringify({
    'focusing-min': 25,
    'focusing-sec': 0,
    'break-min': 5,
    'break-sec': 0,

    'font-choice':'Inter',
    'isfontBold': true,
    'colorValue':'#ffffff',

    'focusedui': true,
    'inactiveTime': 2,
    'alsomusic': true,
    'someWords':""
  }))
}

if (localStorage.getItem('isphoto') === null){
  localStorage.setItem('isphoto', true)
}

let loadedSettingData = JSON.parse(localStorage.getItem('settings'))
for (let [name, value] of Object.entries(loadedSettingData)){

  if (name === ''){
    continue
  }
  let el = document.getElementById(name)
  if (!el) continue
  if (el.type === 'checkbox'){
    el.checked = value
  }
  else if (el.tagName === 'SELECT'){
    el.value = value
  }

  else if (el.type === 'file'){
    el.value = ""
  }
  else{
    el.value = value
  }
}


document.querySelectorAll('input, select').forEach(el => {
  const eventType = (el.type === 'checkbox' || el.type === 'radio') ? 'change' : 'input';

  el.addEventListener(eventType, function(event) {
    if (el.type === 'checkbox' || el.type === 'radio') {
      loadedSettingData[el.id] = el.checked;
    } else if (el.tagName === 'SELECT') {
      loadedSettingData[el.id] = el.value;
    } else {
      loadedSettingData[el.id] = el.value;
    }

    localStorage.setItem('settings', JSON.stringify(loadedSettingData));
  });
});

document.getElementById("stClock").style.backgroundColor = "rgba(128, 128, 128, 0.125)"
document.getElementById("stWallpaper").style.backgroundColor = "rgba(128, 128, 128, 0.35)"
document.getElementById("stCredit").style.backgroundColor = "rgba(128, 128, 128, 0.125)"

const fontChoice = document.getElementById("font-choice")
clock.style.fontFamily = fontChoice.value
clock.style.color = document.getElementById('colorValue').value
fontChoice.style.fontFamily = fontChoice.value
document.getElementById('colorlabel').innerHTML = document.getElementById('colorValue').value
document.getElementById('someWords').innerHTML = document.getElementById('labelInput').value

document.getElementById('labelInput').addEventListener('change',function(){
   document.getElementById('someWords').innerHTML = document.getElementById('labelInput').value
})

document.getElementById("somelabel").innerText = "thanks for using my site 💖"

document.getElementById('rainSound').addEventListener('click',function(){
  isRainSound = !isRainSound
  document.getElementById('rainySound').volume = 0.05
  
  if (isRainSound){
    document.getElementById('rainIcon').style.opacity = 0.3
    document.getElementById('rainPause').style.display = 'block'
    document.getElementById('rainySound').play()
  }
  else{
    document.getElementById('rainIcon').style.opacity = 0.8
    document.getElementById('rainPause').style.display = 'none'
    document.getElementById('rainySound').pause()

  }
})

const soundStuff = document.getElementById('soundBar')
let isSoundAnimating = false
let isSoundBox = false
let animTimeout = null

document.getElementById('soundBox').addEventListener('click', () => {
  isSoundBox = !isSoundBox
  if (isSoundBox){
    document.getElementById('soundBar').style.transform = 'translateY(0%)'
    if (goalbar){
      document.getElementById('goalIcon').style.width = "150px"
      document.getElementById('goalIcon').style.height = "45px"
      document.getElementById('goalhidder').style.visibility = 'hidden'
      document.getElementById("goal-items").style.display = 'none'
      setTimeout(() => {
        goalbar = false
        document.getElementById('gText').style.display = 'block'
        document.getElementById('progressBar').style.display = 'block'
        document.getElementById('progressBar-charged').style.display = 'block'
      }, (100));
    }
  else{
    document.getElementById('soundBar').style.transform = 'translateY(100%)'
  }
}})

let todoOpen = false;
document.getElementById('todolistIcon').addEventListener('click',function(){
  todoOpen = !todoOpen;
  
  if (todoOpen){
    document.getElementById('todobox').style.transform = "translateX(0%)"
  }
  else{
      document.getElementById('todobox').style.transform = "translateX(120%)"
  }
})

document.getElementById('todoClose').addEventListener('click',function(){
  document.getElementById('todobox').style.transform = "translateX(120%)"
  todoOpen = false;
})

// analyzing
let isAnalyze = false;
document.getElementById("analyzeIcon").addEventListener('click', function(){
    isAnalyze = !isAnalyze;
    document.getElementById('analyzeBox').style.transform = 'translateY(0%)';
    document.getElementById('analyzeBox').style.opacity = 1;
    document.getElementById('br').style.display = "block";

    // Reset and recreate chart with animation
    const canvas = document.getElementById('myChart');
    if (canvas) {
        // Destroy existing chart if it exists
        if (window.Mychart) {
            window.Mychart.destroy();
        }
        // Force a fresh canvas
        const newCanvas = canvas.cloneNode(true);
        canvas.parentNode.replaceChild(newCanvas, canvas);
        
        // Small delay to ensure DOM updates
        setTimeout(() => {
            chart();
        }, 50);
    }
});

document.getElementById('izz').addEventListener('click',function(){
  isAnalyze = false
  document.getElementById('analyzeBox').style.transform = 'translateY(-120%)'
  document.getElementById('analyzeBox').style.opacity = 0
  document.getElementById('br').style.display = "none"
})

if (localStorage.getItem('notes') === null){
  localStorage.setItem('notes', JSON.stringify({}))
  console.log("test")
}

// popup
document.getElementById('chatbarClose').addEventListener('click',function(){
  document.getElementById('chatbar').style.transform = "translateX(-120%)"
  setTimeout(() => {
    document.getElementById('chatbar').style.height = '145px'
    document.getElementById('focss').style.display = 'none'
    document.getElementById('donebtn').style.display = 'none'
    document.getElementById('focss').value = ""
    document.getElementById('writefocus').style.display = 'block'
    document.getElementById('grr').style.display = 'none'
  }, 700);
})

document.getElementById('writefocus').addEventListener('click',function(){
  document.getElementById('chatbar').style.height = '240px'
  document.getElementById('focss').style.display = 'block'
  document.getElementById('donebtn').style.display = 'block'
  document.getElementById('grr').style.display = 'block'
  this.style.display = 'none'
  document.getElementById('focss').focus()
})

document.getElementById('donebtn').addEventListener('click', async function(){
  document.getElementById('chatbar').style.transform = "translateX(-120%)"
  let localNote = JSON.parse(localStorage.getItem('notes'))
  if (!localNote[today]) localNote[today] = [];
  localNote[today].push({
    'time': new Date().toLocaleTimeString('en-GB', { hour12: false }), 
    'text':document.getElementById('focss').value,
    'dayFocus': Math.round(studies[today] / 12) / 5
  })

  localStorage.setItem('notes',JSON.stringify(localNote))

  setTimeout(() => {
    document.getElementById('chatbar').style.height = '145px'
    document.getElementById('focss').style.display = 'none'
    document.getElementById('donebtn').style.display = 'none'
    document.getElementById('focss').value = ""
    document.getElementById('writefocus').style.display = 'block'
    document.getElementById('grr').style.display = 'none'
  }, 700);
})


function clockUpdater(){
  if (isTimer){
  document.title = "🌆 Yoojun Clock"
  clock.innerHTML = formatTime(timeRemain)
  subclock.innerHTML = `${formatTime(setTime)} focus | ${formatTime(setbreakTime)} break`
  document.getElementById('timerUI').style.display = 'block'
  document.getElementById('timerButton').style.display = 'block'
  document.getElementById('resetButton').style.display = 'block'

  }
  else{
    document.getElementById('timerUI').style.display = 'none'
    document.getElementById('timerButton').style.display = 'none'
    document.getElementById('resetButton').style.display = 'none'
    if (isTimerRunning){
      timeRemain = setTime
      clock.innerHTML = formatTime(setTime)
      document.getElementById("resetButton").style.visibility = 'hidden'
      document.getElementById("timerButtonText").innerHTML = 'Start'
      subclock.innerHTML = `${formatTime(setTime)} focus | ${formatTime(setbreakTime)} break`
      document.title = "🌆 Yoojun Clock"
      isTimerRunning = false
      isTimerStarted = false
      isFocus = true
    } 
  }

  if (!isTimer){
      const now = new Date()
      const monthName = now.toLocaleString("en-US", { month: "long" });

      let hour = now.getHours()
      if (hour > 12){
        hour = hour - 12
      }
      if (hour === 0){
        hour = 12
      }
      clock.innerText = hour.toString().padStart(2, "0") + ":"
      + now.getMinutes().toString().padStart(2, "0")
      subclock.innerText = `${now.getFullYear()}, ${monthName} ${now.getDate()}th`
}
}
// tab bar system
let isambient = false
document.getElementById('tabShower').style.marginLeft = isambient ? "2px":"73px"
if (!isambient) isTimer = true
clockUpdater()

function fromFocusToAmbient(){
  isambient = true;
  isTimer = false;
  document.getElementById('tabShower').style.marginLeft = "2px";
  clockUpdater();
}

function applyTabChange(){
  loadWallpaper(isambient)
  const ONLY_AMBIENT = ['weatherWidget', 'clockWidget', 'widgetIcon']
  const ONLY_FOCUS = ['goalIcon', 'analyzeIcon', 'soundBox']

  if (isambient){
    for (let p of ONLY_AMBIENT){
      document.getElementById(p).style.display = 'block'
    }
    for (let p of ONLY_FOCUS){
      document.getElementById(p).style.display = 'none'
    }
  }
  else{
    for (let p of ONLY_AMBIENT){
      document.getElementById(p).style.display = 'none'
    }
    for (let p of ONLY_FOCUS){
      document.getElementById(p).style.display = 'block'
    }
  }
}

function makeDraggable(targets, opts = {}) {
  const storageKey = opts.storageKey || 'draggable_positions';
  const gap = +opts.defaultGap || 16;

  let els;
  if (typeof targets === 'string') els = Array.from(document.querySelectorAll(targets));
  else if (NodeList.prototype.isPrototypeOf(targets) || Array.isArray(targets)) els = Array.from(targets);
  else if (targets instanceof Element) els = [targets];
  else throw new Error('makeDraggable: invalid targets');

  els.forEach((el, i) => {
    if (!el.id) el.dataset._dragId = 'drag-' + (Date.now().toString(36) + '-' + i);
  });

  function loadMap() {
    try {
      return JSON.parse(localStorage.getItem(storageKey) || '{}');
    } catch (e) {
      return {};
    }
  }
  function saveMap(m) {
    try { localStorage.setItem(storageKey, JSON.stringify(m)); } catch (e) { /* ignore */ }
  }

  function getContainer(el) {
    // prefer offsetParent (positioned ancestor) else documentElement
    const p = el.offsetParent;
    return (p && p instanceof HTMLElement) ? p : document.documentElement;
  }

  function clamp(n, a, b) { return Math.max(a, Math.min(b, n)); }

  function setStyleLeftTop(el, leftPx, topPx) {
    el.style.left = Math.round(leftPx) + 'px';
    el.style.top  = Math.round(topPx) + 'px';
  }

  function loadAll() {
    const map = loadMap();
    els.forEach((el, i) => {
      const key = el.id || el.dataset._dragId;
      const saved = map[key];

      const container = getContainer(el);
      const cW = container.clientWidth;
      const cH = container.clientHeight;
      const availW = Math.max(1, cW - el.offsetWidth);  // denominator for relative calculation
      const availH = Math.max(1, cH - el.offsetHeight);

      if (saved) {
        // back-compat: convert saved.x/y -> rx/ry if needed
        if ((typeof saved.x === 'number' && typeof saved.y === 'number') && (typeof saved.rx !== 'number' || typeof saved.ry !== 'number')) {
          saved.rx = saved.x / availW;
          saved.ry = saved.y / availH;
          // clamp and persist conversion
          saved.rx = clamp(saved.rx, 0, 1);
          saved.ry = clamp(saved.ry, 0, 1);
          map[key] = saved;
          saveMap(map);
        }

        if (typeof saved.rx === 'number' && typeof saved.ry === 'number') {
          const left = saved.rx * availW;
          const top  = saved.ry * availH;
          setStyleLeftTop(el, left, top);
        } else if (typeof saved.x === 'number' && typeof saved.y === 'number') {
          // last fallback: use raw px
          setStyleLeftTop(el, clamp(saved.x, 0, availW), clamp(saved.y, 0, availH));
        } else {
          // no usable saved pos -> fallback to default below
          if (!el.style.left) el.style.left = (gap + i * (el.offsetWidth + gap)) + 'px';
          if (!el.style.top)  el.style.top  = gap + 'px';
        }
      } else {
        // no saved pos -> place by default and store as relative
        const leftPx = gap + i * (el.offsetWidth + gap);
        const topPx  = gap;
        const rx = clamp(leftPx / availW, 0, 1);
        const ry = clamp(topPx  / availH, 0, 1);
        setStyleLeftTop(el, rx * availW, ry * availH);
        map[key] = { rx, ry };
        saveMap(map);
      }
    });
  }

  function saveAll() {
    const map = loadMap();
    els.forEach(el => {
      const key = el.id || el.dataset._dragId;
      const container = getContainer(el);
      const cW = container.clientWidth;
      const cH = container.clientHeight;
      const availW = Math.max(1, cW - el.offsetWidth);
      const availH = Math.max(1, cH - el.offsetHeight);

      const rx = clamp(el.offsetLeft / availW, 0, 1);
      const ry = clamp(el.offsetTop  / availH, 0, 1);
      map[key] = { rx, ry };
    });
    saveMap(map);
  }

  function resetAll() {
    try { localStorage.removeItem(storageKey); } catch (_) {}
    loadAll();
    saveAll();
  }

  els.forEach(el => {
    const pos = getComputedStyle(el).position;
    if (pos === 'static') el.style.position = 'absolute';
    if (!el.style.touchAction) el.style.touchAction = 'none';

    let hasMoved = false; // Track if element was dragged

    el.addEventListener('pointerdown', function onDown(e) {
      if (e.button && e.button !== 0) return;

      // ADDED: if the pointerdown happened on an interactive child, don't start a drag.
      // This prevents buttons/inputs/links inside the widget from being ignored.
      const interactiveSelector = 'button, a, input, textarea, select, label, option, [data-no-drag]';
      const interactiveAncestor = e.target && e.target.closest ? e.target.closest(interactiveSelector) : null;
      // If a drag handle is specified via data-drag-handle, only start drag when down is on that handle.
      const handleSelector = el.getAttribute('data-drag-handle');
      if (handleSelector) {
        const handleElem = e.target && e.target.closest ? e.target.closest(handleSelector) : null;
        if (!handleElem) return; // not on handle -> don't start dragging
      } else {
        // If user clicked an interactive control inside the element, bail out.
        if (interactiveAncestor && interactiveAncestor !== el) return;
      }
      // END ADDED

      el.setPointerCapture?.(e.pointerId);
      const startX = e.clientX, startY = e.clientY;
      const startLeft = el.offsetLeft, startTop = el.offsetTop;
      hasMoved = false;

      function onMove(ev) {
        if (!hasMoved && (Math.abs(ev.clientX - startX) > 3 || Math.abs(ev.clientY - startY) > 3)) {
          hasMoved = true;
        }
        const nx = startLeft + (ev.clientX - startX);
        const ny = startTop  + (ev.clientY - startY);

        // clamp to container bounds while moving
        const container = getContainer(el);
        const availW = Math.max(0, container.clientWidth - el.offsetWidth);
        const availH = Math.max(0, container.clientHeight - el.offsetHeight);
        const clx = clamp(nx, 0, availW);
        const cly = clamp(ny, 0, availH);

        el.style.left = Math.round(clx) + 'px';
        el.style.top  = Math.round(cly) + 'px';
      }

      function onUp(ev) {
        try { el.releasePointerCapture?.(e.pointerId); } catch (_) {}
        document.removeEventListener('pointermove', onMove);
        document.removeEventListener('pointerup', onUp);

        // Only save position if element was actually dragged
        if (hasMoved) {
          const map = loadMap();
          const key = el.id || el.dataset._dragId;
          const container = getContainer(el);
          const availW = Math.max(1, container.clientWidth - el.offsetWidth);
          const availH = Math.max(1, container.clientHeight - el.offsetHeight);
          map[key] = { rx: clamp(el.offsetLeft / availW, 0, 1), ry: clamp(el.offsetTop / availH, 0, 1) };
          saveMap(map);

          // Prevent click event if moved
          ev.preventDefault();
          ev.stopPropagation();
        }
      }

      document.addEventListener('pointermove', onMove);
      document.addEventListener('pointerup', onUp);
    });

    // Prevent click if dragged
    el.addEventListener('click', e => {
      if (hasMoved) {
        e.preventDefault();
        e.stopPropagation();
        hasMoved = false;
      }
    }, true);
  });

  // reposition on resize (debounced)
  let resizeTimer = null;
  function onResize() {
    if (resizeTimer) clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      loadAll();
      resizeTimer = null;
    }, 80);
  }
  window.addEventListener('resize', onResize);

  loadAll();
  window.addEventListener('beforeunload', saveAll);
  return { saveAll, loadAll, resetAll };
}

// drag logic
const api = makeDraggable('.widget', { storageKey: 'widgetPos' });

// WIDGET

// stopwatch widget
let widgetTimeLoop;
let isWidgetClockRunning = false;

document.getElementById('clockWidgetbutton').addEventListener('click',() => {
  document.getElementById('timerWidgetDisplay').innerText = formatTime(0)
  isWidgetClockRunning = !isWidgetClockRunning
  if (isWidgetClockRunning){
    document.getElementById('timerWidgetButtonText').innerHTML = "stop"
  }
  else{
    let widgetTimer = 0
    document.getElementById('timerWidgetButtonText').innerHTML = "start"
    clearInterval(widgetTimeLoop)
    return
  }

  let widgetTimer = 0
  if (widgetTimeLoop){
    clearInterval(widgetTimeLoop)
  }
  widgetTimeLoop = setInterval(() => {
    widgetTimer = widgetTimer + 1
    document.getElementById('timerWidgetDisplay').innerText = formatTime(widgetTimer)
  }, 1000);
})
document.getElementById('hitbox-ambient').addEventListener('click',async function(){
  if (!isTimerRunning){
    fromFocusToAmbient()
    applyTabChange()
  }
  else{
    if (await Messagebox("timer will be reset", "progress of this timer  session will be reset if you go to ambient. are you sure?")){
      fromFocusToAmbient()
      applyTabChange()
    }
  }
})

document.getElementById('hitbox-focus').addEventListener('click', function(){
  isambient = false;
  isTimer = true;
  document.getElementById('tabShower').style.marginLeft = "73px";
  clockUpdater();
  applyTabChange()

});
// chatbar system
document.addEventListener('keydown', function(event){
  if (event.key == 'p'){
      document.getElementById('chatbar').style.transform = "translateX(0%)"
  }

})


// record
let localstudy = 0
let today = ""

if (localStorage.getItem('studies') === null) localStorage.setItem('studies', JSON.stringify({}));
let studies = JSON.parse(localStorage.getItem('studies'))

function dayUpdate(){
  // updating date
  let date = new Date();
  today = date.toLocaleDateString('en-US', {month: 'short', day: 'numeric'});

  // updating study info
  if (!(today in studies)) studies[today] = 0
  studies[today] = studies[today] + localstudy
  localstudy = 0
  if (isTimerRunning) localStorage.setItem('studies', JSON.stringify(studies))
}

setInterval(dayUpdate, 10000) // updates every 10 sec
dayUpdate();

document.addEventListener('input', function() {
  localStorage.setItem('todos', JSON.stringify(testList));
  if (testList.length > 0) document.getElementById('todo').innerText = testList[0][0]
  else document.getElementById('todo').innerText = ""
});
document.addEventListener('change', function() {
  localStorage.setItem('todos', JSON.stringify(testList));
  if (testList.length > 0) document.getElementById('todo').innerText = testList[0][0]
  else document.getElementById('todo').innerText = ""
});
document.addEventListener('click', function() {
  
  // incool habit but sometimes complier needs to shut the fuck up
  try{
    localStorage.setItem('todos', JSON.stringify(testList));
    if (testList.length > 0) document.getElementById('todo').innerText = testList[0][0]
    else document.getElementById('todo').innerText = ""
  }
  catch{
  }
});

if (localStorage.getItem('todos') === null) localStorage.setItem('todos',JSON.stringify([]))
let testList = JSON.parse(localStorage.getItem('todos'))
const todobox = document.getElementById('todobox')

document.getElementById('resetTodo').onclick = function(){
  testList = []
  applyTodos()
}
function applyTodos(addNew = false, focusIndex = null) {
  let index = 0;
  const todoElem = document.getElementById('todo');
  const todobox = document.getElementById('todobox');
  if (!todobox) {
    console.warn('applyTodos: todobox element not found (id="todobox")');
    return;
  }

  if (testList.length > 0 && todoElem) {
    const first = testList[0];
    todoElem.innerText = (first && first[0] != null) ? first[0] : "";
  } else if (todoElem) {
    todoElem.innerText = "";
  }

  // remove only todoItem nodes inside todobox (safe: doesn't touch buttons)
  for (let q of Array.from(todobox.getElementsByClassName('todoItem'))) {
    q.remove();
  }
  ['kz', 'someSpace', 'kzd', 'someSpacy'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.remove();
  });

  // Prepare to collect todo items before rendering labels
  let todoItemsToRender = [];

  for (let i of testList) {
    if (i == null) { index++; continue }

    let todoItem = document.createElement('div');
    todoItem.className = "todoItem glass";
    if (index === 0){
      todoItem.style.marginBottom = "50px"
      todoItem.style.backgroundColor = "rgba(159, 235, 245, 0.06)"
    }

    let todoInput = document.createElement('input');
    todoInput.value = i[0] ?? "";
    todoInput.className = "todonames";
    if (i[1]) {
      todoInput.style.textDecoration = "line-through";
      todoInput.style.fontStyle = "italic";
      todoInput.style.opacity = 0.5;
    } else {
      // ensure normal style for active items
      todoInput.style.textDecoration = "";
      todoInput.style.fontStyle = "";
      todoInput.style.opacity = "";
    }

    const indexCapture = index;
    todoInput.addEventListener('blur', function () {
      if (testList[indexCapture]) testList[indexCapture][0] = todoInput.value;
      applyTodos();
    });

    todoInput.addEventListener('keydown', function (event) {
      if (event.key === "Enter") this.blur();
    });

    let doneIcon = document.createElement('i');
    doneIcon.className = "iconEffect fa-solid fa-trash fa-lg";
    doneIcon.style.cssText = "position: fixed; margin-top: 20px; margin-left: 85px; transform: scale(0.9);";

    let binIcon = document.createElement('i');
    binIcon.className = "iconEffect fa-solid fa-check fa-xl";
    binIcon.style.marginLeft = "50px";

    let upIcon = document.createElement('i');
    upIcon.className = "iconEffect fa-solid fa-arrow-up fa-xl";
    upIcon.style.position = 'fixed';
    upIcon.style.marginTop = "23px";
    upIcon.style.marginLeft = "18px";
    upIcon.style.transform = "scale(0.9)";

    upIcon.addEventListener('click', function () {
      const items = Array.from(todobox.getElementsByClassName('todoItem'));
      const itemIndex = items.indexOf(todoItem);
      if (itemIndex > 0) {
        testList.splice(itemIndex - 1, 0, testList.splice(itemIndex, 1)[0]);
        applyTodos();
      }
    });

    doneIcon.addEventListener('click', function () {
      const items = Array.from(todobox.getElementsByClassName('todoItem'));
      const itemIndex = items.indexOf(todoItem);
      if (itemIndex === -1) return;
      testList.splice(itemIndex, 1);
      applyTodos();
    });

    const lk = indexCapture;
    binIcon.addEventListener('click', function () {
      if (testList[lk]) {
        testList[lk][1] = true;
        // move completed to the end
        testList.push(testList.splice(lk, 1)[0]);
      }
      applyTodos();
    });

    todoItem.appendChild(todoInput);
    todoItem.appendChild(doneIcon);
    todoItem.appendChild(upIcon);
    if (!i[1]) todoItem.appendChild(binIcon);

    // if requested to focus a newly-created item, focus it here
    if (addNew) {
      const target = (focusIndex != null) ? focusIndex : (testList.length - 1);
      if (index === target) {
        todoInput.placeholder = "something to do..";
        setTimeout(() => todoInput.focus(), 0);
      }
    }

    todoItemsToRender.push({todoItem, index});
    index++;
  }

  // Now render labels and todo items in correct order
  if (testList.length > 0) {
    // Add "current task" label and spacing before first item
    let kz = document.createElement('h3');
    kz.style = "position: fixed; margin-top: -5px; margin-left: 16px; text-shadow: 1px 1px 5px rgba(255, 255, 255, 0.3);";
    kz.innerHTML = "🟢 current task";
    kz.id = "kz";

    let someSpace = document.createElement('div');
    someSpace.style.height = "30px";
    someSpace.id = "someSpace";
    todobox.appendChild(kz);
    todobox.appendChild(someSpace);
  }

  for (let {todoItem, index} of todoItemsToRender) {
    // Add "upcoming task" label and spacing before second item
    if (testList.length > 1 && index === 1) {
      let kzd = document.createElement('h3');
      let sommeeSpace = document.createElement('div');
      sommeeSpace.style.height = "20px";
      sommeeSpace.id = 'someSpacy';
      kzd.style = "position: fixed; margin-top: -35px; margin-left: 16px; text-shadow: 1px 1px 5px rgba(255, 255, 255, 0.3);";
      kzd.innerHTML = "📖 tasks";
      kzd.id = "kzd";

      todobox.appendChild(sommeeSpace);
      todobox.appendChild(kzd);
    }
    todobox.appendChild(todoItem);
  }
}


// keep your existing applyTodos() call (works with new signature)
applyTodos();


// --- REPLACE only the addBtn click handler with this ---
// (leave your existing mousedown/focus tracking code as-is)
const addBtn = document.getElementById('Addnewbutton');

if (addBtn) {
  addBtn.setAttribute('tabindex', '-1');
  addBtn.addEventListener('mousedown', function (e) {
    e.preventDefault();
  });

  addBtn.addEventListener('click', function () {
    const tag = document.activeElement && document.activeElement.tagName ? document.activeElement.tagName.toUpperCase() : '';
    if (tag !== 'INPUT' && tag !== 'TEXTAREA') {
      // Insert new active todo BEFORE the first completed item
      const firstDoneIndex = testList.findIndex(item => item && item[1] === true);
      const insertAt = (firstDoneIndex === -1) ? testList.length : firstDoneIndex;
      testList.splice(insertAt, 0, ['', false]);
      // re-render and focus the newly-inserted index
      applyTodos(true, insertAt);
    }
  });
} else {
  console.warn('Addnewbutton element not found (id="Addnewbutton")');
}

// WEATHER
async function getCurrentTemperatureWithWeatherAPI({apiKey, timeout = 10000} = {}) {
  if (!apiKey) {
    throw new Error('API key is required for WeatherAPI.com.');
  }
  if (!('geolocation' in navigator)) {
    throw new Error('Geolocation not supported by this browser.');
  }

  const coords = await new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      pos => resolve(pos.coords),
      err => reject(new Error('Geolocation failed or permission denied: ' + err.message)),
      { timeout }
    );
  });

  const lat = coords.latitude;
  const lon = coords.longitude;

  const url = `https://api.weatherapi.com/v1/current.json?key=${apiKey}&q=${lat},${lon}`;

  const resp = await fetch(url, { method: 'GET' });
  if (!resp.ok) {
    console.warn(`Weather API error: ${resp.status} ${resp.statusText}`);
    return null;
  }
  
  const data = await resp.json();

  if (data?.current && data?.location) {
    // Map weather conditions to simplified categories
    let condition = data.current.condition.text.toLowerCase();
    let simplifiedCondition = "clear";
    
    if (condition.includes("thunder") || condition.includes("lightning")) {
      simplifiedCondition = "thunder-rain";
    } else if (condition.includes("rain") || condition.includes("drizzle") || condition.includes("sleet")) {
      simplifiedCondition = "rainy";
    } else if (condition.includes("cloud") || condition.includes("overcast") || condition.includes("fog") || condition.includes("mist")) {
      simplifiedCondition = "cloudy";
    }

    return {
      location: `${data.location.country}, ${data.location.name}`,
      temperature: data.current.temp_c,
      condition: simplifiedCondition,
      humidity: data.current.humidity
    };
  }

  console.warn('Could not parse weather data from API response');
  return null;
}
// Example usage (handle errors and null result)
function refreshWeather(){
  document.getElementById('weatherLocInfo').innerText = "Loading Weather.."
  document.getElementById('weatherInfo').innerHTML = ""
  document.getElementById('weatherIcon').className = ""

  getCurrentTemperatureWithWeatherAPI({ apiKey: '322a13be2b3d4704a6861332242710', units: 'C' })
    .then(info => {
      const icony = document.getElementById('weatherIcon')
      if (info) {
        console.log(info);
        document.getElementById('weatherInfo').innerHTML = `${Math.round(info.temperature)}<span style="font-size: 15px; font-weight: 300; position: fixed; margin-top: 5px;">℃</span></p>`
        document.getElementById('weatherLocInfo').innerText = info.location
        if (info.condition === "cloudy"){
          icony.className = "fa-solid fa-cloud fa-xl"
          icony.style.color = '#d0d9dbff'
        }

        else if (info.condition === "clear"){
          icony.className = "fa-solid fa-sun fa-xl"
          icony.style.marginLeft = "13px"
          icony.style.color = '#ebf3beff'
        }

        else if (info.condition === "rainy"){
          icony.className = "fa-solid fa-cloud-rain fa-xl"
          icony.style.marginLeft = "13px"
          icony.style.color = '#bee2ecff'
        }
        
        else if (info.condition === "thunder-rain"){
          icony.className = "fa-solid fa-cloud-bolt fa-xl"
          icony.style.marginLeft = "13px"
          icony.style.color = '#f1ffc0ff'
        }
      } 
      else {
        console.warn('Weather info not available (check API key or permissions).');
      }
    })
    .catch(err => {
      console.error('Weather fetch failed:', err);
  });
}
// refreshWeather()
// document.getElementById('weatherWidget').addEventListener('click', refreshWeather)



function updateGoalProgress(){
  let currentStudyTime = 1 // studies[today] / 60
  let goalTimeToday = Number(document.getElementById('goalHour').value) * 60 + Number(document.getElementById('goalMinute').value)
  if (goalTimeToday === 0){
    goalTimeToday = 1
  }
  if (!goalbar){
    document.getElementById('Goalprogress').innerHTML = `${Math.round((currentStudyTime / goalTimeToday * 1000))/10}%`
    document.getElementById('big-progressBar-charged').style.width = `${Math.min(currentStudyTime / goalTimeToday * 280, 280)}px`
  }

  document.getElementById('gText').innerHTML = `Today's Goal (${Math.round((currentStudyTime / goalTimeToday * 1000))/10}%)`
  document.getElementById('progressBar-charged').style.width = `${Math.min(currentStudyTime / goalTimeToday * 110, 110)}px`
}
setInterval(updateGoalProgress, 2000);

let data;
// check at first Ig!!
window.addEventListener("DOMContentLoaded", async () => {
  try {
    db = await openDatabase();
    fetchSongInfo(songListening, false, false, true);


    await loadWallpaper(isambient);
    
    // Then set brightness and other settings
    document.getElementById("brsetText").value = document.getElementById("brsetSlider").value;
    document.getElementById('wallPaper').style.filter = `brightness(${document.getElementById("brsetText").value / 100})`;
    document.getElementById('wallPaperVideo').style.filter = `brightness(${document.getElementById("brsetText").value / 100})`;

    // Apply visibility settings for music elements
    if (document.getElementById("alsomusic").checked) {
      for (let r of document.getElementsByClassName('pbb')) {
        r.style.visibility = 'hidden';
      }
    } else {
      for (let r of document.getElementsByClassName('pbb')) {
        r.style.visibility = 'visible';
      }
    }

    // Apply initial tab UI
    applyTabChange();
    clockUpdater();

  } catch (err) {
    console.error("Failed to initialize:", err);
  }
});