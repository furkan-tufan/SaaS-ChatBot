import { type GetVerificationEmailContentFn, type GetPasswordResetEmailContentFn } from 'wasp/server/auth';

export const getVerificationEmailContent: GetVerificationEmailContentFn = ({ verificationLink }) => ({
  subject: 'E-Posta Doğrulama',
  text: `E-postanızı doğrulamak için aşağıdaki bağlantıya tıklayın
: ${verificationLink}`,
  html: `
        <p>E-postanızı doğrulamak için aşağıdaki bağlantıya tıklayın</p>
        <a href="${verificationLink}">E-postayı doğrula</a>
    `,
});

export const getPasswordResetEmailContent: GetPasswordResetEmailContentFn = ({ passwordResetLink }) => ({
  subject: 'Şifre Sıfırlama',
  text: `Şifrenizi sıfırlamak için aşağıdaki bağlantıya tıklayın: ${passwordResetLink}`,
  html: `
        <p>Şifrenizi sıfırlamak için aşağıdaki bağlantıya tıklayın</p>
        <a href="${passwordResetLink}">Şifreyi sıfırla</a>
    `,
});
