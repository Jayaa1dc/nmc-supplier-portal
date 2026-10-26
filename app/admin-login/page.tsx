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
    <div className="card mx-auto mt-10 max-w-sm p-8">
      <p className="label">NMC Procurement</p>
      <h1 className="mt-1 text-xl font-bold tracking-tight">Procurement sign-in</h1>
      {error && MESSAGES[error] && (
        <p role="alert" className="mt-4 rounded-xl bg-rose-50 p-3 text-sm text-rose-800">
          {MESSAGES[error]}
        </p>
      )}
      <form action={signIn} className="mt-6 space-y-4">
        <label className="block text-sm">
          <span className="mb-1.5 block font-medium text-zinc-700">Email</span>
          <input name="email" type="email" required autoComplete="email" className="field" />
        </label>
        <label className="block text-sm">
          <span className="mb-1.5 block font-medium text-zinc-700">Password</span>
          <input name="password" type="password" required autoComplete="current-password" className="field" />
        </label>
        <button type="submit" className="btn w-full py-2.5">Sign in</button>
      </form>
    </div>
  );
}
