const grantBtn = document.getElementById("grant-btn");
const statusBox = document.getElementById("status-box");

function requestMic() {
  statusBox.className = "status";
  statusBox.style.display = "block";
  statusBox.textContent = "Requesting microphone permission...";

  navigator.mediaDevices
    .getUserMedia({ audio: true })
    .then((stream) => {
      // Stop stream immediately after acquiring permission
      stream.getTracks().forEach((track) => track.stop());

      statusBox.className = "status success";
      statusBox.textContent = "Microphone access granted! Closing tab in 1 second...";
      grantBtn.textContent = "Permission Granted";
      grantBtn.disabled = true;

      setTimeout(() => {
        window.close();
      }, 1500);
    })
    .catch((err) => {
      statusBox.className = "status error";
      statusBox.textContent = "Permission denied or dismissed: " + err.message + ". Please click 'Click to Allow Microphone' and choose 'Allow'.";
    });
}

grantBtn.addEventListener("click", requestMic);

// Try auto-requesting on load
window.addEventListener("DOMContentLoaded", () => {
  requestMic();
});
