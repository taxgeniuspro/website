/**
 * Email Template Translations
 *
 * Centralized translation system for email templates.
 * Each email can import and use these translations based on locale.
 */

export type Locale = 'en' | 'es';

/**
 * Get translated text based on locale
 */
export function t(translations: { en: string; es: string }, locale: Locale = 'en'): string {
  return translations[locale] || translations.en;
}

/**
 * Common email translations used across multiple templates
 */
export const commonTranslations = {
  // Buttons
  viewDashboard: {
    en: 'View Dashboard',
    es: 'Ver Panel de Control',
  },
  emailClient: {
    en: 'Email Client',
    es: 'Enviar Correo',
  },
  callClient: {
    en: 'Call Client',
    es: 'Llamar Cliente',
  },
  replyViaEmail: {
    en: 'Reply via Email',
    es: 'Responder por Correo',
  },
  callNow: {
    en: 'Call Now',
    es: 'Llamar Ahora',
  },

  // Common labels
  name: {
    en: 'Name',
    es: 'Nombre',
  },
  email: {
    en: 'Email',
    es: 'Correo Electrónico',
  },
  phone: {
    en: 'Phone',
    es: 'Teléfono',
  },
  source: {
    en: 'Source',
    es: 'Fuente',
  },
  message: {
    en: 'Message',
    es: 'Mensaje',
  },
  submitted: {
    en: 'Submitted',
    es: 'Enviado',
  },

  // Service types
  services: {
    individual: {
      en: 'Individual Tax Return',
      es: 'Declaración de Impuestos Individual',
    },
    business: {
      en: 'Business Tax Return',
      es: 'Declaración de Impuestos Comercial',
    },
    'real-estate': {
      en: 'Real Estate Professional',
      es: 'Profesional de Bienes Raíces',
    },
    'audit-defense': {
      en: 'Audit Defense',
      es: 'Defensa de Auditoría',
    },
    'tax-planning': {
      en: 'Tax Planning',
      es: 'Planificación Fiscal',
    },
    'tax-consultation': {
      en: 'Tax Consultation',
      es: 'Consulta Fiscal',
    },
    'tax-intake': {
      en: 'Tax Intake',
      es: 'Formulario de Impuestos',
    },
  },

  // Filing status
  filingStatus: {
    single: {
      en: 'Single',
      es: 'Soltero(a)',
    },
    married_filing_separately: {
      en: 'Married Filing Separately',
      es: 'Casado(a) Declarando por Separado',
    },
    married_filing_jointly: {
      en: 'Married Filing Jointly',
      es: 'Casado(a) Declarando Conjuntamente',
    },
    head_of_household: {
      en: 'Head of Household',
      es: 'Jefe de Familia',
    },
    qualifying_widow: {
      en: 'Qualifying Widow(er)',
      es: 'Viudo(a) Calificado(a)',
    },
  },

  // Employment types
  employment: {
    w2: {
      en: 'W-2',
      es: 'W-2',
    },
    '1099': {
      en: '1099',
      es: '1099',
    },
    both: {
      en: 'W-2 & 1099',
      es: 'W-2 y 1099',
    },
  },

  // Yes/No
  yes: {
    en: 'Yes',
    es: 'Sí',
  },
  no: {
    en: 'No',
    es: 'No',
  },

  // Copyright
  copyright: {
    en: '© 2025 TaxGeniusPro',
    es: '© 2025 TaxGeniusPro',
  },
};

/**
 * Contact Form Notification Translations
 */
