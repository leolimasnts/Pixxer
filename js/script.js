const upload = document.getElementById("upload");
const uploadScreen = document.getElementById("uploadScreen");
const editor = document.getElementById("editor");
const canvas = document.getElementById("canvas");
const canvasContainer = document.getElementById("canvasContainer"); 
const colorList = document.getElementById("colorList"); // Nova lista lateral
const ctx = canvas.getContext("2d", { willReadFrequently: true });
const selectedColorLabel = document.getElementById("selectedColor");
const pixelCountLabel = document.getElementById("pixelCount");
const coordsLabel = document.getElementById("coords");
const resetButton = document.getElementById("resetButton");

let imgWidth = 0, imgHeight = 0;
let originalImageData = null, selectedColor = null;
let zoom = 12, MIN_ZOOM = 1, MAX_ZOOM = 64;

const filteredCanvas = document.createElement("canvas");
const filteredCtx = filteredCanvas.getContext("2d", { willReadFrequently: true });

let isDragging = false;
let startX, startY, startScrollLeft, startScrollTop;
let hasMoved = false; 

upload.onchange = loadImage;
canvas.onclick = canvasClick;
canvas.onmousemove = mouseMove;
canvas.onwheel = zoomCanvas;
resetButton.onclick = clearFilter;

canvas.onmousedown = startDrag;
canvas.onauxclick = middleClick; 
document.addEventListener("mousemove", drag);
document.addEventListener("mouseup", stopDrag);

function loadImage(e) {
    const f = e.target.files[0]; if (!f) return;
    const img = new Image();

    img.onload = () => {
        imgWidth = img.width;
        imgHeight = img.height;

        MAX_ZOOM = Math.max(MIN_ZOOM, Math.min(64, Math.floor(4096 / Math.max(imgWidth, imgHeight))));
        zoom = Math.min(12, MAX_ZOOM); 

        filteredCanvas.width = imgWidth;
        filteredCanvas.height = imgHeight;
        filteredCtx.drawImage(img, 0, 0);
        
        originalImageData = filteredCtx.getImageData(0, 0, imgWidth, imgHeight);

        buildSidebar(); // Gera a lista de cores!

        uploadScreen.style.display = "none"; 
        editor.style.display = "flex";

        clearFilter(); 
    };

    img.src = URL.createObjectURL(f);
}

// --- Nova Função: Extrai e constrói a lista na lateral ---
function buildSidebar() {
    const d = originalImageData.data;
    const colorMap = new Map();

    // 1. Escaneia todos os pixels para contar as cores
    for (let i = 0; i < d.length; i += 4) {
        const r = d[i], g = d[i + 1], b = d[i + 2], a = d[i + 3];
        if (a === 0) continue; // Ignora os pixels transparentes do fundo

        const key = `${r},${g},${b},${a}`;
        colorMap.set(key, (colorMap.get(key) || 0) + 1);
    }

    // 2. Converte para array e ordena (maior quantidade primeiro)
    const palette = [];
    colorMap.forEach((count, key) => {
        const [r, g, b, a] = key.split(',').map(Number);
        palette.push({ r, g, b, a, count, hex: rgbToHex(r, g, b) });
    });
    palette.sort((a, b) => b.count - a.count);

    // 3. Monta o HTML da lista
    colorList.innerHTML = "";
    palette.forEach(c => {
        const li = document.createElement("li");
        li.className = "color-item";
        li.id = `color-${c.r}-${c.g}-${c.b}-${c.a}`;
        
        li.innerHTML = `
            <div class="color-box" style="background: rgba(${c.r},${c.g},${c.b},${c.a/255})"></div>
            <div class="color-info">
                <span class="color-hex">${c.hex}</span>
                <span class="color-count">${c.count} pixels</span>
            </div>
        `;
        
        // Se clicar na lista, atualiza o canvas
        li.onclick = () => {
            if (selectedColor && same([c.r, c.g, c.b, c.a], selectedColor)) {
                clearFilter();
            } else {
                selectedColor = [c.r, c.g, c.b, c.a];
                updateCache();
            }
        };
        
        colorList.appendChild(li);
    });
}

// --- Nova Função: Destaca o item certo na barra lateral ---
function updateSidebarActive() {
    document.querySelectorAll(".color-item").forEach(li => li.classList.remove("active"));
    
    if (selectedColor) {
        const id = `color-${selectedColor[0]}-${selectedColor[1]}-${selectedColor[2]}-${selectedColor[3]}`;
        const activeLi = document.getElementById(id);
        if (activeLi) {
            activeLi.classList.add("active");
            activeLi.scrollIntoView({ behavior: "smooth", block: "nearest" }); // Rola a lista até a cor
        }
    }
}

function getPos(ev) {
    const r = canvas.getBoundingClientRect();
    const x = Math.floor((ev.clientX - r.left) / zoom);
    const y = Math.floor((ev.clientY - r.top) / zoom);
    return { x, y };
}

function mouseMove(e) {
    if (!originalImageData || isDragging) return; 

    const { x, y } = getPos(e);

    if (x < 0 || y < 0 || x >= imgWidth || y >= imgHeight) return;

    const i = (y * imgWidth + x) * 4, d = originalImageData.data;
    const R = d[i], G = d[i + 1], B = d[i + 2];

    coordsLabel.textContent = `(${x}, ${y}) ${rgbToHex(R, G, B)} rgb(${R},${G},${B})`;
}

