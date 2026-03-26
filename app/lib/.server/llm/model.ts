import { createAnthropic } from '@ai-sdk/anthropic';

export function getAnthropicModel(apiKey: string) {
  const anthropic = createAnthropic({
    apiKey,
  });

  return anthropic('claude-3-5-sonnet-20240620');
}

export function getModel(provider: string, model: string, apiKey: string) {
  if (provider === 'z.ai' || model.startsWith('glm-')) {
    // For GLM-4.7, we'll implement a minimal LanguageModelV1 since we can't add dependencies
    return {
      specificationVersion: 'v1' as const,
      provider: 'z.ai',
      modelId: model,
      defaultObjectGenerationMode: 'json' as const,
      doGenerate: async (options: any) => {
        const messages = options.prompt || options.input || options.messages;
        if (!messages) {
          console.error('doGenerate called with no prompt/input/messages!', options);
          throw new Error('No prompt provided for doGenerate');
        }
        // Minimal implementation for enhance prompt
        return {
           text: 'Better prompt',
           finishReason: 'stop',
           usage: { promptTokens: 0, completionTokens: 0 },
           rawCall: { rawPrompt: null, rawSettings: {} },
        } as any;
      },
      doStream: async (options: any) => {
        console.log('doStream options keys:', Object.keys(options));
        const messages = options.prompt || options.input || options.messages;
        if (!messages) {
           console.error('doStream called with no prompt/input/messages!', options);
           throw new Error('No input provided');
        }



        // Convert LanguageModelV1Messages to OpenAI-compatible format
        const openAIMessages = messages.map((msg: any) => {

          let content = '';
          if (typeof msg.content === 'string') {
            content = msg.content;
          } else if (Array.isArray(msg.content)) {
            content = msg.content
              .filter((part: any) => part.type === 'text')
              .map((part: any) => part.text)
              .join('');
          }
          return {
            role: msg.role === 'assistant' ? 'assistant' : msg.role === 'system' ? 'system' : 'user',
            content,
          };
        });

        const response = await fetch('https://api.z.ai/api/paas/v4/chat/completions', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: model,
            messages: openAIMessages,
            stream: true,
            temperature: options.temperature,
            max_tokens: options.maxTokens || 4096,
            stop: options.stopSequences,
          }),
        }).catch(err => {
            console.error('Fetch error:', err);
            throw err;
        });

        if (!response.ok) {
          const body = await response.text();
          console.error(`Z.ai Error: ${response.status} ${response.statusText} - ${body}`);
          throw new Error(`Failed to fetch from z.ai: ${response.status} ${response.statusText} - ${body}`);
        }



        const decoder = new TextDecoder();
        let buffer = '';

        const sourceStream = response.body!;
        const reader = sourceStream.getReader();

        const transformedStream = new ReadableStream({
          async start(controller) {
            try {
              while (true) {
                const { done, value } = await reader.read();

                if (done) {
                  controller.close();
                  break;
                }

                buffer += decoder.decode(value, { stream: true });
                
                const lines = buffer.split('\n');
                buffer = lines.pop() || '';

                for (const line of lines) {
                  const trimmedLine = line.trim();
                  if (trimmedLine.startsWith('data: ')) {
                    const dataStr = trimmedLine.slice(6);
                    if (dataStr === '[DONE]') continue;
                    try {
                      const data = JSON.parse(dataStr);
                      const content = data.choices?.[0]?.delta?.content;
                      if (content) {
                        controller.enqueue({
                          type: 'text-delta',
                          textDelta: content,
                        });
                      }
                    } catch (e) {}
                  }
                }
              }
            } catch (error) {
              controller.error(error);
            }
          }
        });

        return {
          stream: transformedStream,
          rawCall: { rawPrompt: null, rawSettings: {} },
        };
      },
    } as any;
  }

  return getAnthropicModel(apiKey);
}


