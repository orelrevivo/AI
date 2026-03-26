import { type ActionFunctionArgs } from '@remix-run/node';
import { StreamingTextResponse, parseStreamPart } from 'ai';
import { streamText } from '~/lib/.server/llm/stream-text';
import { stripIndents } from '~/utils/stripIndent';

const encoder = new TextEncoder();
const decoder = new TextDecoder();

export async function action(args: ActionFunctionArgs) {
  return enhancerAction(args);
}

async function enhancerAction({ request }: ActionFunctionArgs) {
  const { message } = (await request.json()) as { message: string };


  try {
    const result = await streamText(
      [
        {
          role: 'user',
          content: stripIndents`
          I want you to improve the user prompt that is wrapped in \`<original_prompt>\` tags.

          IMPORTANT: Only respond with the improved prompt and nothing else!

          <original_prompt>
            ${message}
          </original_prompt>
        `,
        },
      ],
      process.env as any,
    );

    const sourceStream = result.toAIStream();
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

            const processedChunk = decoder
              .decode(value)
              .split('\n')
              .filter((line) => line !== '')
              .map(parseStreamPart)
              .map((part) => (part as any).value || '')
              .join('');

            controller.enqueue(encoder.encode(processedChunk));
          }
        } catch (error) {
          controller.error(error);
        }
      },
    });

    return new StreamingTextResponse(transformedStream);
  } catch (error) {
    console.log(error);

    throw new Response(null, {
      status: 500,
      statusText: 'Internal Server Error',
    });
  }
}

