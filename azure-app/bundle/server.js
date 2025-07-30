import http from 'http';
import express, { Router } from 'express';
import * as z from 'zod';
import { z as z$1 } from 'zod';
import { PrismaClient, Prisma } from '@prisma/client';
import { Lucia } from 'lucia';
import { PrismaAdapter } from '@lucia-auth/adapter-prisma';
import { verify, hash } from '@node-rs/argon2';
import { registerCustom, deserialize, serialize } from 'superjson';
import OpenAI from 'openai';
import Stripe from 'stripe';
import { createTransport } from 'nodemailer';
import { randomUUID } from 'crypto';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { createPresignedPost } from '@aws-sdk/s3-presigned-post';
import cookieParser from 'cookie-parser';
import logger from 'morgan';
import cors from 'cors';
import helmet from 'helmet';
import * as jwt from 'oslo/jwt';
import { TimeSpan } from 'oslo';
import PgBoss from 'pg-boss';
import { listOrders } from '@lemonsqueezy/lemonsqueezy.js';
import { join, dirname, extname } from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

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
const allowedCORSOrigins = allowedCORSOriginsPerEnv[env.NODE_ENV];
const config$1 = {
  frontendUrl,
  allowedCORSOrigins,
  env: env.NODE_ENV,
  isDevelopment: env.NODE_ENV === "development",
  port: env.PORT,
  databaseUrl: env.DATABASE_URL,
  auth: {
    jwtSecret: env.JWT_SECRET
  }
};

function createDbClient() {
  return new PrismaClient();
}
const dbClient = createDbClient();

class HttpError extends Error {
  statusCode;
  data;
  constructor(statusCode, message, data, options) {
    super(message, options);
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, HttpError);
    }
    this.name = this.constructor.name;
    if (!(Number.isInteger(statusCode) && statusCode >= 400 && statusCode < 600)) {
      throw new Error("statusCode has to be integer in range [400, 600).");
    }
    this.statusCode = statusCode;
    if (data) {
      this.data = data;
    }
  }
}

const prismaAdapter = new PrismaAdapter(dbClient.session, dbClient.auth);
const auth$1 = new Lucia(prismaAdapter, {
  // Since we are not using cookies, we don't need to set any cookie options.
  // But in the future, if we decide to use cookies, we can set them here.
  // sessionCookie: {
  //   name: "session",
  //   expires: true,
  //   attributes: {
  //     secure: !config.isDevelopment,
  //     sameSite: "lax",
  //   },
  // },
  getUserAttributes({ userId }) {
    return {
      userId
    };
  }
});

const hashingOptions = {
  memoryCost: 19456,
  timeCost: 2,
  outputLen: 32,
  parallelism: 1,
  version: 1
};
async function hashPassword(password) {
  return hash(normalizePassword(password), hashingOptions);
}
async function verifyPassword(hashedPassword, password) {
  const validPassword = await verify(hashedPassword, normalizePassword(password), hashingOptions);
  if (!validPassword) {
    throw new Error("Invalid password");
  }
}
function normalizePassword(password) {
  return password.normalize("NFKC");
}

const defineHandler = (middleware) => middleware;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const PASSWORD_FIELD = "password";
const EMAIL_FIELD = "email";
const TOKEN_FIELD = "token";
function ensureValidEmail(args) {
  validate(args, [
    { validates: EMAIL_FIELD, message: "email must be present", validator: (email) => !!email },
    { validates: EMAIL_FIELD, message: "email must be a valid email", validator: (email) => isValidEmail(email) }
  ]);
}
function ensurePasswordIsPresent(args) {
  validate(args, [
    { validates: PASSWORD_FIELD, message: "password must be present", validator: (password) => !!password }
  ]);
}
function ensureValidPassword(args) {
  validate(args, [
    { validates: PASSWORD_FIELD, message: "password must be at least 8 characters", validator: (password) => isMinLength(password, 8) },
    { validates: PASSWORD_FIELD, message: "password must contain a number", validator: (password) => containsNumber(password) }
  ]);
}
function ensureTokenIsPresent(args) {
  validate(args, [
    { validates: TOKEN_FIELD, message: "token must be present", validator: (token) => !!token }
  ]);
}
function throwValidationError(message) {
  throw new HttpError(422, "Validation failed", { message });
}
function validate(args, validators) {
  for (const { validates, message, validator } of validators) {
    if (!validator(args[validates])) {
      throwValidationError(message);
    }
  }
}
const validEmailRegex = /(?:[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*|"(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21\x23-\x5b\x5d-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])*")@(?:(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?|\[(?:(?:(2(5[0-5]|[0-4][0-9])|1[0-9][0-9]|[1-9]?[0-9]))\.){3}(?:(2(5[0-5]|[0-4][0-9])|1[0-9][0-9]|[1-9]?[0-9])|[a-z0-9-]*[a-z0-9]:(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21-\x5a\x53-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])+)\])/;
function isValidEmail(input) {
  if (typeof input !== "string") {
    return false;
  }
  return input.match(validEmailRegex) !== null;
}
function isMinLength(input, minLength) {
  if (typeof input !== "string") {
    return false;
  }
  return input.length >= minLength;
}
function containsNumber(input) {
  if (typeof input !== "string") {
    return false;
  }
  return /\d/.test(input);
}

({
  entities: {
    User: dbClient.user
  }
});
function createProviderId(providerName, providerUserId) {
  return {
    providerName,
    providerUserId: normalizeProviderUserId(providerName, providerUserId)
  };
}
function normalizeProviderUserId(providerName, providerUserId) {
  switch (providerName) {
    case "email":
    case "username":
      return providerUserId.toLowerCase();
    case "google":
    case "github":
    case "discord":
    case "keycloak":
    case "slack":
      return providerUserId;
    /*
          Why the default case?
          In case users add a new auth provider in the user-land.
          Users can't extend this function because it is private.
          If there is an unknown `providerName` in runtime, we'll
          return the `providerUserId` as is.
    
          We want to still have explicit OAuth providers listed
          so that we get a type error if we forget to add a new provider
          to the switch statement.
        */
    default:
      return providerUserId;
  }
}
async function findAuthIdentity(providerId) {
  return dbClient.authIdentity.findUnique({
    where: {
      providerName_providerUserId: providerId
    }
  });
}
async function updateAuthIdentityProviderData(providerId, existingProviderData, providerDataUpdates) {
  const sanitizedProviderDataUpdates = await ensurePasswordIsHashed(providerDataUpdates);
  const newProviderData = {
    ...existingProviderData,
    ...sanitizedProviderDataUpdates
  };
  const serializedProviderData = await serializeProviderData(newProviderData);
  return dbClient.authIdentity.update({
    where: {
      providerName_providerUserId: providerId
    },
    data: { providerData: serializedProviderData }
  });
}
async function findAuthWithUserBy(where) {
  const result = await dbClient.auth.findFirst({ where, include: { user: true } });
  if (result === null) {
    return null;
  }
  if (result.user === null) {
    return null;
  }
  return { ...result, user: result.user };
}
async function createUser(providerId, serializedProviderData, userFields) {
  return dbClient.user.create({
    data: {
      // Using any here to prevent type errors when userFields are not
      // defined. We want Prisma to throw an error in that case.
      ...userFields ?? {},
      auth: {
        create: {
          identities: {
            create: {
              providerName: providerId.providerName,
              providerUserId: providerId.providerUserId,
              providerData: serializedProviderData
            }
          }
        }
      }
    },
    // We need to include the Auth entity here because we need `authId`
    // to be able to create a session.
    include: {
      auth: true
    }
  });
}
async function deleteUserByAuthId(authId) {
  return dbClient.user.deleteMany({
    where: {
      auth: {
        id: authId
      }
    }
  });
}
async function doFakeWork() {
  const timeToWork = Math.floor(Math.random() * 1e3) + 1e3;
  return sleep(timeToWork);
}
function rethrowPossibleAuthError(e) {
  if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
    throw new HttpError(422, "Save failed", {
      message: `user with the same identity already exists`
    });
  }
  if (e instanceof Prisma.PrismaClientValidationError) {
    console.error(e);
    throw new HttpError(422, "Save failed", {
      message: "there was a database error"
    });
  }
  if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2021") {
    console.error(e);
    console.info("\u{1F41D} This error can happen if you did't run the database migrations.");
    throw new HttpError(500, "Save failed", {
      message: `there was a database error`
    });
  }
  if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2003") {
    console.error(e);
    console.info(`\u{1F41D} This error can happen if you have some relation on your User entity
   but you didn't specify the "onDelete" behaviour to either "Cascade" or "SetNull".
   Read more at: https://www.prisma.io/docs/orm/prisma-schema/data-model/relations/referential-actions`);
    throw new HttpError(500, "Save failed", {
      message: `there was a database error`
    });
  }
  throw e;
}
async function validateAndGetUserFields(data, userSignupFields) {
  const { password: _password, ...sanitizedData } = data;
  const result = {};
  if (!userSignupFields) {
    return result;
  }
  for (const [field, getFieldValue] of Object.entries(userSignupFields)) {
    try {
      const value = await getFieldValue(sanitizedData);
      result[field] = value;
    } catch (e) {
      throwValidationError(e.message);
    }
  }
  return result;
}
function getProviderData(providerData) {
  return sanitizeProviderData(getProviderDataWithPassword(providerData));
}
function getProviderDataWithPassword(providerData) {
  return JSON.parse(providerData);
}
function sanitizeProviderData(providerData) {
  if (providerDataHasPasswordField(providerData)) {
    const { hashedPassword, ...rest } = providerData;
    return rest;
  } else {
    return providerData;
  }
}
async function sanitizeAndSerializeProviderData(providerData) {
  return serializeProviderData(await ensurePasswordIsHashed(providerData));
}
function serializeProviderData(providerData) {
  return JSON.stringify(providerData);
}
async function ensurePasswordIsHashed(providerData) {
  const data = {
    ...providerData
  };
  if (providerDataHasPasswordField(data)) {
    data.hashedPassword = await hashPassword(data.hashedPassword);
  }
  return data;
}
function providerDataHasPasswordField(providerData) {
  return "hashedPassword" in providerData;
}
function createInvalidCredentialsError(message) {
  return new HttpError(401, "Invalid credentials", { message });
}

