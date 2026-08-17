import WebSocket from 'ws';

const API_KEY = 'AIzaSyC0TYpYszVAlz_ArTLui_P-Z84DrsvppJc';
const WS_URL = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent?key=${API_KEY}`;

console.log("Menghubungkan ke Gemini Live API...");
const ws = new WebSocket(WS_URL);

ws.on('open', () => {
  console.log("Koneksi berhasil dibuka. Menunggu respon setup...");
  
  // Send setup message
  ws.send(JSON.stringify({
    setup: {
      model: "models/gemini-2.0-flash-exp",
      generationConfig: {
        responseModalities: ["TEXT"],
      },
      systemInstruction: {
        parts: [{ text: "Anda adalah asisten AI yang tidak boleh oversharing." }]
      }
    }
  }));
});

ws.on('message', (data) => {
  try {
    const msg = JSON.parse(data.toString());
    if (msg.setupComplete) {
      console.log("Setup selesai! API Key valid dan berfungsi.");
      ws.close(1000, "Test selesai");
    } else if (msg.error) {
      console.error("Menerima error dari server:", msg.error);
      const errMsg = msg.error.message?.toLowerCase() || "";
      if (errMsg.includes("quota") || errMsg.includes("token") || msg.error.code === 429) {
        console.log("\n✅ BENAR: Token API Gemini habis (terdeteksi via pesan error).");
      }
      ws.close();
    } else {
      console.log("Menerima data:", Object.keys(msg));
    }
  } catch (err) {
    console.error("Gagal mem-parsing pesan:", err);
  }
});

ws.on('close', (code, reason) => {
  console.log(`WebSocket ditutup. Code: ${code}, Reason: ${reason.toString()}`);
  const reasonLower = reason.toString().toLowerCase();
  if (code === 1008 || code === 429 || reasonLower.includes("quota") || reasonLower.includes("token")) {
    console.log("\n✅ BENAR: Token API Gemini habis (terdeteksi via close code/reason).");
  }
  process.exit(0);
});

ws.on('error', (err) => {
  console.error("WebSocket error:", err);
});
