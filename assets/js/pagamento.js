import {
  getPlanById,
  calculateEventPricing,
  getCoupon,
  normalizeCouponCode
} from "./app.js";

import { generatePixQrCode } from "./pix.js";

const CONFIRMAE_THEME = window.CONFIRMAE_THEME;
const BUSINESS = CONFIRMAE_THEME.business;

const params = new URLSearchParams(window.location.search);
const planId = params.get("plano") || "essential";
const couponCodeParam = params.get("cupom") || "";
const eventIdParam = params.get("evento") || "";
const statusParam = params.get("status") || "solicitado";

/* Elementos do DOM */
const paymentEyebrow = document.getElementById("paymentEyebrow");
const paymentTitle = document.getElementById("paymentTitle");
const paymentDescription = document.getElementById("paymentDescription");
const paymentStatusIcon = document.getElementById("paymentStatusIcon");
const paymentStatusTitle = document.getElementById("paymentStatusTitle");
const paymentStatusText = document.getElementById("paymentStatusText");

const summaryPlanName = document.getElementById("summaryPlanName");
const summaryPlanPrice = document.getElementById("summaryPlanPrice");
const summaryDiscountRow = document.getElementById("summaryDiscountRow");
const summaryDiscount = document.getElementById("summaryDiscount");
const summaryTotal = document.getElementById("summaryTotal");

const pixQrCodeBox = document.getElementById("pixQrCodeBox");
const pixCopyPaste = document.getElementById("pixCopyPaste");
const copyPixButton = document.getElementById("copyPixButton");

const pixHolderText = document.getElementById("pixHolderText");
const pixBankText = document.getElementById("pixBankText");
const pixKeyText = document.getElementById("pixKeyText");

const whatsappComprovanteLink = document.getElementById("whatsappComprovanteLink");
const shareComprovanteButton = document.getElementById("shareComprovanteButton");

/* =========================================================
   Sistema de Toast (não-bloqueante)
   ========================================================= */
function ensureToastContainer() {
  let container = document.querySelector(".toast-container");

  if (!container) {
    container = document.createElement("div");
    container.className = "toast-container";
    document.body.appendChild(container);
  }

  return container;
}

function showToast(message, type = "info", duration = 4000) {
  const container = ensureToastContainer();
  const toast = document.createElement("div");

  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  container.appendChild(toast);

  setTimeout(() => {
    toast.classList.add("is-leaving");
    setTimeout(() => toast.remove(), 320);
  }, duration);
}

/* =========================================================
   Textos por status da URL
   ========================================================= */
const statusContent = {
  solicitado: {
    eyebrow: "Solicitação enviada",
    title: "Pague com Pix para liberar",
    description:
      "Escaneie o QR Code ou use o Pix copia e cola abaixo. Depois, envie o comprovante pelo WhatsApp.",
    icon: "✓",
    statusTitle: "Aguardando pagamento",
    statusText:
      "Seu evento será liberado após a conferência do comprovante."
  },
  pendente: {
    eyebrow: "Pagamento pendente",
    title: "Pague com Pix para liberar",
    description:
      "O pagamento ainda não foi confirmado. Use o QR Code ou o copia e cola abaixo.",
    icon: "!",
    statusTitle: "Aguardando pagamento",
    statusText:
      "Assim que o comprovante for conferido, você receberá o acesso."
  },
  aprovado: {
    eyebrow: "Pagamento aprovado",
    title: "Pagamento confirmado",
    description:
      "Tudo certo! Se ainda não enviou o comprovante, envie pelo WhatsApp para agilizar a liberação.",
    icon: "✓",
    statusTitle: "Liberação em andamento",
    statusText: "Você receberá o acesso pelo WhatsApp em breve."
  },
  erro: {
    eyebrow: "Pagamento não concluído",
    title: "Algo deu errado",
    description:
      "Você pode tentar novamente gerando um novo Pix abaixo.",
    icon: "×",
    statusTitle: "Tente novamente",
    statusText: "Use o QR Code abaixo ou chame o suporte."
  }
};

function applyStatusContent(status) {
  const content = statusContent[status] || statusContent.solicitado;

  paymentEyebrow.textContent = content.eyebrow;
  paymentTitle.textContent = content.title;
  paymentDescription.textContent = content.description;
  paymentStatusIcon.textContent = content.icon;
  paymentStatusTitle.textContent = content.statusTitle;
  paymentStatusText.textContent = content.statusText;
}