function createAuthUserData(user) {
  const { auth, ...rest } = user;
  if (!auth) {
    throw new Error(`\u{1F41D} Error: trying to create a user without auth data.
This should never happen, but it did which means there is a bug in the code.`);
  }
  const identities = {
    email: getProviderInfo(auth, "email")
  };
  return {
    ...rest,
    identities
  };
}
function getProviderInfo(auth, providerName) {
  const identity = getIdentity(auth, providerName);
  if (!identity) {
    return null;
  }
  return {
    ...getProviderData(identity.providerData),
    id: identity.providerUserId
  };
}
function getIdentity(auth, providerName) {
  return auth.identities.find((i) => i.providerName === providerName) ?? null;
}

async function createSession(authId) {
  return auth$1.createSession(authId, {});
}
async function getSessionAndUserFromBearerToken(req) {
  const authorizationHeader = req.headers["authorization"];
  if (typeof authorizationHeader !== "string") {
    return null;
  }
  const sessionId = auth$1.readBearerToken(authorizationHeader);
  if (!sessionId) {
    return null;
  }
  return getSessionAndUserFromSessionId(sessionId);
}
async function getSessionAndUserFromSessionId(sessionId) {
  const { session, user: authEntity } = await auth$1.validateSession(sessionId);
  if (!session || !authEntity) {
    return null;
  }
  return {
    session,
    user: await getAuthUserData(authEntity.userId)
  };
}
async function getAuthUserData(userId) {
  const user = await dbClient.user.findUnique({
    where: { id: userId },
    include: {
      auth: {
        include: {
          identities: true
        }
      }
    }
  });
  if (!user) {
    throw createInvalidCredentialsError();
  }
  return createAuthUserData(user);
}
function invalidateSession(sessionId) {
  return auth$1.invalidateSession(sessionId);
}

const auth = defineHandler(async (req, res, next) => {
  const authHeader = req.get("Authorization");
  if (!authHeader) {
    req.sessionId = null;
    req.user = null;
    return next();
  }
  const sessionAndUser = await getSessionAndUserFromBearerToken(req);
  if (sessionAndUser === null) {
    throw createInvalidCredentialsError();
  }
  req.sessionId = sessionAndUser.session.id;
  req.user = sessionAndUser.user;
  next();
});

const Decimal = Prisma.Decimal;
if (Decimal) {
  registerCustom({
    isApplicable: (v) => Decimal.isDecimal(v),
    serialize: (v) => v.toJSON(),
    deserialize: (v) => new Decimal(v)
  }, "prisma.decimal");
}

function isNotNull(value) {
  return value !== null;
}

function makeAuthUserIfPossible(user) {
  return user ? makeAuthUser(user) : null;
}
function makeAuthUser(data) {
  return {
    ...data,
    getFirstProviderUserId: () => {
      const identities = Object.values(data.identities).filter(isNotNull);
      return identities.length > 0 ? identities[0].id : null;
    }
  };
}

function createOperation(handlerFn) {
  return defineHandler(async (req, res) => {
    const args = req.body && deserialize(req.body) || {};
    const context = {
      user: makeAuthUserIfPossible(req.user)
    };
    const result = await handlerFn(args, context);
    const serializedResult = serialize(result);
    res.json(serializedResult);
  });
}
function createQuery(handlerFn) {
  return createOperation(handlerFn);
}
function createAction(handlerFn) {
  return createOperation(handlerFn);
}

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

function ensureArgsSchemaOrThrowHttpError(schema, rawArgs) {
  const parseResult = schema.safeParse(rawArgs);
  if (!parseResult.success) {
    console.error(parseResult.error);
    throw new HttpError(400, "Operation arguments validation failed", { errors: parseResult.error.errors });
  } else {
    return parseResult.data;
  }
}

const updateUserAdminByIdInputSchema = z.object({
  id: z.string().nonempty(),
  isAdmin: z.boolean()
});
const updateIsUserAdminById$2 = async (rawArgs, context) => {
  const { id, isAdmin } = ensureArgsSchemaOrThrowHttpError(updateUserAdminByIdInputSchema, rawArgs);
  if (!context.user) {
    throw new HttpError(401, "Only authenticated users are allowed to perform this operation");
  }
  if (!context.user.isAdmin) {
    throw new HttpError(403, "Only admins are allowed to perform this operation");
  }
  return context.entities.User.update({
    where: { id },
    data: { isAdmin }
  });
};
const getPaginatorArgsSchema = z.object({
  skipPages: z.number(),
  filter: z.object({
    emailContains: z.string().nonempty().optional(),
    isAdmin: z.boolean().optional(),
    subscriptionStatusIn: z.array(z.nativeEnum(SubscriptionStatus).nullable()).optional()
  })
});
const getPaginatedUsers$2 = async (rawArgs, context) => {
  if (!context.user) {
    throw new HttpError(401, "Only authenticated users are allowed to perform this operation");
  }
  if (!context.user.isAdmin) {
    throw new HttpError(403, "Only admins are allowed to perform this operation");
  }
  const {
    skipPages,
    filter: { subscriptionStatusIn: subscriptionStatus, emailContains, isAdmin }
  } = ensureArgsSchemaOrThrowHttpError(getPaginatorArgsSchema, rawArgs);
  const includeUnsubscribedUsers = !!subscriptionStatus?.some((status) => status === null);
  const desiredSubscriptionStatuses = subscriptionStatus?.filter((status) => status !== null);
  const pageSize = 10;
  const userPageQuery = {
    skip: skipPages * pageSize,
    take: pageSize,
    where: {
      AND: [
        {
          email: {
            contains: emailContains,
            mode: "insensitive"
          },
          isAdmin
        },
        {
          OR: [
            {
              subscriptionStatus: {
                in: desiredSubscriptionStatuses
              }
            },
            {
              subscriptionStatus: includeUnsubscribedUsers ? null : void 0
            }
          ]
        }
      ]
    },
    select: {
      id: true,
      email: true,
      username: true,
      isAdmin: true,
      subscriptionStatus: true,
      paymentProcessorUserId: true
    },
    orderBy: {
      username: "asc"
    }
  };
  const [pageOfUsers, totalUsers] = await dbClient.$transaction([
    context.entities.User.findMany(userPageQuery),
    context.entities.User.count({ where: userPageQuery.where })
  ]);
  const totalPages = Math.ceil(totalUsers / pageSize);
  return {
    users: pageOfUsers,
    totalPages
  };
};

async function updateIsUserAdminById$1(args, context) {
  return updateIsUserAdminById$2(args, {
    ...context,
    entities: {
      User: dbClient.user
    }
  });
}

var updateIsUserAdminById = createAction(updateIsUserAdminById$1);

