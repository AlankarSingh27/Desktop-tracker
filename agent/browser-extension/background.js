// Reports to the local agent bridge only - never leaves the machine except
// via the agent's own authenticated upload to the backend.
const BRIDGE_URL = "http://127.0.0.1:34521";

// Tracks the currently-focused tab's URL and how long it's been open, per
// window, so we can compute a duration when the user navigates away.
let currentTab = null; // { tabId, url, title, startTime }

function domainOf(url) {
  try {
    return new URL(url).hostname;
  } catch {
    return undefined;
  }
}

function closeCurrentAndReport() {
  if (!currentTab) return;
  const endTime = new Date();
  const durationSec = Math.round((endTime.getTime() - currentTab.startTime.getTime()) / 1000);
  if (durationSec < 1) {
    currentTab = null;
    return;
  }

  fetch(`${BRIDGE_URL}/tab-activity`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      appName: "Browser",
      windowTitle: currentTab.title,
      url: currentTab.url,
      domain: domainOf(currentTab.url),
      startTime: currentTab.startTime.toISOString(),
      endTime: endTime.toISOString(),
      durationSec,
    }),
  }).catch(() => {
    // agent not running / device not enrolled yet - silently drop rather
    // than retry-storm; the agent's own bucket is the source of truth
  });

  currentTab = null;
}

function openNewTab(tabId, url, title) {
  // ignore internal/browser pages - nothing meaningful to report
  if (!url || url.startsWith("chrome://") || url.startsWith("about:") || url.startsWith("edge://")) {
    currentTab = null;
    return;
  }
  currentTab = { tabId, url, title: title || "", startTime: new Date() };
}

chrome.tabs.onActivated.addListener(async ({ tabId }) => {
  closeCurrentAndReport();
  try {
    const tab = await chrome.tabs.get(tabId);
    openNewTab(tabId, tab.url, tab.title);
  } catch {
    /* tab may have closed already */
  }
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  // fires on navigation within the same tab (new URL, or title finally loaded)
  if (!tab.active) return;
  if (changeInfo.url) {
    closeCurrentAndReport();
    openNewTab(tabId, changeInfo.url, tab.title);
  } else if (changeInfo.title && currentTab && currentTab.tabId === tabId) {
    currentTab.title = changeInfo.title;
  }
});

chrome.windows.onFocusChanged.addListener((windowId) => {
  if (windowId === chrome.windows.WINDOW_ID_NONE) {
    // browser lost focus entirely (user switched to another app) - close out
    closeCurrentAndReport();
  }
});

chrome.downloads.onChanged.addListener((delta) => {
  // wait until the download finishes - only then is filename/fileSize
  // reliably populated (onCreated fires too early, before Chrome has
  // determined the final save path)
  if (!delta.state || delta.state.current !== "complete") return;

  chrome.downloads.search({ id: delta.id }, (results) => {
    const item = results && results[0];
    if (!item) return;

    fetch(`${BRIDGE_URL}/download`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        filename: item.filename?.split(/[\\/]/).pop() || "unknown",
        fileSizeBytes: item.fileSize > 0 ? item.fileSize : undefined,
        sourceUrl: item.url || item.finalUrl,
        sourceDomain: domainOf(item.url || item.finalUrl),
        mimeType: item.mime,
        downloadedAt: new Date().toISOString(),
      }),
    }).catch(() => {});
  });
});
