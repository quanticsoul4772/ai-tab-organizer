# BYOK Multi-Provider Implementation Plan

## Executive Summary

This document outlines the implementation strategy for adding Bring-Your-Own-Key (BYOK) support to the AI Tab Organizer Chrome extension, enabling users to choose between OpenAI, Anthropic Claude, Google Gemini, and other AI providers.

## Research Findings

### Multi-Provider Solutions

Based on research of existing multi-provider implementations:

1. **aisuite** (Andrew Ng) - Python library with unified interface for multiple providers
2. **LiteLLM** - Provider abstraction with OpenAI-compatible format
3. **Chrome GenAI Chat Extension** - Real Chrome extension with OpenAI, Claude, Gemini support
4. **uni-api** - Unified LLM API with load balancing

### Key API Differences

#### Message Format Differences

| Provider | Message Roles | System Prompt | Special Requirements |
|----------|--------------|---------------|---------------------|
| **OpenAI** | `user`, `assistant`, `system` | In messages array | Flexible role ordering |
| **Anthropic Claude** | `user`, `assistant` | Separate `system` parameter | Must alternate user/assistant |
| **Google Gemini** | `user`, `model` (not `assistant`) | System instructions | Different role name |

#### API Structure Differences

**Claude**:
```typescript
{
  model: "claude-3-5-sonnet-20241022",
  max_tokens: 1024,
  system: "system prompt here",  // Separate parameter
  messages: [
    { role: "user", content: "..." }
  ]
}
```

**OpenAI**:
```typescript
{
  model: "gpt-4o",
  max_tokens: 1024,
  messages: [
    { role: "system", content: "system prompt here" },  // In messages
    { role: "user", content: "..." }
  ]
}
```

**Gemini**:
```typescript
{
  model: "gemini-1.5-pro",
  maxOutputTokens: 1024,
  systemInstruction: { parts: [{ text: "system prompt here" }] },
  contents: [
    { role: "user", parts: [{ text: "..." }] }
  ]
}
```

#### Context Window Differences

- **Claude 3.5 Sonnet**: 200K tokens
- **GPT-4o**: 128K tokens
- **Gemini 2.5 Pro**: 1M tokens

#### Output Token Limits

- **Claude**: 4,096 tokens (all models)
- **OpenAI**: 4,096-16,384 tokens (varies by model)
- **Gemini**: 8,192 tokens

## Current Architecture Analysis

### Existing Components

1. **background.ts** (lines 60-69):
   - Hardcoded Claude API configuration
   - Single `API_CONFIG` object
   - Claude-specific message format

2. **claudeApi.ts** (lines 1-21):
   - Thin wrapper around background worker
   - Only supports categorization
   - No provider abstraction

3. **SettingsPanel.tsx** (lines 31-46):
   - Only Claude API key input
   - Hardcoded Anthropic console link
   - No provider selection UI

### Current API Flow

```
Popup → claudeApi.categorizeTabs() → background.ts categorizeTabs() → fetch() with Claude format
```

## Proposed Architecture

### 1. Provider Abstraction Layer

Create a new provider abstraction system:

```
extension/src/providers/
├── base/
│   ├── BaseProvider.ts          # Abstract base class
│   ├── types.ts                 # Common interfaces
│   └── ProviderFactory.ts       # Provider selection logic
├── openai/
│   ├── OpenAIProvider.ts        # OpenAI implementation
│   ├── config.ts                # OpenAI-specific config
│   └── transformer.ts           # Message format transformation
├── anthropic/
│   ├── AnthropicProvider.ts     # Claude implementation (existing logic)
│   ├── config.ts                # Anthropic config
│   └── transformer.ts           # Message format transformation
├── google/
│   ├── GeminiProvider.ts        # Gemini implementation
│   ├── config.ts                # Gemini config
│   └── transformer.ts           # Message format transformation
└── index.ts                      # Export all providers
```

### 2. Common Interface Design

