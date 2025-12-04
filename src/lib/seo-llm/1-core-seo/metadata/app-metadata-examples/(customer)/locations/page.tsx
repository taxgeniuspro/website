'use client'

import { useState, useMemo, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  MapPin,
  Phone,
  Clock,
  Search,
  Plane,
  Building2,
  Navigation,
  Package,
  Truck,
  Info,
  Loader2,
} from 'lucide-react'
import Link from 'next/link'

// Retail locations data
const retailLocations = [
  {
    id: 'chicago-cottage',
    name: 'Chicago - Cottage Grove Ave',
    address: '4856 S Cottage Grove Ave',
    city: 'Chicago',
    state: 'IL',
    zip: '60615',
    phone: '(312) 929-3376',
    hours: {
      'Monday - Friday': '1:00pm to 9:00pm',
      'Saturday - Sunday': 'Closed',
    },
    type: 'retail',
  },
  {
    id: 'chicago-western',
    name: 'Chicago - Western Ave',
    address: '1300 N Western Ave',
    city: 'Chicago',
    state: 'IL',
    zip: '60622',
    phone: '(773) 819-7613',
    hours: {
      'Monday - Friday': '1:00pm to 9:00pm',
      'Saturday - Sunday': 'Closed',
    },
    type: 'retail',
  },
]

interface AirCargoLocation {
  id: string
  code: string
  name: string
  carrier: string
  operator?: string
  address: string
  city: string
  state: string
  zip: string
  hours: Record<string, string>
}

