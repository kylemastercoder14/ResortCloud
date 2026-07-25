import {
  Building2,
  Check,
  CreditCard,
  Globe2,
  HelpCircle,
  MapPin,
  Phone,
} from "lucide-react";

export const onboardingSteps = [
  {
    title: "Property basics",
    description: "Tell us what guests will book",
    icon: Building2,
  },
  {
    title: "Location",
    description: "Add address and local area",
    icon: MapPin,
  },
  {
    title: "Contact",
    description: "Set public contact details",
    icon: Phone,
  },
  {
    title: "Billing profile",
    description: "Confirm billing information",
    icon: CreditCard,
  },
  {
    title: "Review",
    description: "Confirm and open workspace",
    icon: Check,
  },
] as const;

export const propertyTypes = [
  "Private resort",
  "Beach resort",
  "Villa",
  "Farm resort",
  "Hotel",
  "Event venue",
] as const;

export const supportLinks = [
  {
    label: "Contact us",
    href: "/help-center",
    icon: HelpCircle,
  },
  {
    label: "Public site setup",
    href: "/tenant/foundation/website",
    icon: Globe2,
  },
] as const;