export const contactFormTranslations = {
  title: {
    en: '📬 New Contact Form Submission',
    es: '📬 Nuevo Formulario de Contacto',
  },
  urgentBanner: {
    en: '⏰ New inquiry received - Respond within 2 hours for best conversion',
    es: '⏰ Nueva consulta recibida - Responda en 2 horas para mejor conversión',
  },
  contactInformation: {
    en: '📞 Contact Information',
    es: '📞 Información de Contacto',
  },
  messageLabel: {
    en: '💬 Message',
    es: '💬 Mensaje',
  },
  submittedLabel: {
    en: 'Submitted',
    es: 'Enviado',
  },
  sourceLabel: {
    en: 'Source',
    es: 'Fuente',
  },
  sourcePage: {
    en: 'TaxGeniusPro Contact Page',
    es: 'Página de Contacto TaxGeniusPro',
  },
  recommendedActions: {
    en: '⚡ Recommended Actions',
    es: '⚡ Acciones Recomendadas',
  },
  action1: {
    en: 'Respond within 2 hours for highest conversion rate',
    es: 'Responda en 2 horas para mayor tasa de conversión',
  },
  action2: {
    en: 'Call {phone} if provided for immediate connection',
    es: 'Llame a {phone} si está disponible para conexión inmediata',
  },
  action2NoPhone: {
    en: 'Call the prospect if phone provided for immediate connection',
    es: 'Llame al prospecto si el teléfono está disponible',
  },
  action3: {
    en: 'Send personalized email addressing their {service}',
    es: 'Envíe correo personalizado sobre {service}',
  },
  action4: {
    en: 'Create CRM record if not exists',
    es: 'Crear registro CRM si no existe',
  },
  action5: {
    en: 'Schedule follow-up if no response within 24 hours',
    es: 'Programe seguimiento si no hay respuesta en 24 horas',
  },
  quickReplyTitle: {
    en: '📧 Quick Reply Template',
    es: '📧 Plantilla de Respuesta Rápida',
  },
  quickReplyTemplate: {
    en: `Hi {firstName},

Thank you for contacting TaxGeniusPro! I received your inquiry about {service}.

I'd love to discuss how we can help. Are you available for a quick call {phoneText}?

Alternatively, you can schedule a consultation at your convenience: https://taxgeniuspro.tax/book-appointment

Looking forward to helping you!

Best regards,
TaxGeniusPro Team`,
    es: `Hola {firstName},

¡Gracias por contactar a TaxGeniusPro! Recibí su consulta sobre {service}.

Me encantaría discutir cómo podemos ayudarle. ¿Está disponible para una llamada rápida {phoneText}?

Alternativamente, puede programar una consulta cuando le convenga: https://taxgeniuspro.tax/book-appointment

¡Esperamos poder ayudarle!

Saludos cordiales,
Equipo TaxGeniusPro`,
  },
  atPhone: {
    en: 'at {phone}',
    es: 'al {phone}',
  },
  thisWeek: {
    en: 'this week',
    es: 'esta semana',
  },
  notificationSentTo: {
    en: 'This notification was sent to {email}',
    es: 'Esta notificación fue enviada a {email}',
  },
};

/**
 * Tax Intake Complete Translations
 */
