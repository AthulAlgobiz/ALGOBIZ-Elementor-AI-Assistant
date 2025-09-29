// background.js
chrome.runtime.onInstalled.addListener(async () => {
    // remove existing and re-create to avoid duplicates
    try { await chrome.contextMenus.removeAll(); } catch(e){}
  
    chrome.contextMenus.create({
      id: "generate_ai_content",
      title: "Generate AI content for selection / field",
      contexts: ["editable", "selection"]
    });
  
    chrome.contextMenus.create({
      id: "generate_ai_image",
      title: "Generate AI image and insert",
      contexts: ["image", "editable", "page"]
    });
  });
  
  chrome.contextMenus.onClicked.addListener((info, tab) => {
    if (!tab || !tab.id) return;
    if (info.menuItemId === "generate_ai_content") {
      // signal content script to open generator UI, with selected text (if present)
      chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: (sel) => {
          window.dispatchEvent(new CustomEvent('EA_openAIFromBackground', { detail: { type: 'text', selection: sel || '' } }));
        },
        args: [info.selectionText || ""]
      });
    } else if (info.menuItemId === "generate_ai_image") {
      chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => {
          window.dispatchEvent(new CustomEvent('EA_openAIFromBackground', { detail: { type: 'image' } }));
        }
      });
    }
  });
  