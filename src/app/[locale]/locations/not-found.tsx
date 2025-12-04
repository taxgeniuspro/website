import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';

/**
 * Custom 404 page for /locations/* routes (AC4)
 * Shows helpful message with popular city suggestions
 */
export default function LocationNotFound() {
  const popularCities = [
    { name: 'Atlanta', slug: 'atlanta' },
    { name: 'New York', slug: 'new-york' },
    { name: 'Los Angeles', slug: 'los-angeles' },
    { name: 'Chicago', slug: 'chicago' },
    { name: 'Houston', slug: 'houston' },
    { name: 'Miami', slug: 'miami' },
  ];

  return (
    <div className="container mx-auto px-4 py-16 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle className="text-3xl">Location Not Found</CardTitle>
          <CardDescription className="text-lg">
            We don&apos;t have a landing page for this city yet.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <h3 className="font-semibold mb-3">Popular Locations:</h3>
            <div className="grid grid-cols-2 gap-2">
              {popularCities.map((city) => (
                <Link
                  key={city.slug}
                  href={`/locations/${city.slug}`}
                  className="text-primary hover:underline"
                >
                  {city.name}
                </Link>
              ))}
            </div>
          </div>

          <div className="flex gap-4">
            <Button asChild>
              <Link href="/">Return Home</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/auth/signup">Get Started Anyway</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
