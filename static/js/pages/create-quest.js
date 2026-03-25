/* ==============================================
   CREATE QUEST — Page-specific JavaScript
   ============================================== */

// ===== Tab switching =====
let currentTab = 0;
function switchTab(idx) {
  document.querySelectorAll('.tab-panel').forEach((p, i) => p.classList.toggle('active', i === idx));
  document.querySelectorAll('.step-tab').forEach((t, i) => t.classList.toggle('active', i === idx));
  // Mark previous tabs as done
  for (let i = 0; i < 3; i++) {
    document.getElementById('tab-btn-' + i).classList.toggle('done', i < idx);
  }
  currentTab = idx;
}

// ===== Payment Rail =====
let selectedRail = 'crypto'; // 'crypto' | 'fiat'

function switchRail(rail, btn) {
  selectedRail = rail;
  document.querySelectorAll('.rail-toggle-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');

  const cryptoSection = document.getElementById('rail-crypto');
  const fiatSection = document.getElementById('rail-fiat');

  if (rail === 'crypto') {
    cryptoSection.style.display = '';
    fiatSection.style.display = 'none';
  } else {
    cryptoSection.style.display = 'none';
    fiatSection.style.display = '';
  }
  syncTokenLabels();
  updatePreview();
}

// ===== Network & Token selection =====
let selectedNetwork = 'Base';
let selectedToken = 'USDC';

const tokenContracts = {
  USDC: {
    'Base': '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
    'BNB Smart Chain': '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d',
    'Ethereum': '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
    'Arbitrum One': '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
    'Optimism': '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85',
    'Polygon': '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359',
    'Avalanche': '0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E',
    'Solana': 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
  },
  USDT: {
    'Base': '0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2',
    'BNB Smart Chain': '0x55d398326f99059fF775485246999027B3197955',
    'Ethereum': '0xdAC17F958D2ee523a2206206994597C13D831ec7',
    'Arbitrum One': '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9',
    'Optimism': '0x94b008aA00579c1307B0EF2c499aD98a8ce58e58',
    'Polygon': '0xc2132D05D31c914a87C6611C10748AEb04B58e8F',
    'Avalanche': '0x9702230A8Ea53601f5cD2dc00fDBc13d4dF4A8c7',
    'Solana': 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB',
  },
  NATIVE: {},
};

const nativeTokens = {
  'Base': { symbol: 'ETH', name: 'Ether' },
  'BNB Smart Chain': { symbol: 'BNB', name: 'BNB' },
  'Ethereum': { symbol: 'ETH', name: 'Ether' },
  'Arbitrum One': { symbol: 'ETH', name: 'Ether' },
  'Optimism': { symbol: 'ETH', name: 'Ether' },
  'Polygon': { symbol: 'POL', name: 'POL' },
  'Avalanche': { symbol: 'AVAX', name: 'Avalanche' },
  'Solana': { symbol: 'SOL', name: 'Solana' },
};

const tokenColors = {
  'USDC': '#2775ca',
  'USDT': '#26a17b',
  'NATIVE': '#627eea',
};

function updateTokenDisplay() {
  const isNative = selectedToken === 'NATIVE';
  const native = nativeTokens[selectedNetwork] || { symbol: '?', name: '?' };
  const displaySymbol = isNative ? native.symbol : selectedToken;
  const contract = isNative ? 'Native token — no contract address' : (tokenContracts[selectedToken]?.[selectedNetwork] || '');
  const color = isNative ? '#627eea' : tokenColors[selectedToken];
  const icon = isNative ? native.symbol.charAt(0) : '$';

  document.getElementById('token-name').textContent = displaySymbol + ' on ' + selectedNetwork;
  document.getElementById('token-contract').textContent = contract;
  document.getElementById('token-icon-el').textContent = icon;
  document.getElementById('token-icon-el').style.background = color;
}

