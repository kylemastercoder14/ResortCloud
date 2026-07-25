export type FaqItem = {
  question: string;
  answer: string;
};

export type FaqCategory = {
  category: string;
  items: FaqItem[];
};

export type AddOn = {
  key: string;
  name: string;
  description: string;
  price: number;
  priceNote: string;
  icon: string; // lucide icon name or emoji for now
  badge?: string;
};

export type PlanKey = "free_trial" | "starter" | "growth" | "enterprise";
export type FeatureValue = boolean | "limited" | "preview" | string;

export type PricingFeature = {
  label: string;
  category?: string;
  highlight?: boolean;
  values: Record<PlanKey, FeatureValue>;
};

export type PricingPlan = {
  key: PlanKey;
  name: string;
  badge?: string;
  price: number;
  yearlyPrice?: number;
  isFree?: boolean;
  includes?: string; // "Everything in Starter, plus:"
  description: string;
  cta: string;
  featured?: boolean;
};