import { ContactCard } from "@/components/ui/contact-card";
import { Mail, MapPin, Clock } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

const DESCRIPCION =
  "Veinte minutos por videollamada. Te mandamos antes el formato de los archivos y en la llamada ves el diagnóstico de tu semana, no una presentación." +
  " " +
  "Si la plantilla no alcanza, te lo decimos ahí mismo con la cifra exacta. Es la misma honestidad que vas a encontrar en el producto.";

export default function ContactDemo() {
  return (
    <section id="contacto" className="scroll-mt-24 py-16 md:py-24">
      <div className="container mx-auto max-w-6xl px-4">
        <p className="mb-6 font-mono text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
          Empieza por una sucursal
        </p>
        <ContactCard
          className="rounded-xl"
          title="Una semana de tu sucursal, con el tope de 2027 encima."
          description={DESCRIPCION}
          contactInfo={[
            {
              icon: Mail,
              label: "Correo",
              value: "contacto@aivena.ai",
            },
            {
              icon: MapPin,
              label: "Sede",
              value: "AIvena Inc. · Ciudad de México",
            },
            {
              icon: Clock,
              label: "Duración",
              value: "20 minutos por videollamada",
              className: "col-span-2",
            },
          ]}
        >
          <form className="w-full space-y-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="contact-nombre">Nombre</Label>
              <Input
                id="contact-nombre"
                name="nombre"
                type="text"
                autoComplete="name"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="contact-empresa">Empresa</Label>
              <Input
                id="contact-empresa"
                name="empresa"
                type="text"
                autoComplete="organization"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="contact-correo">Correo de trabajo</Label>
              <Input
                id="contact-correo"
                name="correo"
                type="email"
                autoComplete="email"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="contact-sucursales">Sucursales</Label>
              <Input
                id="contact-sucursales"
                name="sucursales"
                type="number"
                min={1}
                defaultValue={1}
                inputMode="numeric"
                className="tabular-nums"
              />
            </div>
            {/* Honeypot: los humanos no lo ven ni lo llenan. */}
            <div className="sr-only" aria-hidden="true">
              <Label htmlFor="contact-puesto">Puesto</Label>
              <Input
                id="contact-puesto"
                name="puesto"
                type="text"
                tabIndex={-1}
                autoComplete="off"
                className="sr-only"
              />
            </div>
            <Button
              type="button"
              className="w-full bg-ambar text-neutral-950 hover:bg-ambar/90 h-11 px-6"
            >
              Agendar diagnóstico de una sucursal
            </Button>
            <p className="text-xs text-muted-foreground">
              Usamos tus datos solo para contactarte. No compartimos nada con
              terceros.
            </p>
          </form>
        </ContactCard>
      </div>
    </section>
  );
}
