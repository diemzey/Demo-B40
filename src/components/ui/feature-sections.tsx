import { ArrowUpRight } from "lucide-react"

import { cn } from "@/lib/utils"

export interface FeatureItem {
  image: string
  width: number
  height: number
  title: string
  description: string
  alt?: string
}

export interface FeatureSectionProps {
  title: string
  description: string
  features: FeatureItem[]
  className?: string
}

export function FeatureSection({
  title,
  description,
  features,
  className,
}: FeatureSectionProps) {
  return (
    <section className={cn("w-full py-16", className)}>
      <div className="mx-auto mb-12 max-w-2xl text-center">
        <h2 className="text-3xl font-semibold text-foreground">{title}</h2>
        <p className="mt-2 text-sm text-muted-foreground">{description}</p>
      </div>
      <div className="flex flex-wrap items-start justify-center gap-10">
        {features.map((feature) => (
          <div
            key={feature.title}
            className="max-w-80 transition duration-300 hover:-translate-y-0.5"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={feature.image}
              alt={feature.alt ?? feature.title}
              width={feature.width}
              height={feature.height}
              loading="lazy"
              decoding="async"
              className="aspect-[3/2] w-full rounded-xl object-cover"
            />
            <h3 className="mt-4 text-base font-semibold text-foreground">
              {feature.title}
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {feature.description}
            </p>
          </div>
        ))}
      </div>
    </section>
  )
}

export interface ShowcaseImage {
  image: string
  width: number
  height: number
  alt: string
}

export interface FeatureShowcaseProps {
  intro: string
  showcase: ShowcaseImage
  side: ShowcaseImage
  title: string
  description: string
  linkLabel: string
  href: string
  className?: string
}

export function FeatureShowcase({
  intro,
  showcase,
  side,
  title,
  description,
  linkLabel,
  href,
  className,
}: FeatureShowcaseProps) {
  return (
    <section className={cn("relative mx-auto max-w-5xl px-4", className)}>
      <div
        aria-hidden="true"
        className="absolute -top-10 -left-20 -z-50 size-[400px] rounded-full bg-amber-500/20 blur-3xl"
      />
      <p className="max-w-3xl text-left text-lg text-foreground">{intro}</p>
      <div className="mt-8 grid grid-cols-1 gap-10 md:grid-cols-3">
        <div className="md:col-span-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={showcase.image}
            alt={showcase.alt}
            width={showcase.width}
            height={showcase.height}
            loading="lazy"
            decoding="async"
            className="h-auto w-full rounded-xl object-cover"
          />
        </div>
        <div className="md:col-span-1">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={side.image}
            alt={side.alt}
            width={side.width}
            height={side.height}
            loading="lazy"
            decoding="async"
            className="h-auto w-full rounded-xl object-cover transition duration-300 hover:-translate-y-0.5"
          />
          <h3 className="mt-6 text-2xl/7.5 font-medium text-foreground">
            {title}
          </h3>
          <p className="mt-2 text-muted-foreground">{description}</p>
          <a
            href={href}
            className="group mt-4 flex items-center gap-2 text-amber-500 transition hover:text-amber-400"
          >
            {linkLabel}
            <ArrowUpRight className="size-5 transition duration-300 group-hover:translate-x-0.5" />
          </a>
        </div>
      </div>
    </section>
  )
}
