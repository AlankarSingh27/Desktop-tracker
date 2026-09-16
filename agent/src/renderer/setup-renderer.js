const { ipcRenderer } = require("electron");

const submitBtn = document.getElementById("submitBtn");
const msgEl = document.getElementById("msg");

submitBtn.addEventListener("click", async () => {
  const serverBaseUrl = document.getElementById("serverBaseUrl").value.trim();
  const employeeCode = document.getElementById("employeeCode").value.trim();
  const enrollmentSecret = document.getElementById("enrollmentSecret").value.trim();

  if (!serverBaseUrl || !employeeCode || !enrollmentSecret) {
    msgEl.textContent = "All fields are required.";
    msgEl.className = "msg error";
    return;
  }

  submitBtn.disabled = true;
  msgEl.textContent = "Connecting...";
  msgEl.className = "msg";

  const result = await ipcRenderer.invoke("setup:enroll", {
    serverBaseUrl,
    employeeCode,
    enrollmentSecret,
  });

  if (result.success) {
    msgEl.textContent = "Connected. This window will close now.";
    msgEl.className = "msg ok";
  } else {
    msgEl.textContent = result.error || "Enrollment failed.";
    msgEl.className = "msg error";
    submitBtn.disabled = false;
  }
});
