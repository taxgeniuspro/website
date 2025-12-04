import { getTranslations } from 'next-intl/server';

export async function generateMetadata({ params }: { params: { locale: string } }) {
  const t = await getTranslations({ locale: params.locale, namespace: 'terms.metadata' });

  return {
    title: t('title'),
    description: t('description'),
  };
}

export default async function TermsPage({ params }: { params: { locale: string } }) {
  const t = await getTranslations({ locale: params.locale, namespace: 'terms' });

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-16 max-w-4xl">
        <h1 className="text-4xl font-bold mb-8">{t('title')}</h1>

        <p className="text-muted-foreground mb-8">
          <strong>{t('lastUpdated')}</strong> {t('lastUpdatedDate')}
        </p>

        <div className="prose prose-gray max-w-none space-y-8">
          {/* Section 1: Acceptance of Terms */}
          <section>
            <h2 className="text-2xl font-semibold mb-4">1. {t('sections.acceptance.title')}</h2>
            <p className="mb-4">{t('sections.acceptance.description')}</p>
          </section>

          {/* Section 2: Service Description */}
          <section>
            <h2 className="text-2xl font-semibold mb-4">2. {t('sections.serviceDescription.title')}</h2>
            <p className="mb-4">{t('sections.serviceDescription.description')}</p>
            <ul className="list-disc pl-6 space-y-2 mb-4">
              <li>{t('sections.serviceDescription.items.item1')}</li>
              <li>{t('sections.serviceDescription.items.item2')}</li>
              <li>{t('sections.serviceDescription.items.item3')}</li>
              <li>{t('sections.serviceDescription.items.item4')}</li>
              <li>{t('sections.serviceDescription.items.item5')}</li>
            </ul>
          </section>

          {/* Section 3: User Accounts */}
          <section>
            <h2 className="text-2xl font-semibold mb-4">3. {t('sections.userAccounts.title')}</h2>

            <h3 className="text-xl font-semibold mb-2">
              3.1 {t('sections.userAccounts.registration.title')}
            </h3>
            <p className="mb-4">{t('sections.userAccounts.registration.description')}</p>
            <ul className="list-disc pl-6 space-y-2 mb-4">
              <li>{t('sections.userAccounts.registration.items.item1')}</li>
              <li>{t('sections.userAccounts.registration.items.item2')}</li>
              <li>{t('sections.userAccounts.registration.items.item3')}</li>
              <li>{t('sections.userAccounts.registration.items.item4')}</li>
            </ul>

            <h3 className="text-xl font-semibold mb-2">
              3.2 {t('sections.userAccounts.accountTypes.title')}
            </h3>
            <ul className="list-disc pl-6 space-y-2 mb-4">
              <li>
                <strong>{t('sections.userAccounts.accountTypes.items.client.label')}</strong>{' '}
                {t('sections.userAccounts.accountTypes.items.client.description')}
              </li>
              <li>
                <strong>{t('sections.userAccounts.accountTypes.items.referrer.label')}</strong>{' '}
                {t('sections.userAccounts.accountTypes.items.referrer.description')}
              </li>
              <li>
                <strong>{t('sections.userAccounts.accountTypes.items.taxPreparer.label')}</strong>{' '}
                {t('sections.userAccounts.accountTypes.items.taxPreparer.description')}
              </li>
              <li>
                <strong>{t('sections.userAccounts.accountTypes.items.admin.label')}</strong>{' '}
                {t('sections.userAccounts.accountTypes.items.admin.description')}
              </li>
            </ul>
          </section>

          {/* Section 4: Tax Filing Services */}
          <section>
            <h2 className="text-2xl font-semibold mb-4">4. {t('sections.taxFilingServices.title')}</h2>

            <h3 className="text-xl font-semibold mb-2">
              4.1 {t('sections.taxFilingServices.accuracyGuarantee.title')}
            </h3>
            <p className="mb-4">{t('sections.taxFilingServices.accuracyGuarantee.description')}</p>
            <ul className="list-disc pl-6 space-y-2 mb-4">
              <li>{t('sections.taxFilingServices.accuracyGuarantee.items.item1')}</li>
              <li>{t('sections.taxFilingServices.accuracyGuarantee.items.item2')}</li>
              <li>{t('sections.taxFilingServices.accuracyGuarantee.items.item3')}</li>
            </ul>
            <p className="mb-4">{t('sections.taxFilingServices.accuracyGuarantee.disclaimer')}</p>

            <h3 className="text-xl font-semibold mb-2">
              4.2 {t('sections.taxFilingServices.maxRefundGuarantee.title')}
            </h3>
            <p className="mb-4">{t('sections.taxFilingServices.maxRefundGuarantee.description')}</p>

            <h3 className="text-xl font-semibold mb-2">
              4.3 {t('sections.taxFilingServices.yourResponsibilities.title')}
            </h3>
            <p className="mb-4">{t('sections.taxFilingServices.yourResponsibilities.description')}</p>
            <ul className="list-disc pl-6 space-y-2 mb-4">
              <li>{t('sections.taxFilingServices.yourResponsibilities.items.item1')}</li>
              <li>{t('sections.taxFilingServices.yourResponsibilities.items.item2')}</li>
              <li>{t('sections.taxFilingServices.yourResponsibilities.items.item3')}</li>
              <li>{t('sections.taxFilingServices.yourResponsibilities.items.item4')}</li>
            </ul>
          </section>

          {/* Section 5: Referral Program */}
          <section>
            <h2 className="text-2xl font-semibold mb-4">5. {t('sections.referralProgram.title')}</h2>

            <h3 className="text-xl font-semibold mb-2">
              5.1 {t('sections.referralProgram.eligibility.title')}
            </h3>
            <p className="mb-4">{t('sections.referralProgram.eligibility.description')}</p>
            <ul className="list-disc pl-6 space-y-2 mb-4">
              <li>{t('sections.referralProgram.eligibility.items.item1')}</li>
              <li>{t('sections.referralProgram.eligibility.items.item2')}</li>
              <li>{t('sections.referralProgram.eligibility.items.item3')}</li>
            </ul>

            <h3 className="text-xl font-semibold mb-2">
              5.2 {t('sections.referralProgram.commissionStructure.title')}
            </h3>
            <ul className="list-disc pl-6 space-y-2 mb-4">
              <li>{t('sections.referralProgram.commissionStructure.items.basic')}</li>
              <li>{t('sections.referralProgram.commissionStructure.items.standard')}</li>
              <li>{t('sections.referralProgram.commissionStructure.items.premium')}</li>
              <li>{t('sections.referralProgram.commissionStructure.items.deluxe')}</li>
            </ul>

            <h3 className="text-xl font-semibold mb-2">
              5.3 {t('sections.referralProgram.commissionPayment.title')}
            </h3>
            <p className="mb-4">{t('sections.referralProgram.commissionPayment.description')}</p>
            <ul className="list-disc pl-6 space-y-2 mb-4">
              <li>{t('sections.referralProgram.commissionPayment.items.item1')}</li>
              <li>{t('sections.referralProgram.commissionPayment.items.item2')}</li>
              <li>{t('sections.referralProgram.commissionPayment.items.item3')}</li>
              <li>{t('sections.referralProgram.commissionPayment.items.item4')}</li>
            </ul>

            <h3 className="text-xl font-semibold mb-2">
              5.4 {t('sections.referralProgram.prohibitedActivities.title')}
            </h3>
            <p className="mb-4">{t('sections.referralProgram.prohibitedActivities.description')}</p>
            <ul className="list-disc pl-6 space-y-2 mb-4">
              <li>{t('sections.referralProgram.prohibitedActivities.items.item1')}</li>
              <li>{t('sections.referralProgram.prohibitedActivities.items.item2')}</li>
              <li>{t('sections.referralProgram.prohibitedActivities.items.item3')}</li>
              <li>{t('sections.referralProgram.prohibitedActivities.items.item4')}</li>
              <li>{t('sections.referralProgram.prohibitedActivities.items.item5')}</li>
            </ul>
            <p className="mb-4">{t('sections.referralProgram.prohibitedActivities.violation')}</p>
          </section>

          {/* Section 6: Tax Preparer Terms */}
          <section>
            <h2 className="text-2xl font-semibold mb-4">6. {t('sections.taxPreparerTerms.title')}</h2>

            <h3 className="text-xl font-semibold mb-2">
              6.1 {t('sections.taxPreparerTerms.certification.title')}
            </h3>
            <p className="mb-4">{t('sections.taxPreparerTerms.certification.description')}</p>
            <ul className="list-disc pl-6 space-y-2 mb-4">
              <li>{t('sections.taxPreparerTerms.certification.items.item1')}</li>
              <li>{t('sections.taxPreparerTerms.certification.items.item2')}</li>
              <li>{t('sections.taxPreparerTerms.certification.items.item3')}</li>
              <li>{t('sections.taxPreparerTerms.certification.items.item4')}</li>
            </ul>

            <h3 className="text-xl font-semibold mb-2">
              6.2 {t('sections.taxPreparerTerms.professionalStandards.title')}
            </h3>
            <p className="mb-4">{t('sections.taxPreparerTerms.professionalStandards.description')}</p>
            <ul className="list-disc pl-6 space-y-2 mb-4">
              <li>{t('sections.taxPreparerTerms.professionalStandards.items.item1')}</li>
              <li>{t('sections.taxPreparerTerms.professionalStandards.items.item2')}</li>
              <li>{t('sections.taxPreparerTerms.professionalStandards.items.item3')}</li>
              <li>{t('sections.taxPreparerTerms.professionalStandards.items.item4')}</li>
            </ul>
          </section>

          {/* Section 7: Payments and Refunds */}
          <section>
            <h2 className="text-2xl font-semibold mb-4">7. {t('sections.paymentsRefunds.title')}</h2>

            <h3 className="text-xl font-semibold mb-2">
              7.1 {t('sections.paymentsRefunds.paymentProcessing.title')}
            </h3>
            <p className="mb-4">{t('sections.paymentsRefunds.paymentProcessing.description')}</p>

            <h3 className="text-xl font-semibold mb-2">7.2 {t('sections.paymentsRefunds.pricing.title')}</h3>
            <p className="mb-4">{t('sections.paymentsRefunds.pricing.description')}</p>

            <h3 className="text-xl font-semibold mb-2">
              7.3 {t('sections.paymentsRefunds.refundPolicy.title')}
            </h3>
            <p className="mb-4">{t('sections.paymentsRefunds.refundPolicy.description')}</p>
            <ul className="list-disc pl-6 space-y-2 mb-4">
              <li>{t('sections.paymentsRefunds.refundPolicy.items.item1')}</li>
              <li>{t('sections.paymentsRefunds.refundPolicy.items.item2')}</li>
              <li>{t('sections.paymentsRefunds.refundPolicy.items.item3')}</li>
            </ul>
            <p className="mb-4">{t('sections.paymentsRefunds.refundPolicy.storePolicy')}</p>
          </section>

          {/* Section 8: Intellectual Property */}
          <section>
            <h2 className="text-2xl font-semibold mb-4">8. {t('sections.intellectualProperty.title')}</h2>
            <p className="mb-4">{t('sections.intellectualProperty.description')}</p>
            <p className="mb-4">{t('sections.intellectualProperty.disclaimer')}</p>
          </section>

          {/* Section 9: Limitation of Liability */}
          <section>
            <h2 className="text-2xl font-semibold mb-4">9. {t('sections.limitationOfLiability.title')}</h2>
            <p className="mb-4">{t('sections.limitationOfLiability.description')}</p>
            <ul className="list-disc pl-6 space-y-2 mb-4">
              <li>{t('sections.limitationOfLiability.items.item1')}</li>
              <li>{t('sections.limitationOfLiability.items.item2')}</li>
              <li>{t('sections.limitationOfLiability.items.item3')}</li>
              <li>{t('sections.limitationOfLiability.items.item4')}</li>
            </ul>
          </section>

          {/* Section 10: Indemnification */}
          <section>
            <h2 className="text-2xl font-semibold mb-4">10. {t('sections.indemnification.title')}</h2>
            <p className="mb-4">{t('sections.indemnification.description')}</p>
            <ul className="list-disc pl-6 space-y-2 mb-4">
              <li>{t('sections.indemnification.items.item1')}</li>
              <li>{t('sections.indemnification.items.item2')}</li>
              <li>{t('sections.indemnification.items.item3')}</li>
              <li>{t('sections.indemnification.items.item4')}</li>
            </ul>
          </section>

          {/* Section 11: Termination */}
          <section>
            <h2 className="text-2xl font-semibold mb-4">11. {t('sections.termination.title')}</h2>
            <p className="mb-4">{t('sections.termination.description')}</p>
            <ul className="list-disc pl-6 space-y-2 mb-4">
              <li>{t('sections.termination.items.item1')}</li>
              <li>{t('sections.termination.items.item2')}</li>
              <li>{t('sections.termination.items.item3')}</li>
              <li>{t('sections.termination.items.item4')}</li>
            </ul>
            <p className="mb-4">{t('sections.termination.userTermination')}</p>
          </section>

          {/* Section 12: Governing Law */}
          <section>
            <h2 className="text-2xl font-semibold mb-4">12. {t('sections.governingLaw.title')}</h2>
            <p className="mb-4">{t('sections.governingLaw.description')}</p>
          </section>

          {/* Section 13: Changes to Terms */}
          <section>
            <h2 className="text-2xl font-semibold mb-4">13. {t('sections.changesToTerms.title')}</h2>
            <p className="mb-4">{t('sections.changesToTerms.description')}</p>
          </section>

          {/* Section 14: Contact Us */}
          <section>
            <h2 className="text-2xl font-semibold mb-4">14. {t('sections.contactUs.title')}</h2>
            <p className="mb-4">{t('sections.contactUs.description')}</p>
            <ul className="list-none space-y-2 mb-4">
              <li>
                <strong>{t('sections.contactUs.email.label')}</strong>{' '}
                <a
                  href={`mailto:${t('sections.contactUs.email.value')}`}
                  className="text-primary hover:underline"
                >
                  {t('sections.contactUs.email.value')}
                </a>
              </li>
              <li>
                <strong>{t('sections.contactUs.support.label')}</strong>{' '}
                <a
                  href={`mailto:${t('sections.contactUs.support.value')}`}
                  className="text-primary hover:underline"
                >
                  {t('sections.contactUs.support.value')}
                </a>
              </li>
              <li>
                <strong>{t('sections.contactUs.address.label')}</strong>{' '}
                {t('sections.contactUs.address.value')}
              </li>
            </ul>
          </section>

          {/* Disclaimer */}
          <section className="mt-12 p-6 bg-muted rounded-lg">
            <p className="text-sm text-muted-foreground">
              <strong>{t('disclaimer.note')}</strong> {t('disclaimer.text')}
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
