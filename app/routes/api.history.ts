import { json, type ActionFunctionArgs, type LoaderFunctionArgs } from '@remix-run/node';
import { getAuth } from '@clerk/remix/ssr.server';
import { db } from '~/lib/.server/db';
import { chats, messages as dbMessages, users } from '~/lib/.server/db/schema';
import { eq, and, sql } from 'drizzle-orm';


export async function loader(args: LoaderFunctionArgs) {
  const { userId } = await getAuth(args);
  if (!userId) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const url = new URL(args.request.url);
    const id = url.searchParams.get('id');

    if (id) {
      // Simple UUID format check (8-4-4-4-12)
      const isValidUUID = typeof id === 'string' && id.length === 36 && id.includes('-');

      if (!isValidUUID) {
         return json({ error: 'Invalid ID' }, { status: 400 });
      }

      // Fetch specific chat with messages
      const chat = await db.query.chats.findFirst({

        where: and(eq(chats.id, id), eq(chats.userId, userId)),
        with: {
          messages: true,
        },
      });

      if (!chat) {
        return json({ error: 'Chat not found' }, { status: 404 });
      }

      return json({ chat });
    }

    // Fetch all user chats (for sidebar)
    const userChats = await db.query.chats.findMany({
      where: eq(chats.userId, userId),
      orderBy: (chats, { desc }) => [desc(chats.createdAt)],
    });

    return json({ chats: userChats });
  } catch (error: any) {
    console.error('API History Loader Error:', error);
    return json({ error: error.message || 'Internal Server Error', stack: error.stack }, { status: 500 });
  }
}



export async function action(args: ActionFunctionArgs) {
  const { userId } = await getAuth(args);
  if (!userId) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { request } = args;
    const data = await request.json();
    const { chatId, messages, description } = data;

    if (request.method === 'POST') {
      let currentChat;
      
      // Ensure user exists in our local Neon DB (Foreign Key requirement)
      // root.tsx usually handles this, but since we are getting FK errors, we ensure it here too.
      await db.insert(users)
        .values({ id: userId, email: `${userId}@clerk.com`, name: 'Clerk User' })
        .onConflictDoNothing();

      // Simple UUID format check (8-4-4-4-12)

      const isValidUUID = typeof chatId === 'string' && chatId.length === 36 && chatId.includes('-');

      if (isValidUUID) {
        [currentChat] = await db.update(chats)
          .set({ description: description || 'New Conversation', updatedAt: new Date() })
          .where(and(eq(chats.id, chatId), eq(chats.userId, userId)))
          .returning();
      } else {
        [currentChat] = await db.insert(chats)
          .values({ userId, description: description || 'New Conversation' })
          .returning();
      }


      if (!currentChat) {
        return json({ error: 'Chat not found' }, { status: 404 });
      }

      // Replace messages (simple version)
      if (Array.isArray(messages) && messages.length > 0) {
        await db.delete(dbMessages).where(eq(dbMessages.chatId, currentChat.id));
        await db.insert(dbMessages).values(
          messages.map((m: any) => ({
            id: m.id || Math.random().toString(36).slice(2),
            chatId: currentChat.id,
            role: m.role || 'user',
            content: m.content || '',
            toolInvocations: m.toolInvocations || null,
          }))
        ).onConflictDoUpdate({
           target: dbMessages.id,
           set: { content: sql`EXCLUDED.content`, toolInvocations: sql`EXCLUDED.tool_invocations` }
        });
      }


      return json({ chat: currentChat });
    }

    if (request.method === 'DELETE') {
      if (!chatId) {
        return json({ error: 'Missing chatId' }, { status: 400 });
      }

      await db.delete(dbMessages).where(eq(dbMessages.chatId, chatId));
      await db.delete(chats).where(and(eq(chats.id, chatId), eq(chats.userId, userId)));

      return json({ success: true });
    }

    return json({ error: 'Method not allowed' }, { status: 405 });
  } catch (error: any) {
    console.error('API History Error:', error);
    return json({ error: error.message || 'Internal Server Error', stack: error.stack }, { status: 500 });
  }
}



