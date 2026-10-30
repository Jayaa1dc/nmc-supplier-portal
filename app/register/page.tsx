import RegistrationForm from './RegistrationForm';

export const metadata = { title: 'Supplier Pre-Qualification Application | Nawaloka Medical Centre' };

export default function RegisterPage() {
  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Supplier Pre-Qualification Application</h1>
        <p className="si text-xl font-semibold text-slate-700" lang="si">සැපයුම්කරු පූර්ව සුදුසුකම් ඉල්ලුම්පත්‍රය</p>
        <p className="mt-4 max-w-3xl text-base text-slate-700">
          Form 44/FO/MC/GN/01. Fields marked <span className="font-bold text-red-600">*</span> are required. Documents may be PDF, JPG,
          PNG or WEBP, up to 10&nbsp;MB each. Your information is treated as confidential by the Supplies Division.
        </p>
        <p className="si mt-1 max-w-3xl text-base text-slate-600" lang="si">
          <span className="font-bold text-red-600">*</span> ලකුණ ඇති ක්ෂේත්‍ර අනිවාර්යයි. ලේඛන PDF, JPG, PNG හෝ WEBP වර්ගයේ විය යුතු අතර, එකක් උපරිම 10&nbsp;MB
          වේ. ඔබේ තොරතුරු සියල්ල සපයා ගැනීම් අංශය විසින් රහසිගතව තබා ගනී.
        </p>
      </div>
      <RegistrationForm />
    </div>
  );
}
