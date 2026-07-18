# AI Workflow

AI in Rakshika should enhance safety and decision support, but it must never become a dependency for the core emergency activation flow.

## AI Goals

- Provide guided safety assistance.
- Summarize incidents after or during an emergency.
- Support risk analysis and safe route recommendations.
- Keep inference latency and cost under control.

## Workflow Boundaries

- AI should run as a separate service.
- Core SOS initiation must not wait on AI output.
- AI responses should be advisory, not authoritative.

## Example AI Use Cases

- Chat-style emergency guidance.
- Incident summarization.
- Risk scoring based on contextual data.
- Safe route suggestions when navigation is available.

## Operational Considerations

- Prefer short, focused prompts.
- Cache repeated or stable results where possible.
- Protect sensitive user context when sending data to external AI providers.

## Product Implication

The AI workflow should support product value while preserving the speed, reliability, and safety of the primary emergency path.
