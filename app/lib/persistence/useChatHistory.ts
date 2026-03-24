import { useLoaderData, useNavigate } from '@remix-run/react';
import { useState, useEffect } from 'react';
import { atom } from 'nanostores';
import type { Message } from 'ai';
import { toast } from 'react-toastify';
import { workbenchStore } from '~/lib/stores/workbench';

export interface ChatHistoryItem {
  id: string;
  urlId?: string;
  description?: string;
  messages: Message[];
  timestamp: string;
}

export const chatId = atom<string | undefined>(undefined);
export const description = atom<string | undefined>(undefined);

export function useChatHistory() {
  const navigate = useNavigate();
  const { id: mixedId } = useLoaderData<{ id?: string }>();

  const [initialMessages, setInitialMessages] = useState<Message[]>([]);
  const [ready, setReady] = useState<boolean>(false);
  const [urlId, setUrlId] = useState<string | undefined>();

  useEffect(() => {
    if (mixedId) {
      fetch(`/api/history?id=${mixedId}`)
        .then(async (res) => {
          if (res.ok) {
            const data = await res.json();
            if (data.chat) {
              setInitialMessages(data.chat.messages || []);
              setUrlId(data.chat.urlId);
              description.set(data.chat.description);
              chatId.set(data.chat.id);
            }
          } else if (res.status === 401) {
            navigate('/sign-in');
          } else {
            navigate(`/`, { replace: true });
          }
          setReady(true);
        })
        .catch((error) => {
          toast.error(error.message);
          setReady(true);
        });
    } else {
      setReady(true);
    }
  }, [mixedId]);

  const navigateChat = (nextId: string) => {
    navigate(`/chat/${nextId}`, { replace: true });
  };

  return {
    ready,
    initialMessages,
    storeMessageHistory: async (messages: Message[]) => {
      const { firstArtifact } = workbenchStore;

      if (!description.get() && firstArtifact?.title) {
        description.set(firstArtifact?.title);
      }

      const res = await fetch('/api/history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chatId: chatId.get(),
          messages,
          description: description.get(),
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (!chatId.get() && data.chat?.id) {
          chatId.set(data.chat.id);
          navigateChat(data.chat.id);
        }
      } else if (res.status === 401) {
        navigate('/sign-in');
      }
    },
  };
}


