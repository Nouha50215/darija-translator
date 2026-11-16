// Requests microphone access for the extension's origin, then releases the mic.
const status = document.getElementById("status");

navigator.mediaDevices
  .getUserMedia({ audio: true })
  .then((stream) => {
    stream.getTracks().forEach((t) => t.stop());
    status.className = "ok";
    status.textContent = "Microphone allowed ✓ You can close this tab and use 🎤 in the side panel.";
    setTimeout(() => window.close(), 2500);
  })
  .catch((err) => {
    status.className = "err";
    status.textContent =
      "Microphone blocked (" + err.name + "). Click the camera/mic icon in the address bar to allow it, then reload this page.";
  });
