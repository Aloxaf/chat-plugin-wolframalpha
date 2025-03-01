import {
  PluginErrorType,
  createErrorResponse,
  getPluginSettingsFromRequest
} from '@lobehub/chat-plugin-sdk';
import { Hono } from 'hono'
import { handle } from 'hono/cloudflare-pages';

const app = new Hono<{ Bindings: CloudflareBindings }>().basePath('/api/v1');

app.post('/llm-api', async (c) => {
  const settings = getPluginSettingsFromRequest(c.req.raw);
  if (!settings) {
    return createErrorResponse(PluginErrorType.PluginSettingsInvalid, {
      'message': 'Invalid plugin settings'
    });
  }

  const apiKey = settings.WOLFRAM_APP_ID;
  const { input } = await c.req.json();

  const params = new URLSearchParams({
    input,
  });

  const response = await fetch(`https://www.wolframalpha.com/api/v1/llm-api?${params}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${apiKey}`
    }
  });

  return c.text(await response.text());
})

export const onRequest = handle(app);