function updateCache() {
    if (!originalImageData) return;

    const img1to1 = new ImageData(new Uint8ClampedArray(originalImageData.data), imgWidth, imgHeight);
    const d = img1to1.data;
    let count = 0;

    for (let i = 0; i < d.length; i += 4) {
        if (selectedColor) {
            if (d[i] == selectedColor[0] && d[i + 1] == selectedColor[1] && d[i + 2] == selectedColor[2] && d[i + 3] == selectedColor[3]) {
                count++;
            } else {
                let g = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
                g = g * 0.6 + 90; 
                d[i] = d[i + 1] = d[i + 2] = g;
            }
        }
    }

    filteredCtx.putImageData(img1to1, 0, 0); 

    if (selectedColor) {
        selectedColorLabel.textContent = rgbToHex(selectedColor[0], selectedColor[1], selectedColor[2]);
        pixelCountLabel.textContent = `Pixels: ${count}`;
    } else {
        selectedColorLabel.textContent = "None";
        pixelCountLabel.textContent = "Pixels: 0";
    }

    updateSidebarActive(); // Atualiza a barra lateral junto com o cache
    render();
}

function render() {
    if (!originalImageData) return;

    canvas.width = imgWidth * zoom;
    canvas.height = imgHeight * zoom;
    
    ctx.imageSmoothingEnabled = false;

    ctx.drawImage(filteredCanvas, 0, 0, canvas.width, canvas.height);

    if (selectedColor && zoom >= 3) {
        ctx.lineWidth = 1; 
        ctx.strokeStyle = "#00ffff"; 
        ctx.beginPath(); 

        const origData = originalImageData.data;
        const isMatch = (cx, cy) => {
            if (cx < 0 || cy < 0 || cx >= imgWidth || cy >= imgHeight) return false;
            const idx = (cy * imgWidth + cx) * 4;
            return origData[idx] === selectedColor[0] &&
                   origData[idx+1] === selectedColor[1] &&
                   origData[idx+2] === selectedColor[2] &&
                   origData[idx+3] === selectedColor[3];
        };

        for (let y = 0; y < imgHeight; y++) {
            for (let x = 0; x < imgWidth; x++) {
                if (isMatch(x, y)) {
                    const px = x * zoom + 0.5;
                    const py = y * zoom + 0.5;
                    const pz = zoom;

                    ctx.moveTo(px, py); ctx.lineTo(px + pz, py);
                    ctx.moveTo(px, py); ctx.lineTo(px, py + pz);
                    if (!isMatch(x + 1, y)) { ctx.moveTo(px + pz, py); ctx.lineTo(px + pz, py + pz); }
                    if (!isMatch(x, y + 1)) { ctx.moveTo(px, py + pz); ctx.lineTo(px + pz, py + pz); }
                }
            }
        }
        ctx.stroke(); 
    }
}

function canvasClick(e) {
    if (!originalImageData || hasMoved) return; 

    const { x, y } = getPos(e);
    if (x < 0 || y < 0 || x >= imgWidth || y >= imgHeight) return;

    const i = (y * imgWidth + x) * 4, d = originalImageData.data;
    const c = [d[i], d[i + 1], d[i + 2], d[i + 3]];

    if (c[3] === 0) return; // Se clicar numa área 100% transparente, ignora

    if (selectedColor && same(c, selectedColor)) { clearFilter(); return; }
    selectedColor = c; 
    updateCache(); 
}

function clearFilter() {
    selectedColor = null;
    updateCache();
}

function zoomCanvas(e) {
    e.preventDefault();
    if (!originalImageData) return;

    const rect = canvas.getBoundingClientRect();
    const mX = e.clientX - rect.left;
    const mY = e.clientY - rect.top;

    const oldZoom = zoom;
    zoom = e.deltaY < 0 ? Math.min(MAX_ZOOM, zoom * 2) : Math.max(MIN_ZOOM, zoom / 2);

    if (oldZoom === zoom) return;

    const zoomRatio = zoom / oldZoom;

    render(); 

    canvasContainer.scrollLeft += mX * (zoomRatio - 1);
    canvasContainer.scrollTop += mY * (zoomRatio - 1);
}

function startDrag(e) {
    if (!originalImageData) return;
    if (e.button === 1) { e.preventDefault(); return; }
    if (e.button !== 0) return; 

    isDragging = true;
    hasMoved = false;
    startX = e.clientX;
    startY = e.clientY;
    startScrollLeft = canvasContainer.scrollLeft;
    startScrollTop = canvasContainer.scrollTop;
    canvas.style.cursor = "grabbing"; 
}

function drag(e) {
    if (!isDragging) return;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) hasMoved = true;
    canvasContainer.scrollLeft = startScrollLeft - dx;
    canvasContainer.scrollTop = startScrollTop - dy;
}

function stopDrag() {
    if (!isDragging) return;
    isDragging = false;
    canvas.style.cursor = "grab";
}

function middleClick(e) {
    if (!originalImageData) return;
    if (e.button === 1) {
        e.preventDefault(); 
        const { x, y } = getPos(e);
        if (x < 0 || y < 0 || x >= imgWidth || y >= imgHeight) return;

        const i = (y * imgWidth + x) * 4, d = originalImageData.data;
        if (d[i+3] === 0) return; // Não copia cor de espaço transparente

        const hex = rgbToHex(d[i], d[i + 1], d[i + 2]);

        navigator.clipboard.writeText(hex).then(() => {
            const originalText = coordsLabel.textContent;
            coordsLabel.textContent = `Copied ${hex}!`;
            setTimeout(() => { coordsLabel.textContent = originalText; }, 1000);
        }).catch(err => console.error(err));
    }
}

function same(a, b) { return a.every((v, i) => v === b[i]); }
function rgbToHex(r, g, b) { return "#" + [r, g, b].map(v => v.toString(16).padStart(2, "0")).join(""); }
