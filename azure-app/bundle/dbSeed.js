import * as z from 'zod';
import { PrismaClient } from '@prisma/client';
import { faker } from '@faker-js/faker';

const colors = {
  red: "\x1B[31m",
  yellow: "\x1B[33m"
};
const resetColor = "\x1B[0m";
function getColorizedConsoleFormatString(colorKey) {
  const color = colors[colorKey];
  return `${color}%s${resetColor}`;
}

const redColorFormatString = getColorizedConsoleFormatString("red");
function ensureEnvSchema(data, schema) {
  const result = getValidatedEnvOrError(data, schema);
  if (result.success) {
    return result.data;
  } else {
    console.error(`${redColorFormatString}${formatZodEnvErrors(result.error.issues)}`);
    throw new Error("Error parsing environment variables");
  }
}
function getValidatedEnvOrError(env, schema) {
  return schema.safeParse(env);
}
function formatZodEnvErrors(issues) {
  const errorOutput = ["", "\u2550\u2550 Env vars validation failed \u2550\u2550", ""];
  for (const error of issues) {
    errorOutput.push(` - ${error.message}`);
  }
  errorOutput.push("");
  errorOutput.push("\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550");
  return errorOutput.join("\n");
}

const userServerEnvSchema = z.object({});
const waspServerCommonSchema = z.object({
  PORT: z.coerce.number().default(3001),
  DATABASE_URL: z.string({
    required_error: "DATABASE_URL is required"
  }),
  PG_BOSS_NEW_OPTIONS: z.string().optional(),
  SMTP_HOST: z.string({
    required_error: getRequiredEnvVarErrorMessage("SMTP email sender", "SMTP_HOST")
  }),
  SMTP_PORT: z.coerce.number({
    required_error: getRequiredEnvVarErrorMessage("SMTP email sender", "SMTP_PORT"),
    invalid_type_error: "SMTP_PORT must be a number"
  }),
  SMTP_USERNAME: z.string({
    required_error: getRequiredEnvVarErrorMessage("SMTP email sender", "SMTP_USERNAME")
  }),
  SMTP_PASSWORD: z.string({
    required_error: getRequiredEnvVarErrorMessage("SMTP email sender", "SMTP_PASSWORD")
  }),
  SKIP_EMAIL_VERIFICATION_IN_DEV: z.enum(["true", "false"], {
    message: 'SKIP_EMAIL_VERIFICATION_IN_DEV must be either "true" or "false"'
  }).transform((value) => value === "true").default("false")
});
const serverUrlSchema = z.string({
  required_error: "WASP_SERVER_URL is required"
}).url({
  message: "WASP_SERVER_URL must be a valid URL"
});
const clientUrlSchema = z.string({
  required_error: "WASP_WEB_CLIENT_URL is required"
}).url({
  message: "WASP_WEB_CLIENT_URL must be a valid URL"
});
const jwtTokenSchema = z.string({
  required_error: "JWT_SECRET is required"
});
const serverDevSchema = z.object({
  NODE_ENV: z.literal("development"),
  WASP_SERVER_URL: serverUrlSchema.default("http://localhost:3001"),
  WASP_WEB_CLIENT_URL: clientUrlSchema.default("http://localhost:3000/"),
  JWT_SECRET: jwtTokenSchema.default("DEVJWTSECRET")
});
const serverProdSchema = z.object({
  NODE_ENV: z.literal("production"),
  WASP_SERVER_URL: serverUrlSchema,
  WASP_WEB_CLIENT_URL: clientUrlSchema,
  JWT_SECRET: jwtTokenSchema
});
const serverCommonSchema = userServerEnvSchema.merge(waspServerCommonSchema);
const serverEnvSchema = z.discriminatedUnion("NODE_ENV", [
  serverDevSchema.merge(serverCommonSchema),
  serverProdSchema.merge(serverCommonSchema)
]);
const env = ensureEnvSchema({ NODE_ENV: serverDevSchema.shape.NODE_ENV.value, ...process.env }, serverEnvSchema);
function getRequiredEnvVarErrorMessage(featureName, envVarName) {
  return `${envVarName} is required when using ${featureName}`;
}

function stripTrailingSlash(url) {
  return url?.replace(/\/$/, "");
}

