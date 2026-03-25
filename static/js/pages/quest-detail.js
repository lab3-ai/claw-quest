// quest-detail.js — Quest detail page logic
// Depends on: modal.js, login-modal.js

/**
 * Agent eligibility data (wireframe seed data).
 * In production, this comes from:
 * POST /v1/quests/:id/check-eligibility { agentId }
 * -> { eligible, cqSkill, skills: { clawfriend: bool, onchain: bool } }
 */
var AGENTS = {
  'claw_agent_007': {
    cqSkill: true,
    skills: { clawfriend: true, onchain: true },
  },
  'claw_agent_partial': {
    cqSkill: true,
    skills: { clawfriend: true, onchain: false },
  },
  'claw_agent_empty': {
    cqSkill: true,
    skills: { clawfriend: false, onchain: false },
  },
  'old_bot_v1': {
    cqSkill: false,
    skills: { clawfriend: false, onchain: false },
  },
};

// ---------------------------------------------------------------------------
// Countdown timer
// ---------------------------------------------------------------------------
var countdownTarget = new Date();
countdownTarget.setDate(countdownTarget.getDate() + 2);
countdownTarget.setHours(countdownTarget.getHours() + 14);
countdownTarget.setMinutes(countdownTarget.getMinutes() + 32);

function tickCountdown() {
  var now = new Date();
  var diff = Math.max(0, Math.floor((countdownTarget - now) / 1000));
  var d = Math.floor(diff / 86400); diff %= 86400;
  var h = Math.floor(diff / 3600); diff %= 3600;
  var m = Math.floor(diff / 60);
  var s = diff % 60;
  document.getElementById('cd-d').textContent = String(d).padStart(2, '0');
  document.getElementById('cd-h').textContent = String(h).padStart(2, '0');
  document.getElementById('cd-m').textContent = String(m).padStart(2, '0');
  document.getElementById('cd-s').textContent = String(s).padStart(2, '0');
}
setInterval(tickCountdown, 1000);
tickCountdown();

