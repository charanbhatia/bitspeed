import { Request, Response, NextFunction } from 'express';
import { IContactService } from '../interfaces/service.interface';
import { IIdentifyRequest } from '../interfaces/identify.interface';
import { ContactService } from '../services/contact.service';
import { ValidationError } from '../utils/errors';

export class ContactController {
  private readonly contactService: IContactService;

  constructor(contactService: IContactService = new ContactService()) {
    this.contactService = contactService;
    this.identify = this.identify.bind(this);
    this.getById = this.getById.bind(this);
  }

  async identify(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const request: IIdentifyRequest = {
        email: req.body.email ?? null,
        phoneNumber: req.body.phoneNumber ?? null,
      };

      const result = await this.contactService.identify(request);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id) || id <= 0) {
        throw new ValidationError('id must be a positive integer');
      }

      const result = await this.contactService.getConsolidatedById(id);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }
}
