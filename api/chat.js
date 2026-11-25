export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Sadece POST desteklenir.' });
  }

  const { message } = req.body || {};
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: 'API anahtarı bulunamadı.' });
  }

  const models = [
    'gemini-3.8-flash-lite',
    'gemini-3.8-flash',
    'gemini-2.5-flash-lite'
  ];

  let lastError = 'Sunucu şu an yoğun, lütfen tekrar dene.';

  for (const model of models) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal,
          body: JSON.stringify({
            systemInstruction: {
              parts: [
                {
                  text: "Senin adın VYN AI. İnsanlarla samimi, net ve çok hızlı sohbet eden bir yapay zekasın. Cevapların kısa, öz ve anlaşılır olsun."
                }
              ]
            },
            contents: [{ role: "user", parts: [{ text: message }] }],
            generationConfig: {
              maxOutputTokens: 512,
              temperature: 0.7
            }
          })
        }
      );

      clearTimeout(timeout);
      const data = await response.json();

      if (response.ok) {
        const reply = data.candidates?.[0]?.content?.parts?.[0]?.text || "Şu an yanıt üretemedim.";
        return res.status(200).json({ reply });
      }

      lastError = data.error?.message || lastError;
    } catch (err) {
      clearTimeout(timeout);
      lastError = err.name === 'AbortError' ? 'Yanıt süresi aşıldı.' : err.message;
    }
  }

  return res.status(500).json({ error: lastError });
}
