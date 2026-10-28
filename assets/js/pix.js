/* =========================================================
   Confirmaê · Geração de BR Code Pix (EMV)
   =========================================================
   Gera o "copia e cola" do Pix seguindo o padrão EMV
   (Banco Central do Brasil). A função principal
   generatePixPayload() monta a string e calcula o CRC16
   conforme especificação.
   ========================================================= */

const PIX_EMV = {
  PAYLOAD_FORMAT: "00",
  MERCHANT_ACCOUNT: "26",
  MERCHANT_CATEGORY: "52",
  CURRENCY: "53",
  AMOUNT: "54",
  COUNTRY: "58",
  MERCHANT_NAME: "59",
  MERCHANT_CITY: "60",
  ADDITIONAL_DATA: "62",
  CRC: "63"
};

const PIX_GUI = "br.gov.bcb.pix";
const PIX_CURRENCY_BRL = "986";
const PIX_COUNTRY_BR = "BR";

/**
 * Normaliza texto para o padrão EMV: sem acentos, uppercase,
 * apenas caracteres ASCII imprimíveis, com limite de tamanho.
 */
function sanitizePixText(value, maxLength) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\x20-\x7E]/g, "")
    .trim()
    .toUpperCase()
    .slice(0, maxLength);
}

/**
 * Garante que o valor monetário esteja no formato "0.00".
 */
function formatPixAmount(amount) {
  const numericValue = Number(amount || 0);

  if (!Number.isFinite(numericValue) || numericValue < 0) {
    return "0.00";
  }

  return numericValue.toFixed(2);
}

/**
 * Monta um campo EMV: ID + tamanho (2 dígitos) + valor.
 */
function formatPixField(id, value) {
  const stringValue = String(value);
  const length = String(stringValue.length).padStart(2, "0");

  return `${id}${length}${stringValue}`;
}

/**
 * A chave Pix no formato EMV é geralmente telefone
 * internacional: +5511968649673.
 */
function sanitizePixKey(key) {
  return String(key || "").replace(/\s+/g, "").trim();
}

/**
 * Calcula CRC16-CCITT-FALSE (poly 0x1021, init 0xFFFF).
 * Esse é o algoritmo exigido pelo padrão Pix do BCB.
 */
function calculateCRC16(payload) {
  let crc = 0xFFFF;
  const polynomial = 0x1021;

  for (let index = 0; index < payload.length; index += 1) {
    crc ^= payload.charCodeAt(index) << 8;

    for (let bit = 0; bit < 8; bit += 1) {
      if (crc & 0x8000) {
        crc = ((crc << 1) ^ polynomial) & 0xffff;
      } else {
        crc = (crc << 1) & 0xffff;
      }
    }
  }

  return crc.toString(16).toUpperCase().padStart(4, "0");
}

/**
 * Gera o payload completo do Pix (copia e cola).
 *
 * @param {Object} config
 * @param {string} config.key       - Chave Pix (ex: +5511968649673)
 * @param {string} config.name      - Nome do recebedor (máx 25 chars)
 * @param {string} config.city      - Cidade (máx 15 chars)
 * @param {number} config.amount    - Valor em reais (ex: 29.90)
 * @param {string} [config.txid]    - ID da transação ("***" por padrão)
 * @param {string} [config.description] - Descrição curta (opcional)
 * @returns {string} Payload completo com CRC
 */
function generatePixPayload(config) {
  const safeConfig = config || {};

  const pixKey = sanitizePixKey(safeConfig.key);
  const merchantName = sanitizePixText(safeConfig.name, 25) || "RECEBEDOR";
  const merchantCity = sanitizePixText(safeConfig.city, 15) || "BRASIL";
  const amountFormatted = formatPixAmount(safeConfig.amount);
  const txidValue = sanitizePixText(safeConfig.txid || "***", 25) || "***";
  const descriptionValue = sanitizePixText(safeConfig.description || "", 72);

  // Merchant Account Information (campo 26)
  let merchantAccountContent = "";
  merchantAccountContent += formatPixField("00", PIX_GUI);
  merchantAccountContent += formatPixField("01", pixKey);

  if (descriptionValue) {
    merchantAccountContent += formatPixField("02", descriptionValue);
  }

  // Additional Data Field Template (campo 62)
  const additionalData = formatPixField("05", txidValue);

  // Monta o payload antes do CRC
  let payload = "";
  payload += formatPixField(PIX_EMV.PAYLOAD_FORMAT, "01");
  payload += formatPixField(PIX_EMV.MERCHANT_ACCOUNT, merchantAccountContent);
  payload += formatPixField(PIX_EMV.MERCHANT_CATEGORY, "0000");
  payload += formatPixField(PIX_EMV.CURRENCY, PIX_CURRENCY_BRL);

  if (Number(amountFormatted) > 0) {
    payload += formatPixField(PIX_EMV.AMOUNT, amountFormatted);
  }

  payload += formatPixField(PIX_EMV.COUNTRY, PIX_COUNTRY_BR);
  payload += formatPixField(PIX_EMV.MERCHANT_NAME, merchantName);
  payload += formatPixField(PIX_EMV.MERCHANT_CITY, merchantCity);
  payload += formatPixField(PIX_EMV.ADDITIONAL_DATA, additionalData);

  // Bloco do CRC (precisa entrar no cálculo)
  payload += PIX_EMV.CRC + "04";

  const crc = calculateCRC16(payload);

  return payload + crc;
}

/**
 * Gera o QR Code do Pix usando a lib `qrcodejs` (carregada via CDN).
 * Retorna o payload gerado, para uso no "copia e cola".
 */
function generatePixQrCode(config, containerElement) {
  if (!containerElement) {
    return "";
  }

  containerElement.innerHTML = "";

  if (typeof QRCode === "undefined") {
    containerElement.innerHTML =
      '<p class="small-note">Não foi possível carregar o gerador de QR Code. Atualize a página e tente novamente.</p>';
    return "";
  }

  const payload = generatePixPayload(config);

  new QRCode(containerElement, {
    text: payload,
    width: 260,
    height: 260,
    colorDark: "#0D1014",
    colorLight: "#FFFFFF",
    correctLevel: QRCode.CorrectLevel.M
  });

  return payload;
}

export {
  generatePixPayload,
  generatePixQrCode,
  calculateCRC16,
  formatPixAmount
};
