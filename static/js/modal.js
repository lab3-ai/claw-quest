// modal.js — Generic modal open/close by element ID
// Base dependency for login-modal.js, questers-popup.js, etc.

function openModal(id) {
  document.getElementById(id).classList.add('visible');
}

function closeModal(id, e) {
  if (!e || e.target === e.currentTarget) {
    document.getElementById(id).classList.remove('visible');
  }
}

document.addEventListener('keydown', function(e) {
  if (e.key === 'Escape') {
    document.querySelectorAll('.login-backdrop.visible, .questers-backdrop.visible, .modal-backdrop.visible').forEach(function(el) {
      el.classList.remove('visible');
    });
  }
});
