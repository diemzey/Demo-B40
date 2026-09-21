import AlcanceDemo from "@/components/demo/alcance-demo";
import ContactDemo from "@/components/demo/contact-demo";
import FAQDemo from "@/components/demo/faq-demo";
import { Footer } from "@/components/demo/footer";
import { HeaderDemo } from "@/components/demo/header-demo";
import JornadaDemo from "@/components/demo/jornada-demo";
import LogoCloudDemo from "@/components/demo/logo-cloud-demo";
import ReduccionTimelineDemo from "@/components/demo/reduccion-timeline-demo";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col overflow-x-hidden bg-background text-foreground">
      <HeaderDemo />
      <main className="flex-1 pt-20">
        <JornadaDemo />
        <ReduccionTimelineDemo />
        <AlcanceDemo />
        <FAQDemo />
        <ContactDemo />
        <LogoCloudDemo />
      </main>
      <Footer />
    </div>
  );
}