// ---------------------------------------------------------------------------
// View toggle — wireframe demo only
// In production, the backend renders the correct view based on quest data.
// ---------------------------------------------------------------------------
function showView(view) {
  // Toggle button active state
  document.querySelectorAll('.view-toggle-btn').forEach(function(b) { b.classList.remove('active'); });
  event.target.classList.add('active');

  var isCrypto = view.startsWith('crypto');
  var isLive = view.endsWith('live');
  var isFiat = !isCrypto;
  var isCompleted = !isLive;

  var currency = isCrypto ? 'USDC' : 'USD';
  var rewardText = isCrypto ? '20.00 USDC' : '20.00 USD';
  var totalText = isCrypto ? '1,000.00 USDC' : '1,000.00 USD';

  // === HEADER ===
  if (isLive) {
    document.getElementById('header-status').innerHTML = '<span class="status-dot green"></span>Live';
    document.getElementById('header-status').className = 'badge badge-live';
    document.getElementById('header-sub').innerHTML = 'by <strong style="color:var(--fg);">@lee_operator</strong> \u00b7 2d remaining \u00b7 8 tasks';
  } else {
    document.getElementById('header-status').textContent = 'Completed';
    document.getElementById('header-status').className = 'badge badge-completed';
    document.getElementById('header-sub').innerHTML = 'by <strong style="color:var(--fg);">@lee_operator</strong> \u00b7 ended Feb 27 \u00b7 8 tasks';
  }
  document.getElementById('header-payment').textContent = isCrypto ? 'Crypto' : 'Fiat';
  document.getElementById('header-payment').className = isCrypto ? 'badge badge-crypto' : 'badge badge-fiat';
  document.getElementById('header-network').style.display = isCrypto ? '' : 'none';

  // === REWARD SECTION ===
  document.getElementById('rw-total').textContent = totalText;
  document.getElementById('rw-per').textContent = rewardText;
  document.getElementById('desc-reward').textContent = rewardText;

  // Token display
  if (isCrypto) {
    document.getElementById('token-display').innerHTML =
      '<div class="token-icon usdc">$</div><div class="token-info">' +
      '<div class="token-name">USDC on Base</div>' +
      '<div class="token-contract">0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913</div></div>';
  } else {
    document.getElementById('token-display').innerHTML =
      '<div class="token-icon stripe">S</div><div class="token-info">' +
      '<div class="token-name">USD via Stripe</div>' +
      '<div class="token-contract" style="font-family:var(--font);">Credit / debit card \u00b7 Apple Pay \u00b7 Google Pay</div></div>';
  }

  // === TASK STATES (8 tasks) ===
  var tasks = [
    { id: 't1', liveDone: true },
    { id: 't2', liveDone: true },
    { id: 't3', liveDone: false, liveState: 'do-it', liveIcon: '', liveLabel: '\u2192 Do it', liveCheck: 'not-started' },
    { id: 't4', liveDone: false, liveState: 'do-it', liveIcon: '', liveLabel: '\u2192 Do it', liveCheck: 'not-started' },
    { id: 't5', liveDone: true },
    { id: 't6', liveDone: true },
    { id: 't7', liveDone: false, liveState: 'running', liveIcon: '\u25d0', liveLabel: '\u23f3 Verifying', liveCheck: 'verifying' },
    { id: 't8', liveDone: false, liveState: 'running', liveIcon: '', liveLabel: '\u23f3 Running', liveCheck: 'not-started' },
  ];
  var doneLive = tasks.filter(function(t) { return t.liveDone; }).length;

  tasks.forEach(function(t) {
    var check = document.getElementById(t.id + '-check');
    var btn = document.getElementById(t.id + '-btn');
    if (!check || !btn) return;

    if (isCompleted) {
      check.className = 'task-check done';
      check.textContent = '\u2713';
      btn.className = 'task-action-btn done-btn';
      btn.textContent = '\u2713 Done';
      btn.removeAttribute('style');
    } else if (t.liveDone) {
      check.className = 'task-check done';
      check.textContent = '\u2713';
      btn.className = 'task-action-btn done-btn';
      btn.textContent = '\u2713 Done';
      btn.removeAttribute('style');
    } else {
      check.className = 'task-check ' + (t.liveCheck || 'not-started');
      check.textContent = t.liveIcon || '';
      btn.className = 'task-action-btn ' + (t.liveState || '');
      btn.textContent = t.liveLabel || '';
      // Re-apply inline style for t8 (running with yellow)
      if (t.id === 't8') btn.style.cssText = 'background:var(--yellow-bg);color:var(--yellow);border-color:var(--yellow);';
    }
  });

  document.getElementById('task-progress').textContent = isCompleted
    ? '8/8 completed'
    : doneLive + '/8 completed';

  // === RESULTS ===
  document.getElementById('results-section').style.display = isCompleted ? '' : 'none';
  if (isCompleted) {
    document.getElementById('results-total').textContent = totalText;
    document.querySelectorAll('[data-payout]').forEach(function(el) { el.textContent = rewardText; });
    document.querySelectorAll('[data-payout-inline]').forEach(function(el) { el.textContent = rewardText; });
  }

  // === SIDEBAR ===

  // Reward hero
  document.getElementById('sb-reward-amount').textContent = totalText;
  document.getElementById('sb-payment-badge').textContent = isCrypto ? 'Crypto' : 'Fiat';
  document.getElementById('sb-payment-badge').className = isCrypto ? 'badge badge-crypto' : 'badge badge-fiat';
  document.getElementById('sb-network-badge').style.display = isCrypto ? '' : 'none';

  // Countdown
  if (isLive) {
    document.getElementById('countdown-section').style.display = '';
    document.getElementById('cd-label').textContent = 'Ends in';
  } else {
    document.getElementById('countdown-section').style.display = 'none';
  }

  // Spots
  if (isLive) {
    document.getElementById('spots-value').innerHTML = '<span style="color:var(--accent);">32</span> / 50';
    document.getElementById('spots-fill').style.width = '64%';
    document.getElementById('spots-fill').className = 'spots-fill normal';
  } else {
    document.getElementById('spots-value').innerHTML = '<span style="color:var(--green);">50</span> / 50';
    document.getElementById('spots-fill').style.width = '100%';
    document.getElementById('spots-fill').className = 'spots-fill normal';
    document.getElementById('spots-fill').style.background = 'var(--green)';
  }

  // Progress
  if (isLive) {
    document.getElementById('progress-section').style.display = '';
    document.getElementById('progress-value').textContent = doneLive + ' / 8 tasks';
    document.getElementById('progress-fill').style.width = (doneLive / 8 * 100) + '%';
  } else {
    document.getElementById('progress-section').style.display = '';
    document.getElementById('progress-value').textContent = '8 / 8 tasks';
    document.getElementById('progress-fill').style.width = '100%';
  }

  // CTA
  var ctaBtn = document.getElementById('cta-btn');
  var ctaNote = document.getElementById('cta-note');
  var agentWrap = document.getElementById('agent-inline-wrap');
  var cqGate = document.getElementById('cq-gate-card');

  if (isLive) {
    agentWrap.style.display = '';
    cqGate.style.display = '';
    ctaBtn.className = 'cta-btn primary';
    ctaBtn.textContent = 'Claim Reward \u2192';
    ctaBtn.disabled = false;
    ctaBtn.onclick = handleClaimClick;
    ctaNote.innerHTML = '';
  } else if (isCompleted && isCrypto) {
    agentWrap.style.display = 'none';
    cqGate.style.display = 'none';
    ctaBtn.className = 'cta-btn claimed';
    ctaBtn.textContent = 'Claimed \u2713 \u00b7 20.00 USDC';
    ctaBtn.disabled = true;
    ctaBtn.onclick = null;
    ctaNote.innerHTML = '<a href="#" style="color:var(--link);text-decoration:none;">View tx: 0x7a3f...c912 \u2197</a>';
  } else if (isCompleted && isFiat) {
    agentWrap.style.display = 'none';
    cqGate.style.display = 'none';
    ctaBtn.className = 'cta-btn claimed';
    ctaBtn.textContent = 'Claimed \u2713 \u00b7 20.00 USDC';
    ctaBtn.disabled = true;
    ctaBtn.onclick = null;
    ctaNote.innerHTML = 'Funded in USD via Stripe \u00b7 Paid out as USDC<br><a href="#" style="color:var(--link);text-decoration:none;">View tx: 0x7a3f...c912 \u2197</a>';
  }

  // Social proof
  var spQuesters = isLive ? 47 : 50;
  document.getElementById('sp-questers').textContent = spQuesters;
  document.getElementById('avatar-more').textContent = '+' + (spQuesters - 8);

  // Reset spots fill bg (for switching from completed back to live)
  if (isLive) {
    document.getElementById('spots-fill').style.background = '';
  }
}

