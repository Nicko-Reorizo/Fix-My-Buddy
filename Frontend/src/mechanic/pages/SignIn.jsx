import { AuthLayout } from '../../../customer-side/src/components/auth/AuthLayout';
import { SignIn as SharedSignIn } from '../../../customer-side/src/pages/auth/SignIn';

export function SignIn() {
  return <AuthLayout role="mechanic"><SharedSignIn role="mechanic" /></AuthLayout>;
}
