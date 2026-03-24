import { env as nodeProcessEnv } from 'node:process';

export function getAPIKey(envVars: any) {
  return (
    nodeProcessEnv.ZAI_API_KEY ||
    envVars.ZAI_API_KEY ||
    nodeProcessEnv.ZAIGLM_API_KEY ||
    envVars.ZAIGLM_API_KEY ||
    nodeProcessEnv.GLM_API_KEY ||
    envVars.GLM_API_KEY ||
    nodeProcessEnv.ANTHROPIC_API_KEY ||
    envVars.ANTHROPIC_API_KEY
  );
}
