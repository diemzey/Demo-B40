// BORRADOR pendiente de revisión legal. Textos escritos para Jornada40
// (AIvena Inc.) como base de trabajo; no sustituyen la opinión de un abogado.

import type { LegalSection } from "@/components/ui/legal-collapsible-card";

export type LegalDocument = {
  title: string;
  updatedAt: string;
  sections: LegalSection[];
};

const UPDATED_AT = "21 de septiembre de 2026";

export const PRIVACIDAD: LegalDocument = {
  title: "Aviso de privacidad",
  updatedAt: UPDATED_AT,
  sections: [
    {
      id: "responsable",
      title: "Responsable de tus datos",
      description:
        "AIvena Inc., con domicilio en Ciudad de México, es la responsable del tratamiento de los datos personales que nos compartes a través de Jornada40. Para cualquier tema relacionado con este aviso escríbenos a contacto@aivena.ai.",
    },
    {
      id: "datos-recabados",
      title: "Datos que recabamos",
      description:
        "Solo recabamos los datos de contacto que capturas en el formulario: tu nombre, el nombre de tu empresa, tu correo de trabajo y el número de sucursales. No pedimos ni recopilamos otra información personal para atender tu solicitud.",
    },
    {
      id: "datos-no-guardados",
      title: "Datos que NO guardamos",
      description:
        "Los archivos CSV de turnos, las plantillas, los nombres de tu personal y sus horarios se procesan directamente en tu navegador. Esa información no se envía a nuestros servidores ni se almacena en ningún lado: cuando cierras la pestaña, desaparece.",
    },
    {
      id: "finalidad",
      title: "Para qué usamos tus datos",
      description:
        "Usamos tus datos de contacto únicamente para comunicarnos contigo y agendar el diagnóstico que solicitaste, así como para dar seguimiento a esa conversación. No los usamos para marketing de terceros ni te suscribimos a listas que no hayas pedido.",
    },
    {
      id: "transferencias",
      title: "Transferencias a terceros",
      description:
        "No compartimos, vendemos ni transferimos tus datos personales a terceros. La única excepción es cuando una autoridad competente nos lo exija por obligación legal, y en ese caso entregaremos solo lo estrictamente necesario.",
    },
    {
      id: "derechos-arco",
      title: "Tus derechos (ARCO)",
      description:
        "Puedes ejercer en cualquier momento tus derechos de acceso, rectificación, cancelación y oposición sobre tus datos personales. Basta con escribirnos a contacto@aivena.ai indicando qué derecho quieres ejercer; te responderemos en los plazos que marca la ley.",
    },
    {
      id: "cambios",
      title: "Cambios a este aviso",
      description:
        "Podemos actualizar este aviso para reflejar cambios en el servicio o en la ley. Publicaremos la versión vigente en esta misma página con su fecha de actualización, y si el cambio es relevante te lo haremos saber por el correo que nos proporcionaste.",
    },
  ],
};

export const TERMINOS: LegalDocument = {
  title: "Términos y condiciones",
  updatedAt: UPDATED_AT,
  sections: [
    {
      id: "objeto",
      title: "Objeto del servicio",
      description:
        "Jornada40 es una herramienta de AIvena Inc. que elabora un diagnóstico de tus turnos semanales y una propuesta de reacomodo para ajustarlos a la jornada de 40 horas. Es una herramienta de análisis operativo; no constituye asesoría legal, laboral ni fiscal.",
    },
    {
      id: "alcance",
      title: "Alcance y límites",
      description:
        "Jornada40 no promete ni garantiza ahorros en tu nómina. No modifica tu sistema de nómina ni tu checador: solo cuantifica las horas que dejarían de pagarse al doble con el reacomodo propuesto. Los resultados dependen de la calidad de los datos que cargues.",
    },
    {
      id: "cuenta",
      title: "Cuenta y acceso",
      description:
        "Para usar el panel necesitas una cuenta con un correo de trabajo válido. Eres responsable de mantener tus credenciales en privado y de lo que se haga desde tu cuenta. Podemos suspender el acceso si detectamos un uso que viole estos términos.",
    },
    {
      id: "uso-aceptable",
      title: "Uso aceptable",
      description:
        "Te comprometes a usar Jornada40 solo para analizar turnos de personal sobre el que tienes facultades para hacerlo. No está permitido intentar vulnerar la seguridad del servicio, revender el acceso ni usarlo para fines distintos a los descritos aquí.",
    },
    {
      id: "propiedad-intelectual",
      title: "Propiedad intelectual",
      description:
        "El software, la marca Jornada40, los algoritmos y los materiales del servicio son propiedad de AIvena Inc. Los datos de turnos que cargas y las propuestas generadas a partir de ellos son tuyos; nosotros no adquirimos ningún derecho sobre ellos.",
    },
    {
      id: "responsabilidad",
      title: "Limitación de responsabilidad",
      description:
        "La propuesta de reacomodo la revisas, apruebas y aplicas tú; Jornada40 no la implementa por ti. Te recomendamos validarla con un verificador independiente antes de ponerla en marcha. AIvena Inc. no responde por decisiones tomadas con base en los resultados ni por daños indirectos derivados del uso del servicio.",
    },
    {
      id: "ley-aplicable",
      title: "Ley aplicable",
      description:
        "Estos términos se rigen por las leyes de los Estados Unidos Mexicanos. Para cualquier controversia, las partes se someten a los tribunales competentes de la Ciudad de México, renunciando a cualquier otro fuero que pudiera corresponderles.",
    },
    {
      id: "contacto",
      title: "Contacto",
      description:
        "Si tienes dudas sobre estos términos o sobre el servicio, escríbenos a contacto@aivena.ai. Atendemos desde la Ciudad de México en días hábiles.",
    },
  ],
};
