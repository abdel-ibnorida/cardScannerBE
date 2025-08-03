const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch'); // npm install node-fetch@2
const fs = require('fs').promises;
const path = require('path');
const { scrapeCardmarketAveragePrice } = require('./scrapeCardmarketPrice');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

app.post('/api/invia', async (req, res) => {
  try {
    const { id, espansione, lingua, primaEdizione} = req.body;

    if (!/^\d+$/.test(id)) {
      return res.status(400).json({ message: 'ID non valido' });
    }
    if (!/^[A-Za-z0-9]{3,4}$/.test(espansione)) {
      return res.status(400).json({ message: 'Espansione non valida' });
    }
    const urlita = `https://db.ygoprodeck.com/api/v7/cardinfo.php?id=${id}&language=it`;
    const responseita = await fetch(urlita);

    if (!responseita.ok) {
      return res.status(404).json({ message: 'Carta non trovata nell\'API Yu-Gi-Oh!' });
    }
    const dataita = await responseita.json();

    if (!dataita.data || dataita.data.length === 0) {
      return res.status(404).json({ message: 'Carta non trovata' });
    }

    const cardita = dataita.data[0];


    const url = `https://db.ygoprodeck.com/api/v7/cardinfo.php?id=${id}`;
    const response = await fetch(url);

    if (!response.ok) {
      return res.status(404).json({ message: 'Carta non trovata nell\'API Yu-Gi-Oh!' });
    }

    const data = await response.json();

    if (!data.data || data.data.length === 0) {
      return res.status(404).json({ message: 'Carta non trovata' });
    }

    const card = data.data[0];

    const espUpper = espansione.toUpperCase();
    const matchingSet = (card.card_sets || []).find(set => {
      return set.set_code.toUpperCase().startsWith(espUpper + '-');
    });

    if (!matchingSet) {
      return res.status(404).json({ message: 'Set code non trovato con la combinazione espansione-id' });
    }

    const cardId = parseInt(id);

    // === GOAT ===
    const goatPath = path.join(__dirname, 'goat-full.json');
    const goatRaw = await fs.readFile(goatPath, 'utf-8');
    const goatData = JSON.parse(goatRaw);

    const inGoat = goatData.data.some(c => c.id === cardId);

    // === EDISON === (solo se non già in Goat)
    let inEdison = false;
    if (inGoat) {
      inEdison = true;
    } else {
      const edisonPath = path.join(__dirname, 'edison-full.json');
      const edisonRaw = await fs.readFile(edisonPath, 'utf-8');
      const edisonData = JSON.parse(edisonRaw);
      inEdison = edisonData.data.some(c => c.id === cardId);
    }
    const numero_ristampe = (card.card_sets || []).length;

    const averagePrice = await scrapeCardmarketAveragePrice({
      cardName: card.name,
      language: lingua || 'it',   // se non passato, default a 'it'
      setName: matchingSet.set_name,
      primaEdizione: !!primaEdizione,
    });

    const result = {
      name: card.name,
      nomeIta:cardita.name,
      set_name: matchingSet.set_name,
      set_code: matchingSet.set_code,
      image_url: card.card_images?.[0]?.image_url || null,
      rarity:matchingSet.set_rarity,
      numero_ristampe: numero_ristampe,
      cardmarket_price: card.card_prices?.[0]?.cardmarket_price || null,
      cardmarket_scrap_price: averagePrice,
      inGoat,
      inEdison,
    };
    console.log(result)
    res.json(result);

  } catch (error) {
    console.error('Errore interno:', error);
    res.status(500).json({ message: 'Errore interno del server' });
  }
});

app.listen(PORT, () => {
  console.log(`✅ Server avviato su http://localhost:${PORT}`);
});
