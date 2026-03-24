import { type ActionFunctionArgs } from '@remix-run/node';
import { streamText, type Messages, type StreamingOptions } from '~/lib/.server/llm/stream-text';

export async function action(args: ActionFunctionArgs) {
  return chatAction(args);
}

async function chatAction({ request }: ActionFunctionArgs) {
  const { messages } = (await request.json()) as { messages: Messages };

  try {
    const result = await streamText(messages, process.env as any);

    return result.toDataStreamResponse();
  } catch (error: any) {
    console.error('Error in chatAction:', error);

    return new Response(JSON.stringify({ error: error?.message, stack: error?.stack }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }
}