const openAi = setUpOpenAi();
function setUpOpenAi() {
  if (process.env.OPENAI_API_KEY) {
    return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  } else {
    throw new Error("OpenAI API key is not set");
  }
}
const generateChatbotResponseInputSchema = z.object({
  messages: z.array(
    z.object({
      role: z.enum(["system", "user", "assistant"]),
      content: z.string()
    })
  )
});
const generateChatbotResponse$2 = async (rawArgs, context) => {
  if (!context.user) throw new HttpError(401, "Giri\u015F yapmal\u0131s\u0131n\u0131z.");
  const { messages } = generateChatbotResponseInputSchema.parse(rawArgs);
  const completion = await openAi.chat.completions.create({
    model: "gpt-3.5-turbo",
    messages,
    temperature: 0.8
  });
  return completion.choices[0].message?.content ?? "";
};

async function generateChatbotResponse$1(args, context) {
  return generateChatbotResponse$2(args, {
    ...context,
    entities: {
      User: dbClient.user
    }
  });
}

var generateChatbotResponse = createAction(generateChatbotResponse$1);

const stripe = new Stripe(requireNodeEnvVar("STRIPE_API_KEY"), {
  // NOTE:
  // API version below should ideally match the API version in your Stripe dashboard.
  // If that is not the case, you will most likely want to (up/down)grade the `stripe`
  // npm package to the API version that matches your Stripe dashboard's one.
  // For more details and alternative setups check
  // https://docs.stripe.com/api/versioning .
  apiVersion: "2022-11-15"
});

function assertUnreachable(x) {
  throw Error("This code should be unreachable");
}

const DOMAIN = process.env.WASP_WEB_CLIENT_URL || "http://localhost:3000";
async function fetchStripeCustomer(customerEmail) {
  let customer;
  try {
    const stripeCustomers = await stripe.customers.list({
      email: customerEmail
    });
    if (!stripeCustomers.data.length) {
      console.log("creating customer");
      customer = await stripe.customers.create({
        email: customerEmail
      });
    } else {
      console.log("using existing customer");
      customer = stripeCustomers.data[0];
    }
    return customer;
  } catch (error) {
    console.error(error);
    throw error;
  }
}
async function createStripeCheckoutSession({
  priceId,
  customerId,
  mode
}) {
  try {
    const paymentIntentData = getPaymentIntentData({ mode, priceId });
    return await stripe.checkout.sessions.create({
      line_items: [
        {
          price: priceId,
          quantity: 1
        }
      ],
      mode,
      success_url: `${DOMAIN}/checkout?success=true`,
      cancel_url: `${DOMAIN}/checkout?canceled=true`,
      automatic_tax: { enabled: true },
      customer_update: {
        address: "auto"
      },
      customer: customerId,
      // Stripe only allows us to pass payment intent metadata for one-time payments, not subscriptions.
      // We do this so that we can capture priceId in the payment_intent.succeeded webhook
      // and easily confirm the user's payment based on the price id. For subscriptions, we can get the price id
      // in the customer.subscription.updated webhook via the line_items field.
      payment_intent_data: paymentIntentData
    });
  } catch (error) {
    console.error(error);
    throw error;
  }
}
function getPaymentIntentData({ mode, priceId }) {
  switch (mode) {
    case "subscription":
      return void 0;
    case "payment":
      return { metadata: { priceId } };
    default:
      assertUnreachable();
  }
}

const updateUserStripePaymentDetails = ({ userStripeId, subscriptionPlan, subscriptionStatus, datePaid, numOfCreditsPurchased }, userDelegate) => {
  return userDelegate.update({
    where: {
      paymentProcessorUserId: userStripeId
    },
    data: {
      paymentProcessorUserId: userStripeId,
      subscriptionPlan,
      subscriptionStatus,
      datePaid,
      credits: numOfCreditsPurchased !== void 0 ? { increment: numOfCreditsPurchased } : void 0
    }
  });
};

function formatFromField({ email, name }) {
  if (name) {
    return `${name} <${email}>`;
  }
  return email;
}
function getDefaultFromField() {
  return {
    email: "no-reply@opensaas.com",
    name: "Open SaaS App"
  };
}

function initSmtpEmailSender(config) {
  const transporter = createTransport({
    host: config.host,
    port: config.port,
    auth: {
      user: config.username,
      pass: config.password
    }
  });
  const defaultFromField = getDefaultFromField();
  return {
    async send(email) {
      return transporter.sendMail({
        from: formatFromField(email.from || defaultFromField),
        to: email.to,
        subject: email.subject,
        text: email.text,
        html: email.html
      });
    }
  };
}

const emailProvider = {
  host: env.SMTP_HOST,
  port: env.SMTP_PORT,
  username: env.SMTP_USERNAME,
  password: env.SMTP_PASSWORD
};
const emailSender = initSmtpEmailSender(emailProvider);

class UnhandledWebhookEventError extends Error {
  constructor(eventType) {
    super(`Unhandled event type: ${eventType}`);
    this.name = "UnhandledWebhookEventError";
  }
}

async function parseWebhookPayload(rawStripeEvent) {
  try {
    const event = await genericStripeEventSchema.parseAsync(rawStripeEvent);
    switch (event.type) {
      case "checkout.session.completed":
        const session = await sessionCompletedDataSchema.parseAsync(event.data.object);
        return { eventName: event.type, data: session };
      case "invoice.paid":
        const invoice = await invoicePaidDataSchema.parseAsync(event.data.object);
        return { eventName: event.type, data: invoice };
      case "payment_intent.succeeded":
        const paymentIntent = await paymentIntentSucceededDataSchema.parseAsync(event.data.object);
        return { eventName: event.type, data: paymentIntent };
      case "customer.subscription.updated":
        const updatedSubscription = await subscriptionUpdatedDataSchema.parseAsync(event.data.object);
        return { eventName: event.type, data: updatedSubscription };
      case "customer.subscription.deleted":
        const deletedSubscription = await subscriptionDeletedDataSchema.parseAsync(event.data.object);
        return { eventName: event.type, data: deletedSubscription };
      default:
        throw new UnhandledWebhookEventError(event.type);
    }
  } catch (e) {
    if (e instanceof UnhandledWebhookEventError) {
      throw e;
    } else {
      console.error(e);
      throw new HttpError(400, "Error parsing Stripe event object");
    }
  }
}
const genericStripeEventSchema = z.object({
  type: z.string(),
  data: z.object({
    object: z.unknown()
  })
});
const sessionCompletedDataSchema = z.object({
  id: z.string(),
  customer: z.string()
});
const invoicePaidDataSchema = z.object({
  customer: z.string(),
  period_start: z.number()
});
const paymentIntentSucceededDataSchema = z.object({
  invoice: z.unknown().optional(),
  created: z.number(),
  metadata: z.object({
    priceId: z.string().optional()
  }),
  customer: z.string()
});
const subscriptionUpdatedDataSchema = z.object({
  customer: z.string(),
  status: z.string(),
  cancel_at_period_end: z.boolean(),
  items: z.object({
    data: z.array(
      z.object({
        price: z.object({
          id: z.string()
        })
      })
    )
  })
});
const subscriptionDeletedDataSchema = z.object({
  customer: z.string()
});

