import {
  getQueryParam, buildInvitationLink, buildWhatsappUnlockLink, getEvent, saveEvent,
  getGuestsByEvent, updateGuest, addGuest, removeGuest, resetDemoGuests,
  getGuestStatusInfo, getInitials, escapeHtml
} from "./app.js";

const CONFIRMAE_THEME = window.CONFIRMAE_THEME;
const BUSINESS_CONFIG = CONFIRMAE_THEME.business;

// Elementos do DOM
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
const eventTimeInput = document.getElementById("eventTimeInput");
const eventLocationInput = document.getElementById("eventLocationInput");
const addressSuggestions = document.getElementById("address-suggestions");
const locationHelpText = document.getElementById("locationHelpText");
const eventIntroCategory = document.getElementById("eventIntroCategory");
const eventIntroVariation = document.getElementById("eventIntroVariation");
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
let currentQrLink = ""; let currentQrGuestName = ""; let currentEventInfo = null;
let currentGuests = []; let lastCreatedGuest = null;

eventIdInput.value = currentEventId;
eventPanelPinInput.value = getQueryParam("pin") || "";

// =========================================================
// TEMPLATES DE MENSAGENS (3 Variações por Categoria)
// =========================================================
const messageTemplates = {
  "casamento": [
    "É com imensa alegria que convidamos você para celebrar o nosso casamento. Sua presença tornará esse dia ainda mais especial!",
    "Com a bênção de Deus e a alegria de nossas famílias, convidamos você para o nosso casamento. Aguardamos você!",
    "O grande dia chegou! Convidamos você para celebrar conosco o início da nossa nova família. Contamos com sua presença."
  ],
  "aniversario": [
    "Prepare a energia e venha comemorar mais um ano de vida comigo. Sua presença é o melhor presente!",
    "Estamos em festa! Venha celebrar mais um ano de conquistas e alegrias ao meu lado. Não falte!",
    "Um novo ciclo começa! Convido você para celebrar essa data especial comigo. Será uma noite inesquecível."
  ],
  "aniversario-infantil": [
    "Estamos em festa! Venha comemorar o aniversário do(a) [Nome da criança] com muita diversão e alegria.",
    "Prepare o sorriso e a fantasia! É hora de celebrar o aniversário do(a) [Nome da criança]. Vai ser muito divertido!",
    "Com muita cor e alegria, convidamos você para a festa de aniversário do(a) [Nome da criança]. Esperamos por você!"
  ],
  "formatura": [
    "É com orgulho que convidamos você para celebrar a conquista da nossa formatura. Venha compartilhar esse momento inesquecível!",
    "A jornada foi longa, mas a vitória chegou! Convidamos você para a nossa colação de grau e festa de formatura.",
    "Celebre conosco o fim de um ciclo e o início de uma nova etapa profissional. Sua presença é fundamental!"
  ],
  "corporativo": [
    "Convidamos você para o nosso evento corporativo. Será uma excelente oportunidade para networking e celebração.",
    "Prezado(a), temos a honra de convidá-lo(a) para o nosso encontro anual. Sua presença engrandece a ocasião.",
    "Marcamos um encontro com o futuro. Participe do nosso evento corporativo e compartilhe ideias e conquistas."
  ],
  "cha-bebe": [
    "Com o coração transbordando de amor, convidamos você para o nosso chá de bebê. Venha celebrar a chegada do nosso pequeno milagre!",
    "Estamos ansiosos pela chegada do nosso bebê e queremos você conosco nessa celebração. Venha ao nosso chá de bebê!",
    "Um novo amor está chegando! Convidamos você para o nosso chá de bebê, um momento de carinho e felicidade."
  ],
  "cha-casa": [
    "Estamos de casa nova! Convidamos você para celebrar essa nova etapa conosco em nosso chá de casa nova.",
    "Nada melhor do que estrear nossa casa com as pessoas que amamos. Venha para o nosso chá de casa nova!",
    "Novos sonhos, novo lar. Convidamos você para conhecer nossa casa nova e celebrar essa conquista com a gente."
  ],
  "festa-junina": [
    "Vem aí o nosso arraial! Prepare o chapéu de palha, a camisa xadrez e venha dançar quadrilha com a gente.",
    "A fogueira já está acesa! Convidamos você para a nossa festa junina. Terá comidas típicas, música e muita diversão.",
    "Prepare o pé de moleque e a pipoca! Está chegando a hora do nosso arraiá. Contamos com sua presença!"
  ],
  "batizado": [
    "Convidamos você para testemunhar o batizado do nosso(a) filho(a). Será um dia de fé, amor e celebração em família.",
    "Com o coração cheio de fé, convidamos você para o batizado do nosso(a) filho(a). Sua presença abençoa este momento.",
    "Um dia especial de bênçãos e renovação. Participe conosco do batizado do nosso(a) filho(a)."
  ]
};

