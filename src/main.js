const { app, BrowserWindow, shell } = require("electron");
const path = require("path");

let accessToken = null;

const {
    generateCodeVerifier,
    generateCodeChallenge,
    getAuthURL,
    startCallbackServer,
    exchangeCodeForToken
} = require("./auth/spotify-auth");

function createWindow() {
    const window = new BrowserWindow({
        width: 320,
        height: 320,
        frame: false,
        transparent: true,
        alwaysOnTop: true,
        resizable: false
    });

    window.loadFile(path.join(__dirname, "index.html"));
}

app.whenReady().then(() => {
    createWindow();

    const verifier = generateCodeVerifier();
    const challenge = generateCodeChallenge(verifier);
    const authUrl = getAuthURL(challenge);

    startCallbackServer(async (code) => {
        console.log("Got code:", code);

        const tokenData = await exchangeCodeForToken(code, verifier);

        console.log(tokenData);
        accessToken = tokenData.access_token;
        setTimeout(getCurrentTrack, 2000);
    });

    shell.openExternal(authUrl);
});

async function getCurrentTrack() {
    const response = await fetch("https://api.spotify.com/v1/me/player/currently-playing", {
        headers: {
            "Authorization": `Bearer ${accessToken}`
        }
    });

    if (response.status === 204) {
        console.log("Nothing currently playing.");
        return;
    }

    if (!response.ok) {
        const text = await response.text();
        console.log("Error from Spotify:", response.status, text);
        return;
    }

    const data = await response.json();
    console.log("Current track data:", data);
}