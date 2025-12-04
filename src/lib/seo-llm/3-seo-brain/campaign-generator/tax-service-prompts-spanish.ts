/**
 * SEO Brain - City-Specific Tax Service Content Generation Prompts (SPANISH)
 *
 * Premium Quality (500-word content with 15 FAQs) - EN ESPAÑOL
 * Cultural adaptation for Latino communities (NOT just translation)
 * Uses Ollama for text generation
 * Uses Google Imagen 4 for city hero images
 *
 * Target: Spanish-speaking urban low-medium income families
 */

import type { CityData, TaxServiceSpec, RecruitmentOpportunitySpec } from './tax-service-prompts'

/**
 * Generate city-specific introduction for tax services (500 words) - SPANISH
 * OPTIMIZED FOR: Latino families (Cuban, Mexican, Puerto Rican, etc.)
 */
export function generateTaxServiceIntroPromptSpanish(params: {
  city: CityData
  service: TaxServiceSpec
}): string {
  const { city, service } = params

  return `Eres un experto en redacción publicitaria de servicios fiscales especializado en servir a familias latinas de ingresos bajos a medios.

Escribe una introducción convincente de 500 palabras para Tax Genius Pro dirigida a familias trabajadoras en ${city.name}, ${city.state} que pueden estar perdiendo miles de dólares en reembolsos de impuestos.

AUDIENCIA OBJETIVO:
- Familias latinas hispanohablantes
- Ingreso anual: $20,000-$60,000
- Padres trabajadores con hijos
- Trabajadores por cuenta propia, gig workers, empleados W-2
- Muchos califican para EITC pero no lo reclaman
- Necesitan ayuda fiscal asequible y confiable EN ESPAÑOL

DETALLES DEL SERVICIO:
- Servicio: ${service.serviceName} (Preparación de Impuestos)
- Precio Asequible: $99-$199 (planes de pago disponibles)
${service.averageRefund ? `- Reembolso Promedio: $${service.averageRefund.toLocaleString()}` : ''}
- Experiencia en EITC: Ayudamos a familias a reclamar hasta $8,046 en EITC
- Tiempo de Respuesta: ${service.turnaround}
- Bilingüe: Servicio completo en español
- Enfocado en la Comunidad: Propiedad latina, presencia local
- Especialidades: ${service.specialties?.join(', ') || 'EITC, Crédito Tributario por Hijos, familias trabajadoras'}

CONTEXTO DE LA CIUDAD Y LOS IMPUESTOS:
- Ubicación: ${city.name}, ${city.state}
- Población: ${city.population?.toLocaleString() || 'Área metropolitana importante'}
- Impuesto Estatal: ${city.hasStateTax ? `Sí (tasa del ${city.stateTaxRate}%)` : 'Sin impuesto estatal sobre la renta'}
${city.irsOffice ? `- Oficina del IRS: ${city.irsOffice}` : ''}
- Industrias principales: ${city.industries?.join(', ') || 'economía diversa'}
- Áreas populares: ${city.neighborhoods?.slice(0, 3).join(', ') || 'área metropolitana'}
- Códigos postales atendidos: ${city.zipCodes?.slice(0, 3).join(', ') || 'todos los códigos postales locales'}

ENFOQUE CRÍTICO EN EITC (Año Fiscal 2025):
- 1 de cada 4 trabajadores elegibles NO reclama EITC = Pierden $2,000-$8,046
- EITC Máximo 2025: $649 (sin hijos), $4,328 (1 hijo), $7,152 (2 hijos), $8,046 (3+ hijos)
- También enfatizar: Crédito Tributario por Hijos ($2,000/niño), CTC Adicional ($1,700 reembolsable)
- DEBE mencionar EITC en el primer párrafo

REQUISITOS DE ESCRITURA:
1. **Longitud:** Exactamente 500 palabras (requisito estricto)
2. **Gancho EITC (CRÍTICO):** El primer párrafo DEBE mencionar EITC o "dinero de reembolso perdido"
3. **Referencias Locales:** Mencionar al menos 5 vecindarios específicos de ${city.name} donde viven familias latinas
4. **Audiencia Objetivo:** Dirigirse directamente a familias trabajadoras, padres solteros, trabajadores de gig economy en ${city.name}
5. **Puntos de Dolor a Abordar:**
   - Perder miles en reembolsos (EITC, CTC)
   - No pueden pagar preparadores de impuestos caros ($300-$500 en otros lugares)
   - Barreras de idioma (servicios solo en inglés)
   - Desconfianza del sistema fiscal
   - Experiencias previas negativas
6. **Señales de Confianza (ESENCIALES):**
   - "Enfocado en la comunidad latina" o "Sirviendo a familias de ${city.name} desde..."
   - "Propiedad latina" o "De la comunidad, para la comunidad"
   - "Servicio 100% en español"
   - "Sin cargos ocultos" / "Precios transparentes"
   - "Planes de pago disponibles"
   - Historias de éxito: "María obtuvo $7,200" "José obtuvo $5,800"
7. **Asequibilidad (Al Frente y Centro):**
   - Mencionar "$99-$199" en el 2do párrafo
   - "Planes de pago disponibles"
   - "Consulta gratis"
   - Comparar con "otros lugares cobran $300-$500"
8. **Palabras Clave Naturales:** Incluir: "EITC ${city.name.toLowerCase()}", "preparación de impuestos asequible ${city.name.toLowerCase()}", "servicios de impuestos para familias ${city.name.toLowerCase()}", "ayuda fiscal en español ${city.name.toLowerCase()}", "crédito tributario por hijos ${city.name.toLowerCase()}"
9. **Tono:** Cálido, enfocado en la comunidad, empoderador (no corporativo/frío)
10. **Sensibilidad Cultural:** Reconocer las necesidades de la comunidad sin ser condescendiente
11. **Uso de "Tú" (Informal):** Usar "tú" para calidez y conexión, NO "usted" (demasiado formal)
12. **Referencias Familiares:** Cultura latina es centrada en la familia - usar "tu familia", "tus hijos"

ESTRUCTURA:
Párrafo 1 (125 palabras):
- GANCHO: "¿Estás dejando $8,046 sobre la mesa?"
- Abordar la brecha de EITC (25% no lo reclama)
- Presentar Tax Genius Pro como solución para familias de ${city.name}
- Mencionar bilingüe, asequible, enfocado en la comunidad

Párrafo 2 (150 palabras):
- Detallar experiencia en EITC + CTC
- Precios asequibles: $99-$199 vs $300-$500 en otros lugares
- Planes de pago disponibles
- Presentación el mismo día
- Vecindarios específicos servidos en ${city.name}

Párrafo 3 (150 palabras):
- Casos de uso reales para familias de ${city.name}:
  * Mamá soltera con 2 hijos trabajando en [vecindario]: Obtuvo $7,200
  * Conductor de gig en [vecindario]: Obtuvo $3,500
  * Trabajador de restaurante en [vecindario]: Obtuvo $5,800
- Abordar la confianza: "Somos de TU comunidad"
- Servicio completamente en español
- "Te entendemos porque somos como tú"

Párrafo 4 (75 palabras):
- CTA fuerte: "No pierdas otro año de reembolsos"
- Consulta gratis
- Llama, envía mensaje de texto o visita
- "Vamos a conseguirte los $8,046 que mereces"

FORMATO DE SALIDA (Texto plano, sin markdown):
[Tu introducción de 500 palabras aquí]

EJEMPLO DE APERTURA (NO copiar, solo referencia de estilo):
"¿Eres una de las miles de familias de ${city.name} que está dejando hasta $8,046 sobre la mesa? El Crédito Tributario por Ingreso del Trabajo (EITC) por sí solo podría poner miles de dólares de vuelta en tu bolsillo, pero 1 de cada 4 trabajadores elegibles nunca lo reclama. Si eres un padre o madre trabajador en ${city.neighborhoods?.[0] || 'el centro'} de ${city.name}, un trabajador de gig economy en ${city.neighborhoods?.[1] || 'el área'}, o haces malabares con múltiples trabajos para llegar a fin de mes, mereces cada dólar de tu reembolso. Tax Genius Pro está aquí para asegurarse de que lo recibas. Somos un servicio de preparación de impuestos enfocado en la comunidad latina, sirviendo a familias en todo ${city.name}—y hablamos tu idioma. Nuestra misión es ayudar a las familias de ${city.name} a reclamar el EITC, el Crédito Tributario por Hijos, y cada deducción que te has ganado, sin el precio de $300-$500 que cobran otros lugares..."

Escribe ahora (500 palabras, específico de ${city.name}, enfocado en EITC, orientado a la comunidad latina):`
}

