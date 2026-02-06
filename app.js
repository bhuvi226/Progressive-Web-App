let model = null;
let activeStream = null;
let cameraActive = false;

const uploadInput = document.getElementById("upload-input");
const clearButton = document.getElementById("clear-button");
const cameraButton = document.getElementById("camera-button");
const statusEl = document.getElementById("status");
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");
const video = document.getElementById("video");
const resultsList = document.getElementById("results");
const resultsEmpty = document.getElementById("results-empty");
const noImageText = document.getElementById("no-image-text");

async function loadModel() {
  try {
    statusEl.textContent = "Loading TensorFlow.js COCO-SSD model…";
    model = await cocoSsd.load();
    statusEl.textContent = "Model ready. Select or capture an image to start.";
    statusEl.classList.remove("error");
    statusEl.classList.add("ok");
  } catch (err) {
    console.error(err);
    statusEl.textContent = "Failed to load model. Check your network connection and refresh.";
    statusEl.classList.add("error");
  }
}

function clearResults() {
  resultsList.innerHTML = "";
  resultsEmpty.style.display = "block";
}

function showResults(predictions) {
  clearResults();

  if (!predictions || predictions.length === 0) {
    resultsEmpty.textContent = "No high-confidence objects detected.";
    return;
  }

  resultsEmpty.style.display = "none";

  predictions.forEach((p) => {
    const li = document.createElement("li");
    const label = document.createElement("span");
    const confidence = document.createElement("span");

    label.className = "result-label";
    confidence.className = "result-confidence";

    label.textContent = p.class;
    confidence.textContent = `${(p.score * 100).toFixed(1)}%`;

    li.appendChild(label);
    li.appendChild(confidence);
    resultsList.appendChild(li);
  });
}

function drawImageToCanvas(image) {
  // Match canvas pixel dimensions to the actual image so detection boxes line up.
  canvas.width = image.width;
  canvas.height = image.height;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
}

function drawDetections(predictions) {
  if (!predictions || predictions.length === 0) return;

  const lineWidth = Math.max(2, Math.round(canvas.width * 0.0025));
  ctx.lineWidth = lineWidth;
  ctx.font = `${Math.max(12, Math.round(canvas.width * 0.02))}px system-ui, sans-serif`;

  predictions.forEach((p) => {
    const [x, y, width, height] = p.bbox;

    // Bounding box
    ctx.strokeStyle = "rgba(96, 165, 250, 0.95)";
    ctx.strokeRect(x, y, width, height);

    // Label background
    const label = `${p.class} ${(p.score * 100).toFixed(1)}%`;
    const textMetrics = ctx.measureText(label);
    const paddingX = 6;
    const paddingY = 4;
    const textHeight = parseInt(ctx.font, 10) + paddingY;

    ctx.fillStyle = "rgba(15, 23, 42, 0.9)";
    ctx.fillRect(
      x,
      Math.max(0, y - textHeight),
      textMetrics.width + paddingX * 2,
      textHeight
    );

    // Label text
    ctx.fillStyle = "#e5e7eb";
    ctx.fillText(label, x + paddingX, Math.max(paddingY, y - (textHeight - paddingY)));
  });
}

function stopCamera() {
  if (activeStream) {
    activeStream.getTracks().forEach((track) => track.stop());
    activeStream = null;
  }
  cameraActive = false;
  video.srcObject = null;
  video.style.display = "none";
  canvas.style.display = "block";
  cameraButton.textContent = "Open Camera";
}

