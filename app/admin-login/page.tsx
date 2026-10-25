import { signIn } from './actions';

const MESSAGES: Record<string, string> = {
  invalid: 'Email or password is incorrect.',
  not_authorised: 'This account does not have procurement admin access.',
};

export default async function AdminLogin({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  return (
    <div className="mx-auto mt-10 max-w-sm rounded-lg border border-slate-200 bg-white p-8 shadow-sm">
      <h1 className="text-lg font-semibold text-navy">Procurement sign-in</h1>
      {error && MESSAGES[error] && (
        <p role="alert" className="mt-3 rounded-md bg-rose-50 p-3 text-sm text-rose-800">
          {MESSAGES[error]}
        </p>
      )}
      <form action={signIn} className="mt-6 space-y-4">
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-slate-700">Email</span>
          <input name="email" type="email" required autoComplete="email" className="w-full rounded-md border border-slate-300 px-3 py-2" />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-slate-700">Password</span>
          <input name="password" type="password" required autoComplete="current-password" className="w-full rounded-md border border-slate-300 px-3 py-2" />
        </label>
        <button type="submit" className="w-full rounded-md bg-navy px-4 py-2.5 font-semibold text-white hover:bg-navy-700">
          Sign in
        </button>
      </form>
    </div>
  );
}
