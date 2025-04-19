const gridElement = document.getElementById("grid");
const lineLayer = document.getElementById("line-layer");
const foundWordsDisplay = document.getElementById("progress");
const wordPreview = document.getElementById("current-word");

const gridLetters = "DOROOFABTLURNOVEIPKEUGNYSOIKHTBLELSTBLWVTKAYTETA";
const numRows = 8;
const numCols = 6;

const themeWords = ["TWELVE", "SEVENTY", "FOUR", "PILOT", "KNOB", "KATTSKILL", "BAY", "ROAD"];
const spangram = "BOUGHT";

let isMouseDown = false;
let selectedTiles = [];
let foundWords = [];
let spangramJustFound = false;

let isTouch = false; // Determines if the interaction is touch-based

function createGrid() {
    for (let i = 0; i < gridLetters.length; i++) {
        const tile = document.createElement("div");
        tile.classList.add("tile");
        tile.innerHTML = `<span class="letter">${gridLetters[i]}</span>`;
        tile.dataset.index = i;
        gridElement.appendChild(tile);

        // Mouse Events
        tile.addEventListener("mousedown", (e) => {
            if (isTouch) return;
            e.preventDefault();
            handleStart(tile);
        });

        tile.addEventListener("mouseenter", () => {
            if (isMouseDown && !isTouch) {
                handleEnter(tile);
            }
        });

        tile.addEventListener("mouseup", () => {
            if (!isTouch && isMouseDown) {
                handleEnd();
            }
        });
    }

    // Touch Events on the entire grid
    gridElement.addEventListener("touchstart", (e) => {
        isTouch = true;
        e.preventDefault();
        const tile = getTileFromTouch(e);
        if (tile) handleStart(tile);
    });

    gridElement.addEventListener("touchmove", (e) => {
        e.preventDefault();
        const tile = getTileFromTouch(e);
        if (tile) handleEnter(tile);
    });

    gridElement.addEventListener("touchend", () => {
        if (isMouseDown) handleEnd();
        setTimeout(() => (isTouch = false), 100); // reset after short delay
    });
}

function getTileFromTouch(e) {
    const touch = e.touches[0];
    const x = touch.clientX;
    const y = touch.clientY;
    const element = document.elementFromPoint(x, y);
    return element?.closest(".tile");
}

function handleStart(tile) {
    if (wordPreview.textContent === "Not in word list") {
        updatePreviewText();
    }

    if (spangramJustFound) {
        spangramJustFound = false;
    }

    clearPreview();
    isMouseDown = true;
    selectedTiles = [tile];
    tile.classList.add("preview");
    updatePreviewText();
    drawLinePath();
}

function handleEnter(tile) {
    const lastTile = selectedTiles[selectedTiles.length - 1];
    const secondLastTile = selectedTiles[selectedTiles.length - 2];

    if (tile === secondLastTile) {
        const removed = selectedTiles.pop();
        removed.classList.remove("preview");
        updatePreviewText();
        drawLinePath();
        return;
    }

    if (!selectedTiles.includes(tile) && isAdjacent(tile, lastTile)) {
        selectedTiles.push(tile);
        tile.classList.add("preview");
        updatePreviewText();
        drawLinePath();
    }
}

function handleEnd() {
    isMouseDown = false;
    submitSelection();
}

function updatePreviewText() {
    if (spangramJustFound || wordPreview.textContent === "Not in word list") return;
    const word = selectedTiles.map(tile => tile.textContent).join("").toUpperCase();
    wordPreview.textContent = word || "...";
    wordPreview.style.color = "#444";
}

function clearPreview() {
    selectedTiles.forEach(tile => tile.classList.remove("preview"));
    selectedTiles = [];
    clearLines();
}

