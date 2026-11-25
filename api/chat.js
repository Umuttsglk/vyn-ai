export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Sadece POST desteklenir.' });
  }

  const { message } = req.body || {};
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: 'API anahtarı bulunamadı.' });
  }

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent?key=${apiKey}`,
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
    if (!response.ok) {
      return res.status(500).json({ error: data.error?.message || 'API hatası oluştu.' });
    }

    const reply = data.candidates?.[0]?.content?.parts?.[0]?.text || "Şu an yanıt üretemedim.";
    return res.status(200).json({ reply });
  } catch (err) {
    return res.status(500).json({ error: 'Sunucu hatası: ' + err.message });
  }
}
