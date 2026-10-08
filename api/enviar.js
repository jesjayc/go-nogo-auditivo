export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*'); 
    res.setHeader('Access-Control-Allow-Methods', 'OPTIONS,POST');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    const { dadosCSV, participante } = req.body;

    try {
        // A conversão Base64 é OBRIGATÓRIA para anexos no Resend.
        // O Buffer do Node.js faz essa conversão com segurança na Vercel.
        const csvBuffer = Buffer.from('\uFEFF' + dadosCSV, 'utf-8');
        const base64CSV = csvBuffer.toString('base64');

        const respostaResend = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                from: 'Pesquisa Go/No-Go AUDITIVO <onboarding@resend.dev>', 
                to: ['bafeppgufcspa@gmail.com'],
                subject: `Resultados do Experimento - ${participante}`,
                html: `<p>Olá! Seguem em anexo os resultados de <strong>${participante}</strong> no Span Auditivo.</p>`,
                attachments: [
                    {
                        filename: `resultados-${participante}.csv`,
                        content: base64CSV // Aqui enviamos o código convertido e seguro
                    }
                ]
            })
        });

        if (respostaResend.ok) {
            res.status(200).json({ success: true });
        } else {
            const erro = await respostaResend.json();
            res.status(400).json({ error: erro });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}