```typescript
// extension/src/providers/base/types.ts

export enum AIProvider {
  OPENAI = 'openai',
  ANTHROPIC = 'anthropic',
  GOOGLE = 'google',
}

export interface AIModel {
  id: string;
  name: string;
  provider: AIProvider;
  contextWindow: number;
  maxOutputTokens: number;
  costPer1kInput: number;  // For user info
  costPer1kOutput: number;
}

export interface ProviderConfig {
  apiKey: string;
  model: string;
  maxTokens: number;
  timeout: number;
  maxRetries: number;
}

export interface UnifiedMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface UnifiedRequest {
  messages: UnifiedMessage[];
  maxTokens: number;
  temperature?: number;
}

export interface UnifiedResponse {
  content: string;
  usage: {
    inputTokens: number;
    outputTokens: number;
  };
  model: string;
  provider: AIProvider;
}

export abstract class BaseProvider {
  protected config: ProviderConfig;

  constructor(config: ProviderConfig) {
    this.config = config;
  }

  abstract get baseUrl(): string;
  abstract get headers(): Record<string, string>;

  // Transform unified request to provider-specific format
  abstract transformRequest(request: UnifiedRequest): unknown;

  // Transform provider response to unified format
  abstract transformResponse(response: unknown): UnifiedResponse;

  // Make API call with retry logic
  async complete(request: UnifiedRequest): Promise<UnifiedResponse> {
    const providerRequest = this.transformRequest(request);

    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify(providerRequest),
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`);
    }

    const data = await response.json();
    return this.transformResponse(data);
  }
}
```

### 3. Provider Implementations

**AnthropicProvider.ts** (migrate existing logic):
```typescript
export class AnthropicProvider extends BaseProvider {
  get baseUrl(): string {
    return 'https://api.anthropic.com/v1/messages';
  }

  get headers(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      'x-api-key': this.config.apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    };
  }

  transformRequest(request: UnifiedRequest): unknown {
    // Separate system message from others
    const systemMessage = request.messages.find(m => m.role === 'system');
    const otherMessages = request.messages.filter(m => m.role !== 'system');

    return {
      model: this.config.model,
      max_tokens: this.config.maxTokens,
      system: systemMessage?.content,
      messages: otherMessages.map(m => ({
        role: m.role === 'assistant' ? 'assistant' : 'user',
        content: m.content,
      })),
    };
  }

  transformResponse(response: any): UnifiedResponse {
    return {
      content: response.content[0].text,
      usage: {
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
      },
      model: response.model,
      provider: AIProvider.ANTHROPIC,
    };
  }
}
```

**OpenAIProvider.ts**:
```typescript
export class OpenAIProvider extends BaseProvider {
  get baseUrl(): string {
    return 'https://api.openai.com/v1/chat/completions';
  }

  get headers(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.config.apiKey}`,
    };
  }

  transformRequest(request: UnifiedRequest): unknown {
    return {
      model: this.config.model,
      max_tokens: this.config.maxTokens,
      messages: request.messages.map(m => ({
        role: m.role,
        content: m.content,
      })),
      temperature: request.temperature || 0.7,
    };
  }

  transformResponse(response: any): UnifiedResponse {
    return {
      content: response.choices[0].message.content,
      usage: {
        inputTokens: response.usage.prompt_tokens,
        outputTokens: response.usage.completion_tokens,
      },
      model: response.model,
      provider: AIProvider.OPENAI,
    };
  }
}
```

**GeminiProvider.ts**:
```typescript
export class GeminiProvider extends BaseProvider {
  get baseUrl(): string {
    // Gemini uses API key in URL
    return `https://generativelanguage.googleapis.com/v1beta/models/${this.config.model}:generateContent?key=${this.config.apiKey}`;
  }

  get headers(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
    };
  }

  transformRequest(request: UnifiedRequest): unknown {
    const systemMessage = request.messages.find(m => m.role === 'system');
    const otherMessages = request.messages.filter(m => m.role !== 'system');

    return {
      systemInstruction: systemMessage ? {
        parts: [{ text: systemMessage.content }]
      } : undefined,
      contents: otherMessages.map(m => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      })),
      generationConfig: {
        maxOutputTokens: this.config.maxTokens,
        temperature: 0.7,
      },
    };
  }

  transformResponse(response: any): UnifiedResponse {
    return {
      content: response.candidates[0].content.parts[0].text,
      usage: {
        inputTokens: response.usageMetadata.promptTokenCount,
        outputTokens: response.usageMetadata.candidatesTokenCount,
      },
      model: this.config.model,
      provider: AIProvider.GOOGLE,
    };
  }
}
```

### 4. Provider Factory

```typescript
// extension/src/providers/base/ProviderFactory.ts