/* =========================================================
   Aviso visível quando o cupom não foi aplicado
   ========================================================= */
function showCouponNotice(message, type = "warning") {
  const existing = document.getElementById("couponNotice");

  if (existing) {
    existing.remove();
  }

  const notice = document.createElement("div");
  notice.id = "couponNotice";
  notice.style.cssText = [
    "margin-top: 12px",
    "padding: 12px 16px",
    "border-radius: 12px",
    "font-size: 0.88rem",
    "line-height: 1.5",
    type === "warning"
      ? "background: rgba(250, 204, 21, 0.14)"
      : "background: rgba(239, 68, 68, 0.14)",
    type === "warning"
      ? "border: 1px solid rgba(250, 204, 21, 0.45)"
      : "border: 1px solid rgba(239, 68, 68, 0.45)",
    type === "warning"
      ? "color: #fde68a"
      : "color: #fca5a5"
  ].join(";");
  notice.textContent = message;

  const summaryList = document.querySelector(".payment-summary-list");

  if (summaryList) {
    summaryList.parentElement.appendChild(notice);
  }
}

/* =========================================================
   Montagem dos dados do pedido
   ========================================================= */
async function buildPaymentData() {
  const plan = getPlanById(planId);
  let coupon = null;

  if (couponCodeParam) {
    const normalizedCode = normalizeCouponCode(couponCodeParam);

    console.info(
      `[Pagamento] Cupom na URL: "${couponCodeParam}" | Normalizado: "${normalizedCode}"`
    );

    try {
      coupon = await getCoupon(normalizedCode);

      if (coupon) {
        console.info("[Pagamento] Cupom aplicado com sucesso:", coupon);
      } else {
        console.warn("[Pagamento] Cupom não encontrado no Firestore.");
      }
    } catch (error) {
      console.error("[Pagamento] Erro ao buscar cupom:", error);
    }
  } else {
    console.info("[Pagamento] Nenhum cupom na URL.");
  }

  const pricing = calculateEventPricing(plan.id, coupon);

  console.info("[Pagamento] Cálculo final:", pricing);

  return { plan, coupon, pricing };
}

function renderSummary({ plan, coupon, pricing }) {
  summaryPlanName.textContent = plan.name;
  summaryPlanPrice.textContent = pricing.originalAmountFormatted;

  const discountIsValid =
    coupon &&
    coupon.active !== false &&
    pricing.discountAmount > 0;

  if (discountIsValid) {
    summaryDiscountRow.hidden = false;
    summaryDiscount.textContent =
      `${coupon.code || couponCodeParam} (− ${pricing.discountAmountFormatted})`;
  } else {
    summaryDiscountRow.hidden = true;
  }

  summaryTotal.textContent = pricing.finalAmountFormatted;
}

function renderCouponNotice({ coupon, pricing }) {
  if (!couponCodeParam) {
    return;
  }

  // Caso 1: cupom veio na URL mas não foi encontrado
  if (!coupon) {
    showCouponNotice(
      `O cupom "${couponCodeParam}" não foi encontrado. Se você acha que é um erro, ` +
      `fale com o suporte pelo WhatsApp antes de pagar. Estamos gerando o Pix com o valor cheio do plano.`,
      "warning"
    );
    return;
  }

  // Caso 2: cupom existe mas está inativo
  if (coupon.active === false) {
    showCouponNotice(
      `O cupom "${couponCodeParam}" está inativo. O Pix foi gerado com o valor cheio do plano.`,
      "warning"
    );
    return;
  }

  // Caso 3: cupom existe, ativo, mas desconto é zero (valor mal cadastrado)
  if (pricing.discountAmount <= 0) {
    showCouponNotice(
      `O cupom "${couponCodeParam}" está cadastrado com desconto zero. ` +
      `Fale com o suporte para corrigir. O Pix foi gerado com o valor cheio do plano.`,
      "warning"
    );
  }
}

function renderPixDetails() {
  pixHolderText.textContent = BUSINESS.pixHolder;
  pixBankText.textContent = BUSINESS.pixBank;
  pixKeyText.textContent = BUSINESS.pixKey;
}

/* =========================================================
   WhatsApp com a mensagem pronta para envio de comprovante
   ========================================================= */
