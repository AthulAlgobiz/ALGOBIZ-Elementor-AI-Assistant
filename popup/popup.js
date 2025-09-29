// popup.js
document.addEventListener('DOMContentLoaded', () => {
  // Note: The `domain` derived from chrome.runtime.getURL('') is not typically the current tab's domain
  // It's usually the extension's internal ID domain.
  // The correct way to get the current tab's domain is already implemented below.

  // Get current tab domain for saving: query active tab
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const t = tabs[0];
    if (!t || !t.url) { // Added check for t.url as well
        console.error("No active tab found or tab has no URL.");
        // Maybe disable elements or show a message if no active tab is found
        document.getElementById('popup-context').disabled = true;
        document.getElementById('save-context').disabled = true;
        return;
    }
    
    try {
      const tabDomain = new URL(t.url).hostname;
      const key = `ea_context_${tabDomain}`;
      
      // Load context
      chrome.storage.local.get([key], (res) => {
        document.getElementById('popup-context').value = res[key] || '';
      });

      // Save context
      document.getElementById('save-context').onclick = () => {
        const v = document.getElementById('popup-context').value;
        chrome.storage.local.set({ [key]: v }, () => {
          // Replaced alert with a more subtle UI feedback or console log for a cleaner UX
          console.log('Saved for ' + tabDomain);
          // Optionally, provide temporary visual feedback:
          const saveButton = document.getElementById('save-context');
          const originalText = saveButton.innerText;
          saveButton.innerText = 'Saved!';
          saveButton.disabled = true; // Prevent rapid clicking
          setTimeout(() => {
              saveButton.innerText = originalText;
              saveButton.disabled = false;
          }, 1500);
        });
      };
    } catch(e) {
      console.warn('Could not get domain for current tab (e.g., chrome:// or about:blank page):', e);
      // Handle cases like chrome://extensions, about:blank, etc.
      // Disable relevant UI elements or display a message
      document.getElementById('popup-context').placeholder = "Context not available for this page type.";
      document.getElementById('popup-context').disabled = true;
      document.getElementById('save-context').disabled = true;
    }
  });
});