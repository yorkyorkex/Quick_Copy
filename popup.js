const GUMROAD_PRODUCT_URL = "https://gumroad.com/l/your-product";
const VERIFY_API_ENDPOINT = "https://your-vercel-project.vercel.app/api/verify-license";
const MOCK_PRO_KEY = "TEST-PRO-123";

const planStatusEl = document.getElementById("planStatus");
const licenseKeyEl = document.getElementById("licenseKey");
const messageEl = document.getElementById("message");
const activateBtn = document.getElementById("activateBtn");
const upgradeBtn = document.getElementById("upgradeBtn");

init();

async function init() {
  await refreshPlanStatus();

  activateBtn.addEventListener("click", onActivateClick);
  upgradeBtn.addEventListener("click", onUpgradeClick);
}

async function refreshPlanStatus() {
  const { isPro = false, licenseKey = "" } = await chrome.storage.local.get({
    isPro: false,
    licenseKey: ""
  });

  planStatusEl.textContent = isPro ? "Pro" : "Free";
  planStatusEl.classList.toggle("pro", isPro);
  planStatusEl.classList.toggle("free", !isPro);

  if (licenseKey) {
    licenseKeyEl.value = licenseKey;
  }
}

async function onActivateClick() {
  const key = licenseKeyEl.value.trim();
  if (!key) {
    setMessage("Please enter a license key.", true);
    return;
  }

  activateBtn.disabled = true;
  setMessage("Verifying license...");

  try {
    const isValid = await verifyLicenseKey(key);

    if (!isValid) {
      await chrome.storage.local.set({ isPro: false, licenseKey: key });
      await refreshPlanStatus();
      setMessage("Invalid license key.", true);
      return;
    }

    await chrome.storage.local.set({ isPro: true, licenseKey: key });
    await refreshPlanStatus();
    setMessage("Pro unlocked successfully.");
  } catch (error) {
    console.error("License verification failed:", error);
    setMessage("Verification failed. Please try again.", true);
  } finally {
    activateBtn.disabled = false;
  }
}

function onUpgradeClick() {
  chrome.tabs.create({ url: GUMROAD_PRODUCT_URL });
}

async function verifyLicenseKey(key) {
  // Temporary local mock verifier for development.
  if (key === MOCK_PRO_KEY) {
    return true;
  }

  if (!VERIFY_API_ENDPOINT) {
    setMessage("Verification API is not configured.", true);
    return false;
  }

  const response = await fetch(VERIFY_API_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ licenseKey: key })
  });

  if (!response.ok) {
    return false;
  }

  const data = await response.json();
  return Boolean(data && data.valid === true);
}

function setMessage(text, isError = false) {
  messageEl.textContent = text;
  messageEl.style.color = isError ? "#b91c1c" : "#166534";
}