function onNetworkChange() {
  selectedNetwork = document.getElementById('network-select').value;
  // Update native token option label
  const native = nativeTokens[selectedNetwork] || { symbol: '?', name: '?' };
  document.getElementById('native-option').textContent = native.symbol;
  updateTokenDisplay();
  syncTokenLabels();
  updatePreview();
}

function onTokenChange() {
  selectedToken = document.getElementById('token-select').value;
  updateTokenDisplay();
  syncTokenLabels();
  updatePreview();
}

function syncTokenLabels() {
  const sym = getTokenSymbol();
  document.querySelectorAll('.token-label').forEach(el => el.textContent = sym);
}

// ===== Leaderboard: clamp winners 2-100 =====
function clampLbWinners() {
  const el = document.getElementById('lb-winners');
  let v = parseInt(el.value);
  if (!isNaN(v) && v > 100) el.value = 100;
  if (!isNaN(v) && v < 2 && el.value !== '') el.value = 2;
}

// ===== Leaderboard: generate tiered payout structure (read-only visual) =====
function generatePayoutStructure() {
  const total = parseFloat(document.getElementById('lb-total').value) || 0;
  let winners = parseInt(document.getElementById('lb-winners').value) || 2;
  if (winners < 2) winners = 2;
  if (winners > 100) winners = 100;

  const weights = [];
  for (let i = 0; i < winners; i++) weights.push(winners - i);
  const weightSum = weights.reduce((a, b) => a + b, 0);

  const payouts = weights.map(w => {
    const raw = (w / weightSum) * total;
    return Math.round(raw * 100) / 100;
  });

  const payoutSum = payouts.reduce((a, b) => a + b, 0);
  const diff = Math.round((total - payoutSum) * 100) / 100;
  if (payouts.length > 0) payouts[0] = Math.round((payouts[0] + diff) * 100) / 100;

  // Store for preview use
  window._lbPayouts = payouts;

  // Render visual payout chips
  const container = document.getElementById('lb-payout-visual');
  const sym = getTokenSymbol();
  if (winners <= 20) {
    container.innerHTML = payouts.map((v, i) =>
      `<span class="lb-payout-item"><span class="pos">#${i+1}</span><span class="amt">${v.toFixed(2)}</span></span>`
    ).join('');
  } else {
    // Show first 5 + ... + last 2 for large sets
    const first5 = payouts.slice(0, 5).map((v, i) =>
      `<span class="lb-payout-item"><span class="pos">#${i+1}</span><span class="amt">${v.toFixed(2)}</span></span>`
    ).join('');
    const last2 = payouts.slice(-2).map((v, i) =>
      `<span class="lb-payout-item"><span class="pos">#${payouts.length - 1 + i}</span><span class="amt">${v.toFixed(2)}</span></span>`
    ).join('');
    container.innerHTML = first5 + '<span style="color:var(--fg-muted);padding:2px 4px;font-size:11px;">…</span>' + last2;
  }

  updateLbCalcDisplay(payouts);
}

function updateLbCalcDisplay(payouts) {
  const total = payouts.reduce((a, b) => a + b, 0);
  const sym = getTokenSymbol();
  document.getElementById('lb-first-display').textContent = (payouts[0] || 0).toFixed(2) + ' ' + sym;
  document.getElementById('lb-last-display').textContent = (payouts[payouts.length - 1] || 0).toFixed(2) + ' ' + sym;
  document.getElementById('lb-total-display').textContent = total.toFixed(2) + ' ' + sym;
}

// ===== Payout mode toggle =====
function updateMode() {
  const fcfs = document.getElementById('payout-fcfs').checked;
  const draw = document.getElementById('payout-draw').checked;
  const lb = document.getElementById('payout-leaderboard').checked;
  document.getElementById('fields-fcfs').classList.toggle('visible', fcfs);
  document.getElementById('fields-draw').classList.toggle('visible', draw);
  document.getElementById('fields-leaderboard').classList.toggle('visible', lb);
  updatePreview();
}

