const vinylRing = document.querySelector(".vinyl-ring");
const albumArt = document.querySelector(".album-art");
const discContainer = document.querySelector(".disc-container");
const playPauseBtn = document.querySelector(".btn-playpause");
const nextBtn = document.querySelector(".btn-next");
const prevBtn = document.querySelector(".btn-prev");

let currentFrame = 0;
let isPlaying = true;

function spinFrame() {
    if (isPlaying) {
        currentFrame = (currentFrame + 1) % 24;
        vinylRing.src = `../assets/frames/ring-${currentFrame}.png`;
    }
}

setInterval(spinFrame, 80);

playPauseBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    isPlaying = !isPlaying;
    playPauseBtn.textContent = isPlaying ? "⏸" : "▶";
    window.spotifyAPI.sendControl(isPlaying ? "play" : "pause");
});

nextBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    window.spotifyAPI.sendControl("next");
});

prevBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    window.spotifyAPI.sendControl("prev");
});

discContainer.addEventListener("click", () => {
    isPlaying = !isPlaying;
    playPauseBtn.textContent = isPlaying ? "⏸" : "▶";
    window.spotifyAPI.sendControl(isPlaying ? "play" : "pause");
});

playPauseBtn.textContent = isPlaying ? "⏸" : "▶";

const mockTrack = {
    name: "Test Song",
    artist: "Test Artist",
    albumArt: "https://picsum.photos/300"
};

function updateDisc(track) {
    albumArt.style.backgroundImage = `url(${track.albumArt})`;
    albumArt.style.backgroundSize = "cover";
    albumArt.style.backgroundPosition = "center";
    document.querySelector(".track-name").textContent = track.name;
    document.querySelector(".track-artist").textContent = track.artist;
}

updateDisc(mockTrack);

window.spotifyAPI.onTrackUpdate((track) => {
    updateDisc(track);
    isPlaying = track.isPlaying;
    playPauseBtn.textContent = isPlaying ? "⏸" : "▶";
});