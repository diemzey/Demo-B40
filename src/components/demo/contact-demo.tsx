import { ContactCard } from "@/components/ui/contact-card";
import { MailIcon, MapPinIcon, VideoIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

// Contenido tomado de https://aivena.ai/jornada40#contacto
export default function ContactDemo() {
  return (
    <section
      id="contacto"
      className="relative flex w-full items-center justify-center px-4 py-16"
    >
      <div className="mx-auto w-full max-w-5xl">
        <ContactCard
          title={
            <>
              <span className="mb-4 block font-mono text-[10px] font-normal uppercase tracking-[0.14em] text-muted-foreground">
                Empieza por una sucursal
              </span>
              Una semana de tu sucursal, con el tope de 2027 encima.
            </>
          }
          description="Veinte minutos por videollamada: te mandamos el formato de los archivos y en la llamada ves el diagnóstico de tu semana, no una presentación. Si la plantilla no alcanza, te lo decimos ahí mismo con la cifra exacta."
          contactInfo={[
            {
              icon: VideoIcon,
              label: "Videollamada",
              value: "20 min con tu semana real",
            },
            {
              icon: MailIcon,
              label: "Correo",
              value: "contacto@aivena.ai",
            },
            {
              icon: MapPinIcon,
              label: "Oficina",
              value: "AIvena Inc. · CDMX",
              className: "col-span-2 lg:col-span-1",
            },
          ]}
        >
          <form className="w-full space-y-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="contact-name">Nombre</Label>
              <Input id="contact-name" name="nombre" type="text" autoComplete="name" />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="contact-company">Empresa</Label>
              <Input id="contact-company" name="empresa" type="text" autoComplete="organization" />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="contact-email">Correo de trabajo</Label>
              <Input id="contact-email" name="correo" type="email" autoComplete="email" />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="contact-branches">Sucursales</Label>
              <Input id="contact-branches" name="sucursales" type="number" min={1} defaultValue={1} />
            </div>
            {/* Honeypot antispam: oculto para personas, visible para bots. */}
            <div className="absolute -left-[9999px] h-px w-px overflow-hidden" aria-hidden="true">
              <label htmlFor="contact-puesto">Puesto</label>
              <input id="contact-puesto" name="puesto" type="text" tabIndex={-1} autoComplete="off" />
            </div>
            <Button className="w-full bg-yellow-400 font-semibold text-neutral-950 hover:bg-yellow-300" type="button">
              Agendar diagnóstico de una sucursal
            </Button>
            <p className="text-muted-foreground text-xs">
              Usamos tus datos solo para contactarte. No compartimos nada con
              terceros.
            </p>
          </form>
        </ContactCard>
      </div>
    </section>
  );
}
