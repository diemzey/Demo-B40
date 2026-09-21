import { LogoCloud } from "@/components/ui/logo-cloud-2";

export default function LogoCloudDemo() {
  return (
    <div className="w-full px-4 py-16 md:py-24">
      <section className="relative mx-auto grid max-w-3xl">
        <h2 className="mb-6 text-center font-medium text-lg text-muted-foreground tracking-tight md:text-2xl">
          Empresas mexicanas con las que{" "}
          <span className="font-semibold text-primary">colaboramos</span>.
        </h2>

        <LogoCloud />
      </section>
    </div>
  );
}