const stripeWebhook = async (request, response, context) => {
  try {
    const rawStripeEvent = constructStripeEvent(request);
    const { eventName, data } = await parseWebhookPayload(rawStripeEvent);
    const prismaUserDelegate = context.entities.User;
    switch (eventName) {
      case "checkout.session.completed":
        await handleCheckoutSessionCompleted(data, prismaUserDelegate);
        break;
      case "invoice.paid":
        await handleInvoicePaid(data, prismaUserDelegate);
        break;
      case "payment_intent.succeeded":
        await handlePaymentIntentSucceeded(data, prismaUserDelegate);
        break;
      case "customer.subscription.updated":
        await handleCustomerSubscriptionUpdated(data, prismaUserDelegate);
        break;
      case "customer.subscription.deleted":
        await handleCustomerSubscriptionDeleted(data, prismaUserDelegate);
        break;
      default:
        assertUnreachable(eventName);
    }
    return response.json({ received: true });
  } catch (err) {
    if (err instanceof UnhandledWebhookEventError) {
      console.error(err.message);
      return response.status(422).json({ error: err.message });
    }
    console.error("Webhook error:", err);
    if (err instanceof HttpError) {
      return response.status(err.statusCode).json({ error: err.message });
    } else {
      return response.status(400).json({ error: "Error processing Stripe webhook event" });
    }
  }
};
function constructStripeEvent(request) {
  try {
    const secret = requireNodeEnvVar("STRIPE_WEBHOOK_SECRET");
    const sig = request.headers["stripe-signature"];
    if (!sig) {
      throw new HttpError(400, "Stripe webhook signature not provided");
    }
    return stripe.webhooks.constructEvent(request.body, sig, secret);
  } catch (err) {
    throw new HttpError(500, "Error constructing Stripe webhook event");
  }
}
const stripeMiddlewareConfigFn = (middlewareConfig) => {
  middlewareConfig.delete("express.json");
  middlewareConfig.set("express.raw", express.raw({ type: "application/json" }));
  return middlewareConfig;
};
async function handleCheckoutSessionCompleted(session, prismaUserDelegate) {
  const userStripeId = session.customer;
  const lineItems = await getSubscriptionLineItemsBySessionId(session.id);
  const lineItemPriceId = extractPriceId(lineItems);
  const planId = getPlanIdByPriceId(lineItemPriceId);
  const plan = paymentPlans[planId];
  if (plan.effect.kind === "credits") {
    return;
  }
  const { subscriptionPlan } = getPlanEffectPaymentDetails({ planId, planEffect: plan.effect });
  return updateUserStripePaymentDetails({ userStripeId, subscriptionPlan }, prismaUserDelegate);
}
async function handleInvoicePaid(invoice, prismaUserDelegate) {
  const userStripeId = invoice.customer;
  const datePaid = new Date(invoice.period_start * 1e3);
  return updateUserStripePaymentDetails({ userStripeId, datePaid }, prismaUserDelegate);
}
async function handlePaymentIntentSucceeded(paymentIntent, prismaUserDelegate) {
  if (paymentIntent.invoice) {
    return;
  }
  const userStripeId = paymentIntent.customer;
  const datePaid = new Date(paymentIntent.created * 1e3);
  const { metadata } = paymentIntent;
  if (!metadata.priceId) {
    throw new HttpError(400, "No price id found in payment intent");
  }
  const planId = getPlanIdByPriceId(metadata.priceId);
  const plan = paymentPlans[planId];
  if (plan.effect.kind === "subscription") {
    return;
  }
  const { numOfCreditsPurchased } = getPlanEffectPaymentDetails({ planId, planEffect: plan.effect });
  return updateUserStripePaymentDetails(
    { userStripeId, numOfCreditsPurchased, datePaid },
    prismaUserDelegate
  );
}
async function handleCustomerSubscriptionUpdated(subscription, prismaUserDelegate) {
  const userStripeId = subscription.customer;
  let subscriptionStatus;
  const priceId = extractPriceId(subscription.items);
  const subscriptionPlan = getPlanIdByPriceId(priceId);
  if (subscription.status === SubscriptionStatus.Active) {
    subscriptionStatus = subscription.cancel_at_period_end ? SubscriptionStatus.CancelAtPeriodEnd : SubscriptionStatus.Active;
  } else if (subscription.status === SubscriptionStatus.PastDue) {
    subscriptionStatus = SubscriptionStatus.PastDue;
  }
  if (subscriptionStatus) {
    const user = await updateUserStripePaymentDetails(
      { userStripeId, subscriptionPlan, subscriptionStatus },
      prismaUserDelegate
    );
    if (subscription.cancel_at_period_end) {
      if (user.email) {
        await emailSender.send({
          to: user.email,
          subject: "We hate to see you go :(",
          text: "We hate to see you go. Here is a sweet offer...",
          html: "We hate to see you go. Here is a sweet offer..."
        });
      }
    }
    return user;
  }
}
async function handleCustomerSubscriptionDeleted(subscription, prismaUserDelegate) {
  const userStripeId = subscription.customer;
  return updateUserStripePaymentDetails(
    { userStripeId, subscriptionStatus: SubscriptionStatus.Deleted },
    prismaUserDelegate
  );
}
const subscriptionItemsSchema = z$1.object({
  data: z$1.array(
    z$1.object({
      price: z$1.object({
        id: z$1.string()
      })
    })
  )
});
function extractPriceId(items) {
  if (items.data.length === 0) {
    throw new HttpError(400, "No items in stripe event object");
  }
  if (items.data.length > 1) {
    throw new HttpError(400, "More than one item in stripe event object");
  }
  return items.data[0].price.id;
}
async function getSubscriptionLineItemsBySessionId(sessionId) {
  try {
    const { line_items: lineItemsRaw } = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ["line_items"]
    });
    const lineItems = await subscriptionItemsSchema.parseAsync(lineItemsRaw);
    return lineItems;
  } catch (e) {
    throw new HttpError(500, "Error parsing Stripe line items");
  }
}
function getPlanIdByPriceId(priceId) {
  const planId = Object.values(PaymentPlanId).find(
    (planId2) => paymentPlans[planId2].getPaymentProcessorPlanId() === priceId
  );
  if (!planId) {
    throw new Error(`No plan with Stripe price id ${priceId}`);
  }
  return planId;
}
function getPlanEffectPaymentDetails({
  planId,
  planEffect
}) {
  switch (planEffect.kind) {
    case "subscription":
      return { subscriptionPlan: planId, numOfCreditsPurchased: void 0 };
    case "credits":
      return { subscriptionPlan: void 0, numOfCreditsPurchased: planEffect.amount };
    default:
      assertUnreachable();
  }
}

const stripePaymentProcessor = {
  id: "stripe",
  createCheckoutSession: async ({ userId, userEmail, paymentPlan, prismaUserDelegate }) => {
    const customer = await fetchStripeCustomer(userEmail);
    const stripeSession = await createStripeCheckoutSession({
      priceId: paymentPlan.getPaymentProcessorPlanId(),
      customerId: customer.id,
      mode: paymentPlanEffectToStripeMode(paymentPlan.effect)
    });
    await prismaUserDelegate.update({
      where: {
        id: userId
      },
      data: {
        paymentProcessorUserId: customer.id
      }
    });
    if (!stripeSession.url) throw new Error("Error creating Stripe Checkout Session");
    const session = {
      url: stripeSession.url,
      id: stripeSession.id
    };
    return { session };
  },
  fetchCustomerPortalUrl: async (_args) => requireNodeEnvVar("STRIPE_CUSTOMER_PORTAL_URL"),
  webhook: stripeWebhook,
  webhookMiddlewareConfigFn: stripeMiddlewareConfigFn
};
function paymentPlanEffectToStripeMode(planEffect) {
  const effectToMode = {
    subscription: "subscription",
    credits: "payment"
  };
  return effectToMode[planEffect.kind];
}

const paymentProcessor = stripePaymentProcessor;

const generateCheckoutSessionSchema = z.nativeEnum(PaymentPlanId);
const generateCheckoutSession$2 = async (rawPaymentPlanId, context) => {
  if (!context.user) {
    throw new HttpError(401, "Only authenticated users are allowed to perform this operation");
  }
  const paymentPlanId = ensureArgsSchemaOrThrowHttpError(generateCheckoutSessionSchema, rawPaymentPlanId);
  const userId = context.user.id;
  const userEmail = context.user.email;
  if (!userEmail) {
    throw new HttpError(403, "User needs an email to make a payment.");
  }
  const paymentPlan = paymentPlans[paymentPlanId];
  const { session } = await paymentProcessor.createCheckoutSession({
    userId,
    userEmail,
    paymentPlan,
    prismaUserDelegate: context.entities.User
  });
  return {
    sessionUrl: session.url,
    sessionId: session.id
  };
};
const getCustomerPortalUrl$2 = async (_args, context) => {
  if (!context.user) {
    throw new HttpError(401, "Only authenticated users are allowed to perform this operation");
  }
  return paymentProcessor.fetchCustomerPortalUrl({
    userId: context.user.id,
    prismaUserDelegate: context.entities.User
  });
};

async function generateCheckoutSession$1(args, context) {
  return generateCheckoutSession$2(args, {
    ...context,
    entities: {
      User: dbClient.user
    }
  });
}

var generateCheckoutSession = createAction(generateCheckoutSession$1);

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;
const ALLOWED_FILE_TYPES = [
  "image/jpeg",
  "image/png",
  "application/pdf",
  "text/*",
  "video/quicktime",
  "video/mp4"
];

