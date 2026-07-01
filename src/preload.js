const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("spotifyAPI", {
    onTrackUpdate: (callback) => {
        ipcRenderer.on("track-update", (event, track) => callback(track));
    },
    sendControl: (action) => {
        ipcRenderer.send("spotify-control", action);
    }
});