export const taxIntakeTranslations = {
  title: {
    en: 'Complete Tax Intake Received',
    es: 'Formulario de Impuestos Completo Recibido',
  },
  greeting: {
    en: 'Hi {name},',
    es: 'Hola {name},',
  },
  subtext: {
    en: 'Client ready for tax preparation',
    es: 'Cliente listo para preparación de impuestos',
  },
  clientInformation: {
    en: 'CLIENT INFORMATION',
    es: 'INFORMACIÓN DEL CLIENTE',
  },
  address: {
    en: 'ADDRESS',
    es: 'DIRECCIÓN',
  },
  taxFiling: {
    en: 'TAX FILING',
    es: 'DECLARACIÓN DE IMPUESTOS',
  },
  filingStatus: {
    en: 'Filing Status',
    es: 'Estado de Declaración',
  },
  employment: {
    en: 'Employment',
    es: 'Empleo',
  },
  occupation: {
    en: 'Occupation',
    es: 'Ocupación',
  },
  claimedAsDependent: {
    en: 'Claimed as Dependent',
    es: 'Reclamado como Dependiente',
  },
  inCollege: {
    en: 'Currently in College',
    es: 'Actualmente en Universidad',
  },
  dependents: {
    en: 'DEPENDENTS',
    es: 'DEPENDIENTES',
  },
  number: {
    en: 'Number',
    es: 'Número',
  },
  under24StudentDisabled: {
    en: 'Under 24 / Student / Disabled',
    es: 'Menor de 24 / Estudiante / Discapacitado',
  },
  dependentsInCollege: {
    en: 'In College',
    es: 'En Universidad',
  },
  childCareProvider: {
    en: 'Child Care Provider',
    es: 'Proveedor de Cuidado Infantil',
  },
  propertyCredits: {
    en: 'PROPERTY & CREDITS',
    es: 'PROPIEDAD Y CRÉDITOS',
  },
  hasMortgage: {
    en: 'Has Mortgage',
    es: 'Tiene Hipoteca',
  },
  deniedEitc: {
    en: 'Previously Denied EITC',
    es: 'EITC Denegado Anteriormente',
  },
  irsRefund: {
    en: 'IRS & REFUND',
    es: 'IRS Y REEMBOLSO',
  },
  hasIrsPin: {
    en: 'Has IRS PIN',
    es: 'Tiene PIN del IRS',
  },
  irsPinYes: {
    en: 'Yes ({pin})',
    es: 'Sí ({pin})',
  },
  irsPinLocate: {
    en: 'Yes (Need to Locate)',
    es: 'Sí (Necesita Localizar)',
  },
  wantsRefundAdvance: {
    en: 'Wants Refund Advance',
    es: 'Desea Anticipo de Reembolso',
  },
  identification: {
    en: 'IDENTIFICATION',
    es: 'IDENTIFICACIÓN',
  },
  driversLicense: {
    en: "Driver's License",
    es: 'Licencia de Conducir',
  },
  expiration: {
    en: 'Expiration',
    es: 'Vencimiento',
  },
  referrer: {
    en: 'Referrer',
    es: 'Referente',
  },
  dob: {
    en: 'DOB',
    es: 'Fecha de Nacimiento',
  },
  ssn: {
    en: 'SSN',
    es: 'SSN',
  },
};

/**
 * New Lead Notification Translations
 */
export const newLeadTranslations = {
  title: {
    en: 'New Lead Assigned',
    es: 'Nuevo Cliente Potencial Asignado',
  },
  greeting: {
    en: 'Hi {name},',
    es: 'Hola {name},',
  },
  contactInformation: {
    en: 'Contact Information',
    es: 'Información de Contacto',
  },
  messageLabel: {
    en: 'Message',
    es: 'Mensaje',
  },
  leadId: {
    en: 'Lead ID: {id}',
    es: 'ID de Cliente: {id}',
  },
};

/**
 * Affiliate Application Notification Translations
 */