const s3Client = new S3Client({
  region: process.env.AWS_S3_REGION,
  credentials: {
    accessKeyId: process.env.AWS_S3_IAM_ACCESS_KEY,
    secretAccessKey: process.env.AWS_S3_IAM_SECRET_KEY
  }
});
const getUploadFileSignedURLFromS3 = async ({ fileName, fileType, userId }) => {
  const key = getS3Key(fileName, userId);
  const { url: s3UploadUrl, fields: s3UploadFields } = await createPresignedPost(s3Client, {
    Bucket: process.env.AWS_S3_FILES_BUCKET,
    Key: key,
    Conditions: [["content-length-range", 0, MAX_FILE_SIZE_BYTES]],
    Fields: {
      "Content-Type": fileType
    },
    Expires: 3600
  });
  return { s3UploadUrl, key, s3UploadFields };
};
const getDownloadFileSignedURLFromS3 = async ({ key }) => {
  const command = new GetObjectCommand({
    Bucket: process.env.AWS_S3_FILES_BUCKET,
    Key: key
  });
  return await getSignedUrl(s3Client, command, { expiresIn: 3600 });
};
function getS3Key(fileName, userId) {
  const ext = extname(fileName).slice(1);
  return `${userId}/${randomUUID()}.${ext}`;
}

const createFileInputSchema = z.object({
  fileType: z.enum(ALLOWED_FILE_TYPES),
  fileName: z.string().nonempty()
});
const createFile$2 = async (rawArgs, context) => {
  if (!context.user) {
    throw new HttpError(401);
  }
  const { fileType, fileName } = ensureArgsSchemaOrThrowHttpError(createFileInputSchema, rawArgs);
  const { s3UploadUrl, s3UploadFields, key } = await getUploadFileSignedURLFromS3({
    fileType,
    fileName,
    userId: context.user.id
  });
  await context.entities.File.create({
    data: {
      name: fileName,
      key,
      uploadUrl: s3UploadUrl,
      type: fileType,
      user: { connect: { id: context.user.id } }
    }
  });
  return {
    s3UploadUrl,
    s3UploadFields
  };
};
const getAllFilesByUser$2 = async (_args, context) => {
  if (!context.user) {
    throw new HttpError(401);
  }
  return context.entities.File.findMany({
    where: {
      user: {
        id: context.user.id
      }
    },
    orderBy: {
      createdAt: "desc"
    }
  });
};
const getDownloadFileSignedURLInputSchema = z.object({ key: z.string().nonempty() });
const getDownloadFileSignedURL$2 = async (rawArgs, _context) => {
  const { key } = ensureArgsSchemaOrThrowHttpError(getDownloadFileSignedURLInputSchema, rawArgs);
  return await getDownloadFileSignedURLFromS3({ key });
};

async function createFile$1(args, context) {
  return createFile$2(args, {
    ...context,
    entities: {
      User: dbClient.user,
      File: dbClient.file
    }
  });
}

var createFile = createAction(createFile$1);

async function getPaginatedUsers$1(args, context) {
  return getPaginatedUsers$2(args, {
    ...context,
    entities: {
      User: dbClient.user
    }
  });
}

var getPaginatedUsers = createQuery(getPaginatedUsers$1);

async function getCustomerPortalUrl$1(args, context) {
  return getCustomerPortalUrl$2(args, {
    ...context,
    entities: {
      User: dbClient.user
    }
  });
}

var getCustomerPortalUrl = createQuery(getCustomerPortalUrl$1);

async function getAllFilesByUser$1(args, context) {
  return getAllFilesByUser$2(args, {
    ...context,
    entities: {
      User: dbClient.user,
      File: dbClient.file
    }
  });
}

var getAllFilesByUser = createQuery(getAllFilesByUser$1);

async function getDownloadFileSignedURL$1(args, context) {
  return getDownloadFileSignedURL$2(args, {
    ...context,
    entities: {
      User: dbClient.user,
      File: dbClient.file
    }
  });
}

var getDownloadFileSignedURL = createQuery(getDownloadFileSignedURL$1);

const getDailyStats$2 = async (_args, context) => {
  if (!context.user) {
    throw new HttpError(401, "Only authenticated users are allowed to perform this operation");
  }
  if (!context.user.isAdmin) {
    throw new HttpError(403, "Only admins are allowed to perform this operation");
  }
  const statsQuery = {
    orderBy: {
      date: "desc"
    },
    include: {
      sources: true
    }
  };
  const [dailyStats, weeklyStats] = await dbClient.$transaction([
    context.entities.DailyStats.findFirst(statsQuery),
    context.entities.DailyStats.findMany({ ...statsQuery, take: 7 })
  ]);
  if (!dailyStats) {
    console.log("\x1B[34mNote: No daily stats have been generated by the dailyStatsJob yet. \x1B[0m");
    return void 0;
  }
  return { dailyStats, weeklyStats };
};

async function getDailyStats$1(args, context) {
  return getDailyStats$2(args, {
    ...context,
    entities: {
      User: dbClient.user,
      DailyStats: dbClient.dailyStats
    }
  });
}

var getDailyStats = createQuery(getDailyStats$1);

const router$4 = express.Router();
router$4.post("/update-is-user-admin-by-id", auth, updateIsUserAdminById);
router$4.post("/generate-chatbot-response", auth, generateChatbotResponse);
router$4.post("/generate-checkout-session", auth, generateCheckoutSession);
router$4.post("/create-file", auth, createFile);
router$4.post("/get-paginated-users", auth, getPaginatedUsers);
router$4.post("/get-customer-portal-url", auth, getCustomerPortalUrl);
router$4.post("/get-all-files-by-user", auth, getAllFilesByUser);
router$4.post("/get-download-file-signed-url", auth, getDownloadFileSignedURL);
router$4.post("/get-daily-stats", auth, getDailyStats);

const _waspGlobalMiddlewareConfigFn = (mc) => mc;
const defaultGlobalMiddlewareConfig = /* @__PURE__ */ new Map([
  ["helmet", helmet()],
  ["cors", cors({ origin: config$1.allowedCORSOrigins })],
  ["logger", logger("dev")],
  ["express.json", express.json()],
  ["express.urlencoded", express.urlencoded()],
  ["cookieParser", cookieParser()]
]);
const globalMiddlewareConfig = _waspGlobalMiddlewareConfigFn(defaultGlobalMiddlewareConfig);
function globalMiddlewareConfigForExpress(middlewareConfigFn) {
  if (!middlewareConfigFn) {
    return Array.from(globalMiddlewareConfig.values());
  }
  const globalMiddlewareConfigClone = new Map(globalMiddlewareConfig);
  const modifiedMiddlewareConfig = middlewareConfigFn(globalMiddlewareConfigClone);
  return Array.from(modifiedMiddlewareConfig.values());
}

var me = defineHandler(async (req, res) => {
  if (req.user) {
    res.json(serialize(req.user));
  } else {
    res.json(serialize(null));
  }
});

var logout = defineHandler(async (req, res) => {
  if (req.sessionId) {
    await invalidateSession(req.sessionId);
    res.json({ success: true });
  } else {
    throw createInvalidCredentialsError();
  }
});

const onBeforeSignupHook = async (_params) => {
};
const onAfterSignupHook = async (_params) => {
};
const onAfterEmailVerifiedHook = async (_params) => {
};
const onBeforeLoginHook = async (_params) => {
};
const onAfterLoginHook = async (_params) => {
};

function getLoginRoute() {
  return async function login(req, res) {
    const fields = req.body ?? {};
    ensureValidArgs$2(fields);
    const providerId = createProviderId("email", fields.email);
    const authIdentity = await findAuthIdentity(providerId);
    if (!authIdentity) {
      throw createInvalidCredentialsError();
    }
    const providerData = getProviderDataWithPassword(authIdentity.providerData);
    if (!providerData.isEmailVerified) {
      throw createInvalidCredentialsError();
    }
    try {
      await verifyPassword(providerData.hashedPassword, fields.password);
    } catch (e) {
      throw createInvalidCredentialsError();
    }
    const auth = await findAuthWithUserBy({ id: authIdentity.authId });
    if (auth === null) {
      throw createInvalidCredentialsError();
    }
    await onBeforeLoginHook({
      user: auth.user
    });
    const session = await createSession(auth.id);
    await onAfterLoginHook({
      user: auth.user
    });
    res.json({
      sessionId: session.id
    });
  };
}
function ensureValidArgs$2(args) {
  ensureValidEmail(args);
  ensurePasswordIsPresent(args);
}

