const { app, BrowserWindow, shell, ipcMain, Tray, Menu } = require("electron");
const path = require("path");

let accessToken = null;

const {
    generateCodeVerifier,
    generateCodeChallenge,
    getAuthURL,
    startCallbackServer,
    exchangeCodeForToken,
    saveTokens,
    loadTokens,
    refreshAccessToken
} = require("./auth/spotify-auth");

let mainWindow;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 520,
    height: 320,
        frame: false,
        transparent: true,
        alwaysOnTop: true,
        resizable: false,
        webPreferences: { preload: path.join(__dirname, "preload.js") }
    });
    mainWindow.loadFile(path.join(__dirname, "index.html"));
}
let tray;

function createTray() {
    console.log("Creating tray...");
    tray = new Tray(path.join(__dirname, "../assets/tray-icon.png"));

    const contextMenu = Menu.buildFromTemplate([
        {
            label: "Show/Hide Widget",
            click: () => {
                if (mainWindow.isVisible()) {
                    mainWindow.hide();
                } else {
                    mainWindow.show();
                }
            }
        },
        { type: "separator" },
        {
            label: "Quit",
            click: () => app.quit()
        }
    ]);

    tray.setToolTip("Spotify Vinyl Widget");

    // On Windows, left click toggles, right click shows menu
    tray.on("click", () => {
        if (mainWindow.isVisible()) {
            mainWindow.hide();
        } else {
            mainWindow.show();
        }
    });

    tray.on("right-click", () => {
        tray.popUpContextMenu(contextMenu);
    });
}
app.whenReady().then(async () => {
    createWindow();
    createTray();

    const saved = loadTokens();

    if (saved) {
        console.log("Found saved tokens, refreshing...");
        const tokenData = await refreshAccessToken(saved.refreshToken);
        accessToken = tokenData.access_token;

        // Save updated tokens
        saveTokens(accessToken, saved.refreshToken);
        setInterval(getCurrentTrack, 2000);

        // Also refresh token every 50 minutes automatically
        setInterval(async () => {
            const refreshed = await refreshAccessToken(saved.refreshToken);
            accessToken = refreshed.access_token;
            console.log("Token auto-refreshed");
        }, 50 * 60 * 1000);

    } else {
        console.log("No saved tokens, starting OAuth...");
        const verifier = generateCodeVerifier();
        const challenge = generateCodeChallenge(verifier);
        const authUrl = getAuthURL(challenge);

        startCallbackServer(async (code) => {
            const tokenData = await exchangeCodeForToken(code, verifier);
            accessToken = tokenData.access_token;

            // Save tokens for next launch
            saveTokens(accessToken, tokenData.refresh_token);
            setInterval(getCurrentTrack, 2000);
        });

        shell.openExternal(authUrl);
    }
});

app.on("window-all-closed", (e) => {
    e.preventDefault();
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