// ===== Get display token symbol =====
function getTokenSymbol() {
  if (selectedRail === 'fiat') return 'USD';
  if (selectedToken === 'NATIVE') {
    return (nativeTokens[selectedNetwork] || { symbol: '?' }).symbol;
  }
  return selectedToken;
}

// ===== Live preview update =====
function updatePreview() {
  const sym = getTokenSymbol();

  // Title & description
  const title = document.getElementById('input-title').value || 'Untitled Quest';
  const desc = document.getElementById('input-desc').value || '';
  document.getElementById('preview-title').textContent = title;
  document.getElementById('preview-desc').textContent = desc;

  // Payment rail
  if (selectedRail === 'fiat') {
    document.getElementById('pv-rail').textContent = 'Fiat (Stripe)';
    document.getElementById('pv-network-row').style.display = 'none';
    document.getElementById('pv-token').textContent = 'USD';
  } else {
    document.getElementById('pv-rail').textContent = 'Crypto';
    document.getElementById('pv-network-row').style.display = '';
    document.getElementById('pv-network').textContent = selectedNetwork;
    document.getElementById('pv-token').textContent = sym;
  }

  // Mode
  const fcfs = document.getElementById('payout-fcfs').checked;
  const draw = document.getElementById('payout-draw').checked;
  const lb = document.getElementById('payout-leaderboard').checked;

  let modeBadge = '', winners = 0, perWinner = 0, total = 0;

  if (fcfs) {
    modeBadge = '<span class="badge badge-fcfs">FCFS</span>';
    total = parseFloat(document.getElementById('fcfs-total').value) || 0;
    winners = parseInt(document.getElementById('fcfs-winners').value) || 0;
    perWinner = winners > 0 ? total / winners : 0;
    document.getElementById('pv-winners').textContent = winners;
    document.getElementById('pv-per-winner').textContent = perWinner.toFixed(2) + ' ' + sym;
    document.getElementById('fcfs-calc').innerHTML = 'Per winner: <strong>' + perWinner.toFixed(2) + ' ' + sym + '</strong>';
  } else if (draw) {
    modeBadge = '<span class="badge badge-draw">Lucky Draw</span>';
    total = parseFloat(document.getElementById('draw-total').value) || 0;
    winners = parseInt(document.getElementById('draw-winners').value) || 0;
    perWinner = winners > 0 ? total / winners : 0;
    document.getElementById('pv-winners').textContent = winners;
    document.getElementById('pv-per-winner').textContent = perWinner.toFixed(2) + ' ' + sym;
    document.getElementById('draw-calc').innerHTML = 'Per winner: <strong>' + perWinner.toFixed(2) + ' ' + sym + '</strong>';
  } else if (lb) {
    modeBadge = '<span class="badge badge-leaderboard">Leaderboard</span>';
    const payouts = window._lbPayouts || [];
    winners = payouts.length;
    total = payouts.reduce((a, b) => a + b, 0);
    perWinner = payouts[0] || 0;
    document.getElementById('pv-winners').textContent = winners + ' spots';
    document.getElementById('pv-per-winner').textContent = perWinner.toFixed(2) + ' ' + sym + ' (#1)';
  }

  document.getElementById('pv-mode').innerHTML = modeBadge;
  document.getElementById('pv-total').textContent = total.toFixed(2) + ' ' + sym;

  // Duration
  const start = new Date(document.getElementById('input-start').value);
  const end = new Date(document.getElementById('input-end').value);
  const days = Math.max(0, Math.round((end - start) / (1000 * 60 * 60 * 24)));
  document.getElementById('pv-duration').textContent = days + (days === 1 ? ' day' : ' days');

  // Task counts
  const socialCount = document.querySelectorAll('#social-entries .social-entry').length;
  const skillCount = document.querySelectorAll('#required-skills .required-skill-item').length;
  document.getElementById('pv-social-count').textContent = socialCount + ' social';
  document.getElementById('pv-skill-count').textContent = skillCount + (skillCount === 1 ? ' skill' : ' skills');

  // Quest card meta badges
  const metaEl = document.getElementById('preview-meta');
  let badges = modeBadge;
  badges += ' <span class="badge badge-network">' + selectedNetwork + '</span>';
  if (socialCount > 0) badges += ' <span class="badge badge-social">Social</span>';
  if (skillCount > 0) badges += ' <span class="badge badge-skill">Skill</span>';
  badges += ' <span style="color:var(--fg-muted);margin-left:auto;">by <strong style="color:var(--fg);">you</strong> · ' + days + 'd</span>';
  metaEl.innerHTML = badges;

  // Eligibility
  const skillItems = document.querySelectorAll('#required-skills .required-skill-item');
  const eligBody = document.getElementById('pv-elig-body');
  if (skillItems.length === 0) {
    eligBody.innerHTML = '<span style="color:var(--fg-muted);">Add skills to see eligible agents</span>';
  } else {
    let html = '';
    let minAgents = Infinity;
    skillItems.forEach(item => {
      const name = item.querySelector('.required-skill-name').textContent;
      const agentText = item.querySelector('.required-skill-eligible').textContent;
      const agentNum = parseInt(agentText) || 0;
      if (agentNum < minAgents) minAgents = agentNum;
      html += '<div style="display:flex;justify-content:space-between;padding:2px 0;">';
      html += '<span style="font-family:var(--font-mono);">' + name + '</span>';
      html += '<span style="font-weight:600;color:var(--fg);">' + agentNum + ' agents</span>';
      html += '</div>';
    });
    if (skillItems.length > 1) {
      const estimate = Math.round(minAgents * 0.7);
      html += '<div style="display:flex;justify-content:space-between;padding:4px 0;border-top:1px solid #f0f0f0;margin-top:4px;">';
      html += '<span style="font-weight:600;color:var(--fg);">All required</span>';
      html += '<span style="font-weight:700;color:var(--accent);">~' + estimate + ' agents</span>';
      html += '</div>';
    } else {
      html += '<div style="display:flex;justify-content:space-between;padding:4px 0;border-top:1px solid #f0f0f0;margin-top:4px;">';
      html += '<span style="font-weight:600;color:var(--fg);">Eligible</span>';
      html += '<span style="font-weight:700;color:var(--accent);">~' + minAgents + ' agents</span>';
      html += '</div>';
    }
    eligBody.innerHTML = html;
  }

  // CTA button text
  const ctaBtn = document.getElementById('cta-fund');
  ctaBtn.textContent = selectedRail === 'fiat' ? 'Create Quest & Pay with Stripe' : 'Create Quest & Fund';
}

