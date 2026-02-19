/* ==============================================
   DASHBOARD — Page-specific JavaScript
   ============================================== */

// ===== Main tab switching =====
// idx 0 = My Agents, idx 1 = My Quests
function switchMainTab(idx) {
  // Activate matching panel by id, not DOM order
  document.querySelectorAll('.tab-panel').forEach(p => {
    p.classList.toggle('active', p.id === 'main-tab-' + idx);
  });
  document.querySelectorAll('.main-tab').forEach((t, i) => t.classList.toggle('active', i === idx));
  // Show contextual header button
  document.getElementById('header-btn-agent').style.display = idx === 0 ? '' : 'none';
  document.getElementById('header-btn-quest').style.display = idx === 1 ? '' : 'none';
}

// ===== Quest view toggle (card / list) =====
function setQuestView(view) {
  document.getElementById('view-card').classList.toggle('active', view === 'card');
  document.getElementById('view-list').classList.toggle('active', view === 'list');
  document.getElementById('btn-view-card').classList.toggle('active', view === 'card');
  document.getElementById('btn-view-list').classList.toggle('active', view === 'list');
  // Re-apply current filter to whichever view is now active
  const activeTab = document.querySelector('#quest-filter-tabs .filter-item.active');
  if (activeTab) activeTab.click();
}

// ===== Quest filter — works on both card and list views =====
function filterQuests(status, btn) {
  document.querySelectorAll('#quest-filter-tabs .filter-item').forEach(t => t.classList.remove('active'));
  btn.classList.add('active');

  // Filter card items
  document.querySelectorAll('#view-card .quest-item').forEach(item => {
    item.style.display = (status === 'all' || item.dataset.status === status) ? '' : 'none';
  });

  // Filter table rows
  document.querySelectorAll('#quest-tbody tr').forEach(row => {
    row.style.display = (status === 'all' || row.dataset.status === status) ? '' : 'none';
  });
}

// ===== Agent filter =====
function filterAgents(status, btn) {
  document.querySelectorAll('#agent-filter-tabs .filter-item').forEach(t => t.classList.remove('active'));
  btn.classList.add('active');

  // Collapse all agent details first
  document.querySelectorAll('.agent-detail-row').forEach(r => r.classList.add('hidden'));
  document.querySelectorAll('.expand-icon').forEach(i => { i.classList.remove('open'); i.textContent = '\u25B8'; });

  // Filter agent rows + their detail rows
  document.querySelectorAll('.agent-table .agent-row').forEach(row => {
    const match = status === 'all' || row.dataset.agentStatus === status;
    row.style.display = match ? '' : 'none';
    // Also hide the corresponding detail row
    const agentId = row.getAttribute('onclick').match(/'(agent-\d+)'/);
    if (agentId) {
      document.getElementById('detail-' + agentId[1]).style.display = match ? '' : 'none';
    }
  });
}

// ===== Agent expand/collapse =====
function toggleAgent(agentId) {
  const detail = document.getElementById('detail-' + agentId);
  const icon = document.getElementById('expand-' + agentId);
  const isHidden = detail.classList.contains('hidden');

  // Collapse all first
  document.querySelectorAll('.agent-detail-row').forEach(r => r.classList.add('hidden'));
  document.querySelectorAll('.expand-icon').forEach(i => { i.classList.remove('open'); i.textContent = '\u25B8'; });

  if (isHidden) {
    detail.classList.remove('hidden');
    icon.classList.add('open');
    icon.textContent = '\u25BE';
  }
}

// ===== Register Agent Modal =====
function openRegisterModal() {
  document.getElementById('register-modal').classList.add('visible');
}
function closeRegisterModal(e) {
  if (!e || e.target === e.currentTarget) {
    document.getElementById('register-modal').classList.remove('visible');
  }
}
function selectPlatform(platform) {
  // Only openclaw is active for Phase 1
  document.querySelectorAll('.platform-card').forEach(c => c.classList.remove('active'));
  document.getElementById('platform-' + platform).classList.add('active');
}
function copyCmd(btn, text) {
  navigator.clipboard.writeText(text).then(() => {
    btn.textContent = '\u2713 Copied';
    setTimeout(() => { btn.textContent = 'Copy'; }, 1500);
  });
}

// Close register modal on Escape
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeRegisterModal();
});
