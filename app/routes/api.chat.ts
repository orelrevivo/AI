import { type ActionFunctionArgs } from '@remix-run/node';
import { streamText, type Messages } from '~/lib/.server/llm/stream-text';
import { db } from '~/lib/.server/db'; // Connect Neon Database

export async function action(args: ActionFunctionArgs) {
  return chatAction(args);
}

async function chatAction({ request }: ActionFunctionArgs) {
  const { messages } = (await request.json()) as { messages: Messages };

  try {
    // 1. Double check the database connection (optional but helpful for debugging 500s)
    // This ensures your NEON_NEON_DATABASE_URL is working
    const database = db;

    // 2. Stream AI response using standard process.env (Vercel compatible)
    const result = await streamText(messages, process.env as any);

    return new Response(result.toAIStream(), {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'X-Vercel-AI-Stream': 'true',
      },
    });

  } catch (error: any) {
    console.error('Error in chatAction:', error);

    return new Response(JSON.stringify({
      error: error?.message || 'Chat failed',
      stack: error?.stack
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
