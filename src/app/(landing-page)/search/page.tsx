import Image from "next/image";
import Link from "next/link";
import {
  ChefHat,
  Heart,
  ShowerHead,
  SlidersHorizontal,
  Sparkles,
  Star,
  Tv,
  Waves,
  Wifi,
} from "lucide-react";

import { LeafletResortMap } from "@/app/_components/leaflet-resort-map";
import { Button } from "@/components/ui/button";

const searchResults = [
  {
    title: "Azure Tide Beach Resort",
    location: "Nasugbu, Batangas",
    image:
      "https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&w=900&q=85",
    rating: "4.96",
    reviews: "38",
    stay: "Family villa - Pool access - Breakfast",
    capacity: "2 rooms - 2 baths - 8 guests",
    price: "₱8,450",
    date: "Aug 31 - Sep 1",
    lat: 14.0731,
    lng: 120.6319,
    amenities: [Wifi, ShowerHead, ChefHat, Waves],
  },
  {
    title: "Taal Ridge Lake Suites",
    location: "Tagaytay, Cavite",
    image:
      "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=900&q=85",
    rating: "4.88",
    reviews: "19",
    stay: "Lake suite - Spa credit - Dinner",
    capacity: "1 suite - 1 bath - 5 guests",
    price: "₱6,750",
    date: "Sep 2 - Sep 3",
    lat: 14.1153,
    lng: 120.9622,
    amenities: [Wifi, ShowerHead, ChefHat, Sparkles],
  },
  {
    title: "Palm Grove Private Resort",
    location: "Dasmarinas, Cavite",
    image:
      "https://images.unsplash.com/photo-1596394516093-501ba68a0ba6?auto=format&fit=crop&w=900&q=85",
    rating: "4.97",
    reviews: "30",
    stay: "Private pool - Karaoke - Grill area",
    capacity: "3 rooms - 3 baths - 15 guests",
    price: "₱12,900",
    date: "Sep 18 - Sep 19",
    lat: 14.3294,
    lng: 120.9367,
    amenities: [Wifi, ShowerHead, ChefHat, Tv],
  },
  {
    title: "Seabreeze Family Resort",
    location: "Lian, Batangas",
    image:
      "https://images.unsplash.com/photo-1613490493576-7fde63acd811?auto=format&fit=crop&w=900&q=85",
    rating: "4.89",
    reviews: "17",
    stay: "Beachfront room - Bonfire - Breakfast",
    capacity: "2 rooms - 2 baths - 7 guests",
    price: "₱7,300",
    date: "Sep 21 - Sep 22",
    lat: 14.0392,
    lng: 120.6509,
    amenities: [Wifi, ShowerHead, ChefHat, Waves],
  },
  {
    title: "Silang Garden Pool Villas",
    location: "Silang, Cavite",
    image:
      "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=900&q=85",
    rating: "4.93",
    reviews: "27",
    stay: "Garden villa - Heated pool - Event lawn",
    capacity: "3 rooms - 3 baths - 12 guests",
    price: "₱10,500",
    date: "Sep 26 - Sep 27",
    lat: 14.2157,
    lng: 120.9714,
    amenities: [Wifi, ShowerHead, ChefHat, Tv],
  },
  {
    title: "Amadeo Farm Stay Resort",
    location: "Amadeo, Cavite",
    image:
      "https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?auto=format&fit=crop&w=900&q=85",
    rating: "4.90",
    reviews: "18",
    stay: "Farm rooms - Breakfast tray - Bonfire",
    capacity: "2 rooms - 2 baths - 8 guests",
    price: "₱5,800",
    date: "Sep 28 - Sep 29",
    lat: 14.1694,
    lng: 120.9237,
    amenities: [Wifi, ShowerHead, ChefHat, Sparkles],
  },
];

