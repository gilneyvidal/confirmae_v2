import {
  getQueryParam,
  buildInvitationLink,
  buildWhatsappUnlockLink,
  getEvent,
  saveEvent,
  getGuestsByEvent,
  updateGuest,
  addGuest,
  removeGuest,
  resetDemoGuests,
  getGuestStatusInfo,
  getInitials,
  escapeHtml
} from "./app.js";

const CONFIRMAE_THEME = window.CONFIRMAE_THEME;
const BUSINESS_CONFIG = CONFIRMAE_THEME.business;

const eventIdInput = document.getElementById("eventIdInput");
const eventPanelPinInput = document.getElementById("eventPanelPinInput");
const panelPinHelpText = document.getElementById("panelPinHelpText");
const loadEventButton = document.getElementById("loadEventButton");

const accessLockedSection = document.getElementById("accessLockedSection");
const lockedEventIdText = document.getElementById("lockedEventIdText");
const unlockPriceText = document.getElementById("unlockPriceText");
const pixBankText = document.getElementById("pixBankText");
const pixKeyText = document.getElementById("pixKeyText");
const pixHolderText = document.getElementById("pixHolderText");
const unlockWhatsappLink = document.getElementById("unlockWhatsappLink");
const copyPixButton = document.getElementById("copyPixButton");
const eventWorkspaceSections = document.querySelectorAll("[data-event-workspace]");

const eventConfigForm = document.getElementById("eventConfigForm");
const eventNameInput = document.getElementById("eventNameInput");
const eventTypeInput = document.getElementById("eventTypeInput");
const eventHostInput = document.getElementById("eventHostInput");
const eventDateIsoInput = document.getElementById("eventDateIsoInput");
const eventDateInput = document.getElementById("eventDateInput");
const eventTimeInput = document.getElementById("eventTimeInput");
const eventLocationInput = document.getElementById("eventLocationInput");
const eventIntroInput = document.getElementById("eventIntroInput");

const guestForm = document.getElementById("guestForm");
const guestTableBody = document.getElementById("guestTableBody");
const resetDemoButton = document.getElementById("resetDemoButton");

const exportAllGuestsButton = document.getElementById("exportAllGuestsButton");
const exportAcceptedGuestsButton = document.getElementById("exportAcceptedGuestsButton");
const exportPresentGuestsButton = document.getElementById("exportPresentGuestsButton");
const exportDeclinedGuestsButton = document.getElementById("exportDeclinedGuestsButton");

const totalGuests = document.getElementById("totalGuests");
const waitingGuests = document.getElementById("waitingGuests");
const acceptedGuests = document.getElementById("acceptedGuests");
const declinedGuests = document.getElementById("declinedGuests");
const presentGuests = document.getElementById("presentGuests");

const qrModal = document.getElementById("qrModal");
const closeQrModal = document.getElementById("closeQrModal");
const qrGuestInitial = document.getElementById("qrGuestInitial");
const qrGuestName = document.getElementById("qrGuestName");
const qrGuestLink = document.getElementById("qrGuestLink");
const qrCodeBox = document.getElementById("qrCodeBox");
const copyQrLinkButton = document.getElementById("copyQrLinkButton");
const downloadQrButton = document.getElementById("downloadQrButton");

const pickContactButton = document.getElementById("pickContactButton");
const guestCreatedModal = document.getElementById("guestCreatedModal");
const closeGuestCreatedModal = document.getElementById("closeGuestCreatedModal");
const createdGuestName = document.getElementById("createdGuestName");
const createdGuestPhoneNote = document.getElementById("createdGuestPhoneNote");
const sendWhatsappCreatedBtn = document.getElementById("sendWhatsappCreatedBtn");
const copyCreatedLinkBtn = document.getElementById("copyCreatedLinkBtn");

let currentEventId = getQueryParam("evento") || CONFIRMAE_THEME.defaultEventId;
let currentQrLink = "";
let currentQrGuestName = "";
let currentEventInfo = null;
let currentGuests = [];
let lastCreatedGuest = null;

