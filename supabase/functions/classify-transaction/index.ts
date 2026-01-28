// @ts-ignore: Deno standard library
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { description, value, date, categories, type, recentTransactions } = await req.json();
    console.log("[classify-transaction] Analisando:", { description, value, date });

    // @ts-ignore: Deno global
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiApiKey) {
      return new Response(JSON.stringify({ error: 'OpenAI API key not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const categoryList = categories.map((cat: any) => `${cat.cat_nome} (ID: ${cat.cat_id})`).join('\n');
    const recentList = recentTransactions && recentTransactions.length > 0 
      ? recentTransactions.map((t: any) => `- ${t.lan_data}: ${t.lan_descricao} (${t.lan_valor})`).join('\n')
      : "Nenhum lançamento recente encontrado nesta conta.";

    const prompt = `Você é um assistente financeiro especializado em conciliação bancária.
Analise o seguinte lançamento que está sendo importado:
- Descrição: "${description}"
- Valor: ${value}
- Data: ${date}
- Tipo: ${type}

TAREFA 1 (CATEGORIA): Sugira o melhor ID de categoria da lista abaixo. Se for transferência (PIX, TED), use 'Transferência entre Contas' se disponível.
Categorias Disponíveis:
${categoryList}

TAREFA 2 (DUPLICADO): Verifique se este lançamento já parece existir na lista de lançamentos recentes abaixo. Considere que a data pode variar em +/- 2 dias e a descrição pode ser levemente diferente.
Lançamentos Recentes no Sistema:
${recentList}

Responda APENAS um JSON no formato:
{
  "suggestedCategoryId": "id_ou_null",
  "isPossibleDuplicate": true_ou_false,
  "reason": "breve justificativa se for duplicado"
}`;

    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openaiApiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
        temperature: 0,
      }),
    });

    const data = await openaiResponse.json();
    const result = JSON.parse(data.choices[0].message.content);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    // @ts-ignore
    console.error("[classify-transaction] Error:", error.message);
    // @ts-ignore
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});