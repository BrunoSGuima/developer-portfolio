import type { components } from './schema.ts';

// Readable names for the generated contract types (schema.ts, never edited by hand). Only the
// api/ layer uses them; pages and components work with the shell's own models (ADR-0014).
type Schemas = components['schemas'];

export type ApiProject = Schemas['Project'];
export type ApiProjectList = Schemas['ProjectList'];
export type ApiStatus = Schemas['Status'];
export type ApiTechnology = Schemas['Technology'];
export type ApiLocale = Schemas['Locale'];
export type ApiContactMessageRequest = Schemas['ContactMessageRequest'];
export type ApiContactMessageAccepted = Schemas['ContactMessageAccepted'];
export type ApiErrorEnvelope = Schemas['Error'];
export type ApiValidationError = Schemas['ValidationError'];
