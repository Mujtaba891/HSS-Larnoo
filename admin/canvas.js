
/* ══════════════════════════════════════════════
   STATE
══════════════════════════════════════════════ */
let currentMode = 'dnd'; // 'dnd' | 'code'
let selectedBlock = null;
let blockIdCounter = 0;
let subscribers = [];

/* ══════════════════════════════════════════════
   TABS
══════════════════════════════════════════════ */
function showTab(tab) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('screen-' + tab).classList.add('active');
  const idx = { builder: 0, send: 1, subs: 2 }[tab];
  document.querySelectorAll('.tab-btn')[idx].classList.add('active');
  if (tab === 'send') { updateSendCount(); syncSendSubject(); }
  if (tab === 'subs') loadSubscribers();
}

/* ══════════════════════════════════════════════
   MODE TOGGLE
══════════════════════════════════════════════ */
function toggleMode() {
  const btn = document.getElementById('toggle-mode-btn');
  if (currentMode === 'dnd') {
    currentMode = 'code';
    // Sync canvas → code
    const html = getEmailHTML();
    const editor = document.getElementById('code-editor');
    if (editor.value.trim() === '') editor.value = html;
    document.getElementById('dnd-mode').style.display = 'none';
    document.getElementById('code-mode').style.display = 'block';
    btn.innerHTML = '<i class="fas fa-layer-group"></i> Visual Mode';
  } else {
    currentMode = 'dnd';
    document.getElementById('dnd-mode').style.display = 'block';
    document.getElementById('code-mode').style.display = 'none';
    btn.innerHTML = '<i class="fas fa-code"></i> Code Mode';
  }
}

/* ══════════════════════════════════════════════
   DND — DRAG FROM PALETTE
══════════════════════════════════════════════ */
document.querySelectorAll('.palette-item').forEach(item => {
  item.addEventListener('dragstart', e => {
    e.dataTransfer.setData('block-type', item.dataset.block);
    e.dataTransfer.effectAllowed = 'copy';
  });
});

function onDragOver(e) {
  e.preventDefault();
  e.dataTransfer.dropEffect = 'copy';
  document.getElementById('canvas-area').classList.add('drag-over');
}
function onDragLeave() {
  document.getElementById('canvas-area').classList.remove('drag-over');
}
function onDrop(e) {
  e.preventDefault();
  document.getElementById('canvas-area').classList.remove('drag-over');
  const type = e.dataTransfer.getData('block-type');
  if (!type) return;
  appendBlock(type);
}

/* ══════════════════════════════════════════════
   BLOCK DEFINITIONS
══════════════════════════════════════════════ */
const BLOCK_DEFAULTS = {
  header: {
    bgcolor: '#003366', textColor: '#ffffff',
    title: 'HSS Larnoo School Newsletter',
    subtitle: 'Official Communication',
  },
  text: {
    content: 'Write your newsletter content here. You can include important announcements, events, and updates for parents and students.',
    textColor: '#333333', fontSize: '15', align: 'left',
  },
  image: {
    src: 'https://via.placeholder.com/600x200/003366/ffffff?text=School+Image',
    alt: 'School Image', link: '',
  },
  button: {
    label: 'Click Here', href: '#', bgcolor: '#FF9933', textColor: '#ffffff',
  },
  divider: { color: '#dddddd', thickness: '1' },
  spacer:  { height: '24' },
  footer: {
    text: 'HSS Larnoo, Larnoo, Jammu & Kashmir',
    bgcolor: '#003366', textColor: '#aaaaaa',
    unsub: 'You are receiving this because you subscribed to HSS Larnoo newsletters.',
  },
  announcement: {
    title: '📢 Important Notice',
    content: 'Please note the following important announcement from the school administration.',
    bgcolor: '#fff8e1', borderColor: '#FF9933',
  },
};