export class ProviderFactory {
  static create(provider: AIProvider, config: ProviderConfig): BaseProvider {
    switch (provider) {
      case AIProvider.OPENAI:
        return new OpenAIProvider(config);
      case AIProvider.ANTHROPIC:
        return new AnthropicProvider(config);
      case AIProvider.GOOGLE:
        return new GeminiProvider(config);
      default:
        throw new Error(`Unsupported provider: ${provider}`);
    }
  }
}
```

### 5. Updated API Service

```typescript
// extension/src/services/aiApi.ts (renamed from claudeApi.ts)

import type { Tab, CategoryResponse } from '../types';
import { runtime } from '../core/browserApi';
import { BACKGROUND_ACTIONS } from '../constants/actions';
import { AIProvider } from '../providers/base/types';

export const aiApi = {
  async categorizeTabs(
    tabs: Tab[],
    provider: AIProvider,
    apiKey: string,
    model: string
  ): Promise<CategoryResponse> {
    return await runtime.sendMessage<CategoryResponse>(
      BACKGROUND_ACTIONS.CATEGORIZE,
      { tabs, provider, apiKey, model }
    );
  },
};
```

### 6. Background Worker Updates

```typescript
// extension/src/background.ts (simplified excerpt)

import { ProviderFactory } from './providers/base/ProviderFactory';
import { AIProvider, UnifiedRequest } from './providers/base/types';

interface BackgroundRequest {
  action: 'categorize' | 'summarizeTab' | 'summarizeCategory';
  provider: AIProvider;
  apiKey: string;
  model: string;
  tabs?: chrome.tabs.Tab[];
  // ... other fields
}

async function categorizeTabs(
  tabs: chrome.tabs.Tab[],
  provider: AIProvider,
  apiKey: string,
  model: string
): Promise<CategoryResponse> {
  const providerInstance = ProviderFactory.create(provider, {
    apiKey,
    model,
    maxTokens: 1024,
    timeout: 30000,
    maxRetries: 3,
  });

  const tabInfo = tabs.map((t, i) => `${i}: ${t.title} - ${t.url}`).join('\n');

  const request: UnifiedRequest = {
    messages: [
      {
        role: 'user',
        content: buildPrompt(tabInfo),
      }
    ],
    maxTokens: 1024,
  };

  const response = await tracedRetryWithValidation(
    'categorize-tabs',
    () => providerInstance.complete(request),
    // ... validation schema
  );

  return parseApiResponse(response.content);
}
```

### 7. Settings UI Updates

```typescript
// extension/src/components/SettingsPanel.tsx

interface SettingsPanelProps {
  provider: AIProvider;
  onProviderChange: (provider: AIProvider) => void;
  model: string;
  onModelChange: (model: string) => void;
  apiKey: string;
  onApiKeyChange: (key: string) => void;
  // ... other props
}

