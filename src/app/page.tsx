import ContactDemo from "@/components/demo/contact-demo";
import FeaturesDemo from "@/components/demo/features-demo";
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
        <FeaturesDemo />
        <ContactDemo />
        <LogoCloudDemo />
      </main>
      <Footer />
    </div>
  );
}