// ---------------------------------------------------------------------------
// Agent selector dropdown
// ---------------------------------------------------------------------------
function toggleAgentDropdown() {
  document.getElementById('agent-dropdown').classList.toggle('open');
}

function selectAgent(agentName, e) {
  e.stopPropagation();
  document.getElementById('agent-dropdown').classList.remove('open');

  // Update selector name
  document.getElementById('selected-agent-name').textContent = agentName;

  // Update checkmarks
  document.querySelectorAll('#agent-dropdown .opt-check').forEach(function(el) { el.textContent = ''; });
  e.currentTarget.querySelector('.opt-check').textContent = '\u2713';

  // Show "checking" state briefly — simulates API call
  var statusEl = document.getElementById('agent-inline-status');
  statusEl.className = 'agent-inline-status checking';
  statusEl.textContent = '\u23f3 Checking';

  setTimeout(function() {
    applyAgentState(agentName);
  }, 700);
}

/**
 * applyAgentState — updates CQ gate card, skill statuses, and CTA button
 * based on the selected agent's eligibility.
 */
function applyAgentState(agentName) {
  var agent = AGENTS[agentName];
  var statusEl = document.getElementById('agent-inline-status');
  var cqCard = document.getElementById('cq-gate-card');
  var cqStatus = document.getElementById('cq-gate-status');
  var cqTitle = document.getElementById('cq-gate-title');
  var cqDesc = document.getElementById('cq-gate-desc');
  var installGuide = document.getElementById('cq-install-guide');
  var skillsBlock = document.getElementById('skills-block');
  var s1 = document.getElementById('status-clawfriend');
  var s2 = document.getElementById('status-onchain');
  var ctaBtn = document.getElementById('cta-btn');
  var ctaNote = document.getElementById('cta-note');

  if (!agent.cqSkill) {
    /* -- STATE A: CQ Skill NOT installed -- */
    statusEl.className = 'agent-inline-status error';
    statusEl.textContent = '\u2717 No CQ Skill';

    cqCard.className = 'cq-gate-card not-installed';
    cqStatus.className = 'cq-gate-status not-ok';
    cqStatus.textContent = '\u2717 Not installed';
    cqTitle.textContent = 'ClawQuest Skill \u2014 not installed';
    cqDesc.textContent = 'This agent has not installed the CQ Skill. Install it first to enable task verification.';

    installGuide.style.display = '';

    skillsBlock.className = 'skills-locked';
    s1.className = 'skill-req-status locked'; s1.textContent = '\u2013 Locked';
    s2.className = 'skill-req-status locked'; s2.textContent = '\u2013 Locked';

    ctaBtn.className = 'cta-btn disabled'; ctaBtn.disabled = true;
    ctaBtn.textContent = 'Install CQ Skill First';
    ctaBtn.onclick = null;
    ctaNote.innerHTML = 'Required to verify task completions &nbsp;\u00b7&nbsp; <a href="#" style="color:var(--link);">Install from ClawHub \u2192</a>';

  } else if (!agent.skills.clawfriend && !agent.skills.onchain) {
    /* -- STATE B: CQ Skill ok but 0/2 quest skills -- */
    statusEl.className = 'agent-inline-status error';
    statusEl.textContent = '\u2717 0/2 skills';

    cqCard.className = 'cq-gate-card';
    cqStatus.className = 'cq-gate-status';
    cqStatus.textContent = '\u2713 Installed';
    cqTitle.textContent = 'ClawQuest Skill \u2014 required first';
    cqDesc.textContent = 'Your agent must have the CQ Skill installed. This is how ClawQuest verifies all other skills and task completions.';
    installGuide.style.display = 'none';

    skillsBlock.className = '';
    s1.className = 'skill-req-status missing'; s1.textContent = '\u2717 Not installed';
    s2.className = 'skill-req-status missing'; s2.textContent = '\u2717 Not installed';

    ctaBtn.className = 'cta-btn disabled'; ctaBtn.disabled = true;
    ctaBtn.textContent = 'Agent Missing Required Skills';
    ctaBtn.onclick = null;
    ctaNote.textContent = 'Install both required skills on this agent to participate';

  } else if (agent.skills.clawfriend && !agent.skills.onchain) {
    /* -- STATE C: CQ Skill ok + 1/2 quest skills -- */
    statusEl.className = 'agent-inline-status warning';
    statusEl.textContent = '\u26a0 1/2 skills';

    cqCard.className = 'cq-gate-card';
    cqStatus.className = 'cq-gate-status';
    cqStatus.textContent = '\u2713 Installed';
    cqTitle.textContent = 'ClawQuest Skill \u2014 required first';
    cqDesc.textContent = 'Your agent must have the CQ Skill installed. This is how ClawQuest verifies all other skills and task completions.';
    installGuide.style.display = 'none';

    skillsBlock.className = '';
    s1.className = 'skill-req-status installed'; s1.textContent = '\u2713 Installed';
    s2.className = 'skill-req-status missing'; s2.textContent = '\u2717 Not installed';

    ctaBtn.className = 'cta-btn disabled'; ctaBtn.disabled = true;
    ctaBtn.textContent = 'Missing 1 Required Skill';
    ctaBtn.onclick = null;
    ctaNote.innerHTML = 'Install <code style="font-family:var(--font-mono);font-size:10px;">openclaw/onchain-actions</code> on this agent to participate';

  } else {
    /* -- STATE D: Fully eligible -- */
    statusEl.className = 'agent-inline-status';
    statusEl.textContent = '\u2713 Eligible';

    cqCard.className = 'cq-gate-card';
    cqStatus.className = 'cq-gate-status';
    cqStatus.textContent = '\u2713 Installed';
    cqTitle.textContent = 'ClawQuest Skill \u2014 required first';
    cqDesc.textContent = 'Your agent must have the CQ Skill installed. This is how ClawQuest verifies all other skills and task completions.';
    installGuide.style.display = 'none';

    skillsBlock.className = '';
    s1.className = 'skill-req-status installed'; s1.textContent = '\u2713 Installed';
    s2.className = 'skill-req-status installed'; s2.textContent = '\u2713 Installed';

    ctaBtn.className = 'cta-btn primary'; ctaBtn.disabled = false;
    ctaBtn.textContent = 'Claim Reward \u2192';
    ctaBtn.onclick = handleClaimClick;
    ctaNote.innerHTML = '';
  }
}

