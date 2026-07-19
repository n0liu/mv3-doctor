import { locOf, walk } from "../ast-utils.js";
import type { RawFinding, SourceRule } from "../../types.js";

/**
 * Chrome terminates an idle service worker after roughly 30 seconds, so any
 * timer scheduled beyond that window silently never fires.
 */
const IDLE_TERMINATION_MS = 30_000;

export const noTimersInServiceWorker: SourceRule = {
  id: "no-timers-in-service-worker",
  target: "source",
  severity: "error",
  roles: ["service-worker"],
  description:
    "Timers do not survive service worker termination — use chrome.alarms instead.",

  check({ ast }) {
    const findings: RawFinding[] = [];

    walk.simple(ast, {
      CallExpression(node) {
        if (node.callee.type !== "Identifier") return;

        if (node.callee.name === "setInterval") {
          findings.push({
            message:
              "setInterval() in a service worker stops firing as soon as the worker is terminated.",
            hint: "Use chrome.alarms.create() — alarms wake the worker back up. Note the minimum period is 30 seconds.",
            ...locOf(node),
          });
          return;
        }

        if (node.callee.name === "setTimeout") {
          const delay = node.arguments[1];
          if (
            delay?.type === "Literal" &&
            typeof delay.value === "number" &&
            delay.value > IDLE_TERMINATION_MS
          ) {
            findings.push({
              message: `setTimeout() with a ${delay.value}ms delay will not fire — Chrome terminates an idle service worker after about ${IDLE_TERMINATION_MS}ms.`,
              hint: "Use chrome.alarms.create() for anything scheduled further out than a few seconds.",
              ...locOf(node),
            });
          }
        }
      },
    });

    return findings;
  },
};
