import {
  getQueryParam,
  getEvent,
  findGuest,
  updateGuest,
  getStatusInfo,
  getInitials,
  escapeHtml
} from "./app.js";

const CONFIRMAE_THEME = window.CONFIRMAE_THEME;

const guestGreeting = document.getElementById("guestGreeting");
const eventIntro = document.getElementById("eventIntro");
const eventType = document.getElementById("eventType");
const eventName = document.getElementById("eventName");
const eventDate = document.getElementById("eventDate");
const eventTime = document.getElementById("eventTime");
const eventLocation = document.getElementById("eventLocation");
const confirmationMessage = document.getElementById("confirmationMessage");
const currentStatusBox = document.getElementById("currentStatusBox");
const acceptButton = document.getElementById("acceptButton");
const declineButton = document.getElementById("declineButton");
const guestInitial = document.getElementById("guestInitial");
const guestName = document.getElementById("guestName");
const guestToken = document.getElementById("guestToken");
const invitationQrCodeBox = document.getElementById("invitationQrCodeBox");
const addToCalendarButton = document.getElementById("addToCalendarButton");
const downloadIcsButton = document.getElementById("downloadIcsButton");

const eventId = getQueryParam("evento") || CONFIRMAE_THEME.defaultEventId;
const guestId = getQueryParam("convidado") || "convidado-demo";
let currentEventInfo = null;

function setButtonsDisabled(disabled) {
  acceptButton.disabled = disabled;
  declineButton.disabled = disabled;
  acceptButton.style.opacity = disabled ? "0.5" : "1";
  declineButton.style.opacity = disabled ? "0.5" : "1";
}

function renderStatus(status) {
  const statusInfo = getStatusInfo(status);
  currentStatusBox.innerHTML = `
    <span class="status-dot status-dot-${escapeHtml(statusInfo.className)}"></span>
    <span id="currentStatusText">${escapeHtml(statusInfo.label)}</span>
  `;
}

function renderEventInfo(eventInfo) {
  currentEventInfo = eventInfo;
  eventType.textContent = eventInfo.type || "Evento";
  eventName.textContent = eventInfo.name || "Evento";
  eventIntro.textContent = eventInfo.intro || "Você está recebendo este convite especial. Confirme sua presença para ajudar o anfitrião na organização.";
  eventDate.textContent = eventInfo.date || "Data a definir";
  eventTime.textContent = eventInfo.time || "A definir";
  eventLocation.textContent = eventInfo.location || "Local a definir";
}

function renderInvitationQrCode() {
  if (!invitationQrCodeBox) return;
  invitationQrCodeBox.innerHTML = "";
  if (typeof QRCode === "undefined") {
    invitationQrCodeBox.innerHTML = `<p class="small-note">Não foi possível carregar o QR Code.</p>`;
    return;
  }
  new QRCode(invitationQrCodeBox, { text: window.location.href, width: 220, height: 220, colorDark: "#221b35", colorLight: "#ffffff", correctLevel: QRCode.CorrectLevel.H });
}

// Prepara as datas no formato correto
function getEventDates() {
  const isoDate = currentEventInfo.eventDateIso || new Date().toISOString().split('T')[0];
  const cleanDate = isoDate.replace(/-/g, "");
  
  let cleanTime = "190000"; // Padrão 19h se não tiver hora
  if (currentEventInfo.time) {
    const digits = currentEventInfo.time.replace(/\D/g, "");
    if (digits.length >= 4) cleanTime = digits.padEnd(6, "0").slice(0, 6);
  }

  const dtStart = `${cleanDate}T${cleanTime}`;
  let endHour = parseInt(cleanTime.slice(0, 2)) + 4;
  let endDateStr = cleanDate;
  if (endHour >= 24) {
    endHour -= 24;
    const d = new Date(isoDate);
    d.setDate(d.getDate() + 1);
    endDateStr = d.toISOString().split('T')[0].replace(/-/g, "");
  }
  const dtEnd = `${endDateStr}T${String(endHour).padStart(2, '0')}${cleanTime.slice(2)}`;

  return { dtStart, dtEnd };
}

