import ContactDemo from "@/components/demo/contact-demo";
import FeaturesDemo from "@/components/demo/features-demo";
import { Footer } from "@/components/demo/footer";
import { HeaderDemo } from "@/components/demo/header-demo";
import JornadaDemo from "@/components/demo/jornada-demo";
import LogoCloudDemo from "@/components/demo/logo-cloud-demo";
import Alcance from "@/components/sections/alcance";
import ComoFunciona from "@/components/sections/como-funciona";
import Preguntas from "@/components/sections/preguntas";
import QueCambia from "@/components/sections/que-cambia";
import TuSucursal from "@/components/sections/tu-sucursal";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col overflow-x-hidden bg-background text-foreground">
      <HeaderDemo />
      <main className="flex-1 pt-16 lg:pt-20">
        <JornadaDemo />
        <QueCambia />
        <ComoFunciona />
        <TuSucursal />
        <Alcance />
        <FeaturesDemo />
        <Preguntas />
        <ContactDemo />
        <LogoCloudDemo />
      </main>
      <Footer />
    </div>
  );
}