export default function LocationsPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedState, setSelectedState] = useState('all')
  const [activeTab, setActiveTab] = useState('retail')
  const [airCargoLocations, setAirCargoLocations] = useState<AirCargoLocation[]>([])
  const [isLoadingAirports, setIsLoadingAirports] = useState(true)

  // Fetch all airports from API
  useEffect(() => {
    const fetchAirports = async () => {
      try {
        const response = await fetch('/api/airports')
        const data = await response.json()

        if (data.success && data.airports) {
          // Transform API data to match our component format
          const transformedAirports = data.airports.map((airport: any) => ({
            id: airport.id,
            code: airport.code,
            name: airport.name,
            carrier: 'Southwest Airlines Cargo',
            operator: airport.operator || undefined,
            address: airport.address,
            city: airport.city,
            state: airport.state,
            zip: airport.zip,
            hours: airport.hours,
          }))

          setAirCargoLocations(transformedAirports)
        }
      } catch (error) {
        console.error('Failed to fetch airports:', error)
      } finally {
        setIsLoadingAirports(false)
      }
    }

    fetchAirports()
  }, [])

  // Get unique states from all locations
  const states = useMemo(() => {
    const allStates = new Set<string>()
    retailLocations.forEach((loc) => allStates.add(loc.state))
    airCargoLocations.forEach((loc) => allStates.add(loc.state))
    return Array.from(allStates).sort()
  }, [])

  // Filter locations based on search and state
  const filteredRetailLocations = useMemo(() => {
    return retailLocations.filter((location) => {
      const matchesSearch =
        searchQuery === '' ||
        location.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        location.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
        location.state.toLowerCase().includes(searchQuery.toLowerCase()) ||
        location.address.toLowerCase().includes(searchQuery.toLowerCase())

      const matchesState = selectedState === 'all' || location.state === selectedState

      return matchesSearch && matchesState
    })
  }, [searchQuery, selectedState])

  const filteredAirCargoLocations = useMemo(() => {
    return airCargoLocations.filter((location) => {
      const matchesSearch =
        searchQuery === '' ||
        location.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        location.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        location.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
        location.state.toLowerCase().includes(searchQuery.toLowerCase()) ||
        location.address.toLowerCase().includes(searchQuery.toLowerCase())

      const matchesState = selectedState === 'all' || location.state === selectedState

      return matchesSearch && matchesState
    })
  }, [searchQuery, selectedState])

  interface LocationData {
    id: string
    name: string
    address: string
    city: string
    state: string
    zip: string
    code?: string
    carrier?: string
    operator?: string
    hours: Record<string, string | undefined>
    phone?: string
    type?: string
  }

  const LocationCard = ({
    location,
    type,
  }: {
    location: LocationData
    type: 'retail' | 'cargo'
  }) => (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              {type === 'cargo' && location.code && (
                <Badge variant="secondary">{location.code}</Badge>
              )}
              {location.name}
            </CardTitle>
            {location.carrier && (
              <CardDescription className="mt-1">{location.carrier}</CardDescription>
            )}
            {location.operator && (
              <CardDescription className="text-xs">{location.operator}</CardDescription>
            )}
          </div>
          {type === 'retail' ? (
            <Building2 className="h-5 w-5 text-muted-foreground" />
          ) : (
            <Plane className="h-5 w-5 text-muted-foreground" />
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-start gap-3">
          <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
          <div className="text-sm">
            <p>{location.address}</p>
            <p>
              {location.city}, {location.state} {location.zip}
            </p>
          </div>
        </div>

        {location.phone && (
          <div className="flex items-center gap-3">
            <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
            <a className="text-sm text-primary hover:underline" href={`tel:${location.phone}`}>
              {location.phone}
            </a>
          </div>
        )}

        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="text-sm font-medium">Hours</span>
          </div>
          <div className="ml-7 space-y-1">
            {Object.entries(location.hours)
              .filter(([_, hours]) => hours !== undefined)
              .map(([day, hours]) => (
                <div key={day} className="text-sm grid grid-cols-2 gap-2">
                  <span className="text-muted-foreground">{day}:</span>
                  <span className={hours === 'Closed' ? 'text-muted-foreground' : ''}>{hours}</span>
                </div>
              ))}
          </div>
        </div>

        <div className="pt-3 flex gap-2">
          <Button className="flex-1" size="sm" variant="outline">
            <Navigation className="h-4 w-4 mr-1" />
            Get Directions
          </Button>
          {location.phone && (
            <Button asChild size="sm" variant="outline">
              <a href={`tel:${location.phone}`}>
                <Phone className="h-4 w-4" />
              </a>
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      {/* Hero Section */}
      <section className="bg-primary text-primary-foreground">
        <div className="container mx-auto px-4 py-16">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">Pickup Locations</h1>
            <p className="text-lg md:text-xl opacity-90">
              Convenient pickup options for your printing orders - retail locations and nationwide
              air cargo
            </p>
          </div>
        </div>
      </section>

      <div className="container mx-auto px-4 py-12">
        {/* Info Banner */}
        <Card className="mb-8 border-primary/20 bg-primary/5">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <Info className="h-5 w-5 text-primary mt-0.5 shrink-0" />
              <div className="space-y-2">
                <p className="font-medium">Fast & Affordable Shipping Options</p>
                <p className="text-sm text-muted-foreground">
                  Get your printing products shipped to any air cargo pickup location for as little
                  as $1 per pound. Orders can be available for pickup as early as the same day
                  printing is completed!
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Search and Filters */}
        <div className="mb-8 space-y-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                className="pl-10"
                placeholder="Search by city, state, or location name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Select value={selectedState} onValueChange={setSelectedState}>
              <SelectTrigger className="w-full md:w-[200px]">
                <SelectValue placeholder="Filter by state" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All States</SelectItem>
                {states.map((state) => (
                  <SelectItem key={state} value={state}>
                    {state}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Locations Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full max-w-md mx-auto grid-cols-2">
            <TabsTrigger className="flex items-center gap-2" value="retail">
              <Building2 className="h-4 w-4" />
              Retail Locations
            </TabsTrigger>
            <TabsTrigger className="flex items-center gap-2" value="cargo">
              <Plane className="h-4 w-4" />
              Air Cargo Pickup
            </TabsTrigger>
          </TabsList>

          <TabsContent className="mt-8" value="retail">
            {filteredRetailLocations.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <MapPin className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-lg font-medium mb-2">No retail locations found</p>
                  <p className="text-sm text-muted-foreground">
                    Try adjusting your search or filters
                  </p>
                </CardContent>
              </Card>
            ) : (
              <>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                  {filteredRetailLocations.map((location) => (
                    <LocationCard key={location.id} location={location} type="retail" />
                  ))}
                </div>
                <Card className="bg-muted/50">
                  <CardContent className="py-6 text-center">
                    <p className="text-lg font-medium mb-2">More Locations Coming Soon!</p>
                    <p className="text-sm text-muted-foreground">
                      We're expanding our retail pickup network to serve you better
                    </p>
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>

          <TabsContent className="mt-8" value="cargo">
            {isLoadingAirports ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Loader2 className="h-12 w-12 text-primary mx-auto mb-4 animate-spin" />
                  <p className="text-lg font-medium mb-2">Loading air cargo locations...</p>
                  <p className="text-sm text-muted-foreground">
                    Fetching all Southwest Cargo pickup locations
                  </p>
                </CardContent>
              </Card>
            ) : filteredAirCargoLocations.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Plane className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-lg font-medium mb-2">No air cargo locations found</p>
                  <p className="text-sm text-muted-foreground">
                    Try adjusting your search or filters
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-8">
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredAirCargoLocations.map((location) => (
                    <LocationCard key={location.id} location={location} type="cargo" />
                  ))}
                </div>

                {/* Summary banner */}
                <Card className="bg-primary/5 border-primary/20">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Info className="h-5 w-5" />
                      All {airCargoLocations.length} Southwest Airlines Cargo Locations
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-4">
                      We partner with Southwest Airlines Cargo to offer affordable air cargo pickup
                      at all {airCargoLocations.length} locations nationwide. Ship for as little as
                      $1 per pound with same-day or next-day availability!
                    </p>
                    <div className="flex gap-3">
                      <Button asChild>
                        <Link href="/quote">
                          <Package className="mr-2 h-4 w-4" />
                          Request Quote
                        </Link>
                      </Button>
                      <Button asChild variant="outline">
                        <Link href="/contact">
                          <Phone className="mr-2 h-4 w-4" />
                          Contact Us
                        </Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Corporate/Production Facility */}
        <div className="mt-12">
          <Card className="border-2 border-primary/20">
            <CardHeader className="bg-primary/5">
              <CardTitle className="text-xl flex items-center gap-2">
                <Building2 className="h-6 w-6" />
                Corporate / Production Facility
              </CardTitle>
              <CardDescription>
                Our main production facility where all orders are processed
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <MapPin className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                    <div>
                      <p className="font-medium mb-1">Address</p>
                      <p className="text-sm text-muted-foreground">
                        Gang Run Printing Corporate Office
                        <br />
                        Chicago, Illinois
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Phone className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                    <div>
                      <p className="font-medium mb-1">Contact</p>
                      <p className="text-sm text-muted-foreground">
                        Main: 1-877-GANGRUN
                        <br />
                        Email: info@gangrunprinting.com
                      </p>
                    </div>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <Clock className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                    <div>
                      <p className="font-medium mb-1">Production Hours</p>
                      <p className="text-sm text-muted-foreground">
                        Monday - Friday: 8:00 AM - 6:00 PM CST
                        <br />
                        Saturday: 9:00 AM - 2:00 PM CST
                        <br />
                        Sunday: Closed
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Truck className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                    <div>
                      <p className="font-medium mb-1">Shipping Options</p>
                      <p className="text-sm text-muted-foreground">
                        • Same-day local delivery
                        <br />
                        • Next-day air cargo
                        <br />• Standard ground shipping
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
