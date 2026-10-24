/**
 * Códigos fijos de error. El front y el agente deciden con el código, el mensaje es
 * solo para mostrarle a la persona y puede cambiar.
 */
export const ErrorCode = {
  // No existe
  ServiceNotFound: "SERVICE_NOT_FOUND",
  AppointmentNotFound: "APPOINTMENT_NOT_FOUND",
  BarberNotFound: "BARBER_NOT_FOUND",
  TimeBlockNotFound: "TIME_BLOCK_NOT_FOUND",
  ImageNotFound: "IMAGE_NOT_FOUND",
  RouteNotFound: "ROUTE_NOT_FOUND",

  // Choca con algo que ya está
  SlotTaken: "SLOT_TAKEN",
  ActiveAppointmentExists: "ACTIVE_APPOINTMENT_EXISTS",
  AppointmentNotActive: "APPOINTMENT_NOT_ACTIVE",
  PhoneAlreadyRegistered: "PHONE_ALREADY_REGISTERED",

  // No cumple una regla
  TimeInPast: "TIME_IN_PAST",
  DataPolicyRequired: "DATA_POLICY_REQUIRED",
  InvalidTimeRange: "INVALID_TIME_RANGE",
  InvalidImage: "INVALID_IMAGE",
  PasswordTooShort: "PASSWORD_TOO_SHORT",
  InvalidData: "INVALID_DATA",
  ValidationError: "VALIDATION_ERROR",
  InvalidJson: "INVALID_JSON",
  PayloadTooLarge: "PAYLOAD_TOO_LARGE",

  // Sesión y permisos
  InvalidCredentials: "INVALID_CREDENTIALS",
  AuthRequired: "AUTH_REQUIRED",
  TeamOnly: "TEAM_ONLY",
  AdminOnly: "ADMIN_ONLY",
  InvalidApiKey: "INVALID_API_KEY",

  InternalError: "INTERNAL_ERROR",
} as const;

export type ErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode];