function submitSelection() {
    const word = selectedTiles.map(tile => tile.textContent).join("").toUpperCase();

    if (foundWords.includes(word)) {
        clearPreview();
        updatePreviewText();
        return;
    }

    const tIndexes = [];
    for (let i = 0; i < gridLetters.length; i++) {
        if (gridLetters[i] === "T") tIndexes.push(i);
    }
    const requiredTIndex = tIndexes[tIndexes.length - 4];
    const lastTileIndex = parseInt(selectedTiles[selectedTiles.length - 1].dataset.index);

    if (word === spangram && lastTileIndex === requiredTIndex) {
        revealTilesSequentially("selected-spangram", true);
        foundWords.push(word);
        spangramJustFound = true;
        wordPreview.textContent = "SPANGRAM!";
        wordPreview.style.color = "rgb(248, 205, 3)";
        return;
    }

    if (themeWords.includes(word)) {
        revealTilesSequentially("selected-theme", false);
        foundWords.push(word);
        return;
    }

    wordPreview.textContent = word;
    wordPreview.style.color = "#444";

    setTimeout(() => {
        wordPreview.textContent = "Not in word list";
    }, 400);

    clearPreview();
}

function updateProgress() {
    const totalWords = themeWords.length + 1;
    foundWordsDisplay.innerHTML = `<strong>${foundWords.length}</strong> of <strong>${totalWords}</strong> theme words found.`;
    if (foundWords.length === totalWords) celebrate();
}

function celebrate() {
    confetti({
        particleCount: 200,
        spread: 70,
        origin: { y: 0.6 }
    });
}

function getTileCenter(tile) {
    const rect = tile.getBoundingClientRect();
    const containerRect = lineLayer.getBoundingClientRect();
    return {
        x: rect.left + rect.width / 2 - containerRect.left,
        y: rect.top + rect.height / 2 - containerRect.top
    };
}

function drawLinePath(temp = true, isSpangram = false, isCorrectWord = false) {
    if (selectedTiles.length < 2) {
        clearLines();
        return;
    }

    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("class", "line-path");

    if (isSpangram) path.classList.add("spangram");
    if (isCorrectWord) path.classList.add("correct");

    const points = selectedTiles.map(getTileCenter);
    let d = `M ${points[0].x} ${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
        d += ` L ${points[i].x} ${points[i].y}`;
    }

    path.setAttribute("d", d);

    if (temp) {
        clearLines();
        path.id = "temp-line";
        lineLayer.appendChild(path);
    } else {
        setTimeout(() => {
            const length = path.getTotalLength();
            path.style.strokeDasharray = length;
            path.style.strokeDashoffset = length;

            const duration = 0.1 * selectedTiles.length;
            path.style.transition = `stroke-dashoffset ${duration}s ease-out`;

            lineLayer.appendChild(path);
            void path.getBoundingClientRect();
            path.style.strokeDashoffset = 0;
        }, 100);
    }
}

function clearLines() {
    const temp = document.getElementById("temp-line");
    if (temp) temp.remove();
}

function isAdjacent(tileA, tileB) {
    const indexA = parseInt(tileA.dataset.index);
    const indexB = parseInt(tileB.dataset.index);
    const rowA = Math.floor(indexA / numCols), colA = indexA % numCols;
    const rowB = Math.floor(indexB / numCols), colB = indexB % numCols;
    return Math.abs(rowA - rowB) <= 1 && Math.abs(colA - colB) <= 1;
}

function revealTilesSequentially(className, isSpangram = false) {
    clearLines();
    let delay = 0;

    selectedTiles.forEach(tile => {
        tile.classList.remove("preview");
        setTimeout(() => {
            tile.classList.add("animating");
            setTimeout(() => {
                tile.classList.remove("animating");
                tile.classList.add(className);
            }, 150);
        }, delay);
        delay += 60;
    });

    setTimeout(() => {
        drawLinePath(false, isSpangram, !isSpangram);
        updateProgress();
    }, 100);
}

const script = document.createElement("script");
script.src = "https://cdn.jsdelivr.net/npm/canvas-confetti@1.6.0/dist/confetti.browser.min.js";
document.head.appendChild(script);

createGrid();