// Autocomplete de Endereço (OpenStreetMap Nominatim)
let addressTimeout = null;
eventLocationInput.addEventListener("input", (e) => {
  const query = e.target.value;
  if (query.length < 4) return;
  
  clearTimeout(addressTimeout);
  addressTimeout = setTimeout(async () => {
    try {
      locationHelpText.textContent = "Buscando endereços...";
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&addressdetails=1`);
      const data = await res.json();
      
      addressSuggestions.innerHTML = "";
      if (data.length > 0) {
        locationHelpText.textContent = "Selecione uma opção na lista.";
        data.forEach(place => {
          const option = document.createElement("option");
          option.value = place.display_name;
          addressSuggestions.appendChild(option);
        });
      } else {
        locationHelpText.textContent = "Nenhum endereço encontrado. Digite manualmente.";
      }
    } catch (err) {
      console.warn("Erro no mapa", err);
      locationHelpText.textContent = "Digite o endereço manualmente.";
    }
  }, 800); // Espera 800ms depois que o usuário para de digitar
});

if ('contacts' in navigator && 'ContactsManager' in window) {
  pickContactButton.hidden = false;
  pickContactButton.addEventListener("click", async () => {
    try {
      const contacts = await navigator.contacts.select(['name', 'tel'], { multiple: false });
      if (contacts.length > 0) {
        const c = contacts[0];
        if (c.name && c.name.length > 0) document.getElementById("guestNameInput").value = c.name[0];
        if (c.tel && c.tel.length > 0) document.getElementById("guestPhoneInput").value = c.tel[0];
      }
    } catch (err) { console.warn("Busca cancelada."); }
  });
}

function getPanelStorageKey(eventId) { return `confirmae_panel_pin_${eventId}`; }
function hideEventWorkspace() { eventWorkspaceSections.forEach((s) => s.hidden = true); }
function showEventWorkspace() { accessLockedSection.hidden = true; eventWorkspaceSections.forEach((s) => s.hidden = false); }
function setTableLoading(msg) { guestTableBody.innerHTML = `<tr><td colspan="5">${escapeHtml(msg)}</td></tr>`; }

function isPanelPinValid(eventInfo) {
  if (currentEventId === CONFIRMAE_THEME.defaultEventId || !eventInfo.panelPin) return true;
  const typedPin = eventPanelPinInput.value.trim();
  const storedPin = sessionStorage.getItem(getPanelStorageKey(currentEventId));
  return typedPin === eventInfo.panelPin || storedPin === eventInfo.panelPin;
}

function rememberPanelPin(eventInfo) {
  if (eventInfo?.panelPin) sessionStorage.setItem(getPanelStorageKey(currentEventId), eventInfo.panelPin);
}

function showAccessLocked(eventId) {
  lockedEventIdText.textContent = eventId;
  unlockPriceText.textContent = "Planos a partir de R$ 29,90";
  pixBankText.textContent = BUSINESS_CONFIG.pixBank;
  pixKeyText.textContent = BUSINESS_CONFIG.pixKey;
  pixHolderText.textContent = BUSINESS_CONFIG.pixHolder;
  unlockWhatsappLink.href = buildWhatsappUnlockLink(eventId);
  accessLockedSection.hidden = false;
  hideEventWorkspace(); updateStats([]);
}

function showPanelPinDenied() {
  accessLockedSection.hidden = true; hideEventWorkspace(); updateStats([]);
  panelPinHelpText.textContent = "PIN incorreto. Tente novamente.";
  eventPanelPinInput.value = ""; eventPanelPinInput.focus();
  alert("PIN do painel incorreto.");
}

function showPinRequiredMessage() {
  accessLockedSection.hidden = true; hideEventWorkspace(); updateStats([]);
  panelPinHelpText.textContent = "Digite o PIN do painel para acessar.";
  setTableLoading("Informe o ID e o PIN.");
}

function updateStats(guests) {
  totalGuests.textContent = guests.length;
  waitingGuests.textContent = guests.filter((g) => g.status === "waiting").length;
  acceptedGuests.textContent = guests.filter((g) => g.status === "accepted").length;
  declinedGuests.textContent = guests.filter((g) => g.status === "declined").length;
  presentGuests.textContent = guests.filter((g) => g.status === "present").length;
}

function formatDateToLongText(dateStr) {
  if (!dateStr) return "";
  const [y, m, d] = String(dateStr).split("-").map(Number);
  if (!y || !m || !d) return "";
  return new Date(y, m - 1, d).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
}

function formatTimeToText(timeStr) {
  if (!timeStr) return "";
  return timeStr.replace(":", "h");
}

function formatDateTimeForCsv(val) {
  if (!val) return "";
  const date = new Date(val);
  return Number.isNaN(date.getTime()) ? String(val) : date.toLocaleString("pt-BR");
}

function sanitizeFileName(val) {
  return String(val || "evento").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function createCsvCell(val) {
  let safe = String(val ?? "");
  if (/^[=+\-@]/.test(safe)) safe = `'${safe}`;
  return `"${safe.replaceAll('"', '""')}"`;
}

function downloadCsv(filename, rows) {
  const csv = rows.map((r) => r.map(createCsvCell).join(";")).join("\n");
  const blob = new Blob([`\ufeff${csv}`], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
}

function getGuestsForExport(type) {
  if (type === "accepted") return currentGuests.filter((g) => g.status === "accepted");
  if (type === "present") return currentGuests.filter((g) => g.status === "present");
  if (type === "declined") return currentGuests.filter((g) => g.status === "declined");
  return currentGuests;
}

function exportGuests(type) {
  const list = getGuestsForExport(type);
  if (!list.length) return alert("Nenhum convidado para exportar.");
  const header = ["Evento", "ID", "Nome", "Telefone", "E-mail", "Acompanhantes", "Status", "Manual", "Data Entrada", "ID Convite", "Link"];
  const rows = list.map((g) => [
    currentEventInfo?.name || currentEventId, currentEventId, g.name, g.phone || "", g.email || "", g.companions || 0,
    getGuestStatusInfo(g).label, g.gateOverride ? "Sim" : "Não", formatDateTimeForCsv(g.arrivedAt), g.id, buildInvitationLink(g.eventId, g.id)
  ]);
  downloadCsv(`confirmae-${sanitizeFileName(currentEventId)}-${type}.csv`, [header, ...rows]);
}

function populateVariations(category) {
  const variations = messageTemplates[category] || [];
  eventIntroVariation.innerHTML = variations.map((text, idx) => `<option value="${idx}">Opção ${idx + 1}</option>`).join("") + '<option value="custom">--- Escrever do zero ---</option>';
  if (variations.length > 0) {
    eventIntroVariation.value = "0";
    eventIntroInput.value = variations[0];
  }
}

eventIntroCategory.addEventListener("change", (e) => {
  populateVariations(e.target.value);
});

eventIntroVariation.addEventListener("change", (e) => {
  const cat = eventIntroCategory.value;
  const val = e.target.value;
  if (val === "custom") {
    eventIntroInput.value = "";
    eventIntroInput.focus();
  } else {
    eventIntroInput.value = messageTemplates[cat][parseInt(val, 10)];
  }
});

function renderEventConfig(eventInfo) {
  eventNameInput.value = eventInfo.name || "";
  eventTypeInput.value = eventInfo.type || "";
  eventHostInput.value = eventInfo.hostName || "";
  eventDateIsoInput.value = eventInfo.eventDateIso || "";
  
  let timeValue = eventInfo.time || "";
  if (timeValue.includes("h")) timeValue = timeValue.replace("h", ":");
  eventTimeInput.value = timeValue;
  
  eventLocationInput.value = eventInfo.location || "";
  eventIntroInput.value = eventInfo.intro || "";

  // Tenta adivinhar a categoria baseada no texto (simplificado)
  let matchedCat = "casamento";
  const intro = eventInfo.intro || "";
  if (intro.includes("aniversário") || intro.includes("vida")) matchedCat = "aniversario";
  else if (intro.includes("formatura") || intro.includes("colação")) matchedCat = "formatura";
  else if (intro.includes("bebê")) matchedCat = "cha-bebe";
  
  eventIntroCategory.value = matchedCat;
  populateVariations(matchedCat);
  eventIntroVariation.value = "custom"; // Assume que o texto já salvo é custom
}

async function renderGuests() {
  setTableLoading("Carregando convidados...");
  const guests = await getGuestsByEvent(currentEventId);
  currentGuests = guests; updateStats(guests);
  if (!guests.length) return setTableLoading("Nenhum convidado cadastrado.");
  
  guestTableBody.innerHTML = guests.map((guest) => {
    const s = getGuestStatusInfo(guest);
    const link = buildInvitationLink(guest.eventId, guest.id);
    return `
      <tr>
        <td><div class="guest-name-cell"><strong>${escapeHtml(guest.name)}</strong><small>ID: ${escapeHtml(guest.id)}</small></div></td>
        <td><div class="guest-contact-cell"><strong>${escapeHtml(guest.phone || "Sem telefone")}</strong><small>${escapeHtml(guest.email || "Sem e-mail")}</small></div></td>
        <td><span class="status-pill status-pill-${escapeHtml(s.className)}"><span class="status-dot status-dot-${escapeHtml(s.className)}"></span>${escapeHtml(s.label)}</span></td>
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
  panelPinHelpText.textContent = "Verificando...";
  loadEventButton.disabled = true; loadEventButton.textContent = "Carregando...";

  try {
    const eventInfo = await getEvent(currentEventId);
    currentEventInfo = eventInfo;
    if (!eventInfo || eventInfo.accessEnabled === false) return showAccessLocked(currentEventId);
    if (!isPanelPinValid(eventInfo)) {
      if (silent) showPinRequiredMessage(); else showPanelPinDenied();
      return;
    }
    rememberPanelPin(eventInfo);
    panelPinHelpText.textContent = "Acesso liberado.";
    renderEventConfig(eventInfo);
    await renderGuests();
    showEventWorkspace();
  } catch (error) {
    console.error(error);
    if (error.code === "event-not-released") showAccessLocked(currentEventId);
    else { alert("Erro ao carregar evento."); showAccessLocked(currentEventId); }
  } finally {
    loadEventButton.disabled = false; loadEventButton.textContent = "Acessar evento";
  }
}

function openQrModal(name, link) {
  currentQrLink = link; currentQrGuestName = name;
  qrGuestInitial.textContent = getInitials(name); qrGuestName.textContent = name; qrGuestLink.textContent = link;
  qrCodeBox.innerHTML = "";
  if (typeof QRCode !== "undefined") new QRCode(qrCodeBox, { text: link, width: 220, height: 220, colorDark: "#221b35", colorLight: "#ffffff", correctLevel: QRCode.CorrectLevel.H });
  qrModal.classList.add("is-open"); qrModal.setAttribute("aria-hidden", "false");
}

function closeModal() {
  qrModal.classList.remove("is-open"); qrModal.setAttribute("aria-hidden", "true");
  currentQrLink = ""; currentQrGuestName = ""; qrCodeBox.innerHTML = "";
}

async function downloadCurrentQrCode() {
  const canvas = qrCodeBox.querySelector("canvas");
  const image = qrCodeBox.querySelector("img");
  const url = canvas ? canvas.toDataURL("image/png") : (image ? image.src : "");
  if (!url) return alert("Gere o QR novamente.");

  try {
    if (navigator.share && navigator.canShare) {
      const res = await fetch(url); const blob = await res.blob();
      const safe = String(currentQrGuestName || "convidado").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-");
      const file = new File([blob], `qrcode-${safe}.png`, { type: 'image/png' });
      if (navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: 'QR Code do Convite' }); return;
      }
    }
  } catch (e) { console.warn("Share falhou."); }

  const safe = String(currentQrGuestName || "convidado").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-");
  const a = document.createElement("a"); a.href = url; a.download = `qrcode-${safe}.png`; a.click();
}

async function copyText(text, btn, defaultText) {
  try {
    await navigator.clipboard.writeText(text);
    if (btn) { btn.textContent = "Copiado!"; setTimeout(() => btn.textContent = defaultText, 1400); }
  } catch (e) { alert(`Copie manualmente:\n${text}`); }
}

async function handleEventConfigSubmit(event) {
  event.preventDefault();
  const btn = eventConfigForm.querySelector("button[type='submit']");
  btn.disabled = true; btn.textContent = "Salvando...";

  const dateIso = eventDateIsoInput.value;
  const timeRaw = eventTimeInput.value;
  const finalIntro = eventIntroInput.value;

  try {
    await saveEvent(currentEventId, {
      name: eventNameInput.value.trim(),
      type: eventTypeInput.value.trim(),
      hostName: eventHostInput.value.trim(),
      eventDateIso: dateIso,
      date: formatDateToLongText(dateIso),
      time: formatTimeToText(timeRaw),
      location: eventLocationInput.value.trim(),
      intro: finalIntro.trim()
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
  const name = document.getElementById("guestNameInput").value.trim();
  const phone = document.getElementById("guestPhoneInput").value.trim();
  const email = document.getElementById("guestEmailInput").value.trim();
  const companions = document.getElementById("guestCompanionsInput").value;

  if (!name) return alert("Informe o nome.");

  const btn = guestForm.querySelector("button[type='submit']");
  btn.disabled = true; btn.textContent = "Criando...";

  try {
    const newGuest = await addGuest({ eventId: currentEventId, name, phone, email, companions });
    guestForm.reset(); document.getElementById("guestCompanionsInput").value = 0;
    await renderGuests();

    createdGuestName.textContent = newGuest.name;
    const link = buildInvitationLink(newGuest.eventId, newGuest.id);
    const msg = encodeURIComponent(`Olá, ${newGuest.name}! Você está convidado(a) para o evento "${currentEventInfo.name}". Confirme sua presença pelo link abaixo:\n\n${link}`);
    
    let waUrl = `https://wa.me/?text=${msg}`;
    if (newGuest.phone) {
      const digits = newGuest.phone.replace(/\D/g, "");
      if (digits.length >= 10) {
        const intl = digits.startsWith("55") ? digits : `55${digits}`;
        waUrl = `https://wa.me/${intl}?text=${msg}`;
        createdGuestPhoneNote.textContent = `Enviar para: ${newGuest.phone}`;
      }
    } else {
      createdGuestPhoneNote.textContent = "Nenhum telefone. Você escolherá o contato.";
    }

    sendWhatsappCreatedBtn.onclick = () => window.open(waUrl, "_blank");
    copyCreatedLinkBtn.onclick = () => copyText(link, copyCreatedLinkBtn, "Copiar link");
    guestCreatedModal.classList.add("is-open"); guestCreatedModal.setAttribute("aria-hidden", "false");

  } catch (error) {
    console.error(error);
    if (error.code === "guest-limit-reached") alert(`Limite atingido: ${error.limit}`);
    else alert("Erro ao criar convite.");
  } finally {
    btn.disabled = false; btn.textContent = "Criar convite";
  }
}

async function handleTableClick(event) {
  const btn = event.target.closest("button"); if (!btn) return;
  const action = btn.dataset.action;
  if (action === "copy-link") return await copyText(btn.dataset.link, btn, "Copiar link");
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

// Event Listeners
eventConfigForm.addEventListener("submit", handleEventConfigSubmit);
guestForm.addEventListener("submit", handleGuestFormSubmit);
guestTableBody.addEventListener("click", handleTableClick);
loadEventButton.addEventListener("click", () => loadCurrentEvent({ silent: false }));
resetDemoButton.addEventListener("click", handleResetDemo);
exportAllGuestsButton.addEventListener("click", () => exportGuests("all"));
exportAcceptedGuestsButton.addEventListener("click", () => exportGuests("accepted"));
exportPresentGuestsButton.addEventListener("click", () => exportGuests("present"));
exportDeclinedGuestsButton.addEventListener("click", () => exportGuests("declined"));

copyPixButton.addEventListener("click", () => copyText(BUSINESS_CONFIG.pixKey, copyPixButton, "Copiar chave Pix"));
closeQrModal.addEventListener("click", closeModal);
qrModal.addEventListener("click", (e) => { if (e.target === qrModal) closeModal(); });
copyQrLinkButton.addEventListener("click", () => copyText(currentQrLink, copyQrLinkButton, "Copiar link"));
downloadQrButton.addEventListener("click", downloadCurrentQrCode);

closeGuestCreatedModal.addEventListener("click", () => { guestCreatedModal.classList.remove("is-open"); guestCreatedModal.setAttribute("aria-hidden", "true"); });
guestCreatedModal.addEventListener("click", (e) => { if (e.target === guestCreatedModal) { guestCreatedModal.classList.remove("is-open"); guestCreatedModal.setAttribute("aria-hidden", "true"); } });

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
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
