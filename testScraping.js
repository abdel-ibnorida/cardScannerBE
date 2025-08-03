const puppeteer = require('puppeteer');

const languageCodes = {
  it: 5,
  en: 1,
  fr: 2,
  es: 3,
  jo: 4,
  de: 6,
};

function sanitizeName(name) {
  // Rimuove caratteri non alfanumerici, sostituisce spazi con '-'
  return name
    .replace(/[!'".]/g, '')        // elimina caratteri speciali specifici
    .replace(/\s+/g, '-')          // spazi con '-'
    .replace(/[^a-zA-Z0-9\-]/g, ''); // solo alfanumerici e '-'
}

async function scrapeCardmarketPrice({
  cardName,
  language = 'it',
  setName,
  isFirstEdition = false,
}) {
  const langCode = languageCodes[language] || languageCodes['it'];
  const sanitizedSetName = sanitizeName(setName);
  const sanitizedCardName = sanitizeName(cardName);

  const firstEdParam = isFirstEdition ? 'Y' : '';
  const url = `https://www.cardmarket.com/it/YuGiOh/Products/Singles/${sanitizedSetName}/${sanitizedCardName}?minCondition=3&sellerCountry=17&language=${langCode}${isFirstEdition ? '&isFirstEd=Y' : ''}`;

  console.log('Navigating to:', url);

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  const page = await browser.newPage();

  // User agent per sembrare browser reale
  await page.setUserAgent(
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) ' +
    'AppleWebKit/537.36 (KHTML, like Gecko) ' +
    'Chrome/114.0.0.0 Safari/537.36'
  );

  await page.goto(url, { waitUntil: 'networkidle2' });

  // Accetta tutti i cookie, se presente
  try {
    await page.waitForSelector('button[aria-label="Accetta tutti i cookie"]', { timeout: 5000 });
    await page.click('button[aria-label="Accetta tutti i cookie"]');
    console.log('Cookie accettati');
    // aspetta qualche secondo che la pagina si aggiorni
    await page.waitForTimeout(3000);
  } catch {
    console.log('Nessun banner cookie da accettare');
  }

  // Ora estraiamo il prezzo più basso
  const price = await page.evaluate(() => {
    const priceElement = document.querySelector('div.row .price-container span');
    if (priceElement) {
      return priceElement.textContent.trim();
    }
    return null;
  });

  await browser.close();

  return price;
}

// Per testare la funzione direttamente da qui
(async () => {
  const prezzo = await scrapeCardmarketPrice({
    cardName: 'Dark Magician',
    language: 'it',
    setName: 'Legend of Blue Eyes White Dragon',
    isFirstEdition: true,
  });

  console.log('Prezzo più basso trovato:', prezzo);
})();

module.exports = { scrapeCardmarketPrice };
