export interface IIdentifyRequest {
  email?: string | null;
  phoneNumber?: string | null;
}

export interface IConsolidatedContact {
  primaryContatctId: number;
  emails: string[];
  phoneNumbers: string[];
  secondaryContactIds: number[];
}

export interface IIdentifyResponse {
  contact: IConsolidatedContact;
}
