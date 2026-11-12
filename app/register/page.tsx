import RegistrationForm from './RegistrationForm';

export const metadata = { title: 'Supplier Pre-Qualification Application | Nawaloka Medical Centre' };

export default function RegisterPage() {
  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Supplier Pre-Qualification Application</h1>
        <p className="si text-xl font-semibold text-slate-700" lang="si">සැපයුම්කරු පූර්ව සුදුසුකම් ඉල්ලුම්පත්‍රය</p>
        <p className="mt-4 max-w-3xl text-base text-slate-700">
          This online form is a copy of the NMC supplier forms: Supplier Questionnaire 44/FO/KM/02, Pre-Qualification Application Form 44/FO/MC/GN/01 and Forms 01 to 04.
          Fields marked <span className="font-bold text-red-600">*</span> are required. Documents may be PDF, JPG, PNG or WEBP, up to 10&nbsp;MB each. Your information is treated as confidential by the Supplies Division.
        </p>
        <p className="si mt-1 max-w-3xl text-base text-slate-600" lang="si">
          මෙම online ආකෘති පත්‍රය NMC සැපයුම්කරු ආකෘති පත්‍ර වල (44/FO/KM/02, 44/FO/MC/GN/01 සහ Form 01 සිට 04 දක්වා) පිටපතකි. <span className="font-bold text-red-600">*</span> ලකුණ ඇති ක්ෂේත්‍ර අනිවාර්යයි. ලේඛන PDF, JPG, PNG හෝ WEBP වර්ගයේ විය යුතු අතර, එකක් උපරිම 10&nbsp;MB
          වේ. ඔබේ තොරතුරු සියල්ල සපයා ගැනීම් අංශය විසින් රහසිගතව තබා ගනී.
        </p>
        <div className="mt-5 max-w-3xl rounded-2xl border border-emerald-300 bg-emerald-50 p-4 text-slate-800">
          <p className="text-[15px]">
            <span className="font-semibold">Prefer the NMC paper forms?</span> Download the fillable PDF form pack, fill it in on your computer, print and sign it, then upload it under
            &ldquo;Filled and signed application forms&rdquo; in section 7.{' '}
            <a href="/forms/NMC_Supplier_Registration_Form_Fillable.pdf" download className="font-semibold text-emerald-900 underline underline-offset-4">Download the form (PDF)</a>
          </p>
          <p className="si mt-1 text-sm text-slate-700" lang="si">
            NMC මුද්‍රිත ආකෘති පත්‍ර වලට කැමති නම්, පුරවන්න පුළුවන් PDF ගොනුව බාගෙන ඔබේ පරිගණකයේ පුරවා, මුද්‍රණය කර අත්සන් කර, 7 වන කොටසේ &ldquo;පුරවා අත්සන් කළ ආකෘති පත්‍ර&rdquo; යටතේ උඩුගත කරන්න.
          </p>
        </div>
      </div>
      <RegistrationForm />
    </div>
  );
}
