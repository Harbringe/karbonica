import { VerificationEvent } from '../entities/VerificationEvent';

export interface IVerificationEventRepository {
  findByVerificationId(verificationId: string): Promise<VerificationEvent[]>;
  save(event: VerificationEvent): Promise<VerificationEvent>;
}
