import React from 'react';
import Link from 'next/link';
import { Metadata } from 'next';
import {
  FileText,
  ShieldAlert,
  AlertTriangle,
  CheckCircle,
  HelpCircle,
  ArrowLeft,
  Scale,
  Users,
  Building,
  Mail,
} from 'lucide-react';

export const metadata: Metadata = {
  title: 'Términos y Condiciones de Uso | Comunidad de Colegios',
  description:
    'Condiciones generales, responsabilidades y pautas de convivencia comunitaria para el uso de Comunidad de Colegios, una iniciativa de Criana.',
};

export default function TerminosYCondicionesPage() {
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
          <div className="absolute -right-10 -bottom-10 w-48 h-48 bg-mostaza/20 rounded-full blur-2xl pointer-events-none" />
          <div className="relative z-10 space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-arena text-xs font-semibold tracking-wide border border-white/15">
              <Scale className="w-4 h-4 text-mostaza" />
              <span>Pautas de Convivencia y Términos Legales</span>
            </div>
            <h1 className="font-serif text-2xl sm:text-4xl font-bold tracking-tight text-white leading-tight">
              Términos y Condiciones del Servicio
            </h1>
            <p className="text-white/80 text-sm sm:text-base max-w-2xl leading-relaxed">
              Bienvenido a <strong className="text-white">Comunidad de Colegios</strong>, un espacio
              comunitario de encuentro entre familias escolares impulsado por Criana. Al acceder,
              navegar o publicar avisos en nuestro portal, aceptás los presentes Términos y
              Condiciones.
            </p>
          </div>
        </header>

        {/* Aviso Destacado de Deslinde de Responsabilidad */}
        <div className="bg-mostaza/15 border-2 border-mostaza/40 rounded-2xl p-5 sm:p-6 mb-8 text-petroleo space-y-2">
          <div className="flex items-center gap-2.5 font-bold font-serif text-base sm:text-lg text-petroleo">
            <ShieldAlert className="w-5 h-5 text-coral shrink-0" />
            <span>Aviso Importante sobre la Naturaleza Comunitaria del Servicio</span>
          </div>
          <p className="text-xs sm:text-sm text-secondary leading-relaxed">
            <strong>Comunidad de Colegios</strong> es una plataforma de anuncios clasificados y
            recomendaciones directas entre familias escolares. <strong>Criana no interviene</strong>{' '}
            en las contrataciones, no fija tarifas, no actúa como empleador ni intermediario laboral,
            y no se responsabiliza por la calidad, cumplimiento o veracidad de los acuerdos entre
            partes. Cada familia es responsable exclusiva de verificar referencias e idoneidad antes
            de contratar.
          </p>
        </div>

        {/* Contenido Estructurado */}
        <main className="space-y-6">
          {/* 1. Objeto y Naturaleza */}
          <section className="bg-white rounded-2xl p-6 sm:p-8 border border-petroleo/10 shadow-xs space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-petroleo/5 flex items-center justify-center text-coral font-bold text-sm">
                1
              </div>
              <h2 className="font-serif text-lg sm:text-xl font-bold text-petroleo">
                Objeto y Ámbito de Aplicación
              </h2>
            </div>
            <p className="text-sm text-secondary leading-relaxed">
              Los presentes Términos y Condiciones regulan el acceso y utilización del sitio web{' '}
              <strong>Comunidad de Colegios</strong> (en adelante, la "Plataforma"), una iniciativa
              de <strong>Criana</strong> con alcance en la Ciudad Autónoma de Buenos Aires y el Gran
              Buenos Aires (República Argentina).
            </p>
            <p className="text-sm text-secondary leading-relaxed">
              El objetivo de la Plataforma es brindar un catálogo comunitario y colaborativo donde
              padres, madres, tutores y prestadores de servicios vinculados al ámbito escolar puedan
              publicar y encontrar avisos útiles (tales como cuidado infantil, transporte escolar,
              clases particulares, apoyo escolar, indumentaria, actividades extracurriculares y
              otros oficios o servicios afines).
            </p>
          </section>

          {/* 2. Deslinde de Responsabilidad */}
          <section className="bg-white rounded-2xl p-6 sm:p-8 border border-petroleo/10 shadow-xs space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-petroleo/5 flex items-center justify-center text-coral font-bold text-sm">
                2
              </div>
              <h2 className="font-serif text-lg sm:text-xl font-bold text-petroleo">
                Deslinde Integral de Responsabilidad
              </h2>
            </div>
            <p className="text-sm text-secondary leading-relaxed">
              El usuario comprende, acepta y consiente expresamente lo siguiente:
            </p>
            <ul className="space-y-2 text-sm text-secondary list-disc pl-5 leading-relaxed">
              <li>
                <strong>Carácter no intermediario:</strong> La Plataforma funciona exclusivamente
                como un canal técnico de publicación y contacto directo. Criana y Comunidad de
                Colegios no participan en las negociaciones, cotizaciones ni prestaciones efectivas
                de los servicios.
              </li>
              <li>
                <strong>Sin relación de dependencia ni agencia:</strong> Los anunciantes no son
                empleados, agentes ni contratistas de Criana. No existe relación societaria ni vínculo
                laboral alguno entre Criana y quienes publican o prestan servicios.
              </li>
              <li>
                <strong>Verificación individual de antecedentes y aptitudes:</strong> Criana{' '}
                <em>no realiza verificaciones de antecedentes penales</em>, habilitaciones de
                transporte escolar, licencias profesionales, títulos habilitantes ni peritajes
                psicológicos de las personas que anuncian. Corresponde con exclusividad a cada
                usuario contratante solicitar referencias, documentación y entrevistas antes de
                convenir cualquier servicio, especialmente en tareas de cuidado infantil o traslado.
              </li>
              <li>
                <strong>Exención de responsabilidad por daños:</strong> En la máxima medida permitida
                por la legislación aplicable, Criana y Comunidad de Colegios no serán responsables
                por daños directos, indirectos, lucro cesante, pérdidas o siniestros derivados de los
                acuerdos o servicios convenidos entre usuarios.
              </li>
            </ul>
          </section>

          {/* 3. Condiciones para Publicar Avisos */}
          <section className="bg-white rounded-2xl p-6 sm:p-8 border border-petroleo/10 shadow-xs space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-petroleo/5 flex items-center justify-center text-coral font-bold text-sm">
                3
              </div>
              <h2 className="font-serif text-lg sm:text-xl font-bold text-petroleo">
                Pautas y Reglas de Publicación de Avisos
              </h2>
            </div>
            <p className="text-sm text-secondary leading-relaxed">
              Para publicar un aviso en la Plataforma, el usuario declara y garantiza:
            </p>
            <ul className="space-y-2 text-sm text-secondary list-disc pl-5 leading-relaxed">
              <li>
                Proveer información verídica, exacta, actualizada y comprensible sobre los servicios
                ofrecidos.
              </li>
              <li>
                Contar con las habilitaciones, conocimientos o autorizaciones correspondientes para
                la actividad anunciada.
              </li>
              <li>
                No incluir datos de contacto de terceros sin su consentimiento previo e informado.
              </li>
              <li>
                Asociar su aviso a una comunidad escolar o zona geográfica con criterio de buena fe.
              </li>
            </ul>

            <div className="bg-coral/10 border border-coral/20 rounded-xl p-4 space-y-2 text-petroleo">
              <div className="flex items-center gap-2 font-semibold text-coral text-sm">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>Contenido estrictamente prohibido</span>
              </div>
              <ul className="text-xs text-secondary space-y-1 list-disc pl-5 leading-relaxed">
                <li>Avisos ilícitos, contrarios a la moral, discriminatorios o que promuevan violencia.</li>
                <li>Contenido que involucre o vulnere derechos de niñas, niños y adolescentes.</li>
                <li>Publicación de spam, esquemas piramidales, productos no regulados o peligrosos.</li>
                <li>Suplantación de identidad o atribución apócrifa de representación institucional de colegios.</li>
              </ul>
            </div>
          </section>

          {/* 4. Moderación y Baja de Publicaciones */}
          <section className="bg-white rounded-2xl p-6 sm:p-8 border border-petroleo/10 shadow-xs space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-petroleo/5 flex items-center justify-center text-coral font-bold text-sm">
                4
              </div>
              <h2 className="font-serif text-lg sm:text-xl font-bold text-petroleo">
                Facultad de Moderación y Baja
              </h2>
            </div>
            <p className="text-sm text-secondary leading-relaxed">
              El equipo de moderación de Comunidad de Colegios se reserva el derecho potestativo de
              revisar, aprobar, pausar, despublicar o dar de baja cualquier aviso o suspender cuentas
              de usuarios que incumplan las presentes condiciones, o cuando medien denuncias
              fundadas de la comunidad, sin necesidad de intimación previa ni derecho a
              indemnización.
            </p>
          </section>

          {/* 5. Propiedad Intelectual e Identidad Comunitaria */}
          <section className="bg-white rounded-2xl p-6 sm:p-8 border border-petroleo/10 shadow-xs space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-petroleo/5 flex items-center justify-center text-coral font-bold text-sm">
                5
              </div>
              <h2 className="font-serif text-lg sm:text-xl font-bold text-petroleo">
                Propiedad Intelectual y Nombres de Colegios
              </h2>
            </div>
            <p className="text-sm text-secondary leading-relaxed">
              Todos los derechos de propiedad intelectual, marcas, isotipos, diseños de interfaz y
              código fuente de Comunidad de Colegios y Criana son titularidad exclusiva de sus
              respectivos creadores. Queda prohibida la extracción masiva automatizada de datos
              (scraping) o el uso comercial no autorizado de las listas de avisos.
            </p>
            <p className="text-sm text-secondary leading-relaxed">
              Los nombres de colegios o instituciones educativas se mencionan en la Plataforma con
              fines puramente referenciales y organizativos para permitir la búsqueda por parte de
              las familias locales, sin que ello implique patrocinio oficial ni vinculación orgánica
              de dichas instituciones con la Plataforma.
            </p>
          </section>

          {/* 6. Gratuidad del Servicio */}
          <section className="bg-white rounded-2xl p-6 sm:p-8 border border-petroleo/10 shadow-xs space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-petroleo/5 flex items-center justify-center text-coral font-bold text-sm">
                6
              </div>
              <h2 className="font-serif text-lg sm:text-xl font-bold text-petroleo">
                Gratuidad y Disponibilidad del Servicio
              </h2>
            </div>
            <p className="text-sm text-secondary leading-relaxed">
              La consulta del catálogo y la publicación de avisos dentro de los límites comunitarios
              establecidos son actualmente de acceso libre y gratuito. Nos reservamos el derecho de
              incorporar mejoras, herramientas destacadas o funcionalidades adicionales, así como de
              suspender temporalmente el servicio por tareas técnicas de mantenimiento.
            </p>
          </section>

          {/* 7. Ley Aplicable y Jurisdicción */}
          <section className="bg-white rounded-2xl p-6 sm:p-8 border border-petroleo/10 shadow-xs space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-petroleo/5 flex items-center justify-center text-coral font-bold text-sm">
                7
              </div>
              <h2 className="font-serif text-lg sm:text-xl font-bold text-petroleo">
                Ley Aplicable y Jurisdicción
              </h2>
            </div>
            <p className="text-sm text-secondary leading-relaxed">
              Los presentes Términos y Condiciones se interpretan y rigen conforme a las leyes de la{' '}
              <strong>República Argentina</strong>. Para cualquier controversia legal derivada del
              uso de la Plataforma, las partes se someten a la competencia de los Tribunales
              Ordinarios de la Ciudad Autónoma de Buenos Aires, con renuncia expresa a cualquier otro
              fuero o jurisdicción.
            </p>
          </section>

          {/* 8. Contacto y Canal de Reportes */}
          <section className="bg-white rounded-2xl p-6 sm:p-8 border border-petroleo/10 shadow-xs space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-petroleo/5 flex items-center justify-center text-coral font-bold text-sm">
                8
              </div>
              <h2 className="font-serif text-lg sm:text-xl font-bold text-petroleo">
                Canal de Dudas, Reportes o Denuncias
              </h2>
            </div>
            <p className="text-sm text-secondary leading-relaxed">
              Si detectás algún aviso inapropiado, datos erróneos o deseás formular una consulta
              legal o comunitaria, podés contactarte de inmediato con nuestro equipo escribiendo a{' '}
              <a
                href="mailto:contacto@criana.com.ar"
                className="text-coral underline font-semibold hover:text-petroleo"
              >
                contacto@criana.com.ar
              </a>
              .
            </p>
          </section>

          {/* Banner de Contacto */}
          <div className="bg-gradient-to-r from-petroleo to-petroleo-light text-white rounded-2xl p-6 sm:p-8 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="space-y-1 text-center sm:text-left">
              <h3 className="font-serif font-bold text-lg text-white">
                Comunidad de Colegios • Criana
              </h3>
              <p className="text-xs sm:text-sm text-white/80">
                Construimos una red segura y confiable para todas las familias escolares.
              </p>
            </div>
            <a
              href="mailto:contacto@criana.com.ar"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-coral hover:bg-coral-light text-white text-xs font-display font-semibold uppercase tracking-wider transition-all shadow-sm"
            >
              <Mail className="w-4 h-4" />
              <span>contacto@criana.com.ar</span>
            </a>
          </div>
        </main>
      </div>
    </div>
  );
}
