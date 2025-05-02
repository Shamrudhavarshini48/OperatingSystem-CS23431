const startBtn = document.getElementById("startBtn");
const fileIcon = document.getElementById("fileIcon");
const progressBar = document.getElementById("progressBar");
const statusMessage = document.getElementById("statusMessage");

let chart;
let chunkIndex = 0;
let map, clientMarker, serverMarker, fileMarker, line;
let transferCounter = 0; // 2 success, 1 failure cycle

function initChart() {
  const ctx = document.getElementById("transferChart").getContext("2d");
  const gradient = ctx.createLinearGradient(0, 0, 0, 200);
  gradient.addColorStop(0, 'rgba(54, 162, 235, 0.5)');
  gradient.addColorStop(1, 'rgba(54, 162, 235, 0)');

  chart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: [],
      datasets: [{
        label: 'Transfer Speed (KB/s)',
        data: [],
        borderColor: 'blue',
        backgroundColor: gradient,
        borderWidth: 2,
        fill: true,
        tension: 0.3
      }]
    },
    options: {
      responsive: true,
      scales: {
        x: { title: { display: true, text: 'Chunks' } },
        y: { title: { display: true, text: 'Speed (KB/s)' } }
      }
    }
  });
}

function moveFileLocally(isSuccess = true) {
  const client = document.querySelector(".client");
  const server = document.querySelector(".server");

  const clientRect = client.getBoundingClientRect();
  const serverRect = server.getBoundingClientRect();

  const totalSteps = 20;
  let step = 0;
  const distance = serverRect.left - clientRect.left;

  fileIcon.classList.add("glow");
  updateStatus("Sending...");
  fileIcon.classList.remove("file-fail");

  const failAt = isSuccess ? totalSteps : Math.floor(totalSteps / 2);

  const interval = setInterval(() => {
    const left = (distance / totalSteps) * step + 40; // +40 to align starting near client
    fileIcon.style.left = `${left}px`;
    step++;

    updateProgressBar(step, totalSteps);

    if (step >= failAt) {
      clearInterval(interval);
      fileIcon.classList.remove("glow");
      if (!isSuccess) {
        fileIcon.classList.add("file-fail");
      }
    }
  }, 500);
}

function updateProgressBar(step, totalSteps) {
  const percent = Math.min(100, Math.floor((step / totalSteps) * 100));
  progressBar.style.width = percent + "%";
  progressBar.setAttribute("aria-valuenow", percent);
  progressBar.textContent = percent + "%";
}

function fetchGraphData() {
  fetch("/get-graph-data")
    .then(res => res.json())
    .then(data => {
      if (chart) {
        chart.data.labels = data.chunks;
        chart.data.datasets[0].data = data.speeds;
        chart.update();
      }
    });
}

function updateStatus(text, type = 'info') {
    if (statusMessage) {
      statusMessage.textContent = "Status: " + text;
      statusMessage.className = "alert alert-" + type;
    }
  
    const fullScreenAlert = document.getElementById("fullScreenAlert");
    if (fullScreenAlert) {
      if (type === "danger") {
        fullScreenAlert.style.display = "block";  // Show on failure
      } else {
        fullScreenAlert.style.display = "none";   // Hide on success/info
      }
    }
  }
  
function launchConfetti() {
  if (window.confetti) {
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 }
    });
  }
}

// ✅ Updated Map Animation with Accurate Fail Support
function animateFileOnMap(from, to, callback, isSuccess = true) {
  if (fileMarker) map.removeLayer(fileMarker);

  const duration = 10000;
  const steps = 100;
  const stepTime = duration / steps;
  let currentStep = 0;

  function interpolate(a, b, t) {
    return a + (b - a) * t;
  }

  const failStep = isSuccess ? steps : steps / 2;

  const interval = setInterval(() => {
    const lat = interpolate(from.lat, to.lat, currentStep / steps);
    const lng = interpolate(from.lng, to.lng, currentStep / steps);

    if (fileMarker) map.removeLayer(fileMarker);

    const iconHTML = isSuccess || currentStep < failStep ? "📄" : "❌📄";
    fileMarker = L.marker([lat, lng], {
      icon: L.divIcon({ className: 'file-marker', html: iconHTML })
    }).addTo(map);

    currentStep++;
    if (currentStep > failStep) {
      clearInterval(interval);
      if (callback) callback();
    }
  }, stepTime);
}

function initMap(onMapReady = null) {
  if (!map) {
    map = L.map('map').setView([20, 0], 2);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors'
    }).addTo(map);
  }

  fetch('/get-locations')
    .then(res => res.json())
    .then(data => {
      const client = data.client;
      const server = data.server;

      if (clientMarker) map.removeLayer(clientMarker);
      if (serverMarker) map.removeLayer(serverMarker);
      if (line) map.removeLayer(line);

      clientMarker = L.marker([client.lat, client.lng]).addTo(map).bindPopup("🖥️ Client").openPopup();
      serverMarker = L.marker([server.lat, server.lng]).addTo(map).bindPopup("🖥️ Server");

      line = L.polyline([[client.lat, client.lng], [server.lat, server.lng]], {
        color: 'blue',
        dashArray: '8, 10'
      }).addTo(map);

      const bounds = L.latLngBounds([client.lat, client.lng], [server.lat, server.lng]);
      map.fitBounds(bounds, { padding: [50, 50] });

      if (onMapReady) onMapReady(client, server);
    });
}

// 🚀 Transfer Trigger
startBtn.addEventListener("click", () => {
  updateStatus("🔌 Connecting...");
  fetch("/start-transfer")
    .then(res => res.json())
    .then(() => {
      chunkIndex = 0;

      const isSuccess = transferCounter % 3 !== 2;
      transferCounter++;

      moveFileLocally(isSuccess);

      const graphInterval = setInterval(() => {
        if (!isSuccess && chunkIndex >= 10) {
          clearInterval(graphInterval);
          return;
        }

        fetchGraphData();
        chunkIndex++;
        updateProgressBar(chunkIndex, 20);

        if (chunkIndex >= 20) clearInterval(graphInterval);
      }, 500);

      initMap((client, server) => {
        animateFileOnMap(client, server, () => {
          if (isSuccess) {
            updateStatus("✅ Transfer Completed!", "success");
            launchConfetti();
          } else {
            updateStatus("❌ Transfer Failed!", "danger");
          }
        }, isSuccess);
      });
    });
});

// 👋 Init
window.onload = () => {
  initChart();
  initMap();
};
