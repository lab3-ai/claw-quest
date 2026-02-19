// questers-popup.js — Questers popup modal
// Depends on modal.js

function openQuesters(questTitle, count, rewardType) {
  document.getElementById('qp-quest-title').textContent = questTitle;
  document.getElementById('qp-count').textContent = count;
  var badge = document.getElementById('qp-reward-type');
  badge.textContent = rewardType;
  badge.className = 'badge badge-' + rewardType.toLowerCase().replace(' ', '');
  var sortLabel = document.getElementById('qp-sort-label');
  sortLabel.textContent = rewardType === 'Leaderboard' ? 'sorted by rank' : 'sorted by start time';
  document.getElementById('qp-view-all-count').textContent = count;
  openModal('questers-popup');
}

function closeQuesters(e) { closeModal('questers-popup', e); }