const filters = [
  "Free parking",
  "Kitchen",
  "Wifi",
  "Allows pets",
  "Air conditioning",
  "Pool",
  "TV",
  "Guest favorite",
  "Self check-in",
  "1+ beds",
];

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const where = paramValue(params.where) || "Tagaytay";
  const when = paramValue(params.when) || "Any dates";
  const guests = paramValue(params.guests) || "2 guests";

  const points = searchResults.map((result) => ({
    title: result.title,
    price: result.price.replace("₱", "P "),
    lat: result.lat,
    lng: result.lng,
  }));

  return (
    <main className="min-h-screen bg-white text-zinc-950">
      <div className="h-24 bg-zinc-950" />

      <section className="border-b border-zinc-200 bg-white lg:px-20 py-5">
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="outline" className="rounded-full">
            <SlidersHorizontal className="size-4" />
            Filters
          </Button>
          <div className="hidden h-8 w-px bg-zinc-200 sm:block" />
          {filters.map((filter) => (
            <button
              key={filter}
              type="button"
              className="rounded-full border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700 hover:border-zinc-950"
            >
              {filter}
            </button>
          ))}
        </div>
      </section>

      <section className="grid gap-8 py-10 lg:px-20 lg:grid-cols-[minmax(0,1fr)_minmax(520px,0.95fr)]">
        <div>
          <div className="grid gap-5 sm:grid-cols-[1fr_auto] sm:items-center">
            <h1 className="text-2xl font-semibold tracking-tight">
              Over 1,000 resort stays in {where}
            </h1>
            <div className="flex items-center gap-3 rounded-full px-2 py-2 text-sm font-semibold">
              <span className="grid size-9 place-items-center rounded-full bg-rose-50 text-rose-600">
                <Sparkles className="size-5" />
              </span>
              Prices include all fees
            </div>
          </div>
          <p className="mt-2 text-sm text-zinc-500">
            {when} - {guests} - direct rates from resort owners
          </p>

          <div className="mt-8 grid gap-x-8 gap-y-12 md:grid-cols-2">
            {searchResults.map((result) => (
              <SearchResultCard key={result.title} result={result} />
            ))}
          </div>
        </div>

        <aside className="sticky top-5 hidden h-[calc(100vh-3rem)] min-h-150 overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-100 shadow-sm lg:block">
          <LeafletResortMap points={points} />
        </aside>
      </section>
    </main>
  );
}

function SearchResultCard({
  result,
}: {
  result: (typeof searchResults)[number];
}) {
  return (
    <article className="group">
      <Link href={`/resorts/${getResortSlug(result.title)}`} className="block">
        <div className="relative aspect-4/3 overflow-hidden rounded-xl bg-zinc-100">
          <Image
            src={result.image}
            alt={result.title}
            fill
            sizes="(min-width: 1280px) 24vw, (min-width: 768px) 45vw, 100vw"
            className="object-cover transition duration-500 group-hover:scale-105"
          />
          <span className="absolute left-4 top-4 rounded-full bg-white px-4 py-2 text-sm font-semibold shadow-sm">
            Guest favorite
          </span>
          <button
            type="button"
            aria-label={`Save ${result.title}`}
            className="absolute right-4 top-4 grid size-11 place-items-center rounded-full bg-black/35 text-white shadow-lg backdrop-blur"
          >
            <Heart className="size-5" />
          </button>
          <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-1">
            <span className="h-1.5 w-6 rounded-full bg-white" />
            {[1, 2, 3, 4, 5].map((dot) => (
              <span key={dot} className="size-1.5 rounded-full bg-white/65" />
            ))}
          </div>
        </div>

        <div className="mt-4 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">{result.title}</h2>
            <p className="mt-1 line-clamp-1 text-base text-zinc-600">
              {result.stay}
            </p>
            <p className="mt-1 text-base text-zinc-600">{result.capacity}</p>
          </div>
          <p className="flex shrink-0 items-center gap-1 text-base">
            <Star className="size-4 fill-zinc-950 text-zinc-950" />
            <span>{result.rating}</span>
            <span className="text-zinc-500">({result.reviews})</span>
          </p>
        </div>

        <div className="mt-4 flex items-center gap-3 text-zinc-500">
          {result.amenities.map((Icon, index) => (
            <Icon key={index} className="size-4" />
          ))}
        </div>

        <p className="mt-4 text-base text-zinc-500">
          <span className="text-xl font-semibold text-zinc-950">
            {result.price}
          </span>{" "}
          for 1 night
        </p>
        <p className="mt-1 text-xs text-zinc-400">{result.date}</p>
      </Link>
    </article>
  );
}

function paramValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function getResortSlug(title: string) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