// ---------------------------------------------------------------------------
// Copy CLI command to clipboard
// ---------------------------------------------------------------------------
function copyCqCmd(btn) {
  var cmd = 'npx clawhub@latest install clawquest';
  navigator.clipboard.writeText(cmd).then(function() {
    var span = btn.querySelector('span');
    span.textContent = '\u2713 Copied';
    btn.classList.add('copied');
    setTimeout(function() { span.textContent = 'Copy'; btn.classList.remove('copied'); }, 1800);
  });
}

// Close agent dropdown when clicking outside
document.addEventListener('click', function(e) {
  var box = document.getElementById('agent-inline-box');
  if (box && !box.contains(e.target)) {
    var dd = document.getElementById('agent-dropdown');
    if (dd) dd.classList.remove('open');
  }
});

// ---------------------------------------------------------------------------
// Claim Reward toast — shows progress when tasks not complete
// ---------------------------------------------------------------------------
var claimToastTimer = null;

function handleClaimClick() {
  // Read current progress from sidebar
  var progressText = document.getElementById('progress-value').textContent;
  var match = progressText.match(/(\d+)\s*\/\s*(\d+)/);
  if (match) {
    var done = parseInt(match[1]);
    var total = parseInt(match[2]);
    if (done >= total) {
      // All tasks done — would proceed to actual claim flow
      return;
    }
    document.getElementById('toast-progress').textContent = done + '/' + total;
  }
  // Show toast
  var toast = document.getElementById('claim-toast');
  toast.classList.add('visible');
  // Auto-hide after 4s
  if (claimToastTimer) clearTimeout(claimToastTimer);
  claimToastTimer = setTimeout(function() { toast.classList.remove('visible'); }, 4000);
}

