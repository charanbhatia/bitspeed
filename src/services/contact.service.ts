import { LinkPrecedence } from '@prisma/client';
import { IContact } from '../interfaces/contact.interface';
import { IIdentifyRequest, IIdentifyResponse, IConsolidatedContact } from '../interfaces/identify.interface';
import { IContactRepository } from '../interfaces/repository.interface';
import { IContactService } from '../interfaces/service.interface';
import { ContactRepository } from '../repositories/contact.repository';
import { ValidationError, NotFoundError } from '../utils/errors';

export class ContactService implements IContactService {
  private readonly contactRepository: IContactRepository;

  constructor(contactRepository: IContactRepository = new ContactRepository()) {
    this.contactRepository = contactRepository;
  }

  async identify(request: IIdentifyRequest): Promise<IIdentifyResponse> {
    const { email, phoneNumber } = request;

    if (!email && !phoneNumber) {
      throw new ValidationError('At least one of email or phoneNumber must be provided');
    }

    const normalizedEmail = email?.trim().toLowerCase() || null;
    const normalizedPhone = phoneNumber?.trim() || null;

    // Step 1: Find all contacts that directly match the incoming email or phone
    const directMatches = await this.contactRepository.findByEmailOrPhone(
      normalizedEmail,
      normalizedPhone,
    );

    // Step 2: No existing contact — create a new primary contact
    if (directMatches.length === 0) {
      const newContact = await this.contactRepository.create({
        email: normalizedEmail,
        phoneNumber: normalizedPhone,
        linkPrecedence: LinkPrecedence.primary,
        linkedId: null,
      });
      return this.buildResponse([newContact]);
    }

    // Step 3: Resolve the primary IDs of all matched contacts
    const primaryIds = this.resolvePrimaryIds(directMatches);

    // Step 4: Fetch full clusters for each discovered primary
    const allContacts = await this.fetchAllClusters(primaryIds);

    // Step 5: Determine the true primary (oldest by createdAt)
    const primaries = allContacts.filter(
      (c) => c.linkPrecedence === LinkPrecedence.primary,
    );
    primaries.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
    const truePrimary = primaries[0]!;

    // Step 6: Merge any secondary primaries under the true primary
    const secondaryPrimaries = primaries.slice(1);
    if (secondaryPrimaries.length > 0) {
      await this.mergePrimaries(truePrimary.id, secondaryPrimaries);
    }

    // Step 7: Re-fetch the unified cluster after potential merges
    const finalCluster = await this.contactRepository.findClusterByPrimaryId(truePrimary.id);

    // Step 8: Determine if the request carries new information not in any contact
    const hasNewInfo = this.requestHasNewInformation(
      normalizedEmail,
      normalizedPhone,
      finalCluster,
    );

    if (hasNewInfo) {
      await this.contactRepository.create({
        email: normalizedEmail,
        phoneNumber: normalizedPhone,
        linkedId: truePrimary.id,
        linkPrecedence: LinkPrecedence.secondary,
      });
      const updatedCluster = await this.contactRepository.findClusterByPrimaryId(truePrimary.id);
      return this.buildResponse(updatedCluster);
    }

    return this.buildResponse(finalCluster);
  }

  async getConsolidatedById(id: number): Promise<IIdentifyResponse> {
    const contact = await this.contactRepository.findById(id);
    if (!contact) {
      throw new NotFoundError(`Contact with id ${id} not found`);
    }

    const primaryId =
      contact.linkPrecedence === LinkPrecedence.primary ? contact.id : contact.linkedId!;

    const cluster = await this.contactRepository.findClusterByPrimaryId(primaryId);
    return this.buildResponse(cluster);
  }

  private resolvePrimaryIds(contacts: IContact[]): Set<number> {
    const primaryIds = new Set<number>();
    for (const contact of contacts) {
      if (contact.linkPrecedence === LinkPrecedence.primary) {
        primaryIds.add(contact.id);
      } else if (contact.linkedId !== null) {
        primaryIds.add(contact.linkedId);
      }
    }
    return primaryIds;
  }

  private async fetchAllClusters(primaryIds: Set<number>): Promise<IContact[]> {
    const contactMap = new Map<number, IContact>();
    for (const primaryId of primaryIds) {
      const cluster = await this.contactRepository.findClusterByPrimaryId(primaryId);
      for (const contact of cluster) {
        contactMap.set(contact.id, contact);
      }
    }
    return Array.from(contactMap.values());
  }

  private async mergePrimaries(
    truePrimaryId: number,
    secondaryPrimaries: IContact[],
  ): Promise<void> {
    for (const sp of secondaryPrimaries) {
      // First, re-point all of this old primary's secondaries to the true primary
      await this.contactRepository.updateSecondariesToNewPrimary(sp.id, truePrimaryId);
      // Then demote this contact to secondary
      await this.contactRepository.update(sp.id, {
        linkedId: truePrimaryId,
        linkPrecedence: LinkPrecedence.secondary,
      });
    }
  }

  private requestHasNewInformation(
    email: string | null,
    phoneNumber: string | null,
    cluster: IContact[],
  ): boolean {
    const existingEmails = new Set(cluster.map((c) => c.email).filter(Boolean));
    const existingPhones = new Set(cluster.map((c) => c.phoneNumber).filter(Boolean));

    const hasNewEmail = email !== null && !existingEmails.has(email);
    const hasNewPhone = phoneNumber !== null && !existingPhones.has(phoneNumber);

    return hasNewEmail || hasNewPhone;
  }

  private buildResponse(cluster: IContact[]): IIdentifyResponse {
    const primary = cluster.find((c) => c.linkPrecedence === LinkPrecedence.primary);
    if (!primary) {
      throw new Error('Cluster is missing a primary contact');
    }

    const secondaries = cluster.filter((c) => c.linkPrecedence === LinkPrecedence.secondary);

    // Primary's values come first, then secondaries (preserving insertion order)
    const emails: string[] = [];
    const phoneNumbers: string[] = [];
    const secondaryContactIds: number[] = [];

    if (primary.email) emails.push(primary.email);
    if (primary.phoneNumber) phoneNumbers.push(primary.phoneNumber);

    for (const secondary of secondaries) {
      secondaryContactIds.push(secondary.id);
      if (secondary.email && !emails.includes(secondary.email)) {
        emails.push(secondary.email);
      }
      if (secondary.phoneNumber && !phoneNumbers.includes(secondary.phoneNumber)) {
        phoneNumbers.push(secondary.phoneNumber);
      }
    }

    const consolidated: IConsolidatedContact = {
      primaryContatctId: primary.id,
      emails,
      phoneNumbers,
      secondaryContactIds,
    };

    return { contact: consolidated };
  }
}