function createBlockHTML(type, data) {
  data = { ...BLOCK_DEFAULTS[type], ...data };
  switch (type) {
    case 'header': return `
      <div style="background:${data.bgcolor}; padding:36px 28px; text-align:center;">
        <p style="color:${data.textColor}; font-size:11px; letter-spacing:2px; text-transform:uppercase; margin-bottom:8px; opacity:.7;">${data.subtitle}</p>
        <h1 style="color:${data.textColor}; font-size:24px; font-weight:800; margin:0; font-family:Georgia,serif;">${data.title}</h1>
        <div style="width:48px; height:3px; background:#FF9933; margin:14px auto 0;"></div>
      </div>`;
    case 'text': return `
      <div style="padding:20px 28px; font-family:Arial,sans-serif; font-size:${data.fontSize}px; color:${data.textColor}; text-align:${data.align}; line-height:1.7;">
        ${data.content}
      </div>`;
    case 'image': return `
      <div style="text-align:center;">
        ${data.link ? `<a href="${data.link}" target="_blank">` : ''}
        <img src="${data.src}" alt="${data.alt}" style="max-width:100%; height:auto; display:block; margin:0 auto;">
        ${data.link ? `</a>` : ''}
      </div>`;
    case 'button': return `
      <div style="text-align:center; padding:20px 28px;">
        <a href="${data.href}" style="display:inline-block; background:${data.bgcolor}; color:${data.textColor}; text-decoration:none; padding:13px 32px; border-radius:6px; font-weight:700; font-size:15px; font-family:Arial,sans-serif;">${data.label}</a>
      </div>`;
    case 'divider': return `
      <div style="padding:0 28px;">
        <hr style="border:none; border-top:${data.thickness}px solid ${data.color}; margin:10px 0;">
      </div>`;
    case 'spacer': return `<div style="height:${data.height}px;"></div>`;
    case 'footer': return `
      <div style="background:${data.bgcolor}; padding:24px 28px; text-align:center;">
        <p style="color:${data.textColor}; font-size:13px; font-family:Arial,sans-serif; margin-bottom:6px;">${data.text}</p>
        <p style="color:#666; font-size:11px; font-family:Arial,sans-serif;">${data.unsub}</p>
      </div>`;
    case 'announcement': return `
      <div style="margin:16px 28px; padding:18px 20px; background:${data.bgcolor}; border-left:4px solid ${data.borderColor}; border-radius:4px;">
        <p style="font-weight:800; font-size:15px; color:#333; margin-bottom:8px; font-family:Arial,sans-serif;">${data.title}</p>
        <p style="color:#555; font-size:14px; line-height:1.6; font-family:Arial,sans-serif;">${data.content}</p>
      </div>`;
    default: return `<div style="padding:12px;"></div>`;
  }
}

/* ══════════════════════════════════════════════
   APPEND BLOCK TO CANVAS
══════════════════════════════════════════════ */
function appendBlock(type, data = {}) {
  const canvas = document.getElementById('canvas-area');
  const empty  = document.getElementById('canvas-empty');
  if (empty) empty.style.display = 'none';

  const id = 'blk-' + (++blockIdCounter);
  const inner = createBlockHTML(type, data);

  const wrapper = document.createElement('div');
  wrapper.className = 'email-block';
  wrapper.dataset.type = type;
  wrapper.dataset.id   = id;
  wrapper.dataset.props = JSON.stringify({ ...BLOCK_DEFAULTS[type], ...data });

  wrapper.innerHTML = `
    <div class="block-toolbar">
      <button onclick="moveBlock('${id}','up')" title="Move Up"><i class="fas fa-chevron-up"></i></button>
      <button onclick="moveBlock('${id}','down')" title="Move Down"><i class="fas fa-chevron-down"></i></button>
      <button class="del" onclick="deleteBlock('${id}')" title="Delete"><i class="fas fa-trash"></i></button>
    </div>
    <div class="block-inner">${inner}</div>
  `;

  wrapper.addEventListener('click', (e) => {
    if (e.target.closest('.block-toolbar')) return;
    selectBlock(wrapper);
  });

  canvas.appendChild(wrapper);
}

/* ══════════════════════════════════════════════
   BLOCK SELECTION & PROPERTIES
══════════════════════════════════════════════ */
function selectBlock(el) {
  if (selectedBlock) selectedBlock.classList.remove('selected');
  selectedBlock = el;
  el.classList.add('selected');
  renderPropsPanel(el);
}

