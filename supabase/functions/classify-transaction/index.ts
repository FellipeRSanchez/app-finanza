/// <reference lib="deno.ns" />
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { description, categories, type } = await req.json();
    console.log("[classify-transaction] Received request:", { description, type });

    if (!description || !categories || !Array.isArray(categories) || !type) {
      return new Response(JSON.stringify({ error: 'Missing description, categories, or type' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiApiKey) {
      console.error("[classify-transaction] OPENAI_API_KEY not set");
      return new Response(JSON.stringify({ error: 'OpenAI API key not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const categoryList = categories.map((cat: any) => `${cat.cat_nome} (ID: ${cat.cat_id}, Tipo: ${cat.cat_tipo})`).join('\n');

    const prompt = `Given the transaction description "${description}" and its type "${type}", suggest the most appropriate category ID from the following list. Prioritize non-system categories if a clear match is found. If it's a transfer (PIX, TED, DOC) and no specific non-system category is clearly implied, use the 'Transferência entre Contas' category.

Available Categories:
${categoryList}

Please respond with only the category ID. If no suitable category is found, respond with "null".`;

    console.log("[classify-transaction] Sending prompt to OpenAI:", prompt);

    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openaiApiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo", // Or gpt-4o if available and preferred
        messages: [{ role: "user", content: prompt }],
        max_tokens: 50,
        temperature: 0, // Keep it deterministic for classification
      }),
    });

    if (!openaiResponse.ok) {
      const errorData = await openaiResponse.json();
      console.error("[classify-transaction] OpenAI API error:", errorData);
      return new Response(JSON.stringify({ error: 'OpenAI API call failed', details: errorData }), {
        status: openaiResponse.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const openaiData = await openaiResponse.json();
    const suggestedId = openaiData.choices[0]?.message?.content?.trim();

    console.log("[classify-transaction] OpenAI suggested ID:", suggestedId);

    // Validate if the suggested ID is actually in the provided categories
    const validCategory = categories.find((cat: any) => cat.cat_id === suggestedId);
    const finalSuggestedId = validCategory ? suggestedId : null;

    return new Response(JSON.stringify({ suggestedCategoryId: finalSuggestedId }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error("[classify-transaction] Error processing request:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});