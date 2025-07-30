import { type _User, type _File, type _DailyStats, type AuthenticatedQueryDefinition, type Payload } from 'wasp/server/_types';
export type GetPaginatedUsers<Input extends Payload = never, Output extends Payload = Payload> = AuthenticatedQueryDefinition<[
    _User
], Input, Output>;
export type GetCustomerPortalUrl<Input extends Payload = never, Output extends Payload = Payload> = AuthenticatedQueryDefinition<[
    _User
], Input, Output>;
export type GetAllFilesByUser<Input extends Payload = never, Output extends Payload = Payload> = AuthenticatedQueryDefinition<[
    _User,
    _File
], Input, Output>;
export type GetDownloadFileSignedURL<Input extends Payload = never, Output extends Payload = Payload> = AuthenticatedQueryDefinition<[
    _User,
    _File
], Input, Output>;
export type GetDailyStats<Input extends Payload = never, Output extends Payload = Payload> = AuthenticatedQueryDefinition<[
    _User,
    _DailyStats
], Input, Output>;
//# sourceMappingURL=types.d.ts.map