/**
 * Generate city-specific benefits for tax services (10 benefits) - SPANISH
 */
export function generateTaxServiceBenefitsPromptSpanish(params: {
  city: CityData
  service: TaxServiceSpec
}): string {
  const { city, service } = params

  return `Genera 10 beneficios convincentes para Tax Genius Pro específicamente para familias trabajadoras en ${city.name}, ${city.state}.

AUDIENCIA OBJETIVO: Familias latinas de ingresos bajos a medios ($20k-$60k)

SERVICIO: ${service.serviceName}
PRECIO: $99-$199 (vs $300-$500 en otros lugares) - Planes de pago disponibles
ENFOQUE EN EITC: Ayudamos a familias a reclamar hasta $8,046 en reembolsos
TIEMPO: ${service.turnaround}
BILINGÜE: Servicio completo en español

CIUDAD: ${city.name}, ${city.state} (${city.population?.toLocaleString()} población)
IMPUESTO ESTATAL: ${city.hasStateTax ? `${city.stateTaxRate}% impuesto estatal sobre la renta` : 'Sin impuesto estatal sobre la renta'}
ÁREAS SERVIDAS: ${city.neighborhoods?.join(', ')}

REQUISITOS:
- Cada beneficio debe abordar los puntos de dolor de familias de ingresos bajos a medios
- DEBE incluir estos tipos de beneficios:
  1. Experiencia en EITC (encontrar créditos perdidos)
  2. Asequibilidad (vs competidores caros)
  3. Confianza comunitaria (propiedad latina, local, confiable)
  4. Soporte bilingüe (hispanohablantes)
  5. Conveniencia (ubicaciones, horarios, opciones en línea)
  6. Flexibilidad de pago (planes de pago)
  7. Historias de éxito (montos de reembolso reales)
  8. Transparencia (sin cargos ocultos)
  9. Soporte durante todo el año
  10. Amigable para móviles (texto, llamada, en línea)
- Referenciar vecindarios de ${city.name} donde vive la audiencia objetivo
- Mantener cada beneficio en 25-40 palabras
- Usar lenguaje cálido, enfocado en la comunidad (no corporativo)
- Usar "tú" (informal) para conexión personal

FORMATO DE SALIDA (JSON):
{
  "benefits": [
    "Expertos en EITC que encontraron $8,046 para familias en ${city.neighborhoods?.[0] || city.name} que otros preparadores pasaron por alto—nos aseguramos de que reclames cada crédito que te has ganado",
    "Precios asequibles de $99-$199 con planes de pago disponibles, sirviendo a familias de ${city.name} que no pueden pagar $300-$500 en otros lugares",
    "Servicio de impuestos enfocado en la comunidad latina, confiable por cientos de familias en todo ${city.name}—somos de TU comunidad",
    "Servicio 100% en español para las familias hispanohablantes de ${city.name} que merecen ayuda en su idioma",
    "Ubicaciones y horarios convenientes en ${city.neighborhoods?.join(', ') || city.name} con citas por la tarde y los fines de semana para familias trabajadoras",
    "Consulta gratis para revisar tu situación fiscal y estimar tu EITC, Crédito Tributario por Hijos y reembolso total antes de pagar nada",
    "Resultados reales: María en ${city.neighborhoods?.[0] || city.name} obtuvo $7,200. José obtuvo $5,800. Carmen obtuvo $6,500. Tu reembolso te está esperando.",
    "Sin cargos ocultos, sin sorpresas—precios transparentes porque las familias de ${city.name} merecen honestidad y respeto de su preparador de impuestos",
    "Soporte durante todo el año para familias de ${city.name}, no solo en temporada de impuestos—respondemos preguntas, ayudamos con cartas del IRS y te protegemos de auditorías",
    "Texto, llamada o visita—servimos a familias de ${city.name} como prefieras, con opciones de presentación en línea perfectas para padres trabajadores ocupados"
  ]
}

Genera los 10 beneficios ahora (JSON solamente, debe seguir la estructura del ejemplo anterior):`
}

