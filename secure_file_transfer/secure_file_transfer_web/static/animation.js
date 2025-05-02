function startTransfer() {
    fetch('/start-transfer')
      .then(res => res.json())
      .then(data => {
        document.getElementById('status').innerText = "Status: " + data.status;
        animateFile();
      });
  }
  
  function animateFile() {
    const file = document.getElementById('file');
    file.style.transition = 'transform 10s linear';
    file.style.transform = 'translateX(300px)';
    setTimeout(() => {
      file.style.transform = 'translateX(0)';
    }, 11000);
  }
  