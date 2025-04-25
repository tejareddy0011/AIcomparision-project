async function handler({ prompt }) {
  if (!prompt) {
    return { error: "Prompt is required" };
  }

  try {
    const chatGptResponse = await fetch(
      "/integrations/chat-gpt/conversationgpt4",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [{ role: "user", content: prompt }],
        }),
      }
    );
    const chatGptData = await chatGptResponse.json();
    const chatGptResult = chatGptData.choices[0].message.content;

    const geminiResponse = await fetch("/integrations/google-gemini-1-5/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: [{ role: "user", content: prompt }],
      }),
    });
    const geminiData = await geminiResponse.json();
    const geminiResult = geminiData.choices[0].message.content;

    const evaluationPrompt = `Evaluate these two AI responses to the prompt: "${prompt}"

Response 1:
${chatGptResult}

Response 2:
${geminiResult}

Score each response on a scale of 1-10 for:
- Clarity: How clear and well-structured is the response?
- Relevance: How well does it address the prompt?
- Helpfulness: How useful and actionable is the information?

Return the scores in JSON format.`;

    const evaluationResponse = await fetch("/integrations/google-gemini-1-5/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: [{ role: "user", content: evaluationPrompt }],
        json_schema: {
          name: "response_evaluation",
          schema: {
            type: "object",
            properties: {
              response1_scores: {
                type: "object",
                properties: {
                  clarity: { type: "number" },
                  relevance: { type: "number" },
                  helpfulness: { type: "number" },
                },
                required: ["clarity", "relevance", "helpfulness"],
                additionalProperties: false,
              },
              response2_scores: {
                type: "object",
                properties: {
                  clarity: { type: "number" },
                  relevance: { type: "number" },
                  helpfulness: { type: "number" },
                },
                required: ["clarity", "relevance", "helpfulness"],
                additionalProperties: false,
              },
            },
            required: ["response1_scores", "response2_scores"],
            additionalProperties: false,
          },
        },
      }),
    });
    const evaluationData = await evaluationResponse.json();
    const scores = JSON.parse(evaluationData.choices[0].message.content);

    await sql`
      INSERT INTO comparisons (
        prompt, 
        chatgpt_response, 
        gemini_response, 
        chatgpt_scores, 
        gemini_scores
      ) 
      VALUES (
        ${prompt}, 
        ${chatGptResult}, 
        ${geminiResult}, 
        ${JSON.stringify(scores.response1_scores)}, 
        ${JSON.stringify(scores.response2_scores)}
      )
    `;

    return {
      prompt,
      chatgpt: {
        response: chatGptResult,
        scores: scores.response1_scores,
      },
      gemini: {
        response: geminiResult,
        scores: scores.response2_scores,
      },
    };
  } catch (error) {
    return { error: "Failed to process comparison" };
  }
}
export async function POST(request) {
  return handler(await request.json());
}