/**
 * Generate city-specific FAQs for tax services (15 questions & answers) - SPANISH
 */
export function generateTaxServiceFAQsPromptSpanish(params: {
  city: CityData
  service: TaxServiceSpec
}): string {
  const { city, service } = params

  return `Genera 15 preguntas frecuentes y respuestas detalladas para servicios de impuestos de Tax Genius Pro en ${city.name}, ${city.state}.

AUDIENCIA OBJETIVO: Familias latinas trabajadoras (ingresos de $20k-$60k)

SERVICIO: ${service.serviceName}
PRECIO: $99-$199 con planes de pago disponibles
ENFOQUE EN EITC: Reclamar hasta $8,046 en reembolsos
TIEMPO: ${service.turnaround}
BILINGÜE: Servicio completo en español

CONTEXTO DE CIUDAD E IMPUESTOS:
- Ubicación: ${city.name}, ${city.state}
- Población: ${city.population?.toLocaleString()}
- Impuesto Estatal: ${city.hasStateTax ? `Sí (${city.stateTaxRate}%)` : 'Sin impuesto estatal sobre la renta'}
${city.irsOffice ? `- Oficina del IRS: ${city.irsOffice}` : ''}
- Códigos Postales: ${city.zipCodes?.join(', ') || 'toda el área metropolitana'}

CATEGORÍAS DE PREGUNTAS (3-4 preguntas cada una - DEBE abordar estas preocupaciones específicas):
1. **EITC y Créditos Fiscales (4 preguntas)** - MÁS IMPORTANTE
   - "¿Qué es el EITC y califico?"
   - "¿Cuánto EITC puedo obtener?"
   - "¿Qué es el Crédito Tributario por Hijos?"
   - "¿Qué pasa si no reclamé EITC el año pasado?"

2. **Asequibilidad y Precios (3 preguntas)**
   - "¿Cuánto cuesta?" (abordar preocupaciones de asequibilidad)
   - "¿Puedo pagar en cuotas?"
   - "¿Qué pasa si no puedo pagar por adelantado?"

3. **Confianza y Comunidad (3 preguntas)**
   - "¿Realmente son de propiedad latina?"
   - "¿Cómo sé que no me van a cobrar de más?"
   - "¿Hablan español? Mi inglés no es muy bueno."

4. **Ubicación y Conveniencia (2 preguntas)**
   - "¿Dónde están ubicados en ${city.name}?"
   - "¿Puedo presentar mis impuestos en línea/por teléfono?"

5. **Situaciones Comunes (3 preguntas)**
   - "Tengo múltiples trabajos, ¿pueden ayudarme?"
   - "Manejo para Uber/Lyft, ¿es complicado?"
   - "Trabajo por cuenta propia, ¿costará más?"

REQUISITOS:
- Las preguntas deben sonar como las que harían familias trabajadoras reales en ${city.name}
- Las respuestas deben tener 80-120 palabras, detalladas pero fáciles de entender (sin jerga)
- Referenciar vecindarios de ${city.name} donde vive la audiencia objetivo
- Abordar preocupaciones de confianza directa y honestamente
- Enfatizar asequibilidad, EITC, conexión comunitaria
- Usar lenguaje cálido y empoderador (no corporativo)
- Incluir ejemplos específicos y montos en dólares
- Usar "tú" (informal) para conexión personal

FORMATO DE SALIDA (JSON):
{
  "faqs": [
    {
      "question": "¿Qué es el EITC y califico si vivo en ${city.name}?",
      "answer": "El Crédito Tributario por Ingreso del Trabajo (EITC) es dinero que el gobierno devuelve a las familias trabajadoras—hasta $8,046 si tienes 3 o más hijos. Si estás trabajando en ${city.name} y ganando entre $17,000-$60,000 (dependiendo del tamaño de tu familia), probablemente califiques. Muchas familias de ${city.name} en ${city.neighborhoods?.[0]}, ${city.neighborhoods?.[1]}, y en todo ${city.state} no saben sobre el EITC y dejan miles de dólares sobre la mesa cada año. Verificaremos tu elegibilidad gratis y nos aseguraremos de que reclames cada dólar. ${city.hasStateTax ? `Además, ${city.state} puede tener créditos estatales adicionales disponibles.` : `Como ${city.state} no tiene impuesto estatal sobre la renta, nos enfocamos en maximizar tu EITC federal y Crédito Tributario por Hijos.`}"
    },
    {
      "question": "¿Cuánto cuesta la preparación de impuestos en ${city.name}?",
      "answer": "Nuestra preparación de impuestos cuesta $99-$199 para la mayoría de las familias de ${city.name}—eso es mucho menos que los $300-$500 que cobran otros lugares. Una declaración básica con EITC y Crédito Tributario por Hijos comienza en $99. Si tienes múltiples trabajos, trabajo de gig economy (Uber, DoorDash), o eres trabajador por cuenta propia, podría ser $149-$199. Pero aquí está la buena noticia: hay planes de pago disponibles. Si estás recibiendo un reembolso (y la mayoría de las familias de ${city.name} lo hacen), podemos deducir nuestra tarifa de tu reembolso, así que no pagas nada por adelantado. Siempre te daremos una consulta gratis primero para que no haya sorpresas."
    },
    {
      "question": "¿Hablan español? Mi inglés no es muy bueno.",
      "answer": "¡Sí! Hablamos español. Servimos a la comunidad hispanohablante de ${city.name} con soporte completamente bilingüe. Nuestros preparadores de impuestos hablan español con fluidez y pueden explicarte todo sobre el EITC, el Crédito Tributario por Hijos y tu reembolso en tu idioma. Demasiados lugares de impuestos en ${city.name} solo hablan inglés, dejando a las familias latinas confundidas o pagando demasiado. Aquí no. Ya sea que vivas en ${city.neighborhoods?.[0]}, ${city.neighborhoods?.[1]}, o en cualquier lugar de ${city.name}, mereces ayuda fiscal en español. Llámanos y pide soporte en español—estamos aquí para ayudarte."
    },
    {
      "question": "¿Puedo pagar en cuotas? No tengo $200 ahora mismo.",
      "answer": "¡Sí! Ofrecemos planes de pago porque entendemos que las familias de ${city.name} están haciendo malabares con facturas, alquiler y gastos. Puedes pagar en 2-3 cuotas, o si esperas un reembolso, podemos deducir nuestra tarifa directamente de tu reembolso—así que no pagas nada por adelantado. Muchas familias de ${city.name} usan esta opción. Por ejemplo, si tu reembolso es $6,500 y nuestra tarifa es $149, recibes $6,351. De cualquier manera, trabajaremos contigo. El dinero nunca debe impedirte reclamar los $8,046 que mereces."
    },
    {
      "question": "¿Qué pasa si no reclamé el EITC el año pasado? ¿Perdí ese dinero?",
      "answer": "¡Buenas noticias! Todavía puedes reclamar el EITC de los últimos 3 años. Si perdiste el EITC en 2024, 2023 o 2022, podemos presentar declaraciones enmendadas y conseguirte ese dinero. Muchas familias de ${city.name} no saben esto. Hemos ayudado a familias en ${city.neighborhoods?.[0]} y ${city.neighborhoods?.[1]} a recuperar $15,000-$20,000 de 3 años de EITC perdido. El IRS no anuncia esto, pero nos aseguramos de que nuestros clientes de ${city.name} conozcan sus derechos. Revisemos tus declaraciones pasadas gratis y veamos qué se te debe."
    }
  ]
}

Genera las 15 preguntas frecuentes ahora (JSON solamente, siguiendo la estructura y tono anterior):`
}

