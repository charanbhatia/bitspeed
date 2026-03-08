import { IIdentifyRequest, IIdentifyResponse } from './identify.interface';

export interface IContactService {
  identify(request: IIdentifyRequest): Promise<IIdentifyResponse>;
}