function renderPropsPanel(el) {
  const type  = el.dataset.type;
  const props = JSON.parse(el.dataset.props);
  const panel = document.getElementById('props-panel');

  const FIELDS = {
    header:       [['title','Title','text'],['subtitle','Subtitle','text'],['bgcolor','BG Color','color'],['textColor','Text Color','color']],
    text:         [['content','Content','textarea'],['textColor','Color','color'],['fontSize','Size','text'],['align','Align','select:left|center|right']],
    image:        [['src','Image URL','text'],['alt','Alt Text','text'],['link','Link URL','text']],
    button:       [['label','Label','text'],['href','Link URL','text'],['bgcolor','BG Color','color'],['textColor','Text','color']],
    divider:      [['color','Color','color'],['thickness','Thickness','text']],
    spacer:       [['height','Height (px)','text']],
    footer:       [['text','Address','text'],['unsub','Unsub Text','textarea'],['bgcolor','BG','color'],['textColor','Text','color']],
    announcement: [['title','Title','text'],['content','Content','textarea'],['bgcolor','BG','color'],['borderColor','Border','color']],
  };

  const fields = FIELDS[type] || [];
  let html = `<h3><i class="fas fa-edit"></i> ${type.charAt(0).toUpperCase()+type.slice(1)}</h3>`;

  fields.forEach(([key, lbl, inputType]) => {
    const val = (props[key] || '').toString().replace(/"/g, '&quot;');
    html += `<div class="prop-row"><label>${lbl}</label>`;
    if (inputType === 'textarea') {
      html += `<textarea rows="3" onchange="updateProp('${el.dataset.id}','${key}',this.value)">${props[key]||''}</textarea>`;
    } else if (inputType === 'color') {
      html += `<input type="color" value="${val}" oninput="updateProp('${el.dataset.id}','${key}',this.value)">`;
    } else if (inputType.startsWith('select:')) {
      const opts = inputType.split(':')[1].split('|');
      html += `<select onchange="updateProp('${el.dataset.id}','${key}',this.value)">`;
      opts.forEach(o => { html += `<option value="${o}" ${props[key]===o?'selected':''}>${o}</option>`; });
      html += `</select>`;
    } else {
      html += `<input type="text" value="${val}" oninput="updateProp('${el.dataset.id}','${key}',this.value)">`;
    }
    html += `</div>`;
  });

  panel.innerHTML = html;
}

function updateProp(id, key, value) {
  const el = document.querySelector(`[data-id="${id}"]`);
  if (!el) return;
  const props = JSON.parse(el.dataset.props);
  props[key] = value;
  el.dataset.props = JSON.stringify(props);
  el.querySelector('.block-inner').innerHTML = createBlockHTML(el.dataset.type, props);
}

function deleteBlock(id) {
  const el = document.querySelector(`[data-id="${id}"]`);
  if (el) el.remove();
  const canvas = document.getElementById('canvas-area');
  if (!canvas.querySelector('.email-block')) {
    document.getElementById('canvas-empty').style.display = 'flex';
  }
  document.getElementById('props-panel').innerHTML = '<h3><i class="fas fa-sliders-h"></i> Properties</h3><p class="text-muted" style="font-size:.78rem;">Click a block to edit its properties.</p>';
  selectedBlock = null;
}

function moveBlock(id, dir) {
  const el = document.querySelector(`[data-id="${id}"]`);
  if (!el) return;
  if (dir === 'up' && el.previousElementSibling && el.previousElementSibling.classList.contains('email-block')) {
    el.parentNode.insertBefore(el, el.previousElementSibling);
  } else if (dir === 'down' && el.nextElementSibling && el.nextElementSibling.classList.contains('email-block')) {
    el.parentNode.insertBefore(el.nextElementSibling, el);
  }
}

function clearCanvas() {
  if (!confirm('Clear all blocks?')) return;
  const canvas = document.getElementById('canvas-area');
  canvas.querySelectorAll('.email-block').forEach(el => el.remove());
  document.getElementById('canvas-empty').style.display = 'flex';
  selectedBlock = null;
}

/* ══════════════════════════════════════════════
   GET FINAL HTML
══════════════════════════════════════════════ */
function getEmailHTML() {
  if (currentMode === 'code') {
    return document.getElementById('code-editor').value.trim();
  }
  let inner = '';
  document.querySelectorAll('.email-block').forEach(el => {
    inner += el.querySelector('.block-inner').innerHTML;
  });
  return `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>HSS Larnoo Newsletter</title></head>
<body style="margin:0;padding:0;background:#f4f4f4;font-family:Arial,sans-serif;">
<div style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px #0002;">
${inner}
</div></body></html>`;
}

/* ══════════════════════════════════════════════
   PREVIEW
══════════════════════════════════════════════ */
function openPreview() {
  const html = getEmailHTML();
  const modal = document.getElementById('preview-modal');
  const iframe = document.getElementById('preview-iframe');
  modal.classList.add('show');
  iframe.srcdoc = html;
}
function closePreview() {
  document.getElementById('preview-modal').classList.remove('show');
}

/* ══════════════════════════════════════════════
   INSERT TEMPLATE (Code Mode)
══════════════════════════════════════════════ */
function insertTemplate() {
  appendBlock('header');
  appendBlock('text', { content: 'Dear Parents and Students,<br><br>We are pleased to share the latest updates from HSS Larnoo.' });
  appendBlock('divider');
  appendBlock('announcement', { title: '📢 Important Notice', content: 'School annual function will be held on 15th May 2025. All students must attend in uniform.' });
  appendBlock('spacer');
  appendBlock('footer');
  toggleMode(); // switch to code after building
  const html = getEmailHTML();
  document.getElementById('code-editor').value = html;
  toggleMode(); // back to dnd
}

/* ══════════════════════════════════════════════
   SAVE & NAVIGATE TO SEND
══════════════════════════════════════════════ */
function saveAndGoSend() {
  showTab('send');
}
function syncSendSubject() {
  const sub = document.getElementById('email-subject').value.trim() || 'HSS Larnoo Newsletter';
  const preview = document.getElementById('send-subject-preview');
  if (preview) preview.value = sub;
}

/* ══════════════════════════════════════════════
   SUBSCRIBERS
══════════════════════════════════════════════ */
async function loadSubscribers() {
  const wrap = document.getElementById('subs-table-wrap');
  wrap.innerHTML = '<p class="text-muted"><i class="fas fa-spinner fa-spin"></i> Loading…</p>';
  try {
    const q = window._query(window._col(window._COLL), window._orderBy('subscribedAt', 'desc'));
    const snap = await window._getDocs(q);
    subscribers = [];
    snap.forEach(d => subscribers.push({ id: d.id, ...d.data() }));
    renderSubsTable();
    updateSendCount();
  } catch (e) {
    wrap.innerHTML = `<p class="text-muted">Error: ${e.message}</p>`;
  }
}

function renderSubsTable() {
  const wrap = document.getElementById('subs-table-wrap');
  if (!subscribers.length) { wrap.innerHTML = '<p class="text-muted">No subscribers yet.</p>'; return; }
  let rows = '';
  subscribers.forEach(s => {
    const date = s.subscribedAt ? s.subscribedAt.toDate().toLocaleDateString() : 'N/A';
    rows += `<tr>
      <td>${date}</td>
      <td><strong>${s.email}</strong></td>
      <td><button class="btn btn-danger btn-sm" onclick="removeSubscriber('${s.id}','${s.email}')"><i class="fas fa-user-minus"></i></button></td>
    </tr>`;
  });
  wrap.innerHTML = `<div class="tbl-wrap"><table>
    <thead><tr><th>Subscribed</th><th>Email</th><th></th></tr></thead>
    <tbody>${rows}</tbody>
  </table></div>`;
}

async function addSubscriber() {
  const emailEl = document.getElementById('new-email');
  const alert   = document.getElementById('sub-add-alert');
  const email   = emailEl.value.trim();
  if (!email || !/\S+@\S+\.\S+/.test(email)) {
    showAlert(alert, 'Enter a valid email address.', 'danger'); return;
  }
  if (subscribers.find(s => s.email === email)) {
    showAlert(alert, 'This email is already subscribed.', 'danger'); return;
  }
  try {
    await window._addDoc(window._col(window._COLL), { email, subscribedAt: window._serverTimestamp() });
    showAlert(alert, `${email} added successfully!`, 'success');
    emailEl.value = '';
    loadSubscribers();
  } catch (e) { showAlert(alert, e.message, 'danger'); }
}

async function removeSubscriber(id, email) {
  if (!confirm(`Remove ${email}?`)) return;
  try {
    await window._deleteDoc(window._doc(window._db, window._COLL, id));
    loadSubscribers();
  } catch (e) { alert(e.message); }
}

function updateSendCount() {
  const el = document.getElementById('send-count');
  if (el) el.textContent = subscribers.length;
}

/* ══════════════════════════════════════════════
   SEND NEWSLETTER
══════════════════════════════════════════════ */
async function sendNewsletter() {
  if (!window._ejsReady) { alert('EmailJS not loaded yet. Please wait a moment.'); return; }

  const subject   = document.getElementById('email-subject').value.trim() || 'HSS Larnoo Newsletter';
  const fromName  = document.getElementById('from-name').value.trim() || 'HSS Larnoo';
  const replyTo   = document.getElementById('reply-email').value.trim();
  const html      = getEmailHTML();
  const logEl     = document.getElementById('send-log');
  const progressWrap = document.getElementById('send-progress-wrap');
  const progressBar  = document.getElementById('send-progress-bar');
  const statusAlert  = document.getElementById('send-status');
  const sendBtn      = document.getElementById('send-btn');

  if (!html.trim()) { showAlert(statusAlert, 'Newsletter content is empty. Please build one first.', 'danger'); return; }
  if (!subscribers.length) { showAlert(statusAlert, 'No subscribers found.', 'danger'); return; }

  if (!confirm(`Send this newsletter to ${subscribers.length} subscriber(s)?`)) return;

  sendBtn.disabled = true;
  sendBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending…';
  logEl.innerHTML = '';
  logEl.classList.add('show');
  progressWrap.classList.add('show');
  progressBar.style.width = '0%';
  showAlert(statusAlert, `Sending to ${subscribers.length} subscribers…`, 'info');

  let sent = 0, failed = 0;
  const total = subscribers.length;

  addLog(logEl, `📧 Starting send — ${total} recipients`, 'inf');

  for (let i = 0; i < subscribers.length; i++) {
    const sub = subscribers[i];
    try {
      await emailjs.send(
        window._EMAILJS_SERVICE_ID,
        window._EMAILJS_TEMPLATE_ID,
        {
          to_email:   sub.email,
          from_name:  fromName,
          reply_to:   replyTo || sub.email,
          subject:    subject,
          message_html: html,
          message:    'Please view in an HTML-capable email client.',
        }
      );
      sent++;
      addLog(logEl, `✓ Sent to ${sub.email}`, 'ok');
    } catch (e) {
      failed++;
      addLog(logEl, `✗ Failed: ${sub.email} — ${e.text || e.message || e}`, 'err');
    }
    progressBar.style.width = `${Math.round(((i + 1) / total) * 100)}%`;
    await delay(300); // respect rate limits
  }

  const summary = `Done — ${sent} sent, ${failed} failed`;
  addLog(logEl, `\n🎉 ${summary}`, sent === total ? 'ok' : 'err');
  showAlert(statusAlert, summary, sent === total ? 'success' : 'danger');

  // History
  addHistoryItem(subject, sent, failed);

  sendBtn.disabled = false;
  sendBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Send to All';
}

function addLog(el, msg, cls = '') {
  const line = document.createElement('div');
  line.className = `log-line ${cls}`;
  line.textContent = msg;
  el.appendChild(line);
  el.scrollTop = el.scrollHeight;
}

function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

/* ══════════════════════════════════════════════
   HISTORY
══════════════════════════════════════════════ */
const sentHistory = [];
function addHistoryItem(subject, sent, failed) {
  sentHistory.unshift({ subject, sent, failed, date: new Date().toLocaleString() });
  const el = document.getElementById('history-list');
  el.innerHTML = sentHistory.map(h => `
    <div style="display:flex; justify-content:space-between; align-items:center; padding:10px 0; border-bottom:1px solid var(--border-color)30; flex-wrap:wrap; gap:6px;">
      <div>
        <p style="font-weight:600; font-size:.88rem;">${h.subject}</p>
        <p class="text-muted" style="font-size:.75rem;">${h.date}</p>
      </div>
      <div style="display:flex; gap:6px;">
        <span class="badge badge-blue">${h.sent} sent</span>
        ${h.failed ? `<span class="badge" style="background:#dc354522; color:#f07070;">${h.failed} failed</span>` : ''}
      </div>
    </div>
  `).join('');
}

/* ══════════════════════════════════════════════
   ALERT HELPER
══════════════════════════════════════════════ */
function showAlert(el, msg, type) {
  el.textContent = msg;
  el.className = `alert alert-${type} show`;
}