/**
 * Generate city-specific tax preparer recruitment section (250-300 words) - SPANISH
 */
export function generateTaxPreparerRecruitmentPromptSpanish(params: {
  city: CityData
  recruitment: RecruitmentOpportunitySpec
}): string {
  const { city, recruitment } = params

  return `Eres un experto en redacción de reclutamiento especializado en carreras de preparación de impuestos para la comunidad latina.

Escribe una sección de reclutamiento convincente de 250-300 palabras para Tax Genius Pro, dirigida a potenciales preparadores de impuestos en ${city.name}, ${city.state}.

DETALLES DE LA OPORTUNIDAD:
- Ingreso Promedio: $${recruitment.avgIncome.toLocaleString()}/año
${recruitment.topEarnerIncome ? `- Los Mejores Ganan: $${recruitment.topEarnerIncome.toLocaleString()}/año` : ''}
- Modelo de Trabajo: ${recruitment.benefits.join(', ')}
- Capacitación: ${recruitment.trainingDuration}
- Certificación: ${recruitment.certificationProvided ? 'Sí - Proporcionada sin costo' : 'No requerida'}
- Horario: ${recruitment.seasonalOrYearRound === 'year-round' ? 'Oportunidad de ingresos durante todo el año' : 'Período de altos ingresos estacionales'}

CONTEXTO DE LA CIUDAD:
- Ubicación: ${city.name}, ${city.state}
- Población: ${city.population?.toLocaleString()} (gran oportunidad de mercado)
- Demanda en Temporada de Impuestos: Alta demanda en ${city.neighborhoods?.slice(0, 3).join(', ') || 'todas las áreas'}
- Reclutas Objetivo: Personas que buscan cambio de carrera, jubilados, padres que se quedan en casa, trabajadores de medio tiempo en ${city.name}

REQUISITOS DE ESCRITURA:
1. **Longitud:** 250-300 palabras (requisito estricto)
2. **Gancho:** Comenzar con potencial de ingresos o beneficio de estilo de vida
3. **Específico de la Ciudad:** Mencionar oportunidad en ${city.name}, tamaño del mercado local, vecindarios
4. **Abordar Puntos de Dolor:** Trabajos sin futuro, viajes diarios, horarios inflexibles, pago bajo
5. **Destacar Beneficios:**
   - Gana $${recruitment.avgIncome.toLocaleString()}+ desde casa en ${city.name}
   - Capacitación y certificación gratuitas
   - Horarios flexibles perfectos para el estilo de vida de ${city.name}
   - No se requiere experiencia
   - Sé tu propio jefe sirviendo a contribuyentes de ${city.name}
6. **Prueba Social:** Mencionar preparadores de impuestos exitosos ya trabajando en ${city.state}
7. **Urgencia:** Temporada de impuestos acercándose, espacios de capacitación limitados, mercado creciente de ${city.name}
8. **CTA:** "Únete a Tax Genius Pro en ${city.name}" - haz clic para aplicar
9. **Tono:** Inspirador, enfocado en oportunidades, empoderador
10. **Palabras Clave:** Incluir naturalmente: "trabajos de preparador de impuestos ${city.name.toLowerCase()}", "trabajar desde casa ${city.name.toLowerCase()}", "convertirse en preparador de impuestos", "carrera fiscal en ${city.state.toLowerCase()}"
11. **Uso de "Tú":** Usar "tú" para conexión personal

ESTRUCTURA:
Párrafo 1 (80 palabras): Gancho con potencial de ingresos, presentar oportunidad en ${city.name}
Párrafo 2 (100 palabras): Detallar beneficios, capacitación, flexibilidad para residentes de ${city.name}
Párrafo 3 (70-120 palabras): Prueba social, urgencia, CTA fuerte para unirse

FORMATO DE SALIDA (Texto plano, sin markdown):
[Tu sección de reclutamiento de 250-300 palabras aquí]

EJEMPLO DE APERTURA (NO copiar, solo referencia de estilo):
"¿Listo para ganar $${recruitment.avgIncome.toLocaleString()} o más desde tu hogar en ${city.name}? Tax Genius Pro está reclutando preparadores de impuestos en ${city.neighborhoods?.[0] || 'el área'}, ${city.neighborhoods?.[1] || city.name}, y en todo ${city.state}. Ya sea que estés buscando escapar del tráfico de ${city.name}, necesites horarios flexibles, o quieras construir una carrera gratificante ayudando a ${city.population?.toLocaleString()} residentes de ${city.name} con sus impuestos, esta es tu oportunidad..."

Escribe ahora (250-300 palabras, específico de ${city.name}, enfoque de reclutamiento):`
}
