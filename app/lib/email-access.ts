const ALLOWED_EMAIL_DOMAINS = new Set(["gmail.com"]);

type EmailAddressLike = {
  id?: string | null;
  emailAddress?: string | null;
};

type UserEmailLike = {
  primaryEmailAddressId?: string | null;
  emailAddresses?: EmailAddressLike[] | null;
};

export function isAllowedSignupEmail(email: string | null | undefined) {
  const normalized = email?.trim().toLowerCase();
  if (!normalized) {
    return false;
  }

  const domain = normalized.split("@").pop();
  return Boolean(domain && ALLOWED_EMAIL_DOMAINS.has(domain));
}

export function getPrimaryEmailAddress(user: UserEmailLike) {
  const primaryEmailId = user.primaryEmailAddressId;
  return (
    user.emailAddresses?.find((email) => email.id === primaryEmailId)
      ?.emailAddress ??
    user.emailAddresses?.[0]?.emailAddress ??
    null
  );
}

export const allowedEmailDomainsLabel = "gmail.com";
