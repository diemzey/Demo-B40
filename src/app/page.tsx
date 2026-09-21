import { HeaderDemo } from "@/components/demo/header-demo";
import TableServers from "@/components/demo/table-servers";

export default function Home() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <HeaderDemo />
      <main className="container mx-auto px-4 pt-28 pb-16">
        <section className="mb-8">
          <h1 className="text-2xl font-semibold tracking-tight">Servers</h1>
          <p className="text-muted-foreground text-sm">
            Estado actual de la infraestructura.
          </p>
        </section>
        <TableServers />
      </main>
    </div>
  );
}