export const affiliateApplicationTranslations = {
  title: {
    en: '🎯 New Affiliate Application',
    es: '🎯 Nueva Solicitud de Afiliado',
  },
  urgentBanner: {
    en: '⏰ New application requires review - Please respond within 1-2 business days',
    es: '⏰ Nueva solicitud requiere revisión - Por favor responda en 1-2 días hábiles',
  },
  bondingBadge: {
    en: '🔗 Bonding Request',
    es: '🔗 Solicitud de Vinculación',
  },
  contactInformation: {
    en: '📞 Contact Information',
    es: '📞 Información de Contacto',
  },
  marketingProfile: {
    en: '💼 Marketing Profile',
    es: '💼 Perfil de Marketing',
  },
  experience: {
    en: 'Experience',
    es: 'Experiencia',
  },
  targetAudience: {
    en: 'Target Audience',
    es: 'Audiencia Objetivo',
  },
  marketingPlatforms: {
    en: '📱 Marketing Platforms',
    es: '📱 Plataformas de Marketing',
  },
  onlinePresence: {
    en: '🌐 Online Presence',
    es: '🌐 Presencia en Línea',
  },
  website: {
    en: 'Website',
    es: 'Sitio Web',
  },
  socialMedia: {
    en: 'Social Media',
    es: 'Redes Sociales',
  },
  additionalMessage: {
    en: '💬 Additional Message',
    es: '💬 Mensaje Adicional',
  },
  bondingRequestDetails: {
    en: '🔗 Bonding Request Details',
    es: '🔗 Detalles de Solicitud de Vinculación',
  },
  bondingText1: {
    en: 'This applicant has requested to be bonded with Tax Preparer ID:',
    es: 'Este solicitante ha pedido ser vinculado con el Preparador de Impuestos ID:',
  },
  bondingText2: {
    en: 'Please coordinate with the tax preparer to confirm the bonding arrangement.',
    es: 'Por favor coordine con el preparador de impuestos para confirmar el acuerdo de vinculación.',
  },
  applicationDetails: {
    en: '🔍 Application Details',
    es: '🔍 Detalles de Solicitud',
  },
  leadId: {
    en: 'Lead ID',
    es: 'ID de Cliente Potencial',
  },
  submitted: {
    en: 'Submitted',
    es: 'Enviado',
  },
  nextSteps: {
    en: '⚡ Next Steps',
    es: '⚡ Próximos Pasos',
  },
  step1: {
    en: 'Review marketing profile and online presence',
    es: 'Revisar perfil de marketing y presencia en línea',
  },
  step2: {
    en: 'Verify platforms and audience reach',
    es: 'Verificar plataformas y alcance de audiencia',
  },
  step3: {
    en: 'Contact applicant at {phone} or {email}',
    es: 'Contactar solicitante al {phone} o {email}',
  },
  step4: {
    en: 'Coordinate with tax preparer for bonding approval',
    es: 'Coordinar con preparador de impuestos para aprobación de vinculación',
  },
  step5: {
    en: 'Approve or schedule interview if qualified',
    es: 'Aprobar o programar entrevista si está calificado',
  },
  viewInAdminDashboard: {
    en: 'View in Admin Dashboard',
    es: 'Ver en Panel de Administración',
  },
  quickReplyTemplates: {
    en: '📧 Quick Reply Templates',
    es: '📧 Plantillas de Respuesta Rápida',
  },
  toApproveApplication: {
    en: 'To Approve Application',
    es: 'Para Aprobar Solicitud',
  },
  approvalTemplate: {
    en: 'Congratulations! Your affiliate application has been approved. Here\'s your unique affiliate link...',
    es: '¡Felicitaciones! Su solicitud de afiliado ha sido aprobada. Aquí está su enlace de afiliado único...',
  },
  toRequestMoreInfo: {
    en: 'To Request More Info',
    es: 'Para Solicitar Más Información',
  },
  moreInfoTemplate: {
    en: 'Thank you for your application. We\'d like to learn more about your marketing strategy...',
    es: 'Gracias por su solicitud. Nos gustaría aprender más sobre su estrategia de marketing...',
  },
  copyright: {
    en: '© 2025 TaxGeniusPro Affiliate Team',
    es: '© 2025 Equipo de Afiliados TaxGeniusPro',
  },
  emailSentTo: {
    en: 'This email was sent to taxgenius.tax@gmail.com',
    es: 'Este correo fue enviado a taxgenius.tax@gmail.com',
  },
};

/**
 * Affiliate Application Confirmation Translations (sent to applicant)
 */
