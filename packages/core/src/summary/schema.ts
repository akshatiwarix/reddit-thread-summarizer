/** Shared contract both UIs render and every provider is asked to return. */
export const SUMMARY_JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["tldr", "mainPoints", "agreements", "disagreements", "bestComments"],
  properties: {
    tldr: { type: "string", description: "Two or three sentences." },
    mainPoints: { type: "array", items: { type: "string" } },
    agreements: { type: "array", items: { type: "string" } },
    disagreements: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["topic", "sides"],
        properties: {
          topic: { type: "string" },
          sides: {
            type: "array",
            minItems: 2,
            maxItems: 2,
            items: {
              type: "object",
              additionalProperties: false,
              required: ["label", "position"],
              properties: {
                label: { type: "string" },
                position: { type: "string" },
              },
            },
          },
        },
      },
    },
    bestComments: {
      type: "array",
      minItems: 3,
      maxItems: 5,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["author", "excerpt", "score", "permalink"],
        properties: {
          author: { type: "string" },
          excerpt: { type: "string" },
          score: { type: "number" },
          permalink: { type: "string" },
        },
      },
    },
  },
} as const;
