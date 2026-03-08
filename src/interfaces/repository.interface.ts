import { IContact, ICreateContactDTO, IUpdateContactDTO } from './contact.interface';

export interface IContactRepository {
  findByEmailOrPhone(email?: string | null, phoneNumber?: string | null): Promise<IContact[]>;
  findClusterByPrimaryId(primaryId: number): Promise<IContact[]>;
  findById(id: number): Promise<IContact | null>;
  create(data: ICreateContactDTO): Promise<IContact>;
  update(id: number, data: IUpdateContactDTO): Promise<IContact>;
  updateSecondariesToNewPrimary(oldPrimaryId: number, newPrimaryId: number): Promise<void>;
}
