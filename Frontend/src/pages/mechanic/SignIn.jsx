import { AuthLayout } from '../../components/auth/AuthLayout';
import { SignIn as SharedSignIn } from '../SignIn';

export function SignIn() {
  return <AuthLayout role="mechanic"><SharedSignIn role="mechanic" /></AuthLayout>;
}