export function SettingsPanel({
  provider,
  onProviderChange,
  model,
  onModelChange,
  apiKey,
  onApiKeyChange,
  // ...
}: SettingsPanelProps) {
  const availableModels = getModelsForProvider(provider);

  return (
    <div className="settings">
      <h2>Settings</h2>

      <div className="settings-section">
        <h3>AI Provider</h3>
        <select value={provider} onChange={(e) => onProviderChange(e.target.value as AIProvider)}>
          <option value={AIProvider.ANTHROPIC}>Anthropic Claude</option>
          <option value={AIProvider.OPENAI}>OpenAI</option>
          <option value={AIProvider.GOOGLE}>Google Gemini</option>
        </select>
      </div>

      <div className="settings-section">
        <h3>Model</h3>
        <select value={model} onChange={(e) => onModelChange(e.target.value)}>
          {availableModels.map(m => (
            <option key={m.id} value={m.id}>
              {m.name} (Context: {m.contextWindow / 1000}K tokens)
            </option>
          ))}
        </select>
      </div>

      <div className="settings-section">
        <h3>API Key</h3>
        <input
          type="password"
          value={apiKey}
          onChange={(e) => onApiKeyChange(e.target.value)}
          placeholder={getPlaceholderForProvider(provider)}
        />
        <p className="help">
          Get your API key from{' '}
          <a href={getConsoleUrlForProvider(provider)} target="_blank" rel="noopener noreferrer">
            {getProviderName(provider)} Console
          </a>
        </p>
      </div>

      {/* ... rest of settings */}
    </div>
  );
}
```

### 8. Model Configuration

```typescript
// extension/src/providers/models.ts

import { AIProvider, AIModel } from './base/types';

export const AVAILABLE_MODELS: Record<AIProvider, AIModel[]> = {
  [AIProvider.ANTHROPIC]: [
    {
      id: 'claude-3-5-sonnet-20241022',
      name: 'Claude 3.5 Sonnet',
      provider: AIProvider.ANTHROPIC,
      contextWindow: 200000,
      maxOutputTokens: 4096,
      costPer1kInput: 0.003,
      costPer1kOutput: 0.015,
    },
    {
      id: 'claude-3-5-haiku-20241022',
      name: 'Claude 3.5 Haiku',
      provider: AIProvider.ANTHROPIC,
      contextWindow: 200000,
      maxOutputTokens: 4096,
      costPer1kInput: 0.0008,
      costPer1kOutput: 0.004,
    },
  ],
  [AIProvider.OPENAI]: [
    {
      id: 'gpt-4o',
      name: 'GPT-4o',
      provider: AIProvider.OPENAI,
      contextWindow: 128000,
      maxOutputTokens: 4096,
      costPer1kInput: 0.0025,
      costPer1kOutput: 0.01,
    },
    {
      id: 'gpt-4o-mini',
      name: 'GPT-4o Mini',
      provider: AIProvider.OPENAI,
      contextWindow: 128000,
      maxOutputTokens: 16384,
      costPer1kInput: 0.00015,
      costPer1kOutput: 0.0006,
    },
  ],
  [AIProvider.GOOGLE]: [
    {
      id: 'gemini-1.5-pro',
      name: 'Gemini 1.5 Pro',
      provider: AIProvider.GOOGLE,
      contextWindow: 1000000,
      maxOutputTokens: 8192,
      costPer1kInput: 0.00125,
      costPer1kOutput: 0.005,
    },
    {
      id: 'gemini-1.5-flash',
      name: 'Gemini 1.5 Flash',
      provider: AIProvider.GOOGLE,
      contextWindow: 1000000,
      maxOutputTokens: 8192,
      costPer1kInput: 0.000075,
      costPer1kOutput: 0.0003,
    },
  ],
};

export function getModelsForProvider(provider: AIProvider): AIModel[] {
  return AVAILABLE_MODELS[provider] || [];
}