// BOTÃO 1: Google Calendar (Abre na web, não baixa nada)
addToCalendarButton.addEventListener("click", () => {
  if (!currentEventInfo) return;
  const { dtStart, dtEnd } = getEventDates();
  
  const title = encodeURIComponent(currentEventInfo.name || "Evento");
  const details = encodeURIComponent(`Seu convite para ${currentEventInfo.name}. Não esqueça de levar o QR Code!`);
  const location = encodeURIComponent(currentEventInfo.location || "");

  const url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${dtStart}/${dtEnd}&details=${details}&location=${location}`;
  window.open(url, "_blank");
});

// BOTÃO 2: Baixar ICS (Para iPhone/Outlook)
downloadIcsButton.addEventListener("click", () => {
  if (!currentEventInfo) return;
  const { dtStart, dtEnd } = getEventDates();

  const icsLines = [
    "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Confirmae//Evento//PT", "CALSCALE:GREGORIAN", "METHOD:PUBLISH",
    "BEGIN:VEVENT", `UID:${Date.now()}@confirmae.com.br`,
    `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, "").split(".")[0]}Z`,
    `DTSTART:${dtStart}`, `DTEND:${dtEnd}`,
    `SUMMARY:${currentEventInfo.name || "Evento"}`,
    `LOCATION:${currentEventInfo.location || ""}`,
    `DESCRIPTION:Seu convite para ${currentEventInfo.name}. Não esqueça de levar o QR Code!`,
    "BEGIN:VALARM", "TRIGGER:-P1D", "ACTION:DISPLAY", "DESCRIPTION:Lembrete: O evento é amanhã!", "END:VALARM",
    "BEGIN:VALARM", "TRIGGER:-PT2H", "ACTION:DISPLAY", "DESCRIPTION:Lembrete: O evento começa em 2 horas!", "END:VALARM",
    "END:VEVENT", "END:VCALENDAR"
  ];

  const blob = new Blob([icsLines.join("\r\n")], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `convite-${(currentEventInfo.name || "evento").replace(/\s+/g, '-').toLowerCase()}.ics`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
});

async function renderGuest() {
  setButtonsDisabled(true);
  try {
    const eventInfo = await getEvent(eventId);
    const guest = await findGuest(eventId, guestId);
    renderEventInfo(eventInfo || CONFIRMAE_THEME.demoEvent);

    if (!guest) {
      guestGreeting.textContent = "Convite não encontrado";
      guestName.textContent = "Convidado não localizado";
      guestToken.textContent = `Token: ${guestId}`;
      guestInitial.textContent = "?";
      confirmationMessage.textContent = "Não encontramos este convite. Confira se o link está correto ou fale com o anfitrião.";
      renderStatus("declined");
      setButtonsDisabled(true);
      renderInvitationQrCode();
      return;
    }

    guestGreeting.textContent = `Olá, ${guest.name}!`;
    guestName.textContent = guest.name;
    guestToken.textContent = `Token: ${guest.id}`;
    guestInitial.textContent = getInitials(guest.name);
    renderStatus(guest.status);

    if (guest.status === "accepted") confirmationMessage.textContent = "Sua presença já está confirmada. O anfitrião ficará feliz em receber você!";
    else if (guest.status === "declined") confirmationMessage.textContent = "Você informou que não poderá comparecer. Obrigado por avisar com antecedência.";
    else if (guest.status === "present") confirmationMessage.textContent = "Sua presença foi confirmada e sua chegada já foi registrada na portaria.";
    else confirmationMessage.textContent = "Confirme se você poderá comparecer. Sua resposta ajuda o anfitrião a organizar melhor o evento.";

    renderInvitationQrCode();
    setButtonsDisabled(false);
  } catch (error) {
    console.error(error);
    guestGreeting.textContent = "Erro ao carregar convite";
    confirmationMessage.textContent = "Não foi possível carregar este convite. Confira a conexão com o Firebase.";
    renderStatus("declined");
    renderInvitationQrCode();
    setButtonsDisabled(true);
  }
}

async function acceptInvitation() {
  setButtonsDisabled(true);
  try {
    const updated = await updateGuest(eventId, guestId, { status: "accepted" });
    if (!updated) { alert("Erro ao confirmar."); await renderGuest(); return; }
    await renderGuest();
    alert("Presença confirmada!");
  } catch (error) { console.error(error); alert("Erro."); setButtonsDisabled(false); }
}

async function declineInvitation() {
  if (!confirm("Deseja realmente recusar?")) return;
  setButtonsDisabled(true);
  try {
    const updated = await updateGuest(eventId, guestId, { status: "declined" });
    if (!updated) { alert("Erro ao recusar."); await renderGuest(); return; }
    await renderGuest();
    alert("Resposta registrada.");
  } catch (error) { console.error(error); alert("Erro."); setButtonsDisabled(false); }
}

acceptButton.addEventListener("click", acceptInvitation);
declineButton.addEventListener("click", declineInvitation);

renderGuest();