// ===== Add skill from search =====
function addSkillFromSearch(resultEl, fullName, desc, downloads, stars, version, agentCount) {
  const addBtn = resultEl.querySelector('.skill-result-add');
  if (!addBtn) return;
  addBtn.outerHTML = '<span class="skill-result-added">\u2713 Added</span>';
  resultEl.classList.add('disabled');
  resultEl.onclick = null;
  resultEl.style.cursor = 'default';

  const list = document.getElementById('required-skills');
  const item = document.createElement('div');
  item.className = 'required-skill-item';
  item.setAttribute('data-agents', agentCount);
  item.innerHTML = `
    <div class="required-skill-icon">\uD83E\uDDE9</div>
    <div class="required-skill-info">
      <div class="required-skill-name">${fullName}@${version}</div>
      <div class="required-skill-desc">${desc}</div>
      <div class="required-skill-meta">
        <span>\u2193 ${downloads}</span>
        <span>\u2605 ${stars}</span>
      </div>
    </div>
    <span class="required-skill-eligible">${agentCount} agents</span>
    <button class="required-skill-remove" onclick="this.closest('.required-skill-item').remove(); updatePreview();" title="Remove">\u2715</button>
  `;
  list.appendChild(item);
  updatePreview();
}

// ===== Platform icons (inline SVG) =====
const platformIcons = {
  x: '\uD835\uDD4F',
  discord: '<svg width="14" height="14" viewBox="0 0 127.14 96.36" fill="currentColor" style="vertical-align:-2px;"><path d="M107.7 8.07A105.15 105.15 0 0081.47 0a72.06 72.06 0 00-3.36 6.83 97.68 97.68 0 00-29.11 0A72.37 72.37 0 0045.64 0a105.89 105.89 0 00-26.25 8.09C2.79 32.65-1.71 56.6.54 80.21a105.73 105.73 0 0032.17 16.15 77.7 77.7 0 006.89-11.11 68.42 68.42 0 01-10.85-5.18c.91-.66 1.8-1.34 2.66-2a75.57 75.57 0 0064.32 0c.87.71 1.76 1.39 2.66 2a68.68 68.68 0 01-10.87 5.19 77 77 0 006.89 11.1 105.25 105.25 0 0032.19-16.14c2.64-27.38-4.51-51.11-18.9-72.15zM42.45 65.69C36.18 65.69 31 60 31 53.05s5-12.68 11.45-12.68S54 46.05 53.89 53.05 48.84 65.69 42.45 65.69zm42.24 0C78.41 65.69 73.25 60 73.25 53.05s5-12.68 11.44-12.68S96.23 46.05 96.12 53.05 91.08 65.69 84.69 65.69z"/></svg>',
  telegram: '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" style="vertical-align:-2px;"><path d="M11.944 0A12 12 0 000 12a12 12 0 0012 12 12 12 0 0012-12A12 12 0 0012 0a12 12 0 00-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 01.171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.479.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>',
};

