import { PhoneCall } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";

export type FAQItem = {
  question: string;
  answer: string;
};

export type FAQProps = {
  badge?: string;
  title: string;
  description: string;
  cta?: { label: string; href?: string };
  items: FAQItem[];
  id?: string;
};

function FAQ({ badge = "FAQ", title, description, cta, items, id }: FAQProps) {
  return (
    <div id={id} className="w-full py-20 lg:py-40">
      <div className="container mx-auto px-4">
        <div className="grid lg:grid-cols-2 gap-10">
          <div className="flex gap-10 flex-col">
            <div className="flex gap-4 flex-col">
              <div>
                <Badge variant="outline">{badge}</Badge>
              </div>
              <div className="flex gap-2 flex-col">
                <h4 className="text-3xl md:text-5xl tracking-tighter max-w-xl text-left font-regular">
                  {title}
                </h4>
                <p className="text-lg max-w-xl lg:max-w-lg leading-relaxed tracking-tight text-muted-foreground text-left">
                  {description}
                </p>
              </div>
              {cta && (
                <div>
                  <Button className="gap-4" variant="outline" asChild={!!cta.href}>
                    {cta.href ? (
                      <a href={cta.href}>
                        {cta.label} <PhoneCall className="w-4 h-4" />
                      </a>
                    ) : (
                      <>
                        {cta.label} <PhoneCall className="w-4 h-4" />
                      </>
                    )}
                  </Button>
                </div>
              )}
            </div>
          </div>
          <Accordion type="single" collapsible className="w-full">
            {items.map((item, index) => (
              <AccordionItem key={item.question} value={"index-" + index}>
                <AccordionTrigger>{item.question}</AccordionTrigger>
                <AccordionContent className="text-muted-foreground leading-relaxed">
                  {item.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </div>
    </div>
  );
}

export { FAQ };
