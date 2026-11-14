import { getQueryParam, getEvent, findGuest, updateGuest, getStatusInfo, getInitials, escapeHtml } from "./app.js";

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
const saveQrButton = document.getElementById("saveQrButton");

const eventId = getQueryParam("evento") || CONFIRMAE_THEME.defaultEventId;
const guestId = getQueryParam("convidado") || "convidado-demo";
let currentEventInfo = null;

function setButtonsDisabled(disabled) {
  acceptButton.disabled = disabled; declineButton.disabled = disabled;
  acceptButton.style.opacity = disabled ? "0.5" : "1"; declineButton.style.opacity = disabled ? "0.5" : "1";
}

function renderStatus(status) {
  const statusInfo = getStatusInfo(status);
  currentStatusBox.innerHTML = `<span class="status-dot status-dot-${escapeHtml(statusInfo.className)}"></span><span>${escapeHtml(statusInfo.label)}</span>`;
}

function renderEventInfo(eventInfo) {
  currentEventInfo = eventInfo;
  eventType.textContent = eventInfo.type || "Evento";
  eventName.textContent = eventInfo.name || "Evento";
  eventIntro.textContent = eventInfo.intro || "Você está recebendo este convite especial.";
  eventDate.textContent = eventInfo.date || "Data a definir";
  eventTime.textContent = eventInfo.time || "A definir";
  
  const loc = eventInfo.location || "Local a definir";
  eventLocation.textContent = loc;
  if (eventInfo.location) {
    eventLocation.href = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(eventInfo.location)}`;
  } else {
    eventLocation.removeAttribute("href"); eventLocation.style.textDecoration = "none"; eventLocation.style.color = "inherit";
  }
}

function renderInvitationQrCode() {
  if (!invitationQrCodeBox) return;
  invitationQrCodeBox.innerHTML = "";
  if (typeof QRCode === "undefined") { invitationQrCodeBox.innerHTML = `<p class="small-note">Erro ao carregar QR.</p>`; return; }
  new QRCode(invitationQrCodeBox, { text: window.location.href, width: 220, height: 220, colorDark: "#221b35", colorLight: "#ffffff", correctLevel: QRCode.CorrectLevel.H });
}

// =========================================================
// NOVA FUNÇÃO: GERAR O TICKET DE LUXO (HTML5 CANVAS)
// =========================================================
async function generateLuxuryTicket() {
  if (!currentEventInfo) return alert("Aguarde o carregamento do evento.");
  
  saveQrButton.textContent = "Gerando ticket...";
  saveQrButton.disabled = true;

  try {
    // 1. Carrega a imagem de fundo correta
    const theme = currentEventInfo.ticketTheme || "classic";
    const bgImage = new Image();
    bgImage.src = `assets/img/tickets/${theme}.jpg`; // Certifique-se de que os nomes das imagens batem
    
    await new Promise((resolve, reject) => {
      bgImage.onload = resolve;
      bgImage.onerror = () => reject(new Error("Erro ao carregar imagem de fundo."));
    });

    // 2. Prepara o Canvas
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    canvas.width = 1080;
    canvas.height = 1920;

    // 3. Desenha o fundo
    ctx.drawImage(bgImage, 0, 0, canvas.width, canvas.height);

    // 4. Define as cores do texto baseado no tema
    let textColor = "#FFFFFF";
    let subTextColor = "#ACADB3";
    if (theme === "minimalist") {
      textColor = "#2C3E2D"; // Verde escuro
      subTextColor = "#5C6B5D";
    } else if (theme === "neon") {
      textColor = "#21BDC1"; // Ciano
      subTextColor = "#FFFFFF";
    }

    // 5. Desenha os Textos
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    
    // Nome do Evento (Topo)
    ctx.font = "bold 56px Arial, sans-serif";
    ctx.fillStyle = textColor;
    // Se o nome for muito grande, quebra em duas linhas
    const eventNameText = currentEventInfo.name || "Evento";
    if (eventNameText.length > 20) {
      const words = eventNameText.split(" ");
      const mid = Math.ceil(words.length / 2);
      ctx.fillText(words.slice(0, mid).join(" "), 540, 350);
      ctx.fillText(words.slice(mid).join(" "), 540, 420);
    } else {
      ctx.fillText(eventNameText, 540, 380);
    }

    // Data e Hora (Abaixo do nome)
    ctx.font = "32px Arial, sans-serif";
    ctx.fillStyle = subTextColor;
    ctx.fillText(`${currentEventInfo.date || ""} • ${currentEventInfo.time || ""}`, 540, 500);

    // 6. Desenha o QR Code (Usando o canvas gerado pela lib qrcodejs)
    const qrCanvas = invitationQrCodeBox.querySelector("canvas");
    if (!qrCanvas) throw new Error("QR Code não gerado.");
    
    // O QR Code original é 220x220. Vamos ampliar para 400x400 para caber no ticket.
    // A posição central é 540 (meio), então subtraímos 200 (metade do tamanho).
    const qrSize = 400;
    const qrX = (canvas.width - qrSize) / 2;
    const qrY = 750; // Ajuste esta altura se o espaço do QR na imagem for diferente
    
    // Desenha o fundo branco atrás do QR (para garantir leitura)
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(qrX - 20, qrY - 20, qrSize + 40, qrSize + 40);
    
    // Desenha o QR Code
    ctx.drawImage(qrCanvas, qrX, qrY, qrSize, qrSize);

    // 7. Nome do Convidado (Rodapé)
    ctx.font = "bold 48px Arial, sans-serif";
    ctx.fillStyle = textColor;
    ctx.fillText(guestName.textContent, 540, 1550);

    // 8. Código do token (bem miudinho)
    ctx.font = "24px Arial, sans-serif";
    ctx.fillStyle = subTextColor;
    ctx.fillText(`ID: ${guestId}`, 540, 1620);

    // 9. Exporta a imagem
    canvas.toBlob(async (blob) => {
      if (!blob) throw new Error("Erro ao gerar imagem.");
      
      const safeName = String(guestName.textContent || "convidado").normalize('NFD').replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, '-').toLowerCase();
      const file = new File([blob], `ticket-${safeName}.png`, { type: 'image/png' });

      if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: 'Seu Convite de Luxo', text: 'Apresente este ticket na portaria.' });
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a"); a.href = url; a.download = `ticket-${safeName}.png`;
        document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
      }
    }, "image/png");

  } catch (error) {
    console.error(error);
    alert("Não foi possível gerar o ticket: " + error.message);
  } finally {
    saveQrButton.textContent = "Salvar Ticket na Galeria";
    saveQrButton.disabled = false;
  }
}

saveQrButton.addEventListener("click", generateLuxuryTicket);
saveQrButton.textContent = "Salvar Ticket na Galeria"; // Muda o texto do botão

function getEventDates() {
  const isoDate = currentEventInfo.eventDateIso || new Date().toISOString().split('T')[0];
  const cleanDate = isoDate.replace(/-/g, ""); let cleanTime = "190000";
  if (currentEventInfo.time) { const d = currentEventInfo.time.replace(/\D/g, ""); if (d.length >= 4) cleanTime = d.padEnd(6, "0").slice(0, 6); }
  const dtStart = `${cleanDate}T${cleanTime}`; let endHour = parseInt(cleanTime.slice(0, 2)) + 4; let endDateStr = cleanDate;
  if (endHour >= 24) { endHour -= 24; const d = new Date(isoDate); d.setDate(d.getDate() + 1); endDateStr = d.toISOString().split('T')[0].replace(/-/g, ""); }
  const dtEnd = `${endDateStr}T${String(endHour).padStart(2, '0')}${cleanTime.slice(2)}`; return { dtStart, dtEnd };
}

addToCalendarButton.addEventListener("click", () => {
  if (!currentEventInfo) return; const { dtStart, dtEnd } = getEventDates();
  const title = encodeURIComponent(currentEventInfo.name || "Evento"); const details = encodeURIComponent(`Seu convite para ${currentEventInfo.name}.`);
  const loc = encodeURIComponent(currentEventInfo.location || "");
  window.open(`https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${dtStart}/${dtEnd}&details=${details}&location=${loc}`, "_blank");
});

downloadIcsButton.addEventListener("click", () => {
  if (!currentEventInfo) return; const { dtStart, dtEnd } = getEventDates();
  const ics = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Confirmae//Evento//PT", "CALSCALE:GREGORIAN", "METHOD:PUBLISH", "BEGIN:VEVENT", `UID:${Date.now()}@confirmae.com.br`, `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, "").split(".")[0]}Z`, `DTSTART:${dtStart}`, `DTEND:${dtEnd}`, `SUMMARY:${currentEventInfo.name || "Evento"}`, `LOCATION:${currentEventInfo.location || ""}`, `DESCRIPTION:Seu convite para ${currentEventInfo.name}.`, "BEGIN:VALARM", "TRIGGER:-P1D", "ACTION:DISPLAY", "DESCRIPTION:Lembrete: O evento é amanhã!", "END:VALARM", "BEGIN:VALARM", "TRIGGER:-PT2H", "ACTION:DISPLAY", "DESCRIPTION:Lembrete: O evento começa em 2 horas!", "END:VALARM", "END:VEVENT", "END:VCALENDAR"];
  const blob = new Blob([ics.join("\r\n")], { type: "text/calendar;charset=utf-8" }); const url = URL.createObjectURL(blob); const a = document.createElement("a");
  a.href = url; a.download = `convite-${(currentEventInfo.name || "evento").replace(/\s+/g, '-').toLowerCase()}.ics`; document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
});

async function renderGuest() {
  setButtonsDisabled(true);
  try {
    const eventInfo = await getEvent(eventId); const guest = await findGuest(eventId, guestId); renderEventInfo(eventInfo || CONFIRMAE_THEME.demoEvent);
    if (!guest) {
      guestGreeting.textContent = "Convite não encontrado"; guestName.textContent = "Convidado não localizado"; guestToken.textContent = `Token: ${guestId}`; guestInitial.textContent = "?";
      confirmationMessage.textContent = "Não encontramos este convite."; renderStatus("declined"); setButtonsDisabled(true); renderInvitationQrCode(); return;
    }
    guestGreeting.textContent = `Olá, ${guest.name}!`; guestName.textContent = guest.name; guestToken.textContent = `Token: ${guest.id}`; guestInitial.textContent = getInitials(guest.name);
    renderStatus(guest.status);
    if (guest.status === "accepted") confirmationMessage.textContent = "Sua presença já está confirmada. O anfitrião ficará feliz em receber você!";
    else if (guest.status === "declined") confirmationMessage.textContent = "Você informou que não poderá comparecer. Obrigado por avisar!";
    else if (guest.status === "present") confirmationMessage.textContent = "Sua presença foi confirmada e sua chegada já foi registrada.";
    else confirmationMessage.textContent = "Confirme se você poderá comparecer.";
    renderInvitationQrCode(); setButtonsDisabled(false);
  } catch (error) {
    console.error(error); guestGreeting.textContent = "Erro ao carregar"; confirmationMessage.textContent = "Confira sua conexão.";
    renderStatus("declined"); renderInvitationQrCode(); setButtonsDisabled(true);
  }
}

async function acceptInvitation() {
  setButtonsDisabled(true);
  try { const updated = await updateGuest(eventId, guestId, { status: "accepted" }); if (!updated) { alert("Erro."); await renderGuest(); return; } await renderGuest(); alert("Presença confirmada!"); }
  catch (e) { console.error(e); alert("Erro."); setButtonsDisabled(false); }
}

async function declineInvitation() {
  if (!confirm("Deseja realmente recusar?")) return; setButtonsDisabled(true);
  try { const updated = await updateGuest(eventId, guestId, { status: "declined" }); if (!updated) { alert("Erro."); await renderGuest(); return; } await renderGuest(); alert("Resposta registrada."); }
  catch (e) { console.error(e); alert("Erro."); setButtonsDisabled(false); }
}

acceptButton.addEventListener("click", acceptInvitation);
declineButton.addEventListener("click", declineInvitation);
renderGuest();