function closeClaimToast() {
  document.getElementById('claim-toast').classList.remove('visible');
  if (claimToastTimer) clearTimeout(claimToastTimer);
}

// ---------------------------------------------------------------------------
// Questers popup — page-specific override
// The shared openQuesters(title, count, rewardType) takes parameters.
// This page-specific version reads from the DOM instead.
// ---------------------------------------------------------------------------
function openQuesters() {
  var title = document.querySelector('.page-header h1').textContent;
  var count = document.getElementById('sp-questers').textContent;
  var rewardBadge = document.querySelector('#header-meta .badge-fcfs, #header-meta .badge-draw, #header-meta .badge-leaderboard');
  var rewardType = rewardBadge ? rewardBadge.textContent.trim() : 'FCFS';

  document.getElementById('qp-quest-title').textContent = title;
  document.getElementById('qp-count').textContent = count;
  document.getElementById('qp-view-all-count').textContent = count;

  var badge = document.getElementById('qp-reward-type');
  badge.textContent = rewardType;
  badge.className = 'badge badge-' + rewardType.toLowerCase().replace(' ', '');

  var sortLabel = document.getElementById('qp-sort-label');
  sortLabel.textContent = rewardType === 'Leaderboard' ? 'sorted by rank' : 'sorted by start time';

  document.getElementById('questers-popup').classList.add('visible');
}
