import { Palette, Cpu, ShoppingCart, Network } from "lucide-react";

// Product type registry for the Auto Builder — exact copy from the
// lead-growth-forge package. Each product type has its own focused pipeline.
export const BUILD_PRODUCT_TYPES = {
  marketing_site: {
    value: "marketing_site",
    label: "Marketing Website",
    description: "Premium multi-page website with custom design system, SEO/AEO optimization, and lead capture. The existing pipeline.",
    icon: Palette,
    pipeline: "demo",
    deliverable: "Deployed marketing website",
  },
  web_app: {
    value: "web_app",
    label: "Web App / SaaS",
    description: "Multi-page application with authentication, dashboards, database, and user accounts. Full deployable codebase.",
    icon: Cpu,
    pipeline: "web_app",
    deliverable: "Deployable React + backend codebase",
  },
  ecommerce: {
    value: "ecommerce",
    label: "E-Commerce / Storefront",
    description: "Online store with product catalog, shopping cart, checkout, and payment processing. Full deployable codebase.",
    icon: ShoppingCart,
    pipeline: "ecommerce",
    deliverable: "Deployable storefront with payments",
  },
  platform: {
    value: "platform",
    label: "Platform / Marketplace",
    description: "Multi-sided platform with user roles, listings, interactions, and marketplace dynamics. Full deployable codebase.",
    icon: Network,
    pipeline: "platform",
    deliverable: "Deployable platform codebase",
  },
};

export const DEFAULT_PRODUCT_TYPE = "marketing_site";

export function getProductType(value) {
  return BUILD_PRODUCT_TYPES[value] || BUILD_PRODUCT_TYPES[DEFAULT_PRODUCT_TYPE];
}

export const PRODUCT_TYPE_OPTIONS = Object.values(BUILD_PRODUCT_TYPES);