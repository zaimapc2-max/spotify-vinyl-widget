const { app, BrowserWindow, shell, ipcMain } = require("electron");
const path = require("path");

let accessToken = null;

const {
    generateCodeVerifier,
    generateCodeChallenge,
    getAuthURL,
    startCallbackServer,
    exchangeCodeForToken
} = require("./auth/spotify-auth");

let mainWindow;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 380,
        height: 380,
        frame: false,
        transparent: true,
        alwaysOnTop: true,
        resizable: false,
        webPreferences: { preload: path.join(__dirname, "preload.js") }
    });
    mainWindow.loadFile(path.join(__dirname, "index.html"));
}

app.whenReady().then(() => {
    createWindow();

    const verifier = generateCodeVerifier();
    const challenge = generateCodeChallenge(verifier);
    const authUrl = getAuthURL(challenge);

    startCallbackServer(async (code) => {
        const tokenData = await exchangeCodeForToken(code, verifier);
        accessToken = tokenData.access_token;
        setInterval(getCurrentTrack, 2000);
    });

    shell.openExternal(authUrl);
});

async function getCurrentTrack() {
    const response = await fetch("https://api.spotify.com/v1/me/player/currently-playing", {
        headers: { "Authorization": `Bearer ${accessToken}` }
    });

    if (response.status === 204) return;
    if (!response.ok) {
        const text = await response.text();
        console.log("Error from Spotify:", response.status, text);
        return;
    }

    const data = await response.json();
    const track = {
        name: data.item.name,
        artist: data.item.artists[0].name,
        albumArt: data.item.album.images[0].url,
        isPlaying: data.is_playing
    };
    mainWindow.webContents.send("track-update", track);
}

async function controlPlayback(action) {
    const endpoints = {
        play: { url: "https://api.spotify.com/v1/me/player/play", method: "PUT" },
        pause: { url: "https://api.spotify.com/v1/me/player/pause", method: "PUT" },
        next: { url: "https://api.spotify.com/v1/me/player/next", method: "POST" },
        prev: { url: "https://api.spotify.com/v1/me/player/previous", method: "POST" }
    };

    const { url, method } = endpoints[action];
    const response = await fetch(url, {
        method,
        headers: { "Authorization": `Bearer ${accessToken}` }
    });

    if (!response.ok && response.status !== 204) {
        const text = await response.text();
        console.log("Control error:", response.status, text);
    }
}

ipcMain.on("spotify-control", (event, action) => {
    controlPlayback(action);
});