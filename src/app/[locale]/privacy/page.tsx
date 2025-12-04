import { getTranslations } from 'next-intl/server';

export async function generateMetadata({ params }: { params: { locale: string } }) {
  const t = await getTranslations({ locale: params.locale, namespace: 'privacy.metadata' });

  return {
    title: t('title'),
    description: t('description'),
  };
}

export default async function PrivacyPage({ params }: { params: { locale: string } }) {
  const t = await getTranslations({ locale: params.locale, namespace: 'privacy' });

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-16 max-w-4xl">
        <h1 className="text-4xl font-bold mb-8">{t('title')}</h1>

        <p className="text-muted-foreground mb-8">
          <strong>{t('lastUpdated')}</strong> {t('lastUpdatedDate')}
        </p>

        <div className="prose prose-gray max-w-none space-y-8">
          {/* Section 1: Information We Collect */}
          <section>
            <h2 className="text-2xl font-semibold mb-4">
              1. {t('sections.informationWeCollect.title')}
            </h2>

            <h3 className="text-xl font-semibold mb-2">
              1.1 {t('sections.informationWeCollect.personalInfo.title')}
            </h3>
            <p className="mb-4">{t('sections.informationWeCollect.personalInfo.description')}</p>
            <ul className="list-disc pl-6 space-y-2 mb-4">
              <li>{t('sections.informationWeCollect.personalInfo.items.item1')}</li>
              <li>{t('sections.informationWeCollect.personalInfo.items.item2')}</li>
              <li>{t('sections.informationWeCollect.personalInfo.items.item3')}</li>
              <li>{t('sections.informationWeCollect.personalInfo.items.item4')}</li>
              <li>{t('sections.informationWeCollect.personalInfo.items.item5')}</li>
            </ul>

            <h3 className="text-xl font-semibold mb-2">
              1.2 {t('sections.informationWeCollect.automaticInfo.title')}
            </h3>
            <p className="mb-4">{t('sections.informationWeCollect.automaticInfo.description')}</p>
            <ul className="list-disc pl-6 space-y-2 mb-4">
              <li>{t('sections.informationWeCollect.automaticInfo.items.item1')}</li>
              <li>{t('sections.informationWeCollect.automaticInfo.items.item2')}</li>
              <li>{t('sections.informationWeCollect.automaticInfo.items.item3')}</li>
              <li>{t('sections.informationWeCollect.automaticInfo.items.item4')}</li>
            </ul>
          </section>

          {/* Section 2: How We Use Your Information */}
          <section>
            <h2 className="text-2xl font-semibold mb-4">2. {t('sections.howWeUseInfo.title')}</h2>
            <p className="mb-4">{t('sections.howWeUseInfo.description')}</p>
            <ul className="list-disc pl-6 space-y-2 mb-4">
              <li>{t('sections.howWeUseInfo.items.item1')}</li>
              <li>{t('sections.howWeUseInfo.items.item2')}</li>
              <li>{t('sections.howWeUseInfo.items.item3')}</li>
              <li>{t('sections.howWeUseInfo.items.item4')}</li>
              <li>{t('sections.howWeUseInfo.items.item5')}</li>
              <li>{t('sections.howWeUseInfo.items.item6')}</li>
            </ul>
          </section>

          {/* Section 3: Information Sharing */}
          <section>
            <h2 className="text-2xl font-semibold mb-4">3. {t('sections.informationSharing.title')}</h2>
            <p className="mb-4">{t('sections.informationSharing.description')}</p>
            <ul className="list-disc pl-6 space-y-2 mb-4">
              <li>
                <strong>{t('sections.informationSharing.items.item1.title')}</strong>{' '}
                {t('sections.informationSharing.items.item1.description')}
              </li>
              <li>
                <strong>{t('sections.informationSharing.items.item2.title')}</strong>{' '}
                {t('sections.informationSharing.items.item2.description')}
              </li>
              <li>
                <strong>{t('sections.informationSharing.items.item3.title')}</strong>{' '}
                {t('sections.informationSharing.items.item3.description')}
              </li>
              <li>
                <strong>{t('sections.informationSharing.items.item4.title')}</strong>{' '}
                {t('sections.informationSharing.items.item4.description')}
              </li>
              <li>
                <strong>{t('sections.informationSharing.items.item5.title')}</strong>{' '}
                {t('sections.informationSharing.items.item5.description')}
              </li>
            </ul>
          </section>

          {/* Section 4: Data Security */}
          <section>
            <h2 className="text-2xl font-semibold mb-4">4. {t('sections.dataSecurity.title')}</h2>
            <p className="mb-4">{t('sections.dataSecurity.description')}</p>
            <ul className="list-disc pl-6 space-y-2 mb-4">
              <li>{t('sections.dataSecurity.items.item1')}</li>
              <li>{t('sections.dataSecurity.items.item2')}</li>
              <li>{t('sections.dataSecurity.items.item3')}</li>
              <li>{t('sections.dataSecurity.items.item4')}</li>
              <li>{t('sections.dataSecurity.items.item5')}</li>
              <li>{t('sections.dataSecurity.items.item6')}</li>
            </ul>
          </section>

          {/* Section 5: Data Retention */}
          <section>
            <h2 className="text-2xl font-semibold mb-4">5. {t('sections.dataRetention.title')}</h2>
            <p className="mb-4">{t('sections.dataRetention.description')}</p>
            <ul className="list-disc pl-6 space-y-2 mb-4">
              <li>{t('sections.dataRetention.items.item1')}</li>
              <li>{t('sections.dataRetention.items.item2')}</li>
              <li>{t('sections.dataRetention.items.item3')}</li>
              <li>{t('sections.dataRetention.items.item4')}</li>
            </ul>
          </section>

          {/* Section 6: Your Rights */}
          <section>
            <h2 className="text-2xl font-semibold mb-4">6. {t('sections.yourRights.title')}</h2>
            <p className="mb-4">{t('sections.yourRights.description')}</p>
            <ul className="list-disc pl-6 space-y-2 mb-4">
              <li>{t('sections.yourRights.items.item1')}</li>
              <li>{t('sections.yourRights.items.item2')}</li>
              <li>{t('sections.yourRights.items.item3')}</li>
              <li>{t('sections.yourRights.items.item4')}</li>
              <li>{t('sections.yourRights.items.item5')}</li>
            </ul>
            <p className="mb-4">
              {t('sections.yourRights.contact')}{' '}
              <a href={`mailto:${t('sections.yourRights.email')}`} className="text-primary hover:underline">
                {t('sections.yourRights.email')}
              </a>
            </p>
          </section>

          {/* Section 7: Cookies and Tracking */}
          <section>
            <h2 className="text-2xl font-semibold mb-4">7. {t('sections.cookiesTracking.title')}</h2>
            <p className="mb-4">{t('sections.cookiesTracking.description')}</p>
            <ul className="list-disc pl-6 space-y-2 mb-4">
              <li>{t('sections.cookiesTracking.items.item1')}</li>
              <li>{t('sections.cookiesTracking.items.item2')}</li>
              <li>{t('sections.cookiesTracking.items.item3')}</li>
              <li>{t('sections.cookiesTracking.items.item4')}</li>
            </ul>
            <p className="mb-4">{t('sections.cookiesTracking.browserControl')}</p>
          </section>

          {/* Section 8: Third-Party Services */}
          <section>
            <h2 className="text-2xl font-semibold mb-4">8. {t('sections.thirdPartyServices.title')}</h2>
            <p className="mb-4">{t('sections.thirdPartyServices.description')}</p>
            <ul className="list-disc pl-6 space-y-2 mb-4">
              <li>
                <strong>{t('sections.thirdPartyServices.items.clerk.name')}</strong>{' '}
                {t('sections.thirdPartyServices.items.clerk.description')} (
                <a
                  href="https://clerk.com/privacy"
                  className="text-primary hover:underline"
                  target="_blank"
                  rel="noopener"
                >
                  {t('sections.thirdPartyServices.items.clerk.linkText')}
                </a>
                )
              </li>
              <li>
                <strong>{t('sections.thirdPartyServices.items.square.name')}</strong>{' '}
                {t('sections.thirdPartyServices.items.square.description')} (
                <a
                  href="https://squareup.com/us/en/legal/general/privacy"
                  className="text-primary hover:underline"
                  target="_blank"
                  rel="noopener"
                >
                  {t('sections.thirdPartyServices.items.square.linkText')}
                </a>
                )
              </li>
              <li>
                <strong>{t('sections.thirdPartyServices.items.resend.name')}</strong>{' '}
                {t('sections.thirdPartyServices.items.resend.description')} (
                <a
                  href="https://resend.com/legal/privacy-policy"
                  className="text-primary hover:underline"
                  target="_blank"
                  rel="noopener"
                >
                  {t('sections.thirdPartyServices.items.resend.linkText')}
                </a>
                )
              </li>
            </ul>
          </section>

          {/* Section 9: Children's Privacy */}
          <section>
            <h2 className="text-2xl font-semibold mb-4">9. {t('sections.childrensPrivacy.title')}</h2>
            <p className="mb-4">{t('sections.childrensPrivacy.description')}</p>
          </section>

          {/* Section 10: Changes to This Policy */}
          <section>
            <h2 className="text-2xl font-semibold mb-4">10. {t('sections.policyChanges.title')}</h2>
            <p className="mb-4">{t('sections.policyChanges.description')}</p>
          </section>

          {/* Section 11: Contact Us */}
          <section>
            <h2 className="text-2xl font-semibold mb-4">11. {t('sections.contactUs.title')}</h2>
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
