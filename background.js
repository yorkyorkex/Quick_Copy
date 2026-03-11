const MENU_ID = "quick-copy-menu";

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: MENU_ID,
    title: "Quick Copy",
    contexts: ["selection"]
  });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId !== MENU_ID || !tab?.id) {
    return;
  }

  const selectedText = (info.selectionText || "").trim();
  if (!selectedText) {
    await showToast(tab.id, "No text selected");
    return;
  }

  try {
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: async (text) => {
        try {
          await navigator.clipboard.writeText(text);
        } catch {
          const textarea = document.createElement("textarea");
          textarea.value = text;
          textarea.style.position = "fixed";
          textarea.style.opacity = "0";
          document.body.appendChild(textarea);
          textarea.focus();
          textarea.select();
          document.execCommand("copy");
          textarea.remove();
        }
      },
      args: [selectedText]
    });

    await showToast(tab.id, "Copied to clipboard");
  } catch (error) {
    console.error("Quick Copy failed:", error);
  }
});

async function showToast(tabId, message) {
  try {
    await chrome.scripting.executeScript({
      target: { tabId },
      func: (toastMessage) => {
        const existing = document.getElementById("quick-copy-toast");
        if (existing) {
          existing.remove();
        }

        const toast = document.createElement("div");
        toast.id = "quick-copy-toast";
        toast.textContent = toastMessage;
        toast.style.position = "fixed";
        toast.style.bottom = "20px";
        toast.style.right = "20px";
        toast.style.zIndex = "2147483647";
        toast.style.background = "#1f2937";
        toast.style.color = "#ffffff";
        toast.style.padding = "8px 12px";
        toast.style.borderRadius = "8px";
        toast.style.fontFamily = "system-ui, sans-serif";
        toast.style.fontSize = "13px";
        toast.style.boxShadow = "0 6px 20px rgba(0, 0, 0, 0.2)";
        toast.style.opacity = "0";
        toast.style.transition = "opacity 160ms ease";

        document.body.appendChild(toast);

        requestAnimationFrame(() => {
          toast.style.opacity = "1";
        });

        setTimeout(() => {
          toast.style.opacity = "0";
          setTimeout(() => toast.remove(), 180);
        }, 1400);
      },
      args: [message]
    });
  } catch {
    // Some pages (for example chrome:// pages) block script injection.
  }
}
