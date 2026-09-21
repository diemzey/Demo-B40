import { Footer } from "@/components/demo/footer";
import { HeaderDemo } from "@/components/demo/header-demo";
import LogoCloudDemo from "@/components/demo/logo-cloud-demo";
import TableServers from "@/components/demo/table-servers";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col overflow-x-hidden bg-background text-foreground">
      <HeaderDemo />
      <main className="flex-1">
        <div className="container mx-auto px-4 pt-28 pb-16">
          <section className="mb-8">
            <h1 className="text-2xl font-semibold tracking-tight">Servers</h1>
            <p className="text-muted-foreground text-sm">
              Estado actual de la infraestructura.
            </p>
          </section>
          <TableServers />
        </div>
        <LogoCloudDemo />
      </main>
      <Footer />
    </div>
  );
}
