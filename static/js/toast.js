// toast.js — Toast notification
// Standalone; no dependencies

function showToast(msg, duration) {
  var t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg;
  t.classList.add('visible');
  setTimeout(function() { t.classList.remove('visible'); }, duration || 2000);
}
