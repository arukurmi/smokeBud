import { signIn } from '@/auth';

export default function SignIn() {
  return (
    <div className="signin">
      <form action={async () => { 'use server'; await signIn('google', { redirectTo: '/' }); }}>
        <button className="quiet" type="submit">step outside with google</button>
      </form>
      {process.env.E2E_TEST === '1' && (
        <form data-testid="test-login"
          action={async (fd: FormData) => { 'use server';
            await signIn('test-login', { email: String(fd.get('email')), redirectTo: '/' });
          }}>
          <input name="email" placeholder="test email" />
          <button type="submit">test login</button>
        </form>
      )}
    </div>
  );
}