export function getDefaultModel(provider: AIProvider): string {
  const models = getModelsForProvider(provider);
  return models[0]?.id || '';
}
```

## Implementation Phases

### Phase 1: Foundation (Week 1)
- [ ] Create provider abstraction layer structure
- [ ] Implement BaseProvider abstract class
- [ ] Define unified interfaces (UnifiedRequest, UnifiedResponse)
- [ ] Create ProviderFactory

### Phase 2: Provider Implementations (Week 2)
- [ ] Migrate existing Claude logic to AnthropicProvider
- [ ] Implement OpenAIProvider
- [ ] Implement GeminiProvider
- [ ] Add comprehensive tests for each provider

### Phase 3: Integration (Week 3)
- [ ] Update background.ts to use provider abstraction
- [ ] Rename claudeApi.ts to aiApi.ts
- [ ] Update storage schema to include provider and model
- [ ] Update all API calls to pass provider info

### Phase 4: UI Updates (Week 4)
- [ ] Add provider selection dropdown to SettingsPanel
- [ ] Add model selection dropdown (dynamic based on provider)
- [ ] Update API key input placeholder and help text
- [ ] Add provider-specific documentation links

### Phase 5: Testing & Polish (Week 5)
- [ ] Test with all three providers
- [ ] Add error handling for provider-specific issues
- [ ] Update documentation (README, CLAUDE.md)
- [ ] Add migration guide for existing users

## Storage Schema Changes

```typescript
// Current schema
interface Settings {
  apiKey: string;  // Only Claude API key
  summarySettings: SummarySettings;
  jiraSettings: JiraSettings;
}

// New schema
interface Settings {
  provider: AIProvider;           // NEW: Selected provider
  model: string;                  // NEW: Selected model
  apiKeys: {                      // NEW: Multiple API keys
    anthropic?: string;
    openai?: string;
    google?: string;
  };
  summarySettings: SummarySettings;
  jiraSettings: JiraSettings;
}
```

## Migration Strategy

For existing users with Claude API keys:

```typescript
// extension/src/utils/migration.ts

export async function migrateSettings(): Promise<void> {
  const result = await chrome.storage.local.get(['apiKey', 'provider']);

  // If old schema (single apiKey) exists, migrate to new schema
  if (result.apiKey && !result.provider) {
    await chrome.storage.local.set({
      provider: AIProvider.ANTHROPIC,
      model: 'claude-3-5-sonnet-20241022',
      apiKeys: {
        anthropic: result.apiKey,
      },
    });

    // Remove old apiKey
    await chrome.storage.local.remove('apiKey');

    console.log('✅ Migrated settings to multi-provider format');
  }
}

// Call during extension startup
chrome.runtime.onInstalled.addListener(async () => {
  await migrateSettings();
  // ... rest of initialization
});
```

## Error Handling Considerations

### Provider-Specific Errors

```typescript
export class ProviderError extends Error {
  constructor(
    message: string,
    public provider: AIProvider,
    public statusCode?: number,
    public retryable: boolean = false
  ) {
    super(message);
    this.name = 'ProviderError';
  }
}

// In BaseProvider
protected handleError(error: unknown, statusCode?: number): never {
  if (statusCode === 401 || statusCode === 403) {
    throw new ProviderError(
      'Invalid API key',
      this.provider,
      statusCode,
      false
    );
  }

  if (statusCode === 429) {
    throw new ProviderError(
      'Rate limit exceeded',
      this.provider,
      statusCode,
      true
    );
  }

  // ... other error cases
}
```

## Testing Strategy

### Unit Tests

```typescript
// extension/src/providers/__tests__/AnthropicProvider.test.ts
describe('AnthropicProvider', () => {
  it('should transform request correctly', () => {
    const provider = new AnthropicProvider(mockConfig);
    const request: UnifiedRequest = {
      messages: [
        { role: 'system', content: 'You are helpful' },
        { role: 'user', content: 'Hello' },
      ],
      maxTokens: 100,
    };

    const transformed = provider.transformRequest(request);

    expect(transformed).toEqual({
      model: mockConfig.model,
      max_tokens: 100,
      system: 'You are helpful',
      messages: [{ role: 'user', content: 'Hello' }],
    });
  });

  // ... more tests
});
```

### Integration Tests

Test actual API calls with all three providers (requires API keys):

```typescript
// extension/src/providers/__tests__/integration.test.ts
describe('Provider Integration', () => {
  test.each([
    AIProvider.ANTHROPIC,
    AIProvider.OPENAI,
    AIProvider.GOOGLE,
  ])('%s provider should categorize tabs', async (provider) => {
    const apiKey = process.env[`${provider.toUpperCase()}_API_KEY`];
    if (!apiKey) {
      console.warn(`Skipping ${provider} - no API key`);
      return;
    }

    const providerInstance = ProviderFactory.create(provider, {
      apiKey,
      model: getDefaultModel(provider),
      maxTokens: 100,
      timeout: 30000,
      maxRetries: 1,
    });

    const response = await providerInstance.complete({
      messages: [
        { role: 'user', content: 'Categorize: Google, GitHub, Gmail' }
      ],
      maxTokens: 100,
    });

    expect(response.content).toBeTruthy();
    expect(response.provider).toBe(provider);
  });
});
```

## Documentation Updates

### README.md Updates

```markdown
## Supported AI Providers

