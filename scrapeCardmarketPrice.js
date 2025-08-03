const puppeteer = require('puppeteer');

const linguaCodici = {
  it: 5,
  en: 1,
  fr: 2,
  es: 3,
  jo: 4,
  de: 6,
};

function normalizeSetName(setName) {
  // Rimuove caratteri non alfanumerici e sostituisce spazi con "-"
  // es. "Legend of Blue Eyes White Dragon" → "Legend-of-Blue-Eyes-White-Dragon"
  // Ma attenzione: solo alfanumerici + trattini, quindi rimuovo apostrofi e altri simboli
  return setName
    .replace(/[^a-zA-Z0-9\s]/g, '') // togli caratteri speciali
    .trim()
    .split(/\s+/)
    .join('-');
}

async function scrapeCardmarketAveragePrice({
  cardName,
  language = 'it',
  setName,
  primaEdizione = false,
}) {
  if (!cardName || !setName) throw new Error('cardName e setName sono obbligatori');

  const langCode = linguaCodici[language] || linguaCodici['it'];
  const normSetName = normalizeSetName(setName);
  const normCardName = normalizeSetName(cardName);

  const url = `https://www.cardmarket.com/it/YuGiOh/Products/Singles/${normSetName}/${normCardName}?minCondition=3&sellerCountry=17&language=${langCode}` + (primaEdizione ? '&isFirstEd=Y' : '');

  // Avvia puppeteer
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  // Setta user-agent per evitare blocchi banali
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36');

  // Vai alla pagina
  await page.goto(url, { waitUntil: 'domcontentloaded' });

  // Accetta cookie se il bottone è presente
  try {
    const cookieButtonSelector = 'button.btn.btn-secondary.btn-sm.mb-2';
    await page.waitForSelector(cookieButtonSelector, { timeout: 3000 });
    await page.click(cookieButtonSelector);
    // aspettiamo qualche secondo che la pagina si aggiorni se serve
    await page.waitForTimeout(2000);
  } catch {
    // Se il bottone non c’è, proseguiamo
  }

  // Estrai i prezzi (fino a 10)
  const avgPrice = await page.evaluate(() => {
    const priceSpans = Array.from(document.querySelectorAll('div.row .price-container span'));
    const prices = priceSpans
      .slice(0, 10)
      .map(el => el.textContent.trim())
      .map(priceText => {
        // rimuovo tutto tranne numeri, virgola, punto e -
        let cleaned = priceText.replace(/[^\d,.-]/g, '').replace(',', '.');
        let val = parseFloat(cleaned);
        return isNaN(val) ? null : val;
      })
      .filter(p => p !== null);

    if (prices.length === 0) return null;
    const sum = prices.reduce((acc, cur) => acc + cur, 0);
    return sum / prices.length;
  });

  await browser.close();

  return avgPrice; // può essere null se nessun prezzo trovato
}

module.exports = { scrapeCardmarketAveragePrice };
