import type { AwsConfig } from '@config/aws.config';
import { AWS_CONFIG_KEY } from '@config/aws.config';
import { AppLogger } from '@core/logging/app-logger.service';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface BedrockMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface BedrockResponse {
  content: string;
  stopReason: string;
  usage: {
    inputTokens: number;
    outputTokens: number;
  };
}

/**
 * Service for AWS Bedrock AI operations
 *
 * Provides a simple interface for invoking Claude models via Bedrock.
 * Optimized for Lambda with minimal dependencies.
 */
@Injectable()
export class BedrockService {
  private readonly modelId: string;
  private readonly region: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly logger: AppLogger,
  ) {
    this.logger.setContext('BedrockService');

    const awsConfig = this.configService.get<AwsConfig>(AWS_CONFIG_KEY);
    if (!awsConfig) {
      throw new Error('AWS configuration not found');
    }

    this.modelId = awsConfig.bedrock.modelId;
    this.region = awsConfig.region;
  }

  /**
   * Invoke Claude model with a conversation
   *
   * @param messages - Array of conversation messages
   * @param systemPrompt - Optional system prompt
   * @param maxTokens - Maximum tokens in response (default: 1024)
   */
  async invoke(
    messages: BedrockMessage[],
    systemPrompt?: string,
    maxTokens = 1024,
  ): Promise<BedrockResponse> {
    this.logger.debug('Invoking Bedrock model', {
      modelId: this.modelId,
      messageCount: messages.length,
    });

    // Lazy import for Lambda cold start optimization
    const { BedrockRuntimeClient, InvokeModelCommand } = await import(
      '@aws-sdk/client-bedrock-runtime'
    );

    const client = new BedrockRuntimeClient({ region: this.region });

    const body = JSON.stringify({
      anthropic_version: 'bedrock-2023-05-31',
      max_tokens: maxTokens,
      system: systemPrompt,
      messages: messages.map((m) => ({
        role: m.role,
        content: [{ type: 'text', text: m.content }],
      })),
    });

    const command = new InvokeModelCommand({
      modelId: this.modelId,
      contentType: 'application/json',
      accept: 'application/json',
      body: Buffer.from(body),
    });

    const response = await client.send(command);
    const responseBody = JSON.parse(new TextDecoder().decode(response.body));

    this.logger.debug('Bedrock response received', {
      stopReason: responseBody.stop_reason,
      inputTokens: responseBody.usage?.input_tokens,
      outputTokens: responseBody.usage?.output_tokens,
    });

    return {
      content: responseBody.content[0]?.text || '',
      stopReason: responseBody.stop_reason,
      usage: {
        inputTokens: responseBody.usage?.input_tokens || 0,
        outputTokens: responseBody.usage?.output_tokens || 0,
      },
    };
  }

  /**
   * Simple text completion
   */
  async complete(prompt: string, systemPrompt?: string): Promise<string> {
    const response = await this.invoke([{ role: 'user', content: prompt }], systemPrompt);
    return response.content;
  }
}
