import { BadRequestException, ConflictException } from '@nestjs/common';
import {
  mandateApplyPayloadHash,
  assertDistinctMandateDecisions,
  assertReplacementIdentity,
} from './mandate-operations-apply.service';
import { MandateOperationDecisionAction as Action } from './mandate-operations-apply.dto';

const revision = 'a'.repeat(64);
const id = (digit: string) =>
  `${digit.repeat(8)}-${digit.repeat(4)}-4${digit.repeat(3)}-8${digit.repeat(3)}-${digit.repeat(12)}`;

describe('Mandate operational apply invariants', () => {
  it('canonicalizes decision order before hashing', () => {
    const a: any = {
      idempotencyKey: id('1'),
      expectedRevision: revision,
      decisions: [
        { mandateServiceId: id('2'), action: Action.CREATE_ACTIVITY },
        {
          mandateServiceId: id('3'),
          action: Action.ADOPT_LEGACY_ACTIVITY,
          activityId: id('4'),
        },
      ],
    };
    const b = { ...a, decisions: [...a.decisions].reverse() };
    expect(mandateApplyPayloadHash(id('5'), a)).toBe(
      mandateApplyPayloadHash(id('5'), b),
    );
    expect(mandateApplyPayloadHash(id('6'), a)).not.toBe(
      mandateApplyPayloadHash(id('5'), a),
    );
    expect(
      mandateApplyPayloadHash(id('5'), {
        ...a,
        expectedRevision: 'b'.repeat(64),
      }),
    ).not.toBe(mandateApplyPayloadHash(id('5'), a));
  });

  it('includes activityId in the hash', () => {
    const dto: any = {
      idempotencyKey: id('1'),
      expectedRevision: revision,
      decisions: [
        {
          mandateServiceId: id('2'),
          action: Action.CREATE_REPLACEMENT,
          activityId: id('3'),
        },
      ],
    };
    expect(mandateApplyPayloadHash(id('5'), dto)).not.toBe(
      mandateApplyPayloadHash(id('5'), {
        ...dto,
        decisions: [{ ...dto.decisions[0], activityId: id('4') }],
      }),
    );
  });

  it('rejects duplicate services, duplicate activities and incoherent activityId', () => {
    expect(() =>
      assertDistinctMandateDecisions([
        { mandateServiceId: id('1'), action: Action.CREATE_ACTIVITY },
        { mandateServiceId: id('1'), action: Action.CREATE_ACTIVITY },
      ]),
    ).toThrow(BadRequestException);
    expect(() =>
      assertDistinctMandateDecisions([
        {
          mandateServiceId: id('1'),
          action: Action.ADOPT_LEGACY_ACTIVITY,
          activityId: id('3'),
        },
        {
          mandateServiceId: id('2'),
          action: Action.CREATE_REPLACEMENT,
          activityId: id('3'),
        },
      ]),
    ).toThrow(BadRequestException);
    expect(() =>
      assertDistinctMandateDecisions([
        {
          mandateServiceId: id('1'),
          action: Action.CREATE_ACTIVITY,
          activityId: id('3'),
        },
      ]),
    ).toThrow(BadRequestException);
  });

  it('explicitly rejects replacement self-reference', () => {
    expect(() => assertReplacementIdentity(id('1'), id('1'))).toThrow(
      ConflictException,
    );
    expect(() => assertReplacementIdentity(id('1'), id('2'))).not.toThrow();
  });
});
