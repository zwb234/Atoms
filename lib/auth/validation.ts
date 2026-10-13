export type Credentials = {
  email: string;
  password: string;
};

export type CredentialErrors = Partial<Record<keyof Credentials, string>>;

export function validateCredentials(credentials: Credentials): CredentialErrors {
  const errors: CredentialErrors = {};
  const email = credentials.email.trim();

  if (!email) {
    errors.email = "请输入邮箱";
  } else if (!/^\S+@\S+\.\S+$/.test(email)) {
    errors.email = "请输入有效邮箱";
  }

  if (!credentials.password) {
    errors.password = "请输入密码";
  } else if (credentials.password.length < 6) {
    errors.password = "密码至少 6 位";
  }

  return errors;
}
