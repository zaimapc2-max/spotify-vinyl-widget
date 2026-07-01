const http = require("http");
const url = require("url");
const crypto = require("crypto");
const path = require("path");
const fs = require("fs");
const os = require("os");

const CLIENT_ID = "26dbb57facc54ea99adcc904362982eb";
const REDIRECT_URI = "http://127.0.0.1:8888/callback";
const TOKEN_PATH = path.join(os.homedir(), ".spotify-vinyl-token.json");

function generateCodeVerifier() {
    return crypto.randomBytes(64).toString("hex");
}

function generateCodeChallenge(verifier) {
    return crypto
        .createHash("sha256")
        .update(verifier)
        .digest("base64")
        .replace(/=/g, "")
        .replace(/\+/g, "-")
        .replace(/\//g, "_");
}

function getAuthURL(codeChallenge) {
    return `https://accounts.spotify.com/authorize?client_id=${CLIENT_ID}&response_type=code&redirect_uri=${REDIRECT_URI}&code_challenge_method=S256&code_challenge=${codeChallenge}&scope=user-read-currently-playing%20user-read-playback-state%20user-modify-playback-state`;
}

function startCallbackServer(onCode) {
    const server = http.createServer((req, res) => {
        const parsedUrl = url.parse(req.url, true);
        if (parsedUrl.pathname === "/callback") {
            const code = parsedUrl.query.code;
            res.end("Login successful! You can close this tab.");
            server.close();
            onCode(code);
        }
    });
    server.listen(8888);
}

async function exchangeCodeForToken(code, verifier) {
    const response = await fetch("https://accounts.spotify.com/api/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
            grant_type: "authorization_code",
            code: code,
            redirect_uri: REDIRECT_URI,
            client_id: CLIENT_ID,
            code_verifier: verifier
        })
    });
    return await response.json();
}

function saveTokens(accessToken, refreshToken) {
    fs.writeFileSync(TOKEN_PATH, JSON.stringify({
        accessToken,
        refreshToken,
        savedAt: Date.now()
    }));
}

function loadTokens() {
    try {
        if (fs.existsSync(TOKEN_PATH)) {
            return JSON.parse(fs.readFileSync(TOKEN_PATH, "utf8"));
        }
    } catch (e) {
        return null;
    }
    return null;
}

async function refreshAccessToken(refreshToken) {
    const response = await fetch("https://accounts.spotify.com/api/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
            grant_type: "refresh_token",
            refresh_token: refreshToken,
            client_id: CLIENT_ID
        })
    });
    return await response.json();
}

module.exports = {
    generateCodeVerifier,
    generateCodeChallenge,
    getAuthURL,
    startCallbackServer,
    exchangeCodeForToken,
    saveTokens,
    loadTokens,
    refreshAccessToken
};