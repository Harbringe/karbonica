export interface VerificationEvent {
  id: string;
  verificationId: string;
  eventType: string;
  message: string;
  userId: string;
  metadata: Record<string, any> | null;
  createdAt: Date;
}

export interface CreateVerificationEventData {
  verificationId: string;
  eventType: string;
  message: string;
  userId: string;
  metadata?: Record<string, any>;
}