export const affiliateConfirmationTranslations = {
  title: {
    en: '🎉 Application Received!',
    es: '🎉 ¡Solicitud Recibida!',
  },
  greeting: {
    en: 'Thank you for your interest in the TaxGeniusPro Affiliate Program!',
    es: '¡Gracias por su interés en el Programa de Afiliados de TaxGeniusPro!',
  },
  receivedMessage: {
    en: 'We\'ve received your affiliate application and our team will review it shortly.',
    es: 'Hemos recibido su solicitud de afiliado y nuestro equipo la revisará pronto.',
  },
  whatHappensNext: {
    en: 'What Happens Next?',
    es: '¿Qué Sigue Ahora?',
  },
  step1: {
    en: 'Our affiliate team will review your application within 1-2 business days',
    es: 'Nuestro equipo de afiliados revisará su solicitud en 1-2 días hábiles',
  },
  step2: {
    en: 'We\'ll verify your marketing platforms and audience reach',
    es: 'Verificaremos sus plataformas de marketing y alcance de audiencia',
  },
  step3: {
    en: 'If approved, you\'ll receive your unique affiliate link and marketing materials',
    es: 'Si es aprobado, recibirá su enlace de afiliado único y materiales de marketing',
  },
  step4: {
    en: 'Start earning commissions by referring clients to TaxGeniusPro!',
    es: '¡Comience a ganar comisiones refiriendo clientes a TaxGeniusPro!',
  },
  applicationSummary: {
    en: 'Application Summary',
    es: 'Resumen de Solicitud',
  },
  needHelp: {
    en: 'Need Help?',
    es: '¿Necesita Ayuda?',
  },
  contactUs: {
    en: 'If you have any questions, feel free to contact us at:',
    es: 'Si tiene alguna pregunta, no dude en contactarnos a:',
  },
  copyright: {
    en: '© 2025 TaxGeniusPro',
    es: '© 2025 TaxGeniusPro',
  },
};

/**
 * Tax Preparer Application Notification Translations
 */
export const preparerApplicationTranslations = {
  title: {
    en: '👨‍💼 New Tax Preparer Application',
    es: '👨‍💼 Nueva Solicitud de Preparador de Impuestos',
  },
  urgentBanner: {
    en: '⏰ New preparer application requires review - Please respond within 1-2 business days',
    es: '⏰ Nueva solicitud de preparador requiere revisión - Por favor responda en 1-2 días hábiles',
  },
  contactInformation: {
    en: '📞 Contact Information',
    es: '📞 Información de Contacto',
  },
  fullName: {
    en: 'Full Name',
    es: 'Nombre Completo',
  },
  professionalProfile: {
    en: '💼 Professional Profile',
    es: '💼 Perfil Profesional',
  },
  languages: {
    en: 'Languages',
    es: 'Idiomas',
  },
  experienceLevel: {
    en: 'Experience Level',
    es: 'Nivel de Experiencia',
  },
  experienceLevels: {
    NEW: {
      en: 'New (0-2 years)',
      es: 'Nuevo (0-2 años)',
    },
    INTERMEDIATE: {
      en: 'Intermediate (3-5 years)',
      es: 'Intermedio (3-5 años)',
    },
    SEASONED: {
      en: 'Seasoned (5+ years)',
      es: 'Experimentado (5+ años)',
    },
  },
  taxSoftware: {
    en: 'Tax Software Experience',
    es: 'Experiencia con Software de Impuestos',
  },
  smsConsent: {
    en: 'SMS Consent',
    es: 'Consentimiento de SMS',
  },
  agreed: {
    en: 'Agreed',
    es: 'Aceptado',
  },
  notProvided: {
    en: 'Not Provided',
    es: 'No Proporcionado',
  },
  applicationDetails: {
    en: '🔍 Application Details',
    es: '🔍 Detalles de Solicitud',
  },
  applicationId: {
    en: 'Application ID',
    es: 'ID de Solicitud',
  },
  submitted: {
    en: 'Submitted',
    es: 'Enviado',
  },
  nextSteps: {
    en: '⚡ Next Steps',
    es: '⚡ Próximos Pasos',
  },
  step1: {
    en: 'Review professional qualifications and experience',
    es: 'Revisar calificaciones profesionales y experiencia',
  },
  step2: {
    en: 'Verify tax software proficiency',
    es: 'Verificar competencia con software de impuestos',
  },
  step3: {
    en: 'Contact applicant at {phone} or {email}',
    es: 'Contactar solicitante al {phone} o {email}',
  },
  step4: {
    en: 'Schedule interview and skills assessment',
    es: 'Programar entrevista y evaluación de habilidades',
  },
  step5: {
    en: 'Complete background check and onboarding if approved',
    es: 'Completar verificación de antecedentes e incorporación si es aprobado',
  },
  viewInAdminDashboard: {
    en: 'View in Admin Dashboard',
    es: 'Ver en Panel de Administración',
  },
  quickReplyTemplates: {
    en: '📧 Quick Reply Templates',
    es: '📧 Plantillas de Respuesta Rápida',
  },
  toScheduleInterview: {
    en: 'To Schedule Interview',
    es: 'Para Programar Entrevista',
  },
  interviewTemplate: {
    en: 'Thank you for applying! We\'d like to schedule an interview to discuss your experience and qualifications...',
    es: 'Gracias por aplicar! Nos gustaría programar una entrevista para discutir su experiencia y calificaciones...',
  },
  toRequestDocuments: {
    en: 'To Request Documents',
    es: 'Para Solicitar Documentos',
  },
  documentsTemplate: {
    en: 'Thank you for your application. Please provide the following documents for review...',
    es: 'Gracias por su solicitud. Por favor proporcione los siguientes documentos para revisión...',
  },
  copyright: {
    en: '© 2025 TaxGeniusPro HR Team',
    es: '© 2025 Equipo de RRHH TaxGeniusPro',
  },
  emailSentTo: {
    en: 'This email was sent to taxgenius.tax@gmail.com',
    es: 'Este correo fue enviado a taxgenius.tax@gmail.com',
  },
};

