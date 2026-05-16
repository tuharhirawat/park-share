export type AuthProvider =
  | "email"
  | "google"
  | "github"
  | "apple"
  | "phone";

type AuthProviderConfig = {
  enabled: boolean;
  label: string;
};

export const AUTH_CONFIG: Record<
  AuthProvider,
  AuthProviderConfig
> = {

  /*
    =====================================================
    AUTH PROVIDERS CONFIGURATION
    =====================================================
  */

  email: {
    enabled: false,
    label: "Continue with Email",
  },

  google: {
    enabled: true,
    label: "Continue with Google",
  },

  github: {
    enabled: false,
    label: "Continue with GitHub",
  },

  apple: {
    enabled: false,
    label: "Continue with Apple",
  },

  phone: {
    enabled: false,
    label: "Continue with Phone",
  },

};

/*
  =====================================================
  GET ALL ENABLED PROVIDERS
  =====================================================
*/

export const getEnabledAuthProviders = () => {
  return Object.entries(AUTH_CONFIG)
    .filter(([, config]) => config.enabled)
    .map(([provider]) => provider as AuthProvider);
};

/*
  =====================================================
  CHECK IF SPECIFIC PROVIDER IS ENABLED
  =====================================================
*/

export const isAuthProviderEnabled = (
  provider: AuthProvider,
) => {
  return AUTH_CONFIG[provider].enabled;
};

/*
  =====================================================
  CHECK IF ATLEAST ONE AUTH PROVIDER IS ENABLED
  =====================================================
*/

export const hasAnyAuthProvider = () => {
  return getEnabledAuthProviders().length > 0;
};

/*
  =====================================================
  VALIDATE AUTH CONFIG ON APP START
  =====================================================
*/

export const validateAuthConfig = () => {
  if (!hasAnyAuthProvider()) {
    throw new Error("No auth providers enabled");
  }
};

/*
  =====================================================
  CHECK IF EMAIL AUTH EXISTS
  =====================================================

  Email auth means:
  - login and signup page
  - email/password flow
*/

export const hasEmailAuth = () => {
  return isAuthProviderEnabled("email");
};

/*
  =====================================================
  CHECK IF PHONE AUTH EXISTS
  =====================================================

  Phone auth means:
  - phone number / OTP flow
*/

export const hasPhoneAuth = () => {
  return isAuthProviderEnabled("phone");
};

/*
  =====================================================
  CHECK IF SOCIAL/OAUTH AUTH EXISTS
  =====================================================

  Includes:
  - Google
  - GitHub
  - Apple
*/

export const hasSocialAuth = () => {
  return ["google", "github", "apple"]
    .some(
      provider =>
        isAuthProviderEnabled(
          provider as AuthProvider
        )
    );
};

/*
  =====================================================
  SOCIAL AND PHONE AUTH COMBINATION
  =====================================================
*/

export const hasAlternativeAuth = () => {
  return (
    hasSocialAuth() ||
    hasPhoneAuth()
  );
};

/*
  =====================================================
  NON EMAIL MODE
  =====================================================

  TRUE when:
  - social auth exists
  - phone auth enabled
  - email auth disabled

  Example:
  Google only
  GitHub only
  Google + Apple
*/

export const isDirectAuthMode = () => {
  return (
    hasAlternativeAuth() &&
    !hasEmailAuth()
  );
};

/*
  =====================================================
  MIXED AUTH MODE
  =====================================================

  TRUE when:
  - email auth enabled
  - social auth enabled

  Example:
  Email + Google
  Email + GitHub
*/

export const isMixedAuthMode = () => {
  return (
    hasEmailAuth() &&
    hasAlternativeAuth()
  );
};

/*
  =====================================================
  EMAIL ONLY MODE
  =====================================================
*/

export const isEmailOnlyMode = () => {
  return (
    hasEmailAuth() &&
    !hasAlternativeAuth()
  );
};

/*
  =====================================================
  GET DYNAMICALLY LOGIN ROUTE
  =====================================================
*/

export const getLoginRoute = () => {

  if (hasEmailAuth()) {
    return "/login";
  }

  return "/";
};