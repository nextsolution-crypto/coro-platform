import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { ActivityTypesService } from './activity-types.service';

const admin = { userId: 'admin', organizationId: 'org-a', role: 'ADMIN' };
const operator = { ...admin, role: 'OPERATOR' };
function harness() {
  const prisma = { activityType: { findMany: jest.fn(), findFirst: jest.fn(), create: jest.fn(), update: jest.fn(), delete: jest.fn() }, projectActivity: { count: jest.fn() } };
  return { prisma, service: new ActivityTypesService(prisma as never) };
}
const custom = { id:'type-a', organizationId:'org-a', isSystem:false, isActive:true, displayOrder:40 };
const input = { nameFR:'Inspection spéciale', visualToken:'BLUE' as const, clientBookableDefault:false, displayOrder:30 };

describe('ActivityTypesService', () => {
  it('orders available system and tenant types deterministically', async () => { const h=harness(); h.prisma.activityType.findMany.mockResolvedValue([]); await h.service.list(operator); expect(h.prisma.activityType.findMany).toHaveBeenCalledWith(expect.objectContaining({ orderBy:[{displayOrder:'asc'},{nameFR:'asc'},{id:'asc'}] })); });
  it('prevents operators from mutating the catalog', async () => { await expect(harness().service.create(input,operator)).rejects.toBeInstanceOf(ForbiddenException); });
  it('derives organization and a stable generated code on create', async () => { const h=harness(); h.prisma.activityType.findFirst.mockResolvedValue(null); h.prisma.activityType.create.mockImplementation(({data}:any)=>data); const result:any=await h.service.create(input,admin); expect(result.organizationId).toBe('org-a'); expect(result.code).toMatch(/^custom-inspection-speciale-/); expect(result.displayOrder).toBe(30); });
  it('rejects another organization by tenant-scoped lookup', async () => { const h=harness(); h.prisma.activityType.findFirst.mockResolvedValue(null); await expect(h.service.archive('other',admin)).rejects.toBeInstanceOf(NotFoundException); expect(h.prisma.activityType.findFirst).toHaveBeenCalledWith({where:{id:'other',OR:[{organizationId:null},{organizationId:'org-a'}]}}); });
  it('refuses mutation of a global CORO type', async () => { const h=harness(); h.prisma.activityType.findFirst.mockResolvedValue({id:'system',organizationId:null,isSystem:true}); await expect(h.service.archive('system',admin)).rejects.toBeInstanceOf(ForbiddenException); });
  it('archive and restore preserve displayOrder', async () => { const h=harness(); h.prisma.activityType.findFirst.mockResolvedValue(custom); h.prisma.activityType.update.mockImplementation(({data}:any)=>({...custom,...data})); expect((await h.service.archive('type-a',admin)).displayOrder).toBe(40); expect((await h.service.restore('type-a',admin)).displayOrder).toBe(40); });
  it('refuses deletion after use and permits deletion before use', async () => { const h=harness(); h.prisma.activityType.findFirst.mockResolvedValue(custom); h.prisma.projectActivity.count.mockResolvedValueOnce(1).mockResolvedValueOnce(0); await expect(h.service.remove('type-a',admin)).rejects.toBeInstanceOf(BadRequestException); h.prisma.activityType.delete.mockResolvedValue(custom); await expect(h.service.remove('type-a',admin)).resolves.toEqual(custom); });
  it('keeps archived types out of normal form results', async () => { const h=harness(); h.prisma.activityType.findMany.mockResolvedValue([]); await h.service.list(admin); expect(h.prisma.activityType.findMany).toHaveBeenCalledWith(expect.objectContaining({where:expect.objectContaining({isActive:true})})); });
});