eventIdInput.value = currentEventId;
eventPanelPinInput.value = getQueryParam("pin") || "";

if ('contacts' in navigator && 'ContactsManager' in window) {
  pickContactButton.hidden = false;
  pickContactButton.addEventListener("click", async () => {
    try {
      const contacts = await navigator.contacts.select(['name', 'tel'], { multiple: false });
      if (contacts.length > 0) {
        const contact = contacts[0];
        if (contact.name && contact.name.length > 0) document.getElementById("guestNameInput").value = contact.name[0];
        if (contact.tel && contact.tel.length > 0) document.getElementById("guestPhoneInput").value = contact.tel[0];
      }
    } catch (err) { console.warn("Busca cancelada.", err); }
  });
}

function getPanelStorageKey(eventId) { return `confirmae_panel_pin_${eventId}`; }
function hideEventWorkspace() { eventWorkspaceSections.forEach((section) => { section.hidden = true; }); }
function showEventWorkspace() { accessLockedSection.hidden = true; eventWorkspaceSections.forEach((section) => { section.hidden = false; }); }
function setTableLoading(message) { guestTableBody.innerHTML = `<tr><td colspan="5">${escapeHtml(message)}</td></tr>`; }

function isPanelPinValid(eventInfo) {
  if (currentEventId === CONFIRMAE_THEME.defaultEventId) return true;
  if (!eventInfo.panelPin) return true;
  const typedPin = eventPanelPinInput.value.trim();
  const storedPin = sessionStorage.getItem(getPanelStorageKey(currentEventId));
  return typedPin === eventInfo.panelPin || storedPin === eventInfo.panelPin;
}

function rememberPanelPin(eventInfo) {
  if (eventInfo && eventInfo.panelPin) sessionStorage.setItem(getPanelStorageKey(currentEventId), eventInfo.panelPin);
}

function showAccessLocked(eventId) {
  lockedEventIdText.textContent = eventId;
  unlockPriceText.textContent = "Planos a partir de R$ 29,90";
  pixBankText.textContent = BUSINESS_CONFIG.pixBank;
  pixKeyText.textContent = BUSINESS_CONFIG.pixKey;
  pixHolderText.textContent = BUSINESS_CONFIG.pixHolder;
  unlockWhatsappLink.href = buildWhatsappUnlockLink(eventId);
  accessLockedSection.hidden = false;
  hideEventWorkspace();
  updateStats([]);
}

function showPanelPinDenied() {
  accessLockedSection.hidden = true;
  hideEventWorkspace();
  updateStats([]);
  panelPinHelpText.textContent = "PIN incorreto. Confira o PIN enviado pelo WhatsApp e tente novamente.";
  eventPanelPinInput.value = "";
  eventPanelPinInput.focus();
  alert("PIN do painel incorreto.");
}

function showPinRequiredMessage() {
  accessLockedSection.hidden = true;
  hideEventWorkspace();
  updateStats([]);
  panelPinHelpText.textContent = "Digite o PIN do painel para acessar o evento.";
  setTableLoading("Informe o ID do evento e o PIN do painel para carregar.");
}

function updateStats(guests) {
  totalGuests.textContent = guests.length;
  waitingGuests.textContent = guests.filter((guest) => guest.status === "waiting").length;
  acceptedGuests.textContent = guests.filter((guest) => guest.status === "accepted").length;
  declinedGuests.textContent = guests.filter((guest) => guest.status === "declined").length;
  presentGuests.textContent = guests.filter((guest) => guest.status === "present").length;
}

function formatDateIsoToLongText(dateIso) {
  if (!dateIso) return "";
  const [year, month, day] = String(dateIso).split("-").map(Number);
  if (!year || !month || !day) return "";
  return new Date(year, month - 1, day).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
}

function formatDateTimeForCsv(value) {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString("pt-BR");
}

