import { BadRequestException, ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { OccupancyEmployeesService } from './occupancy-employees.service';

describe('Manual employee PIN resend', () => {
  function harness(patch: any = {}) {
    let row: any = { id: 'employee-a', buildingId: 'building-a', organizationId: 'org-a', firstName: 'QA', lastName: 'Fictif', email: 'qa@example.invalid', pin: '1234', isActive: true, pinEmailStatus: 'NOT_VERIFIED', pinEmailMessageId: null, pinEmailAttemptedAt: null, building: { id: 'building-a', name: 'Fictif' }, ...patch };
    const employee = {
      findFirst: jest.fn(async ({ where }: any) => row && row.id === where.id && row.buildingId === where.buildingId && row.organizationId === where.organizationId && row.isActive ? { ...row } : null),
      updateMany: jest.fn(async () => {
        if (row.pinEmailStatus === 'OUTCOME_UNKNOWN') return { count: 0 };
        row = { ...row, pinEmailStatus: 'OUTCOME_UNKNOWN' };
        return { count: 1 };
      }),
      update: jest.fn(async ({ data }: any) => (row = { ...row, ...data })),
    };
    const auditLog = { create: jest.fn().mockResolvedValue({}) };
    const prisma = { buildingEmployee: employee, auditLog, $transaction: jest.fn(async (cb: any) => cb({ buildingEmployee: employee, auditLog })) };
    const service = new OccupancyEmployeesService(prisma as any);
    const send = jest.spyOn(service as any, 'sendPinEmail').mockResolvedValue({ status: 'ACCEPTED', messageId: '<synthetic>' });
    const resend = (enabled = true) => service.resendPinEmail('employee-a', 'building-a', 'org-a', 'client-a', enabled);
    return { service, send, employee, auditLog, prisma, resend };
  }
  it('resends the existing PIN without returning it and preserves provider acceptance semantics', async () => {
    const h = harness({ pinEmailMessageId: '<previous>', pinEmailStatus: 'DELIVERED' });
    const result = await h.resend();
    expect(result.pinEmailStatus).toBe('ACCEPTED');
    expect(result).not.toHaveProperty('pin');
    expect(h.send).toHaveBeenCalledWith(expect.objectContaining({ pin: '1234' }), expect.objectContaining({ id: 'building-a' }));
    expect(h.auditLog.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ metadata: expect.objectContaining({ previousProviderMessageId: '<previous>' }) }) }));
    expect(h.employee.update.mock.calls.some(([arg]) => 'pin' in arg.data)).toBe(false);
  });
  it.each([{ organizationId: 'org-other' }, { buildingId: 'building-other' }, { isActive: false }])('rejects inaccessible or inactive employees %j', async patch => {
    const h = harness(patch);
    await expect(h.resend()).rejects.toBeInstanceOf(NotFoundException);
    expect(h.send).not.toHaveBeenCalled();
  });
  it('honors the pilot restriction without claiming or sending', async () => {
    const h = harness();
    await expect(h.resend(false)).rejects.toBeInstanceOf(ForbiddenException);
    expect(h.employee.updateMany).not.toHaveBeenCalled();
    expect(h.send).not.toHaveBeenCalled();
  });
  it.each([{ email: null }, { email: 'invalid' }, { pin: null }])('rejects missing contact or credential %j', async patch => {
    const h = harness(patch);
    await expect(h.resend()).rejects.toBeInstanceOf(BadRequestException);
    expect(h.send).not.toHaveBeenCalled();
  });
  it.each([{ pinEmailStatus: 'OUTCOME_UNKNOWN' }, { pinEmailAttemptedAt: new Date() }])('blocks uncertain or recent attempts %j', async patch => {
    const h = harness(patch);
    await expect(h.resend()).rejects.toBeInstanceOf(ConflictException);
    expect(h.send).not.toHaveBeenCalled();
  });
  it('claims at most one provider call for concurrent requests', async () => {
    const h = harness();
    const results = await Promise.allSettled([h.resend(), h.resend()]);
    expect(results.filter(x => x.status === 'fulfilled')).toHaveLength(1);
    expect(h.send).toHaveBeenCalledTimes(1);
  });
  it('keeps a provider timeout uncertain without automatic retry', async () => {
    const h = harness(); h.send.mockRejectedValue(new Error('timeout'));
    expect((await h.resend()).pinEmailStatus).toBe('OUTCOME_UNKNOWN');
    expect(h.send).toHaveBeenCalledTimes(1);
  });
  it('shows simulated delivery without claiming a real send', async () => {
    const h = harness(); h.send.mockResolvedValue({ status: 'SIMULATED' });
    expect((await h.resend()).pinEmailStatus).toBe('SIMULATED');
  });
  it('does not contact the provider if the audit transaction fails', async () => {
    const h = harness(); h.auditLog.create.mockRejectedValue(new Error('audit unavailable'));
    await expect(h.resend()).rejects.toThrow('audit unavailable');
    expect(h.send).not.toHaveBeenCalled();
  });
});
