import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import Anthropic from '@anthropic-ai/sdk';

const MODEL = 'claude-opus-4-7';

const HASHTAGS_SYSTEM_PROMPT = `You are a senior social media strategist. Given a post draft and a list of target social networks, return 5 to 8 hashtags that:
- Match the post's topic, audience and tone
- Mix one or two broad/popular tags with niche/long-tail tags for discovery
- Adapt to each network's culture: LinkedIn favors professional/industry tags, Instagram favors discoverability and lifestyle, TikTok favors short trending tags, Facebook stays generic, X (Twitter) favors short and punchy
- Always start with the # character, no spaces, lowercase or PascalCase
- Are written in the same language as the post

Output ONLY a JSON object matching the schema {"hashtags": ["#tag1", ...]} — no preamble, no commentary.`;

const REWRITE_SYSTEM_PROMPT = `You are a senior social media copywriter. Rewrite the user's post for the specified target network and tone, keeping the original meaning and key facts.

Network rules:
- LINKEDIN: professional, value-first, ~150-200 words max, no excessive emoji, single hook line, optional closing question
- INSTAGRAM: engaging, ~80-150 words, emoji-friendly, line breaks for readability, ends with a CTA or question
- TIKTOK: punchy, hook-first, very short (1-3 sentences), conversational
- FACEBOOK: conversational, ~80-120 words, friendly
- TWITTER: ≤ 280 chars, single tweet, concise hook
- THREAD: a thread of 2-5 short tweets ≤ 280 chars each, the first being a hook

Tone options: professional, casual, enthusiastic, informative, witty.

Output ONLY a JSON object matching the schema {"rewritten": "..."} (or {"rewritten": "first tweet", "thread": ["tweet 2", "tweet 3"]} for THREAD). No preamble, no commentary, no markdown fences.`;

interface HashtagResponse {
  hashtags: string[];
}

interface RewriteResponse {
  rewritten: string;
  thread?: string[];
}

@Injectable()
export class AIService {
  private readonly logger = new Logger(AIService.name);
  private readonly client: Anthropic | null;

  constructor() {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    this.client = apiKey ? new Anthropic({ apiKey }) : null;
  }

  isEnabled(): boolean {
    return !!this.client;
  }

  private requireClient(): Anthropic {
    if (!this.client) {
      throw new BadRequestException('AI assistant is not configured (ANTHROPIC_API_KEY missing)');
    }
    return this.client;
  }

  async suggestHashtags(content: string, networks: string[]): Promise<string[]> {
    const client = this.requireClient();
    const userMessage = `Networks: ${networks.join(', ') || 'GENERIC'}\n\nPost:\n${content}`;

    const res = await client.messages.create({
      model: MODEL,
      max_tokens: 512,
      // Cache the system prompt — same on every call, big perf/$$$ win.
      system: [
        { type: 'text', text: HASHTAGS_SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } },
      ],
      output_config: {
        effort: 'low',
        format: {
          type: 'json_schema',
          schema: {
            type: 'object',
            properties: {
              hashtags: { type: 'array', items: { type: 'string' } },
            },
            required: ['hashtags'],
            additionalProperties: false,
          },
        },
      },
      messages: [{ role: 'user', content: userMessage }],
    } as any);

    const textBlock = res.content.find((b: any) => b.type === 'text') as any;
    if (!textBlock?.text) throw new Error('AI returned no content');
    const parsed = JSON.parse(textBlock.text) as HashtagResponse;
    return parsed.hashtags.map((h) => (h.startsWith('#') ? h : `#${h}`));
  }

  async rewrite(content: string, network: string, tone: string): Promise<RewriteResponse> {
    const client = this.requireClient();
    const userMessage = `Target network: ${network}\nTone: ${tone}\n\nOriginal post:\n${content}`;

    const res = await client.messages.create({
      model: MODEL,
      max_tokens: 1500,
      system: [
        { type: 'text', text: REWRITE_SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } },
      ],
      output_config: {
        effort: 'low',
        format: {
          type: 'json_schema',
          schema: {
            type: 'object',
            properties: {
              rewritten: { type: 'string' },
              thread: { type: 'array', items: { type: 'string' } },
            },
            required: ['rewritten'],
            additionalProperties: false,
          },
        },
      },
      messages: [{ role: 'user', content: userMessage }],
    } as any);

    const textBlock = res.content.find((b: any) => b.type === 'text') as any;
    if (!textBlock?.text) throw new Error('AI returned no content');
    const parsed = JSON.parse(textBlock.text) as RewriteResponse;
    if (process.env.NODE_ENV !== 'production') {
      this.logger.debug(
        `cache_read=${res.usage?.cache_read_input_tokens ?? 0} cache_create=${res.usage?.cache_creation_input_tokens ?? 0}`,
      );
    }
    return parsed;
  }
}
