import { ContactCard } from "@/components/ui/contact-card";
import { MailIcon, PhoneIcon, MapPinIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export default function ContactDemo() {
  return (
    <section id="contacto" className="relative flex w-full items-center justify-center px-4 py-16">
      <div className="mx-auto w-full max-w-5xl">
        <ContactCard
          title="Get in touch"
          description="If you have any questions regarding our Services or need help, please fill out the form here. We do our best to respond within 1 business day."
          contactInfo={[
            {
              icon: MailIcon,
              label: "Email",
              value: "hola@example.com",
            },
            {
              icon: PhoneIcon,
              label: "Phone",
              value: "+52 55 1234 5678",
            },
            {
              icon: MapPinIcon,
              label: "Address",
              value: "Ciudad de México, México",
              className: "col-span-2",
            },
          ]}
        >
          <form className="w-full space-y-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="contact-name">Name</Label>
              <Input id="contact-name" name="name" type="text" />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="contact-email">Email</Label>
              <Input id="contact-email" name="email" type="email" />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="contact-phone">Phone</Label>
              <Input id="contact-phone" name="phone" type="tel" />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="contact-message">Message</Label>
              <Textarea id="contact-message" name="message" />
            </div>
            <Button className="w-full" type="button">
              Submit
            </Button>
          </form>
        </ContactCard>
      </div>
    </section>
  );
}
