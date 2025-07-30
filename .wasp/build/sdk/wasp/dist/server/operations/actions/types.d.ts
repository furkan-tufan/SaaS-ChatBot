import { type _User, type _File, type AuthenticatedActionDefinition, type Payload } from 'wasp/server/_types';
export type UpdateIsUserAdminById<Input extends Payload = never, Output extends Payload = Payload> = AuthenticatedActionDefinition<[
    _User
], Input, Output>;
export type GenerateChatbotResponse<Input extends Payload = never, Output extends Payload = Payload> = AuthenticatedActionDefinition<[
    _User
], Input, Output>;
export type GenerateCheckoutSession<Input extends Payload = never, Output extends Payload = Payload> = AuthenticatedActionDefinition<[
    _User
], Input, Output>;
export type CreateFile<Input extends Payload = never, Output extends Payload = Payload> = AuthenticatedActionDefinition<[
    _User,
    _File
], Input, Output>;
//# sourceMappingURL=types.d.ts.map