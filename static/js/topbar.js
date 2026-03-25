// topbar.js — User dropdown toggle
// Standalone; no dependencies

function toggleUserMenu() {
  document.getElementById('user-dropdown').classList.toggle('visible');
}

document.addEventListener('click', function(e) {
  if (!e.target.closest('.user-menu')) {
    var dd = document.getElementById('user-dropdown');
    if (dd) dd.classList.remove('visible');
  }
});
