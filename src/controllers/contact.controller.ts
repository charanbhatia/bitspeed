import { Request, Response, NextFunction } from 'express';
import { IContactService } from '../interfaces/service.interface';
import { IIdentifyRequest } from '../interfaces/identify.interface';
import { ContactService } from '../services/contact.service';

export class ContactController {
  private readonly contactService: IContactService;

  constructor(contactService: IContactService = new ContactService()) {
    this.contactService = contactService;
    this.identify = this.identify.bind(this);
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
}
