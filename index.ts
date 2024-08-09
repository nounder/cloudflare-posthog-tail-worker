import { TailEvent, TraceItemFetchEventInfo } from "@cloudflare/workers-types";
import type { Env } from "./worker-configuration.d.ts";

export default {
  /**
   * See: https://developers.cloudflare.com/workers/runtime-apis/handlers/tail/#taillog
   */
  async tail(events: TailEvent["events"], env: Env, ctx) {
    const {
      POSTHOG_API_KEY,
      POSTHOG_API_URL = "https://i.posthog.com",
      LOG_PREFIX = "event\t",
      POSTHOG_PROCESS_PERSON_PROFILE = "false",
    } = env;

    if (!POSTHOG_API_KEY) {
      console.warn("No POSTHOG_API_KEY set");

      return;
    }

    events.forEach(async (event) => {
      const { request } = event.event as TraceItemFetchEventInfo;
      const clientIp = request.headers["cf-connecting-ip"];

      event.logs.forEach((log) => {
        if (log.level !== "log") {
          return;
        }

        return log.message.map((line) => {
          if (line.startsWith(LOG_PREFIX)) {
            const text = line.slice(env.LOG_PREFIX.length);
            const {
              event,
              // See: https://posthog.com/docs/cdp/geoip-enrichment
              ...properties
            } = JSON.parse(text);

            if (!properties.$ip) {
              // See: https://posthog.com/docs/cdp/geoip-enrichment
              properties.$ip = clientIp;
            }

            if (POSTHOG_PROCESS_PERSON_PROFILE === "true") {
              properties.$process_person_profile = true;
            }

            // Generate random distinct_id if not provided
            // PostHog requires it
            const distinct_id = properties.distinct_id || crypto.randomUUID();

            // delete distinct_id from properties. it must be in the root.
            delete properties.distinct_id;

            const payload = {
              api_key: POSTHOG_API_KEY,
              distinct_id,
              event,
              properties,
            };

            ctx.waitUntil(
              fetch(`${POSTHOG_API_URL}/capture/`, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify(payload),
              }).then(async (v) => {
                if (!v.ok) {
                  const text = await v.text();
                  throw new Error(
                    `Failed to send Posthog event: ${v.statusText}: ${text}`
                  );
                }
              })
            );
          }
        });
      });
    });
  },
};
