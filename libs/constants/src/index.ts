export enum UserRole {
  CUSTOMER = 'CUSTOMER',
  RIDER = 'RIDER',
  ADMIN = 'ADMIN',
  SUPER_ADMIN = 'SUPER_ADMIN',
}

export enum AdminPrivilege {
  SUPER_ADMIN = 'SUPER_ADMIN',
  USER_MANAGEMENT = 'USER_MANAGEMENT',
  OPERATIONS = 'OPERATIONS',
  FINANCE = 'FINANCE',
  SUPPORT = 'SUPPORT',
}

export enum AdminRole {
  SUPER_ADMIN = 'SUPER_ADMIN',
  OPERATIONS_ADMIN = 'OPERATIONS_ADMIN',
  FINANCE_ADMIN = 'FINANCE_ADMIN',
  SUPPORT_ADMIN = 'SUPPORT_ADMIN',
}


export enum OrderStatus {
  PENDING = 'PENDING',
  ASSIGNED = 'ASSIGNED',
  PICKED_UP = 'PICKED_UP',
  DELIVERED = 'DELIVERED',
  CANCELLED = 'CANCELLED',
}

export enum PaymentStatus {
  PENDING = 'PENDING',
  PAID = 'PAID',
  REFUNDED = 'REFUNDED',
}

export enum TransactionType {
  DEBIT = 'DEBIT',
  CREDIT = 'CREDIT',
}

export enum TransactionStatus {
  PENDING = 'PENDING',
  SUCCESS = 'SUCCESS',
  FAILED = 'FAILED',
}

export enum RiderStatus {
  ONLINE = 'ONLINE',
  OFFLINE = 'OFFLINE',
  DELIVERING = 'DELIVERING',
}

export enum NotificationType {
  PUSH = 'PUSH',
  SMS = 'SMS',
  EMAIL = 'EMAIL',
}

export enum AccountStatus {
  ACTIVE = 'ACTIVE',
  SUSPENDED = 'SUSPENDED',
}

