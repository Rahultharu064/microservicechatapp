export interface OtpEvent {
  email: string;
  otp: string;
}

export interface NotifyEvent {
  email: string;
  subject: string;
  message: string;
}

export interface BaseEvent<T> {
  type: string;
  payload: T;
  createdAt: string;
}