function buildWhatsappMessage({ plan, pricing }) {
  const lines = [
    "Olá! Segue o comprovante do Pix para liberação do meu evento no Confirmaê.",
    ""
  ];

  if (eventIdParam) {
    lines.push(`ID do evento: ${eventIdParam}`);
  }

  lines.push(`Plano: ${plan.name}`);
  lines.push(`Valor: ${pricing.finalAmountFormatted}`);

  if (couponCodeParam) {
    lines.push(`Cupom aplicado: ${couponCodeParam}`);
  }

  lines.push("");
  lines.push("Vou anexar o comprovante agora.");

  return lines.join("\n");
}

function configureWhatsappLink(paymentData) {
  const message = buildWhatsappMessage(paymentData);
  const whatsappUrl = `https://wa.me/${BUSINESS.whatsappNumberInternational}?text=${encodeURIComponent(message)}`;

  whatsappComprovanteLink.href = whatsappUrl;
}

/* =========================================================
   Botão de copiar código Pix
   ========================================================= */
async function copyPixToClipboard() {
  if (!pixCopyPaste.value) {
    showToast("Nenhum código Pix disponível para copiar.", "info");
    return;
  }

  try {
    await navigator.clipboard.writeText(pixCopyPaste.value);

    copyPixButton.textContent = "Copiado!";
    showToast("Código Pix copiado!", "success");

    setTimeout(() => {
      copyPixButton.textContent = "Copiar código Pix";
    }, 1800);
  } catch (error) {
    pixCopyPaste.focus();
    pixCopyPaste.select();
    showToast("Selecione o código e copie manualmente.", "info");
  }
}

/* =========================================================
   Botão de compartilhar comprovante (Web Share API)
   ========================================================= */
function configureShareButton() {
  const supportsShare =
    typeof navigator.share === "function" &&
    typeof navigator.canShare === "function";

  if (!supportsShare) {
    shareComprovanteButton.hidden = true;
    return;
  }

  shareComprovanteButton.hidden = false;

  shareComprovanteButton.addEventListener("click", () => {
    const fileInput = document.createElement("input");
    fileInput.type = "file";
    fileInput.accept = "image/*,application/pdf";

    fileInput.addEventListener("change", async (event) => {
      const file = event.target.files && event.target.files[0];

      if (!file) {
        return;
      }

      try {
        const canShareFile = navigator.canShare({ files: [file] });

        if (!canShareFile) {
          showToast(
            "Este tipo de arquivo não pode ser compartilhado. Envie pelo WhatsApp manualmente.",
            "info"
          );
          return;
        }

        await navigator.share({
          files: [file],
          title: "Comprovante Pix",
          text: "Segue o comprovante do Pix."
        });

        showToast("Comprovante compartilhado!", "success");
      } catch (error) {
        if (error.name !== "AbortError") {
          showToast(
            "Não foi possível compartilhar. Envie pelo WhatsApp manualmente.",
            "error"
          );
        }
      }
    });

    fileInput.click();
  });
}

/* =========================================================
   Geração do QR Code e do copia-e-cola
   ========================================================= */
function generateQrCode({ pricing }) {
  const payload = generatePixQrCode(
    {
      key: BUSINESS.pixKeyBrCode,
      name: BUSINESS.pixHolderBrCode,
      city: BUSINESS.pixCityBrCode,
      amount: pricing.finalAmount,
      txid: "***",
      description: "CONFIRMAE"
    },
    pixQrCodeBox
  );

  if (payload) {
    pixCopyPaste.value = payload;
  } else {
    pixCopyPaste.value = "";
    showToast("Não foi possível gerar o QR Code. Atualize a página.", "error");
  }
}

/* =========================================================
   Inicialização
   ========================================================= */
async function init() {
  applyStatusContent(statusParam);
  renderPixDetails();

  try {
    const paymentData = await buildPaymentData();

    renderSummary(paymentData);
    renderCouponNotice(paymentData);
    configureWhatsappLink(paymentData);
    generateQrCode(paymentData);
    configureShareButton();

    copyPixButton.addEventListener("click", copyPixToClipboard);
  } catch (error) {
    console.error(error);
    showToast(
      "Não foi possível preparar o pagamento. Atualize a página e tente novamente.",
      "error"
    );
  }
}

init();
