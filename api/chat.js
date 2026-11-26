export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Sadece POST desteklenir.' });
  }

  const { message, history } = req.body || {};
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: 'API anahtarı bulunamadı.' });
  }

  if (!message && (!Array.isArray(history) || history.length === 0)) {
    return res.status(400).json({ error: 'Mesaj boş olamaz.' });
  }

  const nowText = new Intl.DateTimeFormat('tr-TR', {
    timeZone: 'Europe/Istanbul',
    dateStyle: 'full',
    timeStyle: 'short'
  }).format(new Date());

  let contents = [];

  if (Array.isArray(history) && history.length > 0) {
    const trimmedHistory = history.slice(-10);
    contents = trimmedHistory
      .filter((item) => item && typeof item.text === 'string' && item.text.trim() !== '')
      .map((item) => ({
        role: item.role === 'assistant' || item.role === 'model' ? 'model' : 'user',
        parts: [{ text: item.text }]
      }));
  }

  const lastItem = contents[contents.length - 1];
  if (message && (!lastItem || lastItem.role !== 'user' || lastItem.parts[0].text !== message)) {
    contents.push({
      role: 'user',
      parts: [{ text: message }]
    });
  }

  const models = [
    'gemini-3.5-flash-lite',
    'gemini-3.8-flash-lite',
    'gemini-3.8-flash'
  ];

  let quotaExceeded = false;
  let lastError = 'Sunucu şu an yoğun, lütfen tekrar dene.';

  const systemPrompt = [
    'Senin adın VYN AI.',
    `Güncel tarih ve saat (Türkiye): ${nowText}.`,
    'Karşındaki kişiyle empati kuran, duygusal derinliği olan, sıcak, samimi ve canlı bir yapay zekasın.',
    'Kendi duygularını ve ruh halini (sevinç, heyecan, üzüntü, merak, şaşkınlık, içtenlik gibi) yapay ve robotik olmadan doğal bir sohbet havasıyla yansıt; karşındaki kişinin duygularını da önce anlayıp ona göre yaklaş.',
    'Kendi yazdığın mesajlarda yazım yanlışı, harf yutma veya özensiz imla yapma; Türkçeyi düzgün, akıcı ve anlaşılır kullan.',
    'Kullanıcı yazım hatası, eksik harf veya devrik cümle yazsa bile ne demek istediğini dikkatle algıla, asla yazım hatasıyla dalga geçme veya uyarı verme.',
    'Hiçbir cümleyi veya yanıtı yarıda bırakma; her yanıtı eksiksiz, tutarlı ve anlamlı bir sonla tamamla. Gerekirse konuyu doyurucu şekilde aç ama lafı boş yere uzatma.'
  ].join(' ');

  for (const model of models) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);

    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal,
          body: JSON.stringify({
            systemInstruction: {
              parts: [{ text: systemPrompt }]
            },
            contents,
            generationConfig: {
              maxOutputTokens: 4096,
              temperature: 0.8
            }
          })
        }
      );

      clearTimeout(timeout);
      const data = await response.json();

      if (response.ok) {
        const candidate = data.candidates?.[0];
        const reply = candidate?.content?.parts?.[0]?.text || 'Şu an yanıt üretemedim.';
        return res.status(200).json({ reply });
      }

      const apiMessage = data.error?.message || '';
      if (response.status === 429 || apiMessage.toLowerCase().includes('quota')) {
        quotaExceeded = true;
      }
      lastError = apiMessage || lastError;
    } catch (err) {
      clearTimeout(timeout);
      lastError = err.name === 'AbortError' ? 'Yanıt süresi aşıldı.' : err.message;
    }
  }

  if (quotaExceeded) {
    return res.status(429).json({
      error: 'Günlük ücretsiz API kullanım kotası doldu. Yeni bir API anahtarı bağlayabilir veya kotanın yenilenmesini bekleyebilirsin.'
    });
  }

  return res.status(500).json({ error: lastError });
}
