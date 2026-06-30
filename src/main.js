const { app, BrowserWindow } = require("electron");
const path = require("path");

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

app.whenReady().then(createWindow);