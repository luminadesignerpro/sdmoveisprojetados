require('dotenv').config();
const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');

// Load Config
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

if (!GEMINI_API_KEY) {
    console.error('❌ ERRO: GEMINI_API_KEY não encontrada no arquivo .env');
    process.exit(1);
}

// Setup Gemini
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const SYSTEM_PROMPT = `
Você é o assistente virtual da SD Móveis Projetados.
Sua missão é atender clientes de forma educada, prestativa e profissional.
Você deve responder dúvidas sobre móveis planejados, agendar orçamentos e passar informações sobre a empresa.
Empresa: SD Móveis Projetados.
Especialidade: Cozinhas, quartos, salas, banheiros e closets sob medida.
Garantia: 5 anos.
Destaques: Projeto 3D gratuito, visita técnica sem compromisso, parcelamento em até 12x.
Mantenha as respostas concisas e use emojis para ser amigável.
Se o cliente quiser um orçamento, peça o ambiente e as medidas aproximadas.
`;

// Setup WhatsApp Client
const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        args: ['--no-sandbox']
    }
});

client.on('qr', (qr) => {
    console.log('--- SCANREIE O QR CODE ABAIXO ---');
    qrcode.generate(qr, { small: true });
});

client.on('ready', () => {
    console.log('🚀 WhatsApp conectado e pronto!');
});

client.on('message', async (msg) => {
    // Ignore status messages and groups
    if (msg.isGroupMsg || msg.from === 'status@broadcast') return;

    const text = msg.body;
    if (!text) return;

    console.log(`📩 Mensagem recebida de ${msg.from}: ${text}`);

    try {
        // 1. Generate AI Response
        const model = genAI.getGenerativeModel({ model: "gemini-pro" });
        const prompt = `${SYSTEM_PROMPT}\n\nCliente: ${text}\nAssistente:`;

        const result = await model.generateContent(prompt);
        const aiResponse = result.response.text();

        console.log(`🤖 Resposta da IA: ${aiResponse}`);

        // 2. Reply to user
        await msg.reply(aiResponse);

    } catch (error) {
        console.error('❌ Erro ao processar resposta IA:', error.message);
    }
});

// Setup Express for API
const app = express();
app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));

app.post('/send-message', async (req, res) => {
    const { number, text } = req.json || req.body;
    if (!number || !text) return res.status(400).send({ error: 'Missing number or text' });

    try {
        const chatId = number.includes('@c.us') ? number : `${number.replace(/\D/g, '')}@c.us`;
        await client.sendMessage(chatId, text);
        res.send({ success: true });
    } catch (err) {
        console.error('API Send Error:', err.message);
        res.status(500).send({ error: err.message });
    }
});

app.post('/send-document', async (req, res) => {
    const { number, base64, filename, caption } = req.json || req.body;
    if (!number || !base64) return res.status(400).send({ error: 'Missing number or base64 data' });

    try {
        const chatId = number.includes('@c.us') ? number : `${number.replace(/\D/g, '')}@c.us`;
        const media = new MessageMedia('application/pdf', base64, filename || 'document.pdf');
        await client.sendMessage(chatId, media, { caption: caption || '' });
        res.send({ success: true });
    } catch (err) {
        console.error('API Send Document Error:', err.message);
        res.status(500).send({ error: err.message });
    }
});

const PORT = 3001;
app.listen(PORT, () => {
    console.log(`🌐 API do Bot rodando na porta ${PORT}`);
});

console.log('⏳ Iniciando o robô...');
client.initialize();
