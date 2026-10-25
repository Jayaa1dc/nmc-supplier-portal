import RegistrationForm from './RegistrationForm';

export const metadata = { title: 'Supplier Pre-Qualification Application' };

export default function RegisterPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-navy">Supplier Pre-Qualification Application</h1>
        <p className="mt-2 text-sm text-slate-600">
          Form 44/FO/MC/GN/01. Fields marked * are required. Documents may be PDF, JPG, PNG or WEBP,
          up to 10&nbsp;MB each. Your information is treated as confidential by the Supplies Division.
        </p>
      </div>
      <RegistrationForm />
    </div>
  );
}
