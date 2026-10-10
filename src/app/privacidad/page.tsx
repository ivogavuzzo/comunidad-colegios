import React from 'react';
import Link from 'next/link';
import { Metadata } from 'next';
import {
  ShieldCheck,
  Lock,
  Eye,
  FileText,
  UserCheck,
  Database,
  Mail,
  ArrowLeft,
  Scale,
  Sparkles,
  HelpCircle,
  ExternalLink,
} from 'lucide-react';

export const metadata: Metadata = {
  title: 'Política de Privacidad | Comunidad de Colegios',
  description:
    'Conocé cómo protegemos, tratamos y resguardamos tus datos personales en Comunidad de Colegios, una iniciativa de Criana.',
};

export default function PoliticaPrivacidadPage() {
  const lastUpdated = '10 de Octubre de 2026';

  return (
    <div className="min-h-screen bg-sand/30 py-10 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-4xl mx-auto">
        {/* Breadcrumb y Volver */}
        <div className="mb-6 flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-xs font-semibold text-petroleo/80 hover:text-petroleo bg-white/80 hover:bg-white px-3.5 py-2 rounded-full border border-petroleo/10 shadow-2xs transition-all"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-coral" />
            <span>Volver al inicio</span>
          </Link>

          <span className="text-[11px] font-mono text-secondary bg-white/60 px-3 py-1 rounded-full border border-petroleo/5">
            Última actualización: {lastUpdated}
          </span>
        </div>

        {/* Encabezado Principal */}
        <header className="bg-petroleo text-white rounded-3xl p-6 sm:p-10 shadow-md mb-8 relative overflow-hidden">
          <div className="absolute -right-10 -bottom-10 w-48 h-48 bg-coral/20 rounded-full blur-2xl pointer-events-none" />
          <div className="relative z-10 space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-arena text-xs font-semibold tracking-wide border border-white/15">
              <ShieldCheck className="w-4 h-4 text-mostaza" />
              <span>Transparencia y Protección de Datos</span>
            </div>
            <h1 className="font-serif text-2xl sm:text-4xl font-bold tracking-tight text-white leading-tight">
              Política de Privacidad
            </h1>
            <p className="text-white/80 text-sm sm:text-base max-w-2xl leading-relaxed">
              En <strong className="text-white">Comunidad de Colegios</strong> (iniciativa de Criana)
              valoramos profundamente la confianza de las familias escolares. Este documento
              explica con total claridad qué datos recolectamos, para qué los utilizamos y cómo
              ejercer tus derechos conforme a la normativa argentina.
            </p>
          </div>
        </header>

        {/* Contenido Estructurado */}
        <main className="space-y-6">
          {/* 1. Responsable del Tratamiento */}
          <section className="bg-white rounded-2xl p-6 sm:p-8 border border-petroleo/10 shadow-xs space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-petroleo/5 flex items-center justify-center text-coral font-bold text-sm">
                1
              </div>
              <h2 className="font-serif text-lg sm:text-xl font-bold text-petroleo">
                Responsable del Tratamiento
              </h2>
            </div>
            <p className="text-sm text-secondary leading-relaxed">
              El responsable del tratamiento de los datos personales recopilados a través del sitio
              web y plataforma digital de <strong>Comunidad de Colegios</strong> es{' '}
              <strong>Criana</strong> (con presencia institucional en{' '}
              <a
                href="https://www.criana.com.ar"
                target="_blank"
                rel="noopener noreferrer"
                className="text-coral underline hover:text-petroleo font-medium"
              >
                criana.com.ar
              </a>
              ). Para cualquier consulta o requerimiento respecto a la privacidad de tus datos,
              podés escribirnos a{' '}
              <a
                href="mailto:hola@criana.com.ar"
                className="text-coral underline hover:text-petroleo font-semibold"
              >
                hola@criana.com.ar
              </a>
              .
            </p>
          </section>

          {/* 2. Marco Normativo (Ley 25.326) */}
          <section className="bg-white rounded-2xl p-6 sm:p-8 border border-petroleo/10 shadow-xs space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-petroleo/5 flex items-center justify-center text-coral font-bold text-sm">
                2
              </div>
              <h2 className="font-serif text-lg sm:text-xl font-bold text-petroleo">
                Marco Normativo y Principios de Protección
              </h2>
            </div>
            <p className="text-sm text-secondary leading-relaxed">
              El tratamiento de datos personales realizado por Comunidad de Colegios se rige por la{' '}
              <strong>Ley Nacional N° 25.326 de Protección de los Datos Personales</strong>, su
              Decreto Reglamentario N° 1558/2001 y las normas complementarias dictadas por la{' '}
              <strong>Agencia de Acceso a la Información Pública (AAIP)</strong> de la República
              Argentina.
            </p>
            <p className="text-sm text-secondary leading-relaxed">
              Nos comprometemos a aplicar en todo momento los principios de legalidad, finalidad,
              veracidad, proporcionalidad, seguridad y confidencialidad en el tratamiento de la
              información.
            </p>
          </section>

          {/* 3. Datos que Recopilamos */}
          <section className="bg-white rounded-2xl p-6 sm:p-8 border border-petroleo/10 shadow-xs space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-petroleo/5 flex items-center justify-center text-coral font-bold text-sm">
                3
              </div>
              <h2 className="font-serif text-lg sm:text-xl font-bold text-petroleo">
                Datos que Recopilamos
              </h2>
            </div>
            <p className="text-sm text-secondary leading-relaxed">
              Recopilamos únicamente los datos necesarios para brindar el servicio de catálogo
              comunitario y permitir el contacto entre familias y prestadores:
            </p>

            <div className="grid sm:grid-cols-2 gap-4 pt-2">
              <div className="bg-sand/40 p-4 rounded-xl border border-petroleo/5 space-y-2">
                <div className="flex items-center gap-2 text-petroleo font-semibold text-sm">
                  <UserCheck className="w-4 h-4 text-coral" />
                  <span>Datos de Registro y Cuenta</span>
                </div>
                <p className="text-xs text-secondary leading-relaxed">
                  Nombre completo, dirección de correo electrónico e imagen de perfil provistas al
                  iniciar sesión mediante proveedores de autenticación segura (como Google OAuth).
                </p>
              </div>

              <div className="bg-sand/40 p-4 rounded-xl border border-petroleo/5 space-y-2">
                <div className="flex items-center gap-2 text-petroleo font-semibold text-sm">
                  <Eye className="w-4 h-4 text-coral" />
                  <span>Datos Públicos del Aviso</span>
                </div>
                <p className="text-xs text-secondary leading-relaxed">
                  Título, descripción del servicio ofrecido o buscado, colegio de referencia, zona o
                  barrio de cobertura (CABA / GBA) y canales de contacto público ingresados
                  voluntariamente (WhatsApp, email público, sitio web).
                </p>
              </div>

              <div className="bg-sand/40 p-4 rounded-xl border border-petroleo/5 space-y-2">
                <div className="flex items-center gap-2 text-petroleo font-semibold text-sm">
                  <Database className="w-4 h-4 text-coral" />
                  <span>Datos de Navegación y Uso</span>
                </div>
                <p className="text-xs text-secondary leading-relaxed">
                  Métricas anónimas de interacción (clics en botones de contacto, filtros
                  consultados), dirección IP con fines de seguridad y cookies técnicas indispensables
                  para la sesión.
                </p>
              </div>

              <div className="bg-sand/40 p-4 rounded-xl border border-petroleo/5 space-y-2">
                <div className="flex items-center gap-2 text-petroleo font-semibold text-sm">
                  <Lock className="w-4 h-4 text-coral" />
                  <span>Seguridad y Moderación</span>
                </div>
                <p className="text-xs text-secondary leading-relaxed">
                  Tokens de verificación de seguridad y desafíos anti-spam (captchas) para evitar
                  robots y proteger la integridad de las publicaciones de la comunidad.
                </p>
              </div>
            </div>
          </section>

          {/* 4. Finalidad del Tratamiento */}
          <section className="bg-white rounded-2xl p-6 sm:p-8 border border-petroleo/10 shadow-xs space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-petroleo/5 flex items-center justify-center text-coral font-bold text-sm">
                4
              </div>
              <h2 className="font-serif text-lg sm:text-xl font-bold text-petroleo">
                Finalidad del Tratamiento
              </h2>
            </div>
            <p className="text-sm text-secondary leading-relaxed">
              Utilizamos la información recopilada con las siguientes finalidades exclusivas:
            </p>
            <ul className="space-y-2 text-sm text-secondary list-disc pl-5 leading-relaxed">
              <li>
                <strong>Publicación y visualización:</strong> Exhibir los avisos en el catálogo para
                que las familias de la comunidad escolar puedan encontrar servicios y
                recomendaciones de interés.
              </li>
              <li>
                <strong>Facilitar el contacto directo:</strong> Permitir que los interesados puedan
                comunicarse directamente con el anunciante a través de los canales que este
                autorizó publicar.
              </li>
              <li>
                <strong>Gestión y control de autoría:</strong> Permitir que cada usuario administre,
                edite, pause o elimine sus propios avisos desde el panel "Mis Avisos".
              </li>
              <li>
                <strong>Moderación y seguridad:</strong> Revisar y moderar las publicaciones para
                prevenir conductas abusivas, estafas, suplantaciones de identidad o contenido
                inapropiado.
              </li>
            </ul>
          </section>

          {/* 5. Carácter Público y No Venta de Datos */}
          <section className="bg-white rounded-2xl p-6 sm:p-8 border border-petroleo/10 shadow-xs space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-petroleo/5 flex items-center justify-center text-coral font-bold text-sm">
                5
              </div>
              <h2 className="font-serif text-lg sm:text-xl font-bold text-petroleo">
                Divulgación Pública de Avisos y No Comercialización
              </h2>
            </div>
            <p className="text-sm text-secondary leading-relaxed">
              Al cargar un aviso en la plataforma, el usuario consiente expresamente que los datos
              incorporados en el mismo (título, descripción, colegio, zona, fotos y teléfono o
              enlace de WhatsApp) queden a la vista del público general para cumplir la finalidad del
              servicio.
            </p>
            <div className="p-4 rounded-xl bg-arena/50 border border-mostaza/30 text-xs sm:text-sm text-petroleo font-medium">
              ✨ <strong>Compromiso ético de Criana:</strong> Nunca vendemos, alquilamos ni cedemos
              bases de datos de nuestros usuarios a terceros con fines de publicidad no solicitada
              (spam) ni fines ajenos a la comunidad escolar.
            </div>
          </section>

          {/* 6. Derechos del Usuario (ARCO - Ley 25.326) */}
          <section className="bg-white rounded-2xl p-6 sm:p-8 border border-petroleo/10 shadow-xs space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-petroleo/5 flex items-center justify-center text-coral font-bold text-sm">
                6
              </div>
              <h2 className="font-serif text-lg sm:text-xl font-bold text-petroleo">
                Tus Derechos de Acceso, Rectificación y Supresión (ARCO)
              </h2>
            </div>
            <p className="text-sm text-secondary leading-relaxed">
              Como titular de los datos personales, tenés derecho a acceder a ellos en forma
              gratuita, así como a solicitar su actualización, rectificación o eliminación total de
              nuestras bases de datos en cualquier momento.
            </p>
            <p className="text-sm text-secondary leading-relaxed">
              Para ejercer estos derechos, podés:
            </p>
            <ol className="list-decimal pl-5 text-sm text-secondary space-y-1 leading-relaxed">
              <li>
                Editar o eliminar directamente tus publicaciones desde{' '}
                <Link href="/mis-avisos" className="text-coral underline font-semibold">
                  Mis Avisos
                </Link>
                .
              </li>
              <li>
                Enviar un correo electrónico con el asunto <em>"Protección de Datos Personales"</em> a{' '}
                <a
                  href="mailto:hola@criana.com.ar"
                  className="text-coral underline font-semibold"
                >
                  hola@criana.com.ar
                </a>{' '}
                acreditando tu identidad.
              </li>
            </ol>

            {/* Cláusula legal obligatoria AAIP */}
            <div className="mt-4 p-4 rounded-xl bg-petroleo/5 border border-petroleo/10 text-xs text-secondary leading-relaxed space-y-2">
              <p className="font-semibold text-petroleo">
                Información requerida por la Disposición 10/2008 de la DNPDP / AAIP:
              </p>
              <p>
                <em>
                  "El titular de los datos personales tiene la facultad de ejercer el derecho de
                  acceso a los mismos en forma gratuita a intervalos no inferiores a seis meses,
                  salvo que se acredite un interés legítimo al efecto conforme lo establecido en el
                  artículo 14, inciso 3 de la Ley Nº 25.326."
                </em>
              </p>
              <p>
                <em>
                  "La AGENCIA DE ACCESO A LA INFORMACIÓN PÚBLICA, en su carácter de Órgano de Control
                  de la Ley Nº 25.326, tiene la atribución de atender las denuncias y reclamos que
                  se interpongan con relación al incumplimiento de las normas sobre protección de
                  datos personales."
                </em>
              </p>
            </div>
          </section>

          {/* 7. Cookies y Tecnologías */}
          <section className="bg-white rounded-2xl p-6 sm:p-8 border border-petroleo/10 shadow-xs space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-petroleo/5 flex items-center justify-center text-coral font-bold text-sm">
                7
              </div>
              <h2 className="font-serif text-lg sm:text-xl font-bold text-petroleo">
                Cookies y Almacenamiento Local
              </h2>
            </div>
            <p className="text-sm text-secondary leading-relaxed">
              Utilizamos cookies técnicas y de sesión estrictamente necesarias para el funcionamiento
              seguro del portal (mantenimiento de la sesión de usuario activa y seguridad contra
              ataques CSRF). Podés configurar tu navegador para bloquear las cookies, aunque esto
              podría limitar algunas funciones como el acceso a tu cuenta.
            </p>
          </section>

          {/* 8. Modificaciones a la Política */}
          <section className="bg-white rounded-2xl p-6 sm:p-8 border border-petroleo/10 shadow-xs space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-petroleo/5 flex items-center justify-center text-coral font-bold text-sm">
                8
              </div>
              <h2 className="font-serif text-lg sm:text-xl font-bold text-petroleo">
                Actualizaciones de esta Política
              </h2>
            </div>
            <p className="text-sm text-secondary leading-relaxed">
              Podemos actualizar periódicamente esta Política de Privacidad para reflejar cambios en
              nuestros servicios o requerimientos legales. Toda modificación será publicada en esta
              misma página indicando la fecha de última actualización.
            </p>
          </section>

          {/* Banner de Contacto */}
          <div className="bg-gradient-to-r from-petroleo to-petroleo-light text-white rounded-2xl p-6 sm:p-8 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="space-y-1 text-center sm:text-left">
              <h3 className="font-serif font-bold text-lg text-white">¿Tenés alguna consulta?</h3>
              <p className="text-xs sm:text-sm text-white/80">
                Estamos a tu disposición para aclarar cualquier duda sobre tus datos y privacidad.
              </p>
            </div>
            <a
              href="mailto:hola@criana.com.ar"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-coral hover:bg-coral-light text-white text-xs font-display font-semibold uppercase tracking-wider transition-all shadow-sm"
            >
              <Mail className="w-4 h-4" />
              <span>Escribinos a hola@criana.com.ar</span>
            </a>
          </div>
        </main>
      </div>
    </div>
  );
}