const JWT_SECRET = new TextEncoder().encode(config$1.auth.jwtSecret);
const JWT_ALGORITHM = "HS256";
function createJWT(data, options) {
  return jwt.createJWT(JWT_ALGORITHM, JWT_SECRET, data, options);
}
async function validateJWT(token) {
  const { payload } = await jwt.validateJWT(JWT_ALGORITHM, JWT_SECRET, token);
  return payload;
}

async function createEmailVerificationLink(email, clientRoute) {
  const { jwtToken } = await createEmailJWT(email);
  return `${config$1.frontendUrl}${clientRoute}?token=${jwtToken}`;
}
async function createPasswordResetLink(email, clientRoute) {
  const { jwtToken } = await createEmailJWT(email);
  return `${config$1.frontendUrl}${clientRoute}?token=${jwtToken}`;
}
async function createEmailJWT(email) {
  const jwtToken = await createJWT({ email }, { expiresIn: new TimeSpan(30, "m") });
  return { jwtToken };
}
async function sendPasswordResetEmail(email, content) {
  return sendEmailAndSaveMetadata(email, content, {
    passwordResetSentAt: (/* @__PURE__ */ new Date()).toISOString()
  });
}
async function sendEmailVerificationEmail(email, content) {
  return sendEmailAndSaveMetadata(email, content, {
    emailVerificationSentAt: (/* @__PURE__ */ new Date()).toISOString()
  });
}
async function sendEmailAndSaveMetadata(email, content, metadata) {
  const providerId = createProviderId("email", email);
  const authIdentity = await findAuthIdentity(providerId);
  if (!authIdentity) {
    throw new Error(`User with email: ${email} not found.`);
  }
  const providerData = getProviderDataWithPassword(authIdentity.providerData);
  await updateAuthIdentityProviderData(providerId, providerData, metadata);
  emailSender.send(content).catch((e) => {
    console.error("Failed to send email", e);
  });
}
function isEmailResendAllowed(fields, field, resendInterval = 1e3 * 60) {
  const sentAt = fields[field];
  if (!sentAt) {
    return {
      isResendAllowed: true,
      timeLeft: 0
    };
  }
  const now = /* @__PURE__ */ new Date();
  const diff = now.getTime() - new Date(sentAt).getTime();
  const isResendAllowed = diff > resendInterval;
  const timeLeft = isResendAllowed ? 0 : Math.round((resendInterval - diff) / 1e3);
  return { isResendAllowed, timeLeft };
}

function getSignupRoute({
  userSignupFields,
  fromField,
  clientRoute,
  getVerificationEmailContent,
  isEmailAutoVerified
}) {
  return async function signup(req, res) {
    const fields = req.body;
    ensureValidArgs$1(fields);
    const providerId = createProviderId("email", fields.email);
    const existingAuthIdentity = await findAuthIdentity(providerId);
    if (existingAuthIdentity) {
      const providerData = getProviderDataWithPassword(
        existingAuthIdentity.providerData
      );
      if (providerData.isEmailVerified) {
        await doFakeWork();
        res.json({ success: true });
        return;
      }
      const { isResendAllowed, timeLeft } = isEmailResendAllowed(
        providerData,
        "passwordResetSentAt"
      );
      if (!isResendAllowed) {
        throw new HttpError(
          400,
          `Please wait ${timeLeft} secs before trying again.`
        );
      }
      try {
        await deleteUserByAuthId(existingAuthIdentity.authId);
      } catch (e) {
        rethrowPossibleAuthError(e);
      }
    }
    const userFields = await validateAndGetUserFields(fields, userSignupFields);
    const newUserProviderData = await sanitizeAndSerializeProviderData(
      {
        hashedPassword: fields.password,
        isEmailVerified: false,
        emailVerificationSentAt: null,
        passwordResetSentAt: null
      }
    );
    try {
      await onBeforeSignupHook({ req, providerId });
      const user = await createUser(
        providerId,
        newUserProviderData,
        // Using any here because we want to avoid TypeScript errors and
        // rely on Prisma to validate the data.
        userFields
      );
      await onAfterSignupHook({ req, providerId, user });
    } catch (e) {
      rethrowPossibleAuthError(e);
    }
    const verificationLink = await createEmailVerificationLink(
      fields.email,
      clientRoute
    );
    try {
      await sendEmailVerificationEmail(fields.email, {
        from: fromField,
        to: fields.email,
        ...getVerificationEmailContent({ verificationLink })
      });
    } catch (e) {
      console.error("Failed to send email verification email:", e);
      throw new HttpError(500, "Failed to send email verification email.");
    }
    res.json({ success: true });
  };
}
function ensureValidArgs$1(args) {
  ensureValidEmail(args);
  ensurePasswordIsPresent(args);
  ensureValidPassword(args);
}

function getRequestPasswordResetRoute({
  fromField,
  clientRoute,
  getPasswordResetEmailContent
}) {
  return async function requestPasswordReset(req, res) {
    const args = req.body ?? {};
    ensureValidEmail(args);
    const authIdentity = await findAuthIdentity(
      createProviderId("email", args.email)
    );
    if (!authIdentity) {
      await doFakeWork();
      res.json({ success: true });
      return;
    }
    const providerData = getProviderDataWithPassword(authIdentity.providerData);
    const { isResendAllowed, timeLeft } = isEmailResendAllowed(providerData, "passwordResetSentAt");
    if (!isResendAllowed) {
      throw new HttpError(400, `Please wait ${timeLeft} secs before trying again.`);
    }
    const passwordResetLink = await createPasswordResetLink(args.email, clientRoute);
    try {
      const email = authIdentity.providerUserId;
      await sendPasswordResetEmail(
        email,
        {
          from: fromField,
          to: email,
          ...getPasswordResetEmailContent({ passwordResetLink })
        }
      );
    } catch (e) {
      console.error("Failed to send password reset email:", e);
      throw new HttpError(500, "Failed to send password reset email.");
    }
    res.json({ success: true });
  };
}

async function resetPassword(req, res) {
  const args = req.body ?? {};
  ensureValidArgs(args);
  const { token, password } = args;
  const { email } = await validateJWT(token).catch(() => {
    throw new HttpError(400, "Password reset failed, invalid token");
  });
  const providerId = createProviderId("email", email);
  const authIdentity = await findAuthIdentity(providerId);
  if (!authIdentity) {
    throw new HttpError(400, "Password reset failed, invalid token");
  }
  const providerData = getProviderDataWithPassword(authIdentity.providerData);
  await updateAuthIdentityProviderData(providerId, providerData, {
    // The act of resetting the password verifies the email
    isEmailVerified: true,
    // The password will be hashed when saving the providerData
    // in the DB
    hashedPassword: password
  });
  res.json({ success: true });
}
function ensureValidArgs(args) {
  ensureTokenIsPresent(args);
  ensurePasswordIsPresent(args);
  ensureValidPassword(args);
}

async function verifyEmail(req, res) {
  const { token } = req.body;
  const { email } = await validateJWT(token).catch(() => {
    throw new HttpError(400, "Email verification failed, invalid token");
  });
  const providerId = createProviderId("email", email);
  const authIdentity = await findAuthIdentity(providerId);
  if (!authIdentity) {
    throw new HttpError(400, "Email verification failed, invalid token");
  }
  const providerData = getProviderDataWithPassword(authIdentity.providerData);
  await updateAuthIdentityProviderData(providerId, providerData, {
    isEmailVerified: true
  });
  const auth = await findAuthWithUserBy({ id: authIdentity.authId });
  await onAfterEmailVerifiedHook({ user: auth.user });
  res.json({ success: true });
}

function defineUserSignupFields(fields) {
  return fields;
}

const adminEmails = process.env.ADMIN_EMAILS?.split(",") || [];
const emailDataSchema = z$1.object({
  email: z$1.string()
});
const getEmailUserFields = defineUserSignupFields({
  email: (data) => {
    const emailData = emailDataSchema.parse(data);
    return emailData.email;
  },
  username: (data) => {
    const emailData = emailDataSchema.parse(data);
    return emailData.email;
  },
  isAdmin: (data) => {
    const emailData = emailDataSchema.parse(data);
    return adminEmails.includes(emailData.email);
  }
});
z$1.object({
  profile: z$1.object({
    emails: z$1.array(
      z$1.object({
        email: z$1.string(),
        verified: z$1.boolean()
      })
    ).min(1, "You need to have an email address associated with your GitHub account to sign up."),
    login: z$1.string()
  })
});
z$1.object({
  profile: z$1.object({
    email: z$1.string(),
    email_verified: z$1.boolean()
  })
});
z$1.object({
  profile: z$1.object({
    username: z$1.string(),
    email: z$1.string().email().nullable(),
    verified: z$1.boolean().nullable()
  })
});