const frontendUrl = stripTrailingSlash(env.WASP_WEB_CLIENT_URL);
stripTrailingSlash(env.WASP_SERVER_URL);
const allowedCORSOriginsPerEnv = {
  development: "*",
  production: [frontendUrl]
};
allowedCORSOriginsPerEnv[env.NODE_ENV];
({
  env: env.NODE_ENV,
  isDevelopment: env.NODE_ENV === "development",
  port: env.PORT,
  databaseUrl: env.DATABASE_URL,
  auth: {
    jwtSecret: env.JWT_SECRET
  }
});

function createDbClient() {
  return new PrismaClient();
}
const dbClient = createDbClient();

function requireNodeEnvVar(name) {
  const value = process.env[name];
  if (value === void 0) {
    throw new Error(`Env var ${name} is undefined`);
  } else {
    return value;
  }
}

var SubscriptionStatus = /* @__PURE__ */ ((SubscriptionStatus2) => {
  SubscriptionStatus2["PastDue"] = "past_due";
  SubscriptionStatus2["CancelAtPeriodEnd"] = "cancel_at_period_end";
  SubscriptionStatus2["Active"] = "active";
  SubscriptionStatus2["Deleted"] = "deleted";
  return SubscriptionStatus2;
})(SubscriptionStatus || {});
var PaymentPlanId = /* @__PURE__ */ ((PaymentPlanId2) => {
  PaymentPlanId2["Hobby"] = "hobby";
  PaymentPlanId2["Pro"] = "pro";
  PaymentPlanId2["Credits10"] = "credits10";
  return PaymentPlanId2;
})(PaymentPlanId || {});
const paymentPlans = {
  ["hobby" /* Hobby */]: {
    getPaymentProcessorPlanId: () => requireNodeEnvVar("PAYMENTS_HOBBY_SUBSCRIPTION_PLAN_ID"),
    effect: { kind: "subscription" }
  },
  ["pro" /* Pro */]: {
    getPaymentProcessorPlanId: () => requireNodeEnvVar("PAYMENTS_PRO_SUBSCRIPTION_PLAN_ID"),
    effect: { kind: "subscription" }
  },
  ["credits10" /* Credits10 */]: {
    getPaymentProcessorPlanId: () => requireNodeEnvVar("PAYMENTS_CREDITS_10_PLAN_ID"),
    effect: { kind: "credits", amount: 10 }
  }
};
function getSubscriptionPaymentPlanIds() {
  return Object.values(PaymentPlanId).filter((planId) => paymentPlans[planId].effect.kind === "subscription");
}

async function seedMockUsers(prismaClient) {
  await Promise.all(generateMockUsersData(50).map((data) => prismaClient.user.create({ data })));
}
function generateMockUsersData(numOfUsers) {
  return faker.helpers.multiple(generateMockUserData, { count: numOfUsers });
}
function generateMockUserData() {
  const firstName = faker.person.firstName();
  const lastName = faker.person.lastName();
  const subscriptionStatus = faker.helpers.arrayElement([
    ...Object.values(SubscriptionStatus),
    null
  ]);
  const now = /* @__PURE__ */ new Date();
  const createdAt = faker.date.past({ refDate: now });
  const timePaid = faker.date.between({ from: createdAt, to: now });
  const credits = subscriptionStatus ? 0 : faker.number.int({ min: 0, max: 10 });
  const hasUserPaidOnStripe = !!subscriptionStatus || credits > 3;
  return {
    email: faker.internet.email({ firstName, lastName }),
    username: faker.internet.userName({ firstName, lastName }),
    createdAt,
    isAdmin: false,
    credits,
    subscriptionStatus,
    lemonSqueezyCustomerPortalUrl: null,
    paymentProcessorUserId: hasUserPaidOnStripe ? `cus_test_${faker.string.uuid()}` : null,
    datePaid: hasUserPaidOnStripe ? faker.date.between({ from: createdAt, to: timePaid }) : null,
    subscriptionPlan: subscriptionStatus ? faker.helpers.arrayElement(getSubscriptionPaymentPlanIds()) : null
  };
}

const seeds = {
  seedMockUsers
};
async function main() {
  const nameOfSeedToRun = process.env.WASP_DB_SEED_NAME;
  if (nameOfSeedToRun) {
    console.log(`Running seed: ${nameOfSeedToRun}`);
  } else {
    console.error("Name of the seed to run not specified!");
  }
  await seeds[nameOfSeedToRun](dbClient);
}
main().then(async () => {
  await dbClient.$disconnect();
}).catch(async (e) => {
  console.error(e);
  await dbClient.$disconnect();
  process.exit(1);
});
//# sourceMappingURL=dbSeed.js.map
