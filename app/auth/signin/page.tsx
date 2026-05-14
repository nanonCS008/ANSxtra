'use client';

import { getSession, signIn } from 'next-auth/react';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Container } from '@/components/ui/Container';
import { Button } from '@/components/ui/Button';

type UiState = 'checking' | 'redirecting' | 'error';

export default function SignIn() {
  const router = useRouter();
  const [uiState, setUiState] = useState<UiState>('checking');
  const [errorFromQuery, setErrorFromQuery] = useState<string | null>(null);
  const [errorReason, setErrorReason] = useState<string | null>(null);

  const getErrorMessage = useCallback((error: string | null) => {
    if (!error) return null;
    const map: Record<string, string> = {
      AccessDenied:
        'Sign-in was denied. If this keeps happening, try again or contact the school for help.',
      Callback:
        'We couldn’t complete sign-in. Please try again or clear this site’s cookies and retry.',
      OAuthCallback:
        'The sign-in service returned an unexpected response. Check your school Google account and try again.',
      OAuthSignin:
        'Could not start sign-in. Ask your teacher to confirm Google sign-in is configured for this site.',
      OAuthAccountNotLinked:
        'This email is already linked to another sign-in method. Use the same method you used before.',
      google:
        'Google sign-in failed. If you are at school, check that the site is allowed, then try again.',
      MissingIdToken: 'Google did not return a valid sign-in token. Try again in a moment.',
      GoogleAudienceMismatch:
        'The app’s Google sign-in settings don’t match. Ask your teacher to check the environment configuration.',
      SupabaseOAuth:
        'You signed in with Google, but the app couldn’t connect your school account. Ask your teacher to check the database configuration.',
      ProfileLookup:
        'We couldn’t look up your school profile. Ask your teacher to check the student database and service settings.',
      EmailSignin: 'There was a problem with email sign-in.',
      CredentialsSignin: 'Sign in failed.',
      SessionRequired: 'A session is required. Please sign in again.',
    };
    return map[error] ?? error;
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      const session = await getSession();
      if (cancelled) return;

      if (session?.user?.id) {
        const res = await fetch('/api/profile/me', { cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          if (data?.year_group) {
            router.replace('/');
            return;
          }
          router.replace('/profile/setup');
        } else {
          router.replace('/profile/setup');
        }
        return;
      }

      const params = new URLSearchParams(
        typeof window !== 'undefined' ? window.location.search : ''
      );
      const err = params.get('error');
      if (err) {
        if (!cancelled) {
          setErrorFromQuery(err);
          setErrorReason(params.get('reason'));
          setUiState('error');
        }
        return;
      }

      if (!cancelled) {
        setUiState('redirecting');
        const callbackUrl = params.get('callbackUrl') || '/';
        void signIn('google', { callbackUrl });
      }
    }

    void run();
    return () => {
      cancelled = true;
    };
  }, [router]);

  const handleRetrySignIn = async () => {
    setUiState('redirecting');
    const params = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '');
    const callbackUrl = params.get('callbackUrl') || '/';
    void signIn('google', { callbackUrl });
  };

  if (uiState === 'error') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-brand-deep px-4">
        <Container size="narrow" className="w-full max-w-md">
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-6 text-center shadow-xl backdrop-blur">
            <h1 className="text-xl font-semibold text-white mb-2">Couldn’t sign you in</h1>
            <p className="text-white/60 text-sm mb-4">
              {getErrorMessage(errorFromQuery) ?? 'Something went wrong while signing in.'}
              {errorReason && (
                <span className="mt-1 block text-[11px] text-white/40 break-all opacity-80">
                  {errorReason}
                </span>
              )}
            </p>
            <p className="text-white/50 text-xs mb-6">
              Use your <span className="text-white/70">@student.amnuaysilpa.ac.th</span> school Google
              account. If the problem continues, try another browser or ask a teacher.
            </p>
            <Button
              onClick={handleRetrySignIn}
              className="w-full"
              size="lg"
            >
              Continue with Google
            </Button>
          </div>
        </Container>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-brand-deep px-4">
      <div className="text-center text-white/70 text-sm">
        {uiState === 'redirecting' || uiState === 'checking' ? (
          <p>
            {uiState === 'checking' ? 'Checking your session…' : 'Taking you to Google to sign in…'}
          </p>
        ) : null}
      </div>
    </div>
  );
}
