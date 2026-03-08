import { PrismaClient, LinkPrecedence } from '@prisma/client';
import { IContact, ICreateContactDTO, IUpdateContactDTO } from '../interfaces/contact.interface';
import { IContactRepository } from '../interfaces/repository.interface';
import { prisma } from '../config/database';

export class ContactRepository implements IContactRepository {
  private readonly db: PrismaClient;

  constructor(db: PrismaClient = prisma) {
    this.db = db;
  }

  async findByEmailOrPhone(
    email?: string | null,
    phoneNumber?: string | null,
  ): Promise<IContact[]> {
    const conditions: Array<{ email?: string; phoneNumber?: string }> = [];

    if (email) conditions.push({ email });
    if (phoneNumber) conditions.push({ phoneNumber });
    if (conditions.length === 0) return [];

    return this.db.contact.findMany({
      where: {
        OR: conditions,
        deletedAt: null,
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async findClusterByPrimaryId(primaryId: number): Promise<IContact[]> {
    return this.db.contact.findMany({
      where: {
        OR: [{ id: primaryId }, { linkedId: primaryId }],
        deletedAt: null,
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async findById(id: number): Promise<IContact | null> {
    return this.db.contact.findFirst({
      where: { id, deletedAt: null },
    });
  }

  async create(data: ICreateContactDTO): Promise<IContact> {
    return this.db.contact.create({
      data: {
        email: data.email ?? null,
        phoneNumber: data.phoneNumber ?? null,
        linkedId: data.linkedId ?? null,
        linkPrecedence: data.linkPrecedence,
      },
    });
  }

  async update(id: number, data: IUpdateContactDTO): Promise<IContact> {
    return this.db.contact.update({
      where: { id },
      data: {
        ...(data.email !== undefined && { email: data.email }),
        ...(data.phoneNumber !== undefined && { phoneNumber: data.phoneNumber }),
        ...(data.linkedId !== undefined && { linkedId: data.linkedId }),
        ...(data.linkPrecedence !== undefined && { linkPrecedence: data.linkPrecedence }),
      },
    });
  }

  async updateSecondariesToNewPrimary(
    oldPrimaryId: number,
    newPrimaryId: number,
  ): Promise<void> {
    await this.db.contact.updateMany({
      where: { linkedId: oldPrimaryId, deletedAt: null },
      data: { linkedId: newPrimaryId },
    });
  }
}
