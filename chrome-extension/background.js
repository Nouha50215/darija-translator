// Service worker: context menu + keyboard shortcut -> open side panel with the selected text.

const MENU_TRANSLATE = "darija-translate-selection";
const MENU_OPEN = "darija-open-panel";

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: MENU_TRANSLATE,
    title: 'Translate "%s" to Darija',
    contexts: ["selection"]
  });
  chrome.contextMenus.create({
    id: MENU_OPEN,
    title: "Open Darija Translator",
    contexts: ["page"]
  });
});

// Clicking the toolbar icon opens the side panel too.
chrome.sidePanel
  .setPanelBehavior({ openPanelOnActionClick: true })
  .catch((err) => console.error("setPanelBehavior failed", err));

chrome.contextMenus.onClicked.addListener((info, tab) => {
  // sidePanel.open() must run synchronously inside the user gesture, before any await.
  openPanel(tab);
  if (info.menuItemId === MENU_TRANSLATE) {
    sendSelectionToPanel(tab, info.selectionText);
  }
});

chrome.commands.onCommand.addListener((command, tab) => {
  if (command !== "translate-selection") return;
  openPanel(tab);
  sendSelectionToPanel(tab, "");
});

function openPanel(tab) {
  if (tab && tab.windowId !== undefined) {
    chrome.sidePanel.open({ windowId: tab.windowId }).catch((err) => console.warn("sidePanel.open", err));
  }
}

/**
 * Reads the exact selection from the page (keeps line breaks, which
 * info.selectionText loses) and hands it to the side panel via session storage.
 * Falls back to the context-menu text on pages where scripts can't run (chrome://, PDF viewer...).
 */
async function sendSelectionToPanel(tab, fallbackText) {
  let text = fallbackText || "";
  if (tab && tab.id !== undefined) {
    try {
      const [result] = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => window.getSelection().toString()
      });
      if (result && result.result && result.result.trim()) {
        text = result.result;
      }
    } catch (err) {
      // Restricted page: keep the fallback text.
    }
  }
  text = text.trim();
  if (text) {
    await chrome.storage.session.set({ pendingText: { text, ts: Date.now() } });
  }
}
