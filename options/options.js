// options.js
document.addEventListener('DOMContentLoaded', () => {
    const keyField = document.getElementById('api-key');
    const modelField = document.getElementById('api-model');
    chrome.storage.local.get(['ea_openai_key','ea_openai_model'], (res) => {
      keyField.value = res.ea_openai_key || '';
      modelField.value = res.ea_openai_model || 'gpt-4o-mini';
    });
  
    document.getElementById('save').onclick = () => {
      const key = keyField.value.trim();
      const model = modelField.value.trim() || 'gpt-4o-mini';
      chrome.storage.local.set({ ea_openai_key: key, ea_openai_model: model }, () => {
        alert('Saved');
      });
    };
    document.getElementById('clear').onclick = () => {
      chrome.storage.local.remove(['ea_openai_key','ea_openai_model'], () => {
        keyField.value = '';
        alert('Key cleared.');
      });
    };
  });
  