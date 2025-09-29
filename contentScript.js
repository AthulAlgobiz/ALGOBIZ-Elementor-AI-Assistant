// contentScript.js
(() => {
  if (window.__EA_INIT__) return;
  window.__EA_INIT__ = true;

  // Floating button markup
  const FLOAT_ID = 'ea-ai-float-btn';
  const PANEL_ID = 'ea-ai-panel';

  // Inject styles for movable/resizable panel
  const injectStyles = () => {
      const style = document.createElement('style');
      style.textContent = `
          #${PANEL_ID} {
              position: fixed;
              z-index: 2147483647;
              top: 50px;
              right: 50px;
              width: 380px;
              min-width: 280px;
              max-width: 90vw;
              height: auto;
              min-height: 250px;
              max-height: 90vh;
              resize: both; /* For modern browsers, but we'll use JS for cross-browser support */
              overflow: hidden;
              border-radius: 8px;
              box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
              background-color: #fff;
              display: flex;
              flex-direction: column;
              user-select: none; /* Prevent text selection during drag/resize */
          }
          #${PANEL_ID} .ea-panel-header {
              cursor: grab;
              padding: 12px;
              background-color: #f0f0f0;
              border-bottom: 1px solid #ddd;
              display: flex;
              justify-content: space-between;
              align-items: center;
          }
          #${PANEL_ID} .ea-panel-header:active {
              cursor: grabbing;
          }
          #${PANEL_ID} .ea-panel-resizer {
              position: absolute;
              bottom: 0;
              right: 0;
              width: 15px;
              height: 15px;
              cursor: nwse-resize;
              background: linear-gradient(to top left, transparent 50%, #ccc 50%);
          }
          #${PANEL_ID} .ea-panel-body {
              flex-grow: 1;
              overflow-y: auto;
              padding: 15px;
          }
      `;
      document.head.appendChild(style);
  };

  // create floating button
  const createFloat = () => {
    if (document.getElementById(FLOAT_ID)) return;
    const btn = document.createElement('button');
    btn.id = FLOAT_ID;
    btn.title = 'AI: Generate content for this field';
    btn.innerText = 'AI';
    btn.style.position = 'fixed';
    btn.style.zIndex = 2147483647;
    btn.style.display = 'none';
    btn.className = 'ea-float-btn';
    document.body.appendChild(btn);

    btn.addEventListener('click', async () => {
      openPanel({ fromFloat: true });
    });
  };

  createFloat();
  injectStyles();

  // track focused editable element
  let currentEditable = null;
  const updateFloatPosition = (el) => {
    const btn = document.getElementById(FLOAT_ID);
    if (!btn) return;
    if (!el) { btn.style.display = 'none'; return; }
    const rect = el.getBoundingClientRect();
    btn.style.top = Math.max(rect.top - 10, 4) + 'px';
    btn.style.left = Math.min(rect.right + 8, window.innerWidth - 44) + 'px';
    btn.style.display = 'block';
  };

  const isEditable = (el) => {
    if (!el) return false;
    if (el.isContentEditable) return true;
    const tag = el.tagName ? el.tagName.toLowerCase() : '';
    if (tag === 'textarea' || (tag === 'input' && ['text','search'].includes(el.type))) return true;
    return false;
  };

  // focus/blur handlers
  document.addEventListener('focusin', (e) => {
    let el = e.target;
    if (isEditable(el)) currentEditable = el;
    else {
      // if inside an Elementor iframe, try find editable within
      currentEditable = null;
    }
    updateFloatPosition(currentEditable);
  });

  document.addEventListener('mousedown', (e) => {
    // hide on general clicks if outside
    const target = e.target;
    if (!isEditable(target) && !target.closest(`#${PANEL_ID}`) && !target.closest(`#${FLOAT_ID}`)) {
      // keep panel open if interacting with panel
    }
  });

  // Panel UI injection
  function openPanel(opts = {}) {
    // remove existing
    const old = document.getElementById(PANEL_ID);
    if (old) old.remove();

    const panel = document.createElement('div');
    panel.id = PANEL_ID;
    panel.className = 'ea-panel';
    panel.innerHTML = `
      <div class="ea-panel-inner">
        <div class="ea-panel-header">
          <strong>AI Content Assistant</strong>
          <button id="ea-close">✕</button>
        </div>
        <div class="ea-panel-body">
          <label>Operation</label>
          <select id="ea-operation">
            <option value="generate">Generate new</option>
            <option value="rewrite">Rewrite / Improve</option>
            <option value="shorten">Shorten</option>
            <option value="expand">Expand</option>
            <option value="seo">SEO Optimize</option>
          </select>

          <label>Context / Company base prompt (saved per domain)</label>
          <textarea id="ea-context" placeholder="Describe the company, tone, audience..."></textarea>

          <label>Word limit (optional)</label>
          <input id="ea-wordlimit" placeholder="e.g., 40" type="number"/>

          <label>Preview / Input</label>
          <textarea id="ea-input" rows="6" placeholder="Selected text (or leave empty to generate fresh)"></textarea>

          <div class="ea-panel-actions">
            <button id="ea-gen" class="primary">Generate</button>
            <button id="ea-insert">Insert into field</button>
            <button id="ea-gen-image">Generate Image</button>
          </div>

          <label>Result</label>
          <textarea id="ea-output" rows="6" placeholder="Result appears here"></textarea>
        </div>
        <div class="ea-panel-resizer"></div>
      </div>
    `;
    document.body.appendChild(panel);

    // Add functionality for moving and resizing
    makeMovable(panel, panel.querySelector('.ea-panel-header'));
    makeResizable(panel, panel.querySelector('.ea-panel-resizer'));

    // load domain-saved context
    const domain = location.hostname;
    chrome.storage.local.get([`ea_context_${domain}`], (res) => {
      const ctx = res[`ea_context_${domain}`] || '';
      panel.querySelector('#ea-context').value = ctx;
    });

    // if selection passed from background, set into input
    if (opts.selection) panel.querySelector('#ea-input').value = opts.selection;

    document.getElementById('ea-close').onclick = () => panel.remove();

    // Generate click
    document.getElementById('ea-gen').onclick = async () => {
      const op = panel.querySelector('#ea-operation').value;
      const ctx = panel.querySelector('#ea-context').value;
      const wl = panel.querySelector('#ea-wordlimit').value;
      const input = panel.querySelector('#ea-input').value;
      // save base prompt for this domain
      chrome.storage.local.set({ [`ea_context_${domain}`]: ctx });

      panel.querySelector('#ea-output').value = 'Generating...';
      try {
        const result = await requestOpenAI({
          operation: op,
          context: ctx,
          inputText: input,
          wordLimit: wl
        });
        panel.querySelector('#ea-output').value = result;
      } catch (err) {
        panel.querySelector('#ea-output').value = 'Error: ' + (err.message || err);
      }
    };

    // Insert into field
    document.getElementById('ea-insert').onclick = () => {
      const out = panel.querySelector('#ea-output').value;
      insertIntoEditable(out);
    };

    // Generate Image
    document.getElementById('ea-gen-image').onclick = async () => {
      const ctx = panel.querySelector('#ea-context').value;
      const input = panel.querySelector('#ea-input').value || ctx || 'hero product photo';
      panel.querySelector('#ea-output').value = 'Generating image...';
      try {
        const imgUrl = await requestOpenAIImage({ prompt: input });
        // insert image into page: create <img> at cursor or append to editable
        insertImage(imgUrl);
        panel.querySelector('#ea-output').value = 'Image inserted.';
      } catch (err){
        panel.querySelector('#ea-output').value = 'Image Error: ' + (err.message||err);
      }
    };
  }
  
  // Make an element movable by dragging a handle
  function makeMovable(element, handle) {
      let isDragging = false;
      let offset = { x: 0, y: 0 };
  
      handle.addEventListener('mousedown', (e) => {
          isDragging = true;
          offset.x = e.clientX - element.offsetLeft;
          offset.y = e.clientY - element.offsetTop;
          element.style.cursor = 'grabbing';
      });
  
      document.addEventListener('mousemove', (e) => {
          if (!isDragging) return;
          let newX = e.clientX - offset.x;
          let newY = e.clientY - offset.y;
  
          // Boundary checks to keep the panel within the viewport
          newX = Math.max(0, Math.min(newX, window.innerWidth - element.offsetWidth));
          newY = Math.max(0, Math.min(newY, window.innerHeight - element.offsetHeight));
  
          element.style.left = newX + 'px';
          element.style.top = newY + 'px';
      });
  
      document.addEventListener('mouseup', () => {
          isDragging = false;
          element.style.cursor = 'default';
      });
  }

  // Make an element resizable from a corner handle
  function makeResizable(element, resizer) {
      let isResizing = false;
  
      resizer.addEventListener('mousedown', (e) => {
          isResizing = true;
          e.preventDefault();
      });
  
      document.addEventListener('mousemove', (e) => {
          if (!isResizing) return;
  
          // Calculate new width and height
          const newWidth = e.clientX - element.offsetLeft + 5;
          const newHeight = e.clientY - element.offsetTop + 5;
  
          // Get min/max from CSS
          const minWidth = parseInt(getComputedStyle(element).minWidth);
          const maxWidth = parseInt(getComputedStyle(element).maxWidth);
          const minHeight = parseInt(getComputedStyle(element).minHeight);
          const maxHeight = parseInt(getComputedStyle(element).maxHeight);
  
          // Apply width and height with boundary checks
          if (newWidth >= minWidth && newWidth <= maxWidth) {
              element.style.width = newWidth + 'px';
          }
          if (newHeight >= minHeight && newHeight <= maxHeight) {
              element.style.height = newHeight + 'px';
          }
      });
  
      document.addEventListener('mouseup', () => {
          isResizing = false;
      });
  }

  function insertIntoEditable(text) {
    try {
      const el = currentEditable || document.activeElement;
      if (!el) return alert('No editable element focused');
      if (el.isContentEditable) {
        // preserve selection if possible
        const sel = window.getSelection();
        if (sel && sel.rangeCount > 0 && sel.anchorNode && el.contains(sel.anchorNode)) {
          sel.deleteFromDocument();
          sel.getRangeAt(0).insertNode(document.createTextNode(text));
        } else {
          // clear and insert
          el.innerText = text;
        }
      } else if (el.tagName.toLowerCase() === 'textarea' || el.tagName.toLowerCase() === 'input') {
        el.value = text;
        el.dispatchEvent(new Event('input', { bubbles: true }));
      } else {
        // fallback: try to set innerText
        el.innerText = text;
      }
    } catch (e) {
      console.error('Insert error', e);
      alert('Failed to insert text into the field. Try clicking inside the field and press the Insert button again.');
    }
  }

  function insertImage(imageUrl) {
    const el = currentEditable || document.activeElement;
    const img = document.createElement('img');
    img.src = imageUrl;
    img.alt = 'AI-generated image';
    img.style.maxWidth = '100%';
    if (el && el.isContentEditable) {
      el.appendChild(img);
    } else {
      // try find nearest editor or insert at body end
      const container = el && el.closest ? el.closest('.elementor-widget') : null;
      if (container) container.appendChild(img);
      else document.body.appendChild(img);
    }
  }

  // Open UI if background uses dispatch
  window.addEventListener('EA_openAIFromBackground', (e) => {
    const sel = e.detail && e.detail.selection ? e.detail.selection : '';
    openPanel({ selection: sel });
  });

  // Helper: get API key and call OpenAI
  async function getApiKey() {
    return new Promise((resolve) => {
      chrome.storage.local.get(['ea_openai_key','ea_openai_model'], (res) => {
        resolve({ apiKey: res.ea_openai_key || '', model: res.ea_openai_model || 'gpt-4o-mini' });
      });
    });
  }

  async function requestOpenAI({ operation, context, inputText, wordLimit }) {
    const { apiKey, model } = await getApiKey();
    if (!apiKey) throw new Error('OpenAI API key not set. Open Options and add your key.');
    // Build system & user prompt
    let systemPrompt = `You are a website copywriter. Follow instructions precisely. Keep output concise and friendly.`;
    if (context && context.trim()) systemPrompt += ' Company context: ' + context.trim();

    let instruction = '';
    if (operation === 'generate') instruction = `Write a website section (short). If a word limit is provided, obey it.`;
    if (operation === 'rewrite') instruction = `Rewrite the given text to be clearer, punchier, and more web-friendly.`;
    if (operation === 'shorten') instruction = `Shorten the given text while preserving meaning.`;
    if (operation === 'expand') instruction = `Expand the given text into a fuller paragraph suitable for a website section.`;
    if (operation === 'seo') instruction = `Rewrite the text to be SEO friendly; include relevant keywords naturally.`;

    if (wordLimit) instruction += ` Limit to approximately ${wordLimit} words.`;

    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `${instruction}\n\nInput:\n${inputText || '(none)'}\n\nReturn only the final text; no commentary.` }
    ];

    const resp = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + apiKey
      },
      body: JSON.stringify({
        model: model,
        messages: messages,
        max_tokens: 500
      })
    });

    if (!resp.ok) {
      const text = await resp.text();
      throw new Error('OpenAI error: ' + resp.status + ' - ' + text);
    }
    const data = await resp.json();
    // get first assistant message
    const out = (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) || (data.choices && data.choices[0] && data.choices[0].text) || '';
    return out.trim();
  }

  async function requestOpenAIImage({ prompt }) {
    const { apiKey } = await getApiKey();
    if (!apiKey) throw new Error('OpenAI API key not set.');
    // Use OpenAI Images endpoint (DALL·E). This example uses /v1/images/generations
    const body = {
      prompt: prompt,
      n: 1,
      size: "1024x1024"
    };
    const resp = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + apiKey
      },
      body: JSON.stringify(body)
    });

    if (!resp.ok) {
      const text = await resp.text();
      throw new Error('Image API error: ' + resp.status + ' - ' + text);
    }
    const data = await resp.json();
    // Following OpenAI image response which can return base64 or URL depending on account
    const url = data.data && data.data[0] && (data.data[0].url || (data.data[0].b64_json ? `data:image/png;base64,${data.data[0].b64_json}` : null));
    if (!url) throw new Error('No image URL returned.');
    return url;
  }

  // initialize
  createFloat();
})();