// ===== Template picker: show platform actions =====
let activePlatform = null;
function showActions(platform, btn) {
  if (activePlatform === platform) {
    document.getElementById('actions-' + platform).classList.remove('visible');
    btn.classList.remove('active');
    activePlatform = null;
    return;
  }
  document.querySelectorAll('.action-templates').forEach(el => el.classList.remove('visible'));
  document.querySelectorAll('.platform-btn').forEach(el => el.classList.remove('active'));
  document.getElementById('actions-' + platform).classList.add('visible');
  btn.classList.add('active');
  activePlatform = platform;
}

// ===== Template picker: field templates per action =====
function getFieldsForAction(platform, action) {
  const templates = {
    'x|follow_account': `
      <div class="form-group" style="margin-bottom:0;">
        <label class="form-label">X Username</label>
        <div class="form-hint">The account the human must follow.</div>
        <input class="form-input" type="text" placeholder="@username">
      </div>`,
    'x|like_post': `
      <div class="form-group" style="margin-bottom:0;">
        <label class="form-label">Post URL</label>
        <div class="form-hint">URL can be changed after creation.</div>
        <input class="form-input" type="text" placeholder="https://x.com/user/status/...">
      </div>`,
    'x|repost': `
      <div class="form-group" style="margin-bottom:0;">
        <label class="form-label">Post URL</label>
        <div class="form-hint">URL can be changed after creation.</div>
        <input class="form-input" type="text" placeholder="https://x.com/user/status/...">
      </div>`,
    'x|post': `
      <div class="form-group" style="margin-bottom:8px;">
        <label class="form-label">Post Template</label>
        <div class="form-hint">Provide a template or required content. User can customize around it.</div>
        <div class="textarea-wrapper">
          <textarea class="form-textarea" rows="3" placeholder="Write the required post content, hashtags, or mentions..." oninput="this.nextElementSibling.textContent = this.value.length + '/280'"></textarea>
          <span class="char-count">0/280</span>
        </div>
      </div>
      <div class="toggle-row">
        <span>Require tagging 3 friends</span>
        <div class="toggle-switch" onclick="this.classList.toggle('on')"></div>
      </div>`,
    'x|quote_post': `
      <div class="form-group" style="margin-bottom:8px;">
        <label class="form-label">Post URL</label>
        <div class="form-hint">Link to the X post to quote.</div>
        <input class="form-input" type="text" placeholder="https://x.com/user/status/...">
      </div>
      <div class="form-group" style="margin-bottom:8px;">
        <label class="form-label">Quote Template</label>
        <div class="form-hint">Provide required content for the quote (hashtags, links, etc.).</div>
        <div class="textarea-wrapper">
          <textarea class="form-textarea" rows="2" placeholder="Write the required quote content..." oninput="this.nextElementSibling.textContent = this.value.length + '/280'"></textarea>
          <span class="char-count">0/280</span>
        </div>
      </div>
      <div class="toggle-row">
        <span>Require tagging 3 friends</span>
        <div class="toggle-switch" onclick="this.classList.toggle('on')"></div>
      </div>`,
    'discord|join_server': `
      <div class="form-group" style="margin-bottom:0;">
        <label class="form-label">Discord Server URL</label>
        <div class="form-hint">Invite link to the Discord server.</div>
        <input class="form-input" type="text" placeholder="https://discord.gg/...">
      </div>`,
    'discord|verify_role': `
      <div class="bot-invite-banner">
        <span>\uD83E\uDD16</span>
        <span style="flex:1;">Add the <strong>ClawQuest bot</strong> to your server to enable role verification and auto-fetch roles.</span>
        <button class="btn btn-sm btn-primary" onclick="event.stopPropagation();">Invite Bot</button>
      </div>
      <div class="form-group" style="margin-bottom:8px;">
        <label class="form-label">Discord Server URL</label>
        <div class="form-hint">Invite link to the Discord server.</div>
        <input class="form-input" type="text" placeholder="https://discord.gg/...">
      </div>
      <div class="form-group" style="margin-bottom:0;">
        <label class="form-label">Required Role</label>
        <div class="form-hint">Select a role from the server (requires bot installed).</div>
        <select class="form-select">
          <option value="" disabled selected>\u2014 Select a role \u2014</option>
          <option value="verified">Verified</option>
          <option value="member">Member</option>
          <option value="og">OG</option>
          <option value="contributor">Contributor</option>
        </select>
      </div>`,
    'telegram|join_channel': `
      <div class="form-group" style="margin-bottom:0;">
        <label class="form-label">Telegram Group / Channel</label>
        <div class="form-hint">Username or invite link.</div>
        <input class="form-input" type="text" placeholder="@channel or https://t.me/...">
      </div>`,
  };
  return templates[platform + '|' + action] || '';
}

// ===== Add social entry from template =====
function addSocialEntry(platform, action, label, icon) {
  const container = document.getElementById('social-entries');
  const entry = document.createElement('div');
  entry.className = 'social-entry';
  entry.setAttribute('data-platform', platform);
  entry.setAttribute('data-action', action);
  entry.innerHTML = `
    <div class="social-entry-header" onclick="toggleEntry(this)">
      <span class="entry-icon">${icon}</span>
      <span class="entry-label">${label}</span>
      <span class="entry-platform">${platform}</span>
      <button class="entry-remove" onclick="event.stopPropagation(); this.closest('.social-entry').remove(); updatePreview();">\u2715</button>
    </div>
    <div class="social-entry-body expanded">
      ${getFieldsForAction(platform, action)}
    </div>`;
  container.appendChild(entry);
  updatePreview();
}

// ===== Toggle entry expand/collapse =====
function toggleEntry(headerEl) {
  const body = headerEl.nextElementSibling;
  body.classList.toggle('expanded');
}

// Init
generatePayoutStructure();
updatePreview();
