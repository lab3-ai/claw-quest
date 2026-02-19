/* Quest Explore Page JS */

/* Tab filter */
function setTab(el) {
  document.querySelectorAll('.tabs .tab').forEach(t => t.classList.remove('active'));
  el.classList.add('active');
}

/* View toggle */
function setView(mode) {
  var cardView = document.getElementById('card-view');
  var listView = document.getElementById('list-view');
  var btnCard = document.getElementById('btn-card');
  var btnList = document.getElementById('btn-list');

  if (mode === 'list') {
    cardView.classList.add('hidden');
    listView.classList.add('active');
    btnCard.classList.remove('active');
    btnList.classList.add('active');
  } else {
    cardView.classList.remove('hidden');
    listView.classList.remove('active');
    btnCard.classList.add('active');
    btnList.classList.remove('active');
  }
}
