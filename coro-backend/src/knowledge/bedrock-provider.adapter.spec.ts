import { BedrockProviderAdapter } from './bedrock-provider.adapter';
import { KnowledgeConfig } from './knowledge.config';
import { KnowledgeSearchHit } from './knowledge.types';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { BedrockRuntimeClient } from '@aws-sdk/client-bedrock-runtime';

const hit: KnowledgeSearchHit = {
  chunkId: 'chunk-1',
  citationId: 'citation-1',
  projectFileId: 'file-1',
  projectFileVersion: 2,
  documentName: 'Plan approuve',
  buildingId: 'building-1',
  pageStart: 4,
  pageEnd: 4,
  sectionPath: 'Evacuation',
  text: 'Le point de rassemblement est situe dans la cour nord.',
  score: 0.92,
  sourceSha256: 'a'.repeat(64),
};

describe('BedrockProviderAdapter', () => {
  const original = { ...process.env };

  beforeEach(() => {
    process.env.NODE_ENV = 'test';
    process.env.CORO_AI_PROVIDER = 'bedrock';
    process.env.CORO_AI_BEDROCK_INVOCATION_ENABLED = 'true';
    process.env.CORO_AI_BEDROCK_REGION = 'ca-central-1';
    process.env.CORO_AI_BEDROCK_MODEL_ID = 'ca.amazon.nova-lite-v1:0';
  });

  afterAll(() => {
    process.env = original;
  });

  it('accepte une reponse simulee strictement fondee sur une citation autorisee', async () => {
    const adapter = new BedrockProviderAdapter(new KnowledgeConfig());
    adapter.setClientForTesting({
      send: jest.fn().mockResolvedValue({
        output: {
          message: {
            content: [
              {
                text: JSON.stringify({
                  answer: 'Le point de rassemblement est dans la cour nord.',
                  uncertainty: null,
                  missingInformation: [],
                  conflicts: [],
                  usedCitationIds: ['citation-1'],
                }),
              },
            ],
          },
        },
      }),
    } as never);

    await expect(adapter.answer('Ou est le point?', [hit])).resolves.toMatchObject({
      usedCitationIds: ['citation-1'],
    });
  });

  it('abstains if the provider reports contradictory evidence even when it proposes an answer', async () => {
    const adapter = new BedrockProviderAdapter(new KnowledgeConfig());
    adapter.setClientForTesting({ send: jest.fn().mockResolvedValue({ output: { message: { content: [{ text: JSON.stringify({
      answer: 'Une valeur arbitraire', uncertainty: '', missingInformation: [], conflicts: ['Deux valeurs divergentes'], usedCitationIds: ['citation-1'],
    }) }] } } }) } as never);
    await expect(adapter.answer('Question de recette', [hit])).resolves.toMatchObject({ answer: null, conflicts: ['Deux valeurs divergentes'], usedCitationIds: ['citation-1'] });
  });

  const fence = String.fromCharCode(96).repeat(3);
  const groundedJson = JSON.stringify({
    answer: 'Le point de rassemblement est dans la cour nord.',
    uncertainty: null, missingInformation: [], conflicts: [],
    usedCitationIds: ['citation-1'],
  });
  function responseAdapter(text: string) {
    const adapter = new BedrockProviderAdapter(new KnowledgeConfig());
    adapter.setClientForTesting({ send: jest.fn().mockResolvedValue({
      output: { message: { content: [{ text }] } },
    }) } as never);
    return adapter;
  }

  it.each(['json', ''])('accepte un bloc JSON unique avec balise %s', async (language) => {
    const text = '  '+fence+language+'\n'+groundedJson+'\n'+fence+'  ';
    await expect(responseAdapter(text).answer('Question', [hit])).resolves.toMatchObject({
      answer: 'Le point de rassemblement est dans la cour nord.',
      usedCitationIds: ['citation-1'],
    });
  });

  it.each([
    'Voici la reponse: '+fence+'json\n'+groundedJson+'\n'+fence,
    fence+'json\n'+groundedJson+'\n'+fence+' Texte ajoute',
    fence+'json\n'+groundedJson+'\n'+fence+'\n'+fence+'json\n{}\n'+fence,
    fence+'javascript\n'+groundedJson+'\n'+fence,
    fence+'json\n'+groundedJson+' {}\n'+fence,
  ])('refuse un document entoure de prose, plusieurs blocs ou du contenu non JSON (%#)', async (text) => {
    await expect(responseAdapter(text).answer('Question', [hit])).rejects.toThrow(SyntaxError);
  });

  it('refuse toujours une citation interdite dans un bloc JSON', async () => {
    const text=fence+'json\n'+JSON.stringify({answer:'Inventee',uncertainty:null,missingInformation:[],conflicts:[],usedCitationIds:['citation-interdite']})+'\n'+fence;
    await expect(responseAdapter(text).answer('Question', [hit])).rejects.toThrow('Citation Bedrock non autorisee');
  });

  const validToolAnswer = {
    answer: 'Le point de rassemblement est dans la cour nord.',
    uncertainty: '', missingInformation: [], conflicts: [], usedCitationIds: ['citation-1'],
  };
  function toolAdapter(inputs: Array<{ name: string; input: unknown }>) {
    const send = jest.fn().mockResolvedValue({
      output: { message: { content: inputs.map((tool) => ({ toolUse: { toolUseId: 'test-tool', ...tool } })) } },
    });
    const adapter = new BedrockProviderAdapter(new KnowledgeConfig());
    adapter.setClientForTesting({ send } as never);
    return { adapter, send };
  }

  it('demande un format type limite aux citations autorisees et accepte sa reponse', async () => {
    const { adapter, send } = toolAdapter([{ name: 'coro_grounded_answer', input: validToolAnswer }]);
    await expect(adapter.answer('Question', [hit])).resolves.toMatchObject(validToolAnswer);
    const request = send.mock.calls[0][0].input;
    expect(request.toolConfig.toolChoice).toEqual({ tool: { name: 'coro_grounded_answer' } });
    expect(request.toolConfig.tools[0].toolSpec.inputSchema.json.properties.usedCitationIds.items.enum).toEqual(['citation-1']);
    expect(request.inferenceConfig.maxTokens).toBe(800);
    expect(send).toHaveBeenCalledTimes(1);
  });

  it.each([
    { tools: [{ name: 'execute_action', input: validToolAnswer }] },
    { tools: [{ name: 'coro_grounded_answer', input: validToolAnswer }, { name: 'coro_grounded_answer', input: validToolAnswer }] },
  ])('refuse les sorties multiples ou un nom de format non autorise (%#)', async ({ tools }) => {
    await expect(toolAdapter(tools).adapter.answer('Question', [hit])).rejects.toThrow('Format de sortie Bedrock non autorise');
  });

  it.each([
    null, [], {},
    { answer: validToolAnswer.answer, usedCitationIds: validToolAnswer.usedCitationIds },
    { ...validToolAnswer, answer: 7 },
    { ...validToolAnswer, uncertainty: 0 },
    { ...validToolAnswer, missingInformation: 'Aucune' },
    { ...validToolAnswer, conflicts: 'Aucun' },
    { ...validToolAnswer, usedCitationIds: ['citation-1', 7] },
  ].map((input) => ({ input })))('refuse un schema de sortie structuree invalide (%#)', async ({ input }) => {
    const { adapter } = toolAdapter([{ name: 'coro_grounded_answer', input }]);
    await expect(adapter.answer('Question', [hit])).rejects.toThrow('Schema Bedrock invalide');
  });

  it('refuse une citation inventee meme dans la sortie structuree', async () => {
    const { adapter } = toolAdapter([{ name: 'coro_grounded_answer', input: { ...validToolAnswer, usedCitationIds: ['forbidden'] } }]);
    await expect(adapter.answer('Question', [hit])).rejects.toThrow('Citation Bedrock non autorisee');
  });

  it('refuse une citation inventee par le fournisseur', async () => {
    const adapter = new BedrockProviderAdapter(new KnowledgeConfig());
    adapter.setClientForTesting({
      send: jest.fn().mockResolvedValue({
        output: {
          message: {
            content: [
              {
                text: JSON.stringify({
                  answer: 'Reponse non fondee',
                  uncertainty: null,
                  missingInformation: [],
                  conflicts: [],
                  usedCitationIds: ['citation-interdite'],
                }),
              },
            ],
          },
        },
      }),
    } as never);

    await expect(adapter.answer('Question', [hit])).rejects.toThrow(
      'Citation Bedrock non autorisee',
    );
  });

  it('reste desactive sans gate d invocation explicite', async () => {
    process.env.CORO_AI_BEDROCK_INVOCATION_ENABLED = 'false';
    const adapter = new BedrockProviderAdapter(new KnowledgeConfig());
    adapter.setClientForTesting({ send: jest.fn() } as never);
    await expect(adapter.answer('Question', [hit])).rejects.toThrow(
      'Invocation Bedrock non autorisee',
    );
  });

  it('refuse un appel direct lorsque le fournisseur Bedrock n est pas selectionne', async () => {
    process.env.CORO_AI_PROVIDER = 'deterministic-simulated';
    const send = jest.fn();
    const adapter = new BedrockProviderAdapter(new KnowledgeConfig());
    adapter.setClientForTesting({ send } as never);
    await expect(adapter.answer('Question', [hit])).rejects.toThrow(
      'Fournisseur Bedrock non selectionne',
    );
    expect(send).not.toHaveBeenCalled();
  });

  it('ne transmet aucune question sans source autorisee', async () => {
    const send = jest.fn();
    const adapter = new BedrockProviderAdapter(new KnowledgeConfig());
    adapter.setClientForTesting({ send } as never);
    await expect(adapter.answer('Question', [])).rejects.toThrow(
      'Aucune source autorisee',
    );
    expect(send).not.toHaveBeenCalled();
  });

  it('charge credential_process depuis le fichier config explicite sans AWS_CONFIG_FILE', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'coro-roles-anywhere-test-'));
    const previous = { ...process.env };
    try {
      const configFile = join(directory, 'config');
      const credentialsFile = join(directory, 'credentials');
      const processFile = join(directory, 'fake-credential-process.cjs');
      writeFileSync(credentialsFile, '');
      writeFileSync(
        processFile,
        `process.stdout.write(JSON.stringify({Version:1,AccessKeyId:'TEST_ONLY_ACCESS_KEY',SecretAccessKey:'TEST_ONLY_SECRET',SessionToken:'TEST_ONLY_TOKEN'}));`,
      );
      writeFileSync(
        configFile,
        `[profile coro-credential-process-test]\ncredential_process = "${process.execPath}" "${processFile}"\nregion = ca-central-1\n`,
      );
      delete process.env.AWS_CONFIG_FILE;
      process.env.AWS_SHARED_CREDENTIALS_FILE = credentialsFile;
      process.env.AWS_PROFILE = 'coro-credential-process-test';
      const config = new KnowledgeConfig();
      Object.defineProperty(config, 'awsConfigFile', { value: configFile });
      const adapter = new BedrockProviderAdapter(config);
      const client = (
        adapter as unknown as { getClient(): BedrockRuntimeClient }
      ).getClient();
      const credentials = await client.config.credentials();
      expect(credentials.accessKeyId).toBe('TEST_ONLY_ACCESS_KEY');
      expect(credentials.sessionToken).toBe('TEST_ONLY_TOKEN');
      client.destroy();
    } finally {
      process.env = previous;
      rmSync(directory, { recursive: true, force: true });
    }
  });
});