/**
 * Tax Preparer Application Confirmation Translations (sent to applicant)
 */
export const preparerConfirmationTranslations = {
  title: {
    en: '🎉 Application Received!',
    es: '🎉 ¡Solicitud Recibida!',
  },
  greeting: {
    en: 'Thank you for your interest in joining the TaxGeniusPro team!',
    es: '¡Gracias por su interés en unirse al equipo de TaxGeniusPro!',
  },
  receivedMessage: {
    en: 'We\'ve received your tax preparer application and our team will review it shortly.',
    es: 'Hemos recibido su solicitud de preparador de impuestos y nuestro equipo la revisará pronto.',
  },
  whatHappensNext: {
    en: 'What Happens Next?',
    es: '¿Qué Sigue Ahora?',
  },
  step1: {
    en: 'Our HR team will review your application within 1-2 business days',
    es: 'Nuestro equipo de RRHH revisará su solicitud en 1-2 días hábiles',
  },
  step2: {
    en: 'We\'ll verify your experience and qualifications',
    es: 'Verificaremos su experiencia y calificaciones',
  },
  step3: {
    en: 'If qualified, we\'ll schedule an interview and skills assessment',
    es: 'Si está calificado, programaremos una entrevista y evaluación de habilidades',
  },
  step4: {
    en: 'Upon approval, we\'ll conduct a background check and begin onboarding',
    es: 'Una vez aprobado, realizaremos verificación de antecedentes y comenzaremos la incorporación',
  },
  applicationSummary: {
    en: 'Application Summary',
    es: 'Resumen de Solicitud',
  },
  needHelp: {
    en: 'Need Help?',
    es: '¿Necesita Ayuda?',
  },
  contactUs: {
    en: 'If you have any questions, feel free to contact us at:',
    es: 'Si tiene alguna pregunta, no dude en contactarnos a:',
  },
  copyright: {
    en: '© 2025 TaxGeniusPro',
    es: '© 2025 TaxGeniusPro',
  },
};