const getVerificationEmailContent = ({ verificationLink }) => ({
  subject: "Verify your email",
  text: `Click the link below to verify your email: ${verificationLink}`,
  html: `
        <p>Click the link below to verify your email</p>
        <a href="${verificationLink}">Verify email</a>
    `
});
const getPasswordResetEmailContent = ({ passwordResetLink }) => ({
  subject: "Password reset",
  text: `Click the link below to reset your password: ${passwordResetLink}`,
  html: `
        <p>Click the link below to reset your password</p>
        <a href="${passwordResetLink}">Reset password</a>
    `
});

const _waspUserSignupFields = getEmailUserFields;
const _waspGetVerificationEmailContent = getVerificationEmailContent;
const _waspGetPasswordResetEmailContent = getPasswordResetEmailContent;
const fromField = {
  name: "Open SaaS App",
  email: "me@example.com"
};
const config = {
  id: "email",
  displayName: "Email and password",
  createRouter() {
    const router = Router();
    const loginRoute = defineHandler(getLoginRoute());
    router.post("/login", loginRoute);
    const signupRoute = defineHandler(getSignupRoute({
      userSignupFields: _waspUserSignupFields,
      fromField,
      clientRoute: "/email-verification",
      getVerificationEmailContent: _waspGetVerificationEmailContent,
      isEmailAutoVerified: false
    }));
    router.post("/signup", signupRoute);
    const requestPasswordResetRoute = defineHandler(getRequestPasswordResetRoute({
      fromField,
      clientRoute: "/password-reset",
      getPasswordResetEmailContent: _waspGetPasswordResetEmailContent
    }));
    router.post("/request-password-reset", requestPasswordResetRoute);
    router.post("/reset-password", defineHandler(resetPassword));
    router.post("/verify-email", defineHandler(verifyEmail));
    return router;
  }
};

const providers = [
  config
];
const router$3 = Router();
for (const provider of providers) {
  const { createRouter } = provider;
  const providerRouter = createRouter(provider);
  router$3.use(`/${provider.id}`, providerRouter);
  console.log(`\u{1F680} "${provider.displayName}" auth initialized`);
}

const router$2 = express.Router();
router$2.get("/me", auth, me);
router$2.post("/logout", auth, logout);
router$2.use("/", router$3);

const paymentsWebhook = paymentProcessor.webhook;
const paymentsMiddlewareConfigFn = paymentProcessor.webhookMiddlewareConfigFn;

const router$1 = express.Router();
const paymentsWebhookMiddleware = globalMiddlewareConfigForExpress(paymentsMiddlewareConfigFn);
router$1.post(
  "/payments-webhook",
  [auth, ...paymentsWebhookMiddleware],
  defineHandler(
    (req, res) => {
      const context = {
        user: makeAuthUserIfPossible(req.user),
        entities: {
          User: dbClient.user
        }
      };
      return paymentsWebhook(req, res, context);
    }
  )
);

const router = express.Router();
const middleware = globalMiddlewareConfigForExpress();
router.get("/", middleware, function (_req, res) {
  res.status(200).send();
});
router.use("/auth", middleware, router$2);
router.use("/operations", middleware, router$4);
router.use(router$1);

const app = express();
app.use(express.static(join(__dirname, '../web-build')));
app.use("/", router);
app.get(/(.*)/, (_, res) =>
  res.sendFile(join(__dirname, '../web-build', 'index.html'))
);


app.use((err, _req, res, next) => {
  if (res.headersSent) {
    return next(err);
  }
  if (err instanceof HttpError) {
    return res.status(err.statusCode).json({ message: err.message, data: err.data });
  }
  return next(err);
});

const boss = createPgBoss();
function createPgBoss() {
  let pgBossNewOptions = {
    connectionString: config$1.databaseUrl
  };
  if (env.PG_BOSS_NEW_OPTIONS) {
    try {
      pgBossNewOptions = JSON.parse(env.PG_BOSS_NEW_OPTIONS);
    } catch {
      console.error("Environment variable PG_BOSS_NEW_OPTIONS was not parsable by JSON.parse()!");
    }
  }
  return new PgBoss(pgBossNewOptions);
}
let resolvePgBossStarted;
let rejectPgBossStarted;
const pgBossStarted = new Promise((resolve, reject) => {
  resolvePgBossStarted = resolve;
  rejectPgBossStarted = reject;
});
var PgBossStatus;
(function (PgBossStatus2) {
  PgBossStatus2["Unstarted"] = "Unstarted";
  PgBossStatus2["Starting"] = "Starting";
  PgBossStatus2["Started"] = "Started";
  PgBossStatus2["Error"] = "Error";
})(PgBossStatus || (PgBossStatus = {}));
let pgBossStatus = PgBossStatus.Unstarted;
async function startPgBoss() {
  if (pgBossStatus !== PgBossStatus.Unstarted) {
    return;
  }
  pgBossStatus = PgBossStatus.Starting;
  console.log("Starting pg-boss...");
  boss.on("error", (error) => console.error(error));
  try {
    await boss.start();
  } catch (error) {
    console.error("pg-boss failed to start!");
    console.error(error);
    pgBossStatus = PgBossStatus.Error;
    rejectPgBossStarted(boss);
    return;
  }
  resolvePgBossStarted(boss);
  console.log("pg-boss started!");
  pgBossStatus = PgBossStatus.Started;
}

class Job {
  jobName;
  executorName;
  constructor(jobName, executorName) {
    this.jobName = jobName;
    this.executorName = executorName;
  }
}
class SubmittedJob {
  job;
  jobId;
  constructor(job, jobId) {
    this.job = job;
    this.jobId = jobId;
  }
}

const PG_BOSS_EXECUTOR_NAME = Symbol("PgBoss");
function createJobDefinition({ jobName, defaultJobOptions, jobSchedule, entities }) {
  return new PgBossJob(jobName, defaultJobOptions, entities, jobSchedule);
}
function registerJob({ job, jobFn }) {
  pgBossStarted.then(async (boss) => {
    await boss.offWork(job.jobName);
    await boss.work(job.jobName, pgBossCallbackWrapper(jobFn, job.entities));
    if (job.jobSchedule) {
      const options = {
        ...job.defaultJobOptions,
        ...job.jobSchedule.options
      };
      await boss.schedule(job.jobName, job.jobSchedule.cron, job.jobSchedule.args, options);
    }
  });
}
class PgBossJob extends Job {
  defaultJobOptions;
  startAfter;
  entities;
  jobSchedule;
  constructor(jobName, defaultJobOptions, entities, jobSchedule, startAfter) {
    super(jobName, PG_BOSS_EXECUTOR_NAME);
    this.defaultJobOptions = defaultJobOptions;
    this.entities = entities;
    this.jobSchedule = jobSchedule;
    this.startAfter = startAfter;
  }
  delay(startAfter) {
    return new PgBossJob(this.jobName, this.defaultJobOptions, this.entities, this.jobSchedule, startAfter);
  }
  async submit(jobArgs, jobOptions = {}) {
    const boss = await pgBossStarted;
    const jobId = await boss.send(this.jobName, jobArgs, {
      ...this.defaultJobOptions,
      ...this.startAfter && { startAfter: this.startAfter },
      ...jobOptions
    });
    return new PgBossSubmittedJob(boss, this, jobId);
  }
}
class PgBossSubmittedJob extends SubmittedJob {
  pgBoss;
  constructor(boss, job, jobId) {
    super(job, jobId);
    this.pgBoss = {
      cancel: () => boss.cancel(jobId),
      resume: () => boss.resume(jobId),
      // Coarcing here since pg-boss typings are not precise enough.
      details: () => boss.getJobById(jobId)
    };
  }
}
function pgBossCallbackWrapper(jobFn, entities) {
  return (args) => {
    const context = { entities };
    return jobFn(args.data, context);
  };
}

