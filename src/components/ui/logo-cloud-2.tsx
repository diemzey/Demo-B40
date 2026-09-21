import { PlusIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type Logo = {
  src: string;
  alt: string;
  width?: number;
  height?: number;
};

type LogoCloudProps = React.ComponentProps<"div">;

export function LogoCloud({ className, ...props }: LogoCloudProps) {
  return (
    <div
      className={cn(
        "relative grid grid-cols-2 border-x md:grid-cols-4",
        className
      )}
      {...props}
    >
      <div className="-translate-x-1/2 -top-px pointer-events-none absolute left-1/2 w-screen border-t" />

      <LogoCard
        className="relative border-r border-b bg-secondary dark:bg-secondary/30"
        logo={{ src: "/logos/bimbo.svg", alt: "Bimbo", width: 43, height: 20 }}
      >
        <PlusIcon
          className="-right-[12.5px] -bottom-[12.5px] absolute z-10 size-6"
          strokeWidth={1}
        />
      </LogoCard>

      <LogoCard
        className="border-b md:border-r"
        logo={{ src: "/logos/cemex.svg", alt: "CEMEX", width: 73, height: 20 }}
      />

      <LogoCard
        className="relative border-r border-b md:bg-secondary dark:md:bg-secondary/30"
        logo={{ src: "/logos/telcel.svg", alt: "Telcel", width: 71, height: 20 }}
      >
        <PlusIcon
          className="-right-[12.5px] -bottom-[12.5px] absolute z-10 size-6"
          strokeWidth={1}
        />
        <PlusIcon
          className="-bottom-[12.5px] -left-[12.5px] absolute z-10 hidden size-6 md:block"
          strokeWidth={1}
        />
      </LogoCard>

      <LogoCard
        className="relative border-b bg-secondary md:bg-background dark:bg-secondary/30 md:dark:bg-background"
        logo={{ src: "/logos/oxxo.svg", alt: "OXXO", width: 39, height: 20 }}
      />

      <LogoCard
        className="relative border-r border-b bg-secondary md:border-b-0 md:bg-background dark:bg-secondary/30 md:dark:bg-background"
        logo={{ src: "/logos/aeromexico.svg", alt: "Aeroméxico", width: 181, height: 20 }}
      >
        <PlusIcon
          className="-right-[12.5px] -bottom-[12.5px] md:-left-[12.5px] absolute z-10 size-6 md:hidden"
          strokeWidth={1}
        />
      </LogoCard>

      <LogoCard
        className="border-b bg-background md:border-r md:border-b-0 md:bg-secondary dark:md:bg-secondary/30"
        logo={{ src: "/logos/grupo-mexico.svg", alt: "Grupo México", width: 104, height: 20 }}
      />

      <LogoCard
        className="border-r"
        logo={{ src: "/logos/kavak.svg", alt: "Kavak", width: 76, height: 20 }}
      />

      <LogoCard
        className="bg-secondary dark:bg-secondary/30"
        logo={{ src: "/logos/bitso.svg", alt: "Bitso", width: 73, height: 20 }}
      />

      <div className="-translate-x-1/2 -bottom-px pointer-events-none absolute left-1/2 w-screen border-b" />
    </div>
  );
}

type LogoCardProps = React.ComponentProps<"div"> & {
  logo: Logo;
};

function LogoCard({ logo, className, children, ...props }: LogoCardProps) {
  return (
    <div
      className={cn(
        "flex items-center justify-center bg-background px-4 py-8 md:p-8",
        className
      )}
      {...props}
    >
      {/* Optimized brand SVGs served from /public with intrinsic sizes to avoid layout shift. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        alt={logo.alt}
        className="pointer-events-none h-4 w-auto max-w-full select-none md:h-5 dark:grayscale dark:invert"
        decoding="async"
        height={logo.height}
        loading="lazy"
        src={logo.src}
        width={logo.width}
      />
      {children}
    </div>
  );
}