async function runDetection(imageBitmap) {
  if (!model) {
    statusEl.textContent = "Model not ready yet. Please wait…";
    statusEl.classList.remove("ok");
    statusEl.classList.add("error");
    return;
  }

  clearResults();
  statusEl.textContent = "Running detection…";
  statusEl.classList.remove("error");
  statusEl.classList.remove("ok");

  // Draw image to canvas
  const offscreen = document.createElement("canvas");
  offscreen.width = imageBitmap.width;
  offscreen.height = imageBitmap.height;
  const offCtx = offscreen.getContext("2d");
  offCtx.drawImage(imageBitmap, 0, 0);

  drawImageToCanvas(imageBitmap);
  noImageText.style.display = "none";

  // Convert canvas content to an HTMLImageElement the model can use
  const img = new Image();
  img.src = offscreen.toDataURL("image/png");

  await new Promise((resolve) => {
    img.onload = resolve;
  });

  try {
    // Ask the model for more boxes so multiple objects can be detected in a single image.
    const predictions = await model.detect(img, 10);
    // Keep reasonably confident detections but allow multiple objects at once.
    const filtered = predictions.filter((p) => p.score >= 0.15);
    // Draw bounding boxes and labels on top of the preview.
    drawImageToCanvas(imageBitmap);
    drawDetections(filtered);

    showResults(filtered);
    statusEl.textContent =
      filtered.length > 0 ? "Detection complete." : "Detection complete (no objects found).";
    statusEl.classList.add("ok");
  } catch (err) {
    console.error(err);
    statusEl.textContent = "Detection failed. Check console for details.";
    statusEl.classList.add("error");
  }
}

async function handleFile(inputFile) {
  if (!inputFile) return;

  clearButton.disabled = false;
  resultsEmpty.textContent = "Detection results will appear here.";

  // If camera is currently open, stop it when switching to upload
  if (cameraActive) {
    stopCamera();
  }

  try {
    const fileBitmap = await createImageBitmap(inputFile);
    await runDetection(fileBitmap);
  } catch (err) {
    console.error(err);
    statusEl.textContent = "Unable to read image file.";
    statusEl.classList.add("error");
  }
}

uploadInput.addEventListener("change", (event) => {
  const [file] = event.target.files || [];
  handleFile(file);
});

async function toggleCamera() {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    statusEl.textContent = "Camera not supported in this browser. Please use image upload instead.";
    statusEl.classList.add("error");
    return;
  }

  // If camera already active, capture a frame
  if (cameraActive && activeStream) {
    try {
      const track = activeStream.getVideoTracks()[0];
      const settings = track.getSettings();
      const width = settings.width || 640;
      const height = settings.height || 480;

      const offscreen = document.createElement("canvas");
      offscreen.width = width;
      offscreen.height = height;
      const offCtx = offscreen.getContext("2d");
      offCtx.drawImage(video, 0, 0, width, height);

      const blob = await new Promise((resolve) =>
        offscreen.toBlob(resolve, "image/jpeg", 0.95)
      );
      if (!blob) {
        throw new Error("Failed to capture image from camera.");
      }

      const bitmap = await createImageBitmap(blob);
      stopCamera();
      await runDetection(bitmap);
      clearButton.disabled = false;
    } catch (err) {
      console.error(err);
      statusEl.textContent = "Unable to capture photo from camera.";
      statusEl.classList.add("error");
    }
    return;
  }

  // Start camera
  try {
    statusEl.textContent = "Requesting camera access…";
    statusEl.classList.remove("error");
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "environment" },
      audio: false
    });
    activeStream = stream;
    video.srcObject = stream;
    video.style.display = "block";
    canvas.style.display = "none";
    noImageText.style.display = "none";
    cameraButton.textContent = "Capture Photo";
    cameraActive = true;
    statusEl.textContent = "Camera active. When ready, click “Capture Photo”.";
  } catch (err) {
    console.error(err);
    statusEl.textContent = "Could not access camera. Check permissions and try again.";
    statusEl.classList.add("error");
  }
}

cameraButton.addEventListener("click", () => {
  toggleCamera();
});

clearButton.addEventListener("click", () => {
  if (cameraActive) {
    stopCamera();
  }
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  noImageText.style.display = "block";
  clearResults();
  clearButton.disabled = true;
  uploadInput.value = "";
  statusEl.textContent = "Model ready. Select or capture an image to start.";
  statusEl.classList.remove("error");
  statusEl.classList.add("ok");
});

// Register service worker for PWA features
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/service-worker.js")
      .catch((err) => console.warn("Service worker registration failed:", err));
  });
}

// Kick off model loading
loadModel();