const PLAUSIBLE_API_KEY = process.env.PLAUSIBLE_API_KEY;
const PLAUSIBLE_SITE_ID = process.env.PLAUSIBLE_SITE_ID;
const PLAUSIBLE_BASE_URL = process.env.PLAUSIBLE_BASE_URL;
const headers = {
  "Content-Type": "application/json",
  Authorization: `Bearer ${PLAUSIBLE_API_KEY}`
};
async function getDailyPageViews() {
  const totalViews = await getTotalPageViews();
  const prevDayViewsChangePercent = await getPrevDayViewsChangePercent();
  return {
    totalViews,
    prevDayViewsChangePercent
  };
}
async function getTotalPageViews() {
  const response = await fetch(
    `${PLAUSIBLE_BASE_URL}/v1/stats/aggregate?site_id=${PLAUSIBLE_SITE_ID}&metrics=pageviews`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${PLAUSIBLE_API_KEY}`
      }
    }
  );
  if (!response.ok) {
    throw new Error(`HTTP error! Status: ${response.status}`);
  }
  const json = await response.json();
  return json.results.pageviews.value;
}
async function getPrevDayViewsChangePercent() {
  const today = /* @__PURE__ */ new Date();
  const yesterday = new Date(today.setDate(today.getDate() - 1)).toISOString().split("T")[0];
  const dayBeforeYesterday = new Date((/* @__PURE__ */ new Date()).setDate((/* @__PURE__ */ new Date()).getDate() - 2)).toISOString().split("T")[0];
  const pageViewsYesterday = await getPageviewsForDate(yesterday);
  const pageViewsDayBeforeYesterday = await getPageviewsForDate(dayBeforeYesterday);
  console.table({
    pageViewsYesterday,
    pageViewsDayBeforeYesterday,
    typeY: typeof pageViewsYesterday,
    typeDBY: typeof pageViewsDayBeforeYesterday
  });
  let change = 0;
  if (pageViewsYesterday === 0 || pageViewsDayBeforeYesterday === 0) {
    return "0";
  } else {
    change = (pageViewsYesterday - pageViewsDayBeforeYesterday) / pageViewsDayBeforeYesterday * 100;
  }
  return change.toFixed(0);
}
async function getPageviewsForDate(date) {
  const url = `${PLAUSIBLE_BASE_URL}/v1/stats/aggregate?site_id=${PLAUSIBLE_SITE_ID}&period=day&date=${date}&metrics=pageviews`;
  const response = await fetch(url, {
    method: "GET",
    headers
  });
  if (!response.ok) {
    throw new Error(`HTTP error! Status: ${response.status}`);
  }
  const data = await response.json();
  return data.results.pageviews.value;
}
async function getSources() {
  const url = `${PLAUSIBLE_BASE_URL}/v1/stats/breakdown?site_id=${PLAUSIBLE_SITE_ID}&property=visit:source&metrics=visitors`;
  const response = await fetch(url, {
    method: "GET",
    headers
  });
  if (!response.ok) {
    throw new Error(`HTTP error! Status: ${response.status}`);
  }
  const data = await response.json();
  return data.results;
}

const calculateDailyStats = async (_args, context) => {
  const nowUTC = new Date(Date.now());
  nowUTC.setUTCHours(0, 0, 0, 0);
  const yesterdayUTC = new Date(nowUTC);
  yesterdayUTC.setUTCDate(yesterdayUTC.getUTCDate() - 1);
  try {
    const yesterdaysStats = await context.entities.DailyStats.findFirst({
      where: {
        date: {
          equals: yesterdayUTC
        }
      }
    });
    const userCount = await context.entities.User.count({});
    const paidUserCount = await context.entities.User.count({
      where: {
        subscriptionStatus: SubscriptionStatus.Active
      }
    });
    let userDelta = userCount;
    let paidUserDelta = paidUserCount;
    if (yesterdaysStats) {
      userDelta -= yesterdaysStats.userCount;
      paidUserDelta -= yesterdaysStats.paidUserCount;
    }
    let totalRevenue;
    switch (paymentProcessor.id) {
      case "stripe":
        totalRevenue = await fetchTotalStripeRevenue();
        break;
      case "lemonsqueezy":
        totalRevenue = await fetchTotalLemonSqueezyRevenue();
        break;
      default:
        throw new Error(`Unsupported payment processor: ${paymentProcessor.id}`);
    }
    const { totalViews, prevDayViewsChangePercent } = await getDailyPageViews();
    let dailyStats = await context.entities.DailyStats.findUnique({
      where: {
        date: nowUTC
      }
    });
    if (!dailyStats) {
      console.log("No daily stat found for today, creating one...");
      dailyStats = await context.entities.DailyStats.create({
        data: {
          date: nowUTC,
          totalViews,
          prevDayViewsChangePercent,
          userCount,
          paidUserCount,
          userDelta,
          paidUserDelta,
          totalRevenue
        }
      });
    } else {
      console.log("Daily stat found for today, updating it...");
      dailyStats = await context.entities.DailyStats.update({
        where: {
          id: dailyStats.id
        },
        data: {
          totalViews,
          prevDayViewsChangePercent,
          userCount,
          paidUserCount,
          userDelta,
          paidUserDelta,
          totalRevenue
        }
      });
    }
    const sources = await getSources();
    for (const source of sources) {
      let visitors = source.visitors;
      if (typeof source.visitors !== "number") {
        visitors = parseInt(source.visitors);
      }
      await context.entities.PageViewSource.upsert({
        where: {
          date_name: {
            date: nowUTC,
            name: source.source
          }
        },
        create: {
          date: nowUTC,
          name: source.source,
          visitors,
          dailyStatsId: dailyStats.id
        },
        update: {
          visitors
        }
      });
    }
    console.table({ dailyStats });
  } catch (error) {
    console.error("Error calculating daily stats: ", error);
    await context.entities.Logs.create({
      data: {
        message: `Error calculating daily stats: ${error?.message}`,
        level: "job-error"
      }
    });
  }
};
async function fetchTotalStripeRevenue() {
  let totalRevenue = 0;
  let params = {
    limit: 100,
    // created: {
    //   gte: startTimestamp,
    //   lt: endTimestamp
    // },
    type: "charge"
  };
  let hasMore = true;
  while (hasMore) {
    const balanceTransactions = await stripe.balanceTransactions.list(params);
    for (const transaction of balanceTransactions.data) {
      if (transaction.type === "charge") {
        totalRevenue += transaction.amount;
      }
    }
    if (balanceTransactions.has_more) {
      params.starting_after = balanceTransactions.data[balanceTransactions.data.length - 1].id;
    } else {
      hasMore = false;
    }
  }
  return totalRevenue / 100;
}
async function fetchTotalLemonSqueezyRevenue() {
  try {
    let totalRevenue = 0;
    let hasNextPage = true;
    let currentPage = 1;
    while (hasNextPage) {
      const { data: response } = await listOrders({
        filter: {
          storeId: process.env.LEMONSQUEEZY_STORE_ID
        },
        page: {
          number: currentPage,
          size: 100
        }
      });
      if (response?.data) {
        for (const order of response.data) {
          totalRevenue += order.attributes.total;
        }
      }
      hasNextPage = !response?.meta?.page.lastPage;
      currentPage++;
    }
    return totalRevenue / 100;
  } catch (error) {
    console.error("Error fetching Lemon Squeezy revenue:", error);
    throw error;
  }
}

const entities = {
  User: dbClient.user,
  DailyStats: dbClient.dailyStats,
  Logs: dbClient.logs,
  PageViewSource: dbClient.pageViewSource
};
const jobSchedule = {
  cron: "0 * * * *",
  options: {}
};
const dailyStatsJob = createJobDefinition({
  jobName: "dailyStatsJob",
  defaultJobOptions: {},
  jobSchedule,
  entities
});

registerJob({
  job: dailyStatsJob,
  jobFn: calculateDailyStats
});

const startServer = async () => {
  await startPgBoss();
  const port = normalizePort(config$1.port);
  app.set("port", port);
  const server = http.createServer(app);
  server.listen(port);
  server.on("error", (error) => {
    if (error.syscall !== "listen") throw error;
    const bind = typeof port === "string" ? "Pipe " + port : "Port " + port;
    switch (error.code) {
      case "EACCES":
        console.error(bind + " requires elevated privileges");
        process.exit(1);
      case "EADDRINUSE":
        console.error(bind + " is already in use");
        process.exit(1);
      default:
        throw error;
    }
  });
  server.on("listening", () => {
    const addr = server.address();
    const bind = typeof addr === "string" ? "pipe " + addr : "port " + addr.port;
    console.log("Server listening on " + bind);
  });
};
startServer().catch((e) => console.error(e));
function normalizePort(val) {
  const port = parseInt(val, 10);
  if (isNaN(port)) return val;
  if (port >= 0) return port;
  return false;
}
//# sourceMappingURL=server.js.map
