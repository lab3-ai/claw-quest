/* Questers Page JS */
function filterQuesters(status, btn) {
  document.querySelectorAll('#questers-filter .filter-item').forEach(t => t.classList.remove('active'));
  btn.classList.add('active');
  document.querySelectorAll('#questers-tbody tr').forEach(row => {
    row.style.display = (status === 'all' || row.dataset.progress === status) ? '' : 'none';
  });
}
