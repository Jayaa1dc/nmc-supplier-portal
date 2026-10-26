import RegistrationForm from './RegistrationForm';

export const metadata = { title: 'Supplier Pre-Qualification Application' };

export default function RegisterPage() {
  return (
    <div className="space-y-8">
      <div>
        <p className="label">Form 44/FO/MC/GN/01</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight">Supplier Pre-Qualification Application</h1>
        <p className="mt-2 max-w-2xl text-sm text-zinc-500">
          Fields marked * are required. Documents may be PDF, JPG, PNG or WEBP,
          up to 10&nbsp;MB each. Your information is treated as confidential by the Supplies Division.
        </p>
      </div>
      <RegistrationForm />
    </div>
  );
}
