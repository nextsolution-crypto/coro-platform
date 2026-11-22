import { IsOptional, IsString } from 'class-validator';
import { UnknownFieldsAuditPipe, declaredProperties } from './unknown-fields-audit.pipe';

class SampleDto {
  @IsString() name!: string;
  @IsOptional() @IsString() note?: string;
}

describe('champs inconnus (M3-08)', () => {
  const pipe = new UnknownFieldsAuditPipe();
  const meta = { type: 'body' as const, metatype: SampleDto, data: '' };
  afterEach(() => {
    delete process.env.STRICT_PAYLOAD_VALIDATION;
    delete process.env.STRICT_PAYLOAD_PREFIXES;
  });

  it('lit les champs déclarés du DTO', () => {
    expect([...declaredProperties(SampleDto)].sort()).toEqual(['name', 'note']);
  });

  it('laisse passer et journalise par défaut', () => {
    const warn = jest.spyOn((pipe as any).logger, 'warn').mockImplementation(() => undefined);
    expect(pipe.transform({ name: 'a', role: 'ADMIN' }, meta)).toEqual({ name: 'a', role: 'ADMIN' });
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('role'));
    expect(warn.mock.calls[0][0]).not.toContain('ADMIN');
  });

  it('refuse en mode strict', () => {
    process.env.STRICT_PAYLOAD_VALIDATION = 'true';
    expect(() => pipe.transform({ name: 'a', role: 'ADMIN' }, meta)).toThrow('Champ(s) non prévu(s) : role.');
  });

  it('ignore les routes non typées et les paramètres', () => {
    process.env.STRICT_PAYLOAD_VALIDATION = 'true';
    expect(pipe.transform({ x: 1 }, { type: 'body', metatype: Object, data: '' })).toEqual({ x: 1 });
    expect(pipe.transform('abc', { type: 'param', metatype: String, data: 'id' })).toBe('abc');
  });
});