function sanitizeFileName(value) {
  return String(value || "evento").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function createCsvCell(value) {
  let safeValue = String(value ?? "");
  if (/^[=+\-@]/.test(safeValue)) safeValue = `'${safeValue}`;
  return `"${safeValue.replaceAll('"', '""')}"`;
}

function downloadCsv(filename, rows) {
  const csvContent = rows.map((row) => row.map(createCsvCell).join(";")).join("\n");
  const blob = new Blob([`\ufeff${csvContent}`], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function getGuestsForExport(type) {
  if (type === "accepted") return currentGuests.filter((g) => g.status === "accepted");
  if (type === "present") return currentGuests.filter((g) => g.status === "present");
  if (type === "declined") return currentGuests.filter((g) => g.status === "declined");
  return currentGuests;
}

function getExportLabel(type) {
  return { all: "todos", accepted: "confirmados", present: "presentes", declined: "recusados" }[type] || "convidados";
}

function exportGuests(type) {
  const list = getGuestsForExport(type);
  if (!list.length) return alert(`Nenhum convidado encontrado para exportar em: ${getExportLabel(type)}.`);
  const header = ["Evento", "ID do evento", "Nome do convidado", "Telefone", "E-mail", "Acompanhantes permitidos", "Status", "Presente com liberação manual", "Data/hora de entrada", "ID do convite", "Link do convite"];
  const rows = list.map((guest) => [
    currentEventInfo?.name || currentEventId, currentEventId, guest.name || "", guest.phone || "", guest.email || "",
    guest.companions || 0, getGuestStatusInfo(guest).label, guest.gateOverride === true ? "Sim" : "Não",
    formatDateTimeForCsv(guest.arrivedAt), guest.id || "", buildInvitationLink(guest.eventId, guest.id)
  ]);
  downloadCsv(`confirmae-${sanitizeFileName(currentEventId)}-${getExportLabel(type)}.csv`, [header, ...rows]);
}

function renderEventConfig(eventInfo) {
  eventNameInput.value = eventInfo.name || "";
  eventTypeInput.value = eventInfo.type || "";
  eventHostInput.value = eventInfo.hostName || "";
  eventDateIsoInput.value = eventInfo.eventDateIso || "";
  eventDateInput.value = eventInfo.date || "";
  eventTimeInput.value = eventInfo.time || "";
  eventLocationInput.value = eventInfo.location || "";
  eventIntroInput.value = eventInfo.intro || "";
}

async function renderGuests() {
  setTableLoading("Carregando convidados...");
  const guests = await getGuestsByEvent(currentEventId);
  currentGuests = guests;
  updateStats(guests);
  if (!guests.length) {
    guestTableBody.innerHTML = `<tr><td colspan="5">Nenhum convidado cadastrado para este evento.</td></tr>`;
    return;
  }
  guestTableBody.innerHTML = guests.map((guest) => {
    const statusInfo = getGuestStatusInfo(guest);
    const link = buildInvitationLink(guest.eventId, guest.id);
    return `
      <tr>
        <td><div class="guest-name-cell"><strong>${escapeHtml(guest.name)}</strong><small>ID: ${escapeHtml(guest.id)}</small></div></td>
        <td><div class="guest-contact-cell"><strong>${escapeHtml(guest.phone || "Sem telefone")}</strong><small>${escapeHtml(guest.email || "Sem e-mail")}</small></div></td>
        <td><span class="status-pill status-pill-${escapeHtml(statusInfo.className)}"><span class="status-dot status-dot-${escapeHtml(statusInfo.className)}"></span>${escapeHtml(statusInfo.label)}</span></td>
        <td>
          <div class="invitation-actions">
            <button type="button" class="btn btn-secondary btn-small" data-action="copy-link" data-link="${escapeHtml(link)}">Copiar link</button>
            <button type="button" class="btn btn-primary btn-small" data-action="show-qr" data-link="${escapeHtml(link)}" data-guest-name="${escapeHtml(guest.name)}">Ver QR</button>
          </div>
        </td>
        <td>
          <div class="table-actions">
            <button type="button" class="btn btn-secondary btn-small" data-action="mark-waiting" data-guest-id="${escapeHtml(guest.id)}">Enviado</button>
            <button type="button" class="btn btn-danger btn-small" data-action="remove" data-guest-id="${escapeHtml(guest.id)}">Remover</button>
          </div>
        </td>
      </tr>
    `;
  }).join("");
}

async function loadCurrentEvent(options = {}) {
  const { silent = false } = options;
  currentEventId = eventIdInput.value.trim() || CONFIRMAE_THEME.defaultEventId;
  eventIdInput.value = currentEventId;
  panelPinHelpText.textContent = "Verificando acesso...";
  loadEventButton.disabled = true;
  loadEventButton.textContent = "Carregando...";

  try {
    const eventInfo = await getEvent(currentEventId);
    currentEventInfo = eventInfo;
    if (!eventInfo || eventInfo.accessEnabled === false) return showAccessLocked(currentEventId);
    if (!isPanelPinValid(eventInfo)) {
      if (silent) showPinRequiredMessage(); else showPanelPinDenied();
      return;
    }
    rememberPanelPin(eventInfo);
    panelPinHelpText.textContent = "Acesso liberado para este evento.";
    renderEventConfig(eventInfo);
    await renderGuests();
    showEventWorkspace();
  } catch (error) {
    console.error(error);
    if (error.code === "event-not-released") showAccessLocked(currentEventId);
    else { alert("Não foi possível carregar o evento."); showAccessLocked(currentEventId); }
  } finally {
    loadEventButton.disabled = false;
    loadEventButton.textContent = "Acessar evento";
  }
}

function openQrModal(guestName, invitationLink) {
  currentQrLink = invitationLink;
  currentQrGuestName = guestName;
  qrGuestInitial.textContent = getInitials(guestName);
  qrGuestName.textContent = guestName;
  qrGuestLink.textContent = invitationLink;
  qrCodeBox.innerHTML = "";
  if (typeof QRCode === "undefined") qrCodeBox.innerHTML = `<p>Erro ao carregar gerador.</p>`;
  else new QRCode(qrCodeBox, { text: invitationLink, width: 220, height: 220, colorDark: "#221b35", colorLight: "#ffffff", correctLevel: QRCode.CorrectLevel.H });
  qrModal.classList.add("is-open");
  qrModal.setAttribute("aria-hidden", "false");
}

function closeModal() {
  qrModal.classList.remove("is-open");
  qrModal.setAttribute("aria-hidden", "true");
  currentQrLink = "";
  currentQrGuestName = "";
  qrCodeBox.innerHTML = "";
}

// NOVA FUNÇÃO PARA SALVAR NA GALERIA (USANDO SHARE API)
async function downloadCurrentQrCode() {
  const canvas = qrCodeBox.querySelector("canvas");
  const image = qrCodeBox.querySelector("img");
  let imageUrl = canvas ? canvas.toDataURL("image/png") : (image ? image.src : "");

  if (!imageUrl) return alert("Não foi possível gerar o QR Code.");

  try {
    if (navigator.share && navigator.canShare) {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const safeName = String(currentQrGuestName || "convidado").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-");
      const file = new File([blob], `qrcode-${safeName}.png`, { type: 'image/png' });
      
      if (navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: 'QR Code do Convite',
          text: 'Salve na galeria ou envie para o convidado.'
        });
        return;
      }
    }
  } catch (error) {
    console.warn("Share API falhou, usando download.", error);
  }

  // Fallback antigo
  const safeGuestName = String(currentQrGuestName || "convidado").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-");
  const link = document.createElement("a");
  link.href = imageUrl;
  link.download = `qrcode-${safeGuestName}.png`;
  link.click();
}

async function copyTextToClipboard(text, successButton = null, defaultText = "") {
  try {
    await navigator.clipboard.writeText(text);
    if (successButton) {
      successButton.textContent = "Copiado!";
      setTimeout(() => { successButton.textContent = defaultText; }, 1400);
    }
  } catch (error) { alert(`Copie manualmente:\n${text}`); }
}

async function handleEventConfigSubmit(event) {
  event.preventDefault();
  const btn = eventConfigForm.querySelector("button[type='submit']");
  btn.disabled = true; btn.textContent = "Salvando...";
  const eventDateIso = eventDateIsoInput.value.trim();
  const dateText = eventDateInput.value.trim() || formatDateIsoToLongText(eventDateIso);

  try {
    await saveEvent(currentEventId, {
      name: eventNameInput.value.trim(), type: eventTypeInput.value.trim(), hostName: eventHostInput.value.trim(),
      eventDateIso, date: dateText, time: eventTimeInput.value.trim(), location: eventLocationInput.value.trim(), intro: eventIntroInput.value.trim()
    });
    alert("Dados do evento salvos!");
    await loadCurrentEvent({ silent: true });
  } catch (error) {
    console.error(error); alert("Erro ao salvar.");
  } finally {
    btn.disabled = false; btn.textContent = "Salvar dados do evento";
  }
}

async function handleGuestFormSubmit(event) {
  event.preventDefault();
  const nameInput = document.getElementById("guestNameInput");
  const phoneInput = document.getElementById("guestPhoneInput");
  const emailInput = document.getElementById("guestEmailInput");
  const companionsInput = document.getElementById("guestCompanionsInput");
  const name = nameInput.value.trim();

  if (!name) return alert("Informe o nome.");

  if (currentEventId !== CONFIRMAE_THEME.defaultEventId && currentEventInfo && currentEventInfo.guestLimit !== null && currentEventInfo.guestLimit !== undefined && currentGuests.length >= Number(currentEventInfo.guestLimit)) {
    return alert(`Seu plano permite até ${currentEventInfo.guestLimit} convidados.`);
  }

  const submitButton = guestForm.querySelector("button[type='submit']");
  submitButton.disabled = true;
  submitButton.textContent = "Criando...";

  try {
    const newGuest = await addGuest({
      eventId: currentEventId, name, phone: phoneInput.value.trim(), email: emailInput.value.trim(), companions: companionsInput.value
    });
    guestForm.reset(); companionsInput.value = 0;
    await renderGuests();

    lastCreatedGuest = newGuest;
    createdGuestName.textContent = newGuest.name;
    
    const link = buildInvitationLink(newGuest.eventId, newGuest.id);
    const msg = encodeURIComponent(`Olá, ${newGuest.name}! Você está convidado(a) para o evento "${currentEventInfo.name}". Por favor, confirme sua presença pelo link abaixo:\n\n${link}`);
    
    let whatsappUrl = `https://wa.me/?text=${msg}`;
    if (newGuest.phone) {
      const digits = newGuest.phone.replace(/\D/g, "");
      if (digits.length >= 10) {
        const intlPhone = digits.startsWith("55") ? digits : `55${digits}`;
        whatsappUrl = `https://wa.me/${intlPhone}?text=${msg}`;
        createdGuestPhoneNote.textContent = `Enviar para: ${newGuest.phone}`;
      }
    } else {
      createdGuestPhoneNote.textContent = "Nenhum telefone cadastrado. Você escolherá o contato no WhatsApp.";
    }

    sendWhatsappCreatedBtn.onclick = () => window.open(whatsappUrl, "_blank");
    copyCreatedLinkBtn.onclick = () => copyTextToClipboard(link, copyCreatedLinkBtn, "Copiar link");

    guestCreatedModal.classList.add("is-open");
    guestCreatedModal.setAttribute("aria-hidden", "false");

  } catch (error) {
    console.error(error);
    if (error.code === "guest-limit-reached") alert(`Limite atingido: ${error.limit}`);
    else alert("Erro ao criar convite.");
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = "Criar convite";
  }
}

async function handleTableClick(event) {
  const btn = event.target.closest("button");
  if (!btn) return;
  const action = btn.dataset.action;

  if (action === "copy-link") return await copyTextToClipboard(btn.dataset.link, btn, "Copiar link");
  if (action === "show-qr") return openQrModal(btn.dataset.guestName, btn.dataset.link);
  if (action === "mark-waiting") {
    btn.disabled = true; btn.textContent = "Salvando...";
    try { await updateGuest(currentEventId, btn.dataset.guestId, { status: "waiting", gateOverride: false }); await renderGuests(); }
    catch (e) { console.error(e); alert("Erro."); }
    return;
  }
  if (action === "remove") {
    if (!confirm("Remover este convidado?")) return;
    try { await removeGuest(currentEventId, btn.dataset.guestId); await renderGuests(); }
    catch (e) { console.error(e); alert("Erro."); }
  }
}

async function handleResetDemo() {
  if (!confirm("Restaurar a demonstração?")) return;
  resetDemoButton.disabled = true; resetDemoButton.textContent = "Restaurando...";
  try {
    await resetDemoGuests();
    currentEventId = CONFIRMAE_THEME.defaultEventId; eventIdInput.value = currentEventId;
    await loadCurrentEvent({ silent: true });
  } catch (e) { console.error(e); alert("Erro."); }
  finally { resetDemoButton.disabled = false; resetDemoButton.textContent = "Restaurar demo"; }
}

eventConfigForm.addEventListener("submit", handleEventConfigSubmit);
guestForm.addEventListener("submit", handleGuestFormSubmit);
guestTableBody.addEventListener("click", handleTableClick);
loadEventButton.addEventListener("click", () => loadCurrentEvent({ silent: false }));
resetDemoButton.addEventListener("click", handleResetDemo);
exportAllGuestsButton.addEventListener("click", () => exportGuests("all"));
exportAcceptedGuestsButton.addEventListener("click", () => exportGuests("accepted"));
exportPresentGuestsButton.addEventListener("click", () => exportGuests("present"));
exportDeclinedGuestsButton.addEventListener("click", () => exportGuests("declined"));

eventDateIsoInput.addEventListener("change", () => {
  if (!eventDateInput.value.trim()) eventDateInput.value = formatDateIsoToLongText(eventDateIsoInput.value);
});

copyPixButton.addEventListener("click", () => copyTextToClipboard(BUSINESS_CONFIG.pixKey, copyPixButton, "Copiar chave Pix"));
closeQrModal.addEventListener("click", closeModal);
qrModal.addEventListener("click", (e) => { if (e.target === qrModal) closeModal(); });
copyQrLinkButton.addEventListener("click", () => copyTextToClipboard(currentQrLink, copyQrLinkButton, "Copiar link"));
downloadQrButton.addEventListener("click", downloadCurrentQrCode);

closeGuestCreatedModal.addEventListener("click", () => { guestCreatedModal.classList.remove("is-open"); guestCreatedModal.setAttribute("aria-hidden", "true"); });
guestCreatedModal.addEventListener("click", (e) => { if (e.target === guestCreatedModal) { guestCreatedModal.classList.remove("is-open"); guestCreatedModal.setAttribute("aria-hidden", "true"); } });

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    if (qrModal.classList.contains("is-open")) closeModal();
    if (guestCreatedModal.classList.contains("is-open")) { guestCreatedModal.classList.remove("is-open"); guestCreatedModal.setAttribute("aria-hidden", "true"); }
  }
});

hideEventWorkspace();
(function tryInitialLoad() {
  const id = eventIdInput.value.trim() || CONFIRMAE_THEME.defaultEventId;
  const pin = eventPanelPinInput.value.trim();
  const stored = sessionStorage.getItem(getPanelStorageKey(id));
  if (id === CONFIRMAE_THEME.defaultEventId || Boolean(pin) || Boolean(stored)) loadCurrentEvent({ silent: true });
  else showPinRequiredMessage();
})();