AI Tab Organizer supports multiple AI providers - bring your own API key:

- **Anthropic Claude** - Claude 3.5 Sonnet, Claude 3.5 Haiku
- **OpenAI** - GPT-4o, GPT-4o Mini
- **Google Gemini** - Gemini 1.5 Pro, Gemini 1.5 Flash

### Getting API Keys

- **Claude**: [console.anthropic.com](https://console.anthropic.com)
- **OpenAI**: [platform.openai.com](https://platform.openai.com)
- **Gemini**: [aistudio.google.com](https://aistudio.google.com)

### Choosing a Provider

| Provider | Best For | Context Window | Cost (per 1M tokens) |
|----------|----------|----------------|---------------------|
| Claude 3.5 Sonnet | Quality, long documents | 200K | $3 input / $15 output |
| GPT-4o | Balanced performance | 128K | $2.50 input / $10 output |
| GPT-4o Mini | Cost efficiency | 128K | $0.15 input / $0.60 output |
| Gemini 1.5 Pro | Massive context | 1M | $1.25 input / $5 output |
| Gemini 1.5 Flash | Speed & cost | 1M | $0.075 input / $0.30 output |
```

## Benefits of BYOK Approach

1. **User Choice**: Users select provider based on their preferences
2. **Cost Control**: Users manage their own API costs and usage
3. **Privacy**: Direct API calls, no intermediary servers
4. **Flexibility**: Easy to add new providers in the future
5. **No Rate Limits**: Extension doesn't enforce shared rate limits
6. **Model Selection**: Users can choose specific models (fast vs. capable)

## Future Enhancements

### Phase 6: Advanced Features
- [ ] Support for local models (Ollama integration)
- [ ] Azure OpenAI support
- [ ] Custom API endpoint configuration
- [ ] Provider fallback (try another if one fails)
- [ ] Cost tracking and usage statistics
- [ ] A/B testing between providers

### Phase 7: Optimization
- [ ] Smart provider selection based on task
- [ ] Request batching for multiple tabs
- [ ] Caching shared across providers
- [ ] Performance benchmarking dashboard

## Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|-----------|
| API format changes | High | Version API calls, add provider version tracking |
| User confusion | Medium | Clear UI, good documentation, smart defaults |
| Increased complexity | Medium | Comprehensive tests, clear abstractions |
| Migration issues | Low | Automatic migration, backwards compatibility |
| API key security | High | Use Chrome storage encryption, never log keys |

## Success Metrics

- [ ] All three providers working correctly
- [ ] Zero breaking changes for existing Claude users
- [ ] <100ms overhead from abstraction layer
- [ ] 95%+ test coverage for provider code
- [ ] Clear documentation for adding new providers
- [ ] Positive user feedback on provider choice

## Conclusion

This implementation plan provides a comprehensive roadmap for adding BYOK multi-provider support to the AI Tab Organizer extension. The design prioritizes:

1. **Clean abstraction** - Unified interface hiding provider differences
2. **Backwards compatibility** - Seamless migration for existing users
3. **Extensibility** - Easy to add new providers
4. **User experience** - Simple provider/model selection
5. **Maintainability** - Clear separation of concerns

Estimated timeline: 5 weeks for full implementation and testing.
