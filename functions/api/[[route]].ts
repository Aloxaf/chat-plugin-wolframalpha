import {
  PluginErrorType,
  createErrorResponse,
  getPluginSettingsFromRequest,
} from "@lobehub/chat-plugin-sdk";
import { Hono, Context, Next } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { handle } from "hono/cloudflare-pages";
import { Settings } from "./types";

const app = new Hono<{
  Bindings: CloudflareBindings;
  Variables: { settings: Settings };
}>().basePath("/api/v1");

const validateSettingsMiddleware = async (c: Context, next: Next) => {
  const settings = getPluginSettingsFromRequest(c.req.raw);
  if (!settings) {
    return createErrorResponse(PluginErrorType.PluginSettingsInvalid, {
      message: "Invalid plugin settings",
    });
  }

  c.set("settings", settings);
  await next();
};

app.use("/*", validateSettingsMiddleware);

app.post(
  "/getSpokenResult",
  zValidator(
    "json",
    z.object({
      input: z.string(),
    })
  ),
  async (c) => {
    const settings = c.get("settings");
    const apiKey = settings.WOLFRAM_APP_ID;

    const { input } = c.req.valid("json");
    const params = new URLSearchParams({
      input,
    });

    const response = await fetch(
      `http://api.wolframalpha.com/v1/spoken?${params}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
      }
    );

    return c.text(await response.text());
  }
);

app.post(
  "/getShortAnswer",
  zValidator(
    "json",
    z.object({
      input: z.string(),
    })
  ),
  async (c) => {
    const settings = c.get("settings");
    const apiKey = settings.WOLFRAM_APP_ID;

    const { input } = c.req.valid("json");
    const params = new URLSearchParams({
      input,
    });

    const response = await fetch(
      `http://api.wolframalpha.com/v1/result?${params}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
      }
    );

    return c.text(await response.text());
  }
);

app.post(
  "/getFullResults",
  zValidator(
    "json",
    z.object({
      input: z.string(),
      assumption: z.array(z.string()).optional(),
      format: z.array(z.string()).optional(),
    })
  ),
  async (c) => {
    const settings = c.get("settings");
    const apiKey = settings.WOLFRAM_APP_ID;

    const { input, assumption, format } = c.req.valid("json");
    const params = new URLSearchParams({
      input,
      output: "json",
    });
    if (Array.isArray(format)) {
      params.set("format", format.join(","));
    }
    if (Array.isArray(assumption)) {
      for (const item of assumption) {
        params.set("assumption", item);
      }
    }

    const response = await fetch(
      `http://api.wolframalpha.com/v1/full?${params}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
      }
    );

    const data = (await response.json()) as any;

    return c.json(data);
  }
);

export const onRequest = handle(app);
