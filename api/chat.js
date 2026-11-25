export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Sadece POST desteklenir.' });
  }

  const { message } = req.body || {};
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: 'API anahtarı bulunamadı.' });
  }

  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  const model = 'gemini-3.8-flash';
  const maxRetries = 3;

  try {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            systemInstruction: {
              parts: [
                {
                  text: "Senin adın VYN AI. İnsanlarla samimi, net ve anlaşılır sohbet eden bir yapay zekasın. Matematik işlemlerini adım adım çözer, fen, tarih, genel kültür ve günlük konulardaki sorulara açık, doğru ve faydalı cevaplar verirsin."
                }
              ]
            },
            contents: [{ role: "user", parts: [{ text: message }] }]
          })
        }
      );

      const data = await response.json();

      if (response.ok) {
        const reply = data.candidates?.[0]?.content?.parts?.[0]?.text || "Şu an yanıt üretemedim.";
        return res.status(200).json({ reply });
      }

      const errorMessage = data.error?.message || 'API hatası oluştu.';
      const isHighDemand =
        response.status === 429 ||
        response.status === 503 ||
        /high demand|overloaded|try again later|quota/i.test(errorMessage);

      if (isHighDemand && attempt < maxRetries) {
        await sleep(1500 * attempt);
        continue;
      }

      return res.status(500).json({ error: errorMessage });
    }
  } catch (err) {
    return res.status(500).json({ error: 'Sunucu hatası: ' + err.message });
  }
}
