import { type Integration } from "fogbender-client/src/shared";

const IntegrationDetails = {
  "ai": {
    type: "ai",
    name: "AI",
    icon: (
      <img src="https://fog-bot-avatars.s3.amazonaws.com/ai_192.png" title="AI" alt="bot avatar" />
    ),
  },
};

type IntegrationType = keyof typeof IntegrationDetails;

export function getIntegrationDetails(integration: Integration | IntegrationType) {
  const type = typeof integration === "string" ? integration : integration.type;
  const details = IntegrationDetails[type as IntegrationType];
  return details ? details : undefined;
}
