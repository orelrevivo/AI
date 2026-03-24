import { streamText as _streamText, convertToCoreMessages } from 'ai';
import { getAPIKey } from '~/lib/.server/llm/api-key';
import { getModel } from '~/lib/.server/llm/model';
import { MAX_TOKENS } from './constants';
import { getSystemPrompt } from './prompts';

interface ToolResult<Name extends string, Args, Result> {
  toolCallId: string;
  toolName: Name;
  args: Args;
  result: Result;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
  toolInvocations?: ToolResult<string, unknown, unknown>[];
}

export type Messages = Message[];

export type StreamingOptions = Omit<Parameters<typeof _streamText>[0], 'model'>;

import { env } from 'node:process';

export function streamText(messages: Messages, envVars: Env, options?: StreamingOptions) {
  const apiKey = getAPIKey(envVars);
  
  if (!apiKey) {
    throw new Error('Missing API key (GLM_API_KEY, ZAI_API_KEY, or ANTHROPIC_API_KEY)');
  }

  // Detect provider by checking the key format or if specific key is present

  const isGLM = (apiKey && !apiKey.startsWith('sk-ant-')) || 
                 (typeof env !== 'undefined' && ((env as any).ZAI_API_KEY || (env as any).ZAIGLM_API_KEY)) || 
                 (envVars as any).ZAI_API_KEY || (envVars as any).ZAIGLM_API_KEY;

  const provider = isGLM ? 'z.ai' : 'anthropic';

  const model = provider === 'z.ai' ? 'glm-4.7' : 'claude-3-5-sonnet-20240620';

  console.log(`Using provider: ${provider}, model: ${model}`);

  const streamOptions: any = {
    model: getModel(provider, model, apiKey),
    system: getSystemPrompt(),
    maxTokens: MAX_TOKENS,
    messages: convertToCoreMessages(messages),
    ...options,
  };


  if (provider === 'anthropic') {
    streamOptions.headers = {
      'anthropic-beta': 'max-tokens-3-5-sonnet-2024-07-15',
    };
  }

  return _streamText(streamOptions);
}


