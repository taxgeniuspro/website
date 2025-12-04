import { redirect } from 'next/navigation'
import { validateRequest } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import { Plus, Edit, Trash2, Eye, EyeOff } from 'lucide-react'

export default async function MenusPage() {
  const { user } = await validateRequest()

  if (!user || user.role !== 'ADMIN') {
    redirect('/admin/login')
  }

  const menus = await prisma.menu.findMany({
    include: {
      _count: {
        select: {
          items: true,
          sections: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">Menu Management</h1>
          <p className="text-muted-foreground mt-2">
            Manage your website navigation menus, mega menus, and sections
          </p>
        </div>
        <Link href="/admin/menus/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Create Menu
          </Button>
        </Link>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {menus.map((menu) => (
          <Card key={menu.id}>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    {menu.name}
                    {menu.isActive ? (
                      <Eye className="h-4 w-4 text-green-500" />
                    ) : (
                      <EyeOff className="h-4 w-4 text-gray-400" />
                    )}
                  </CardTitle>
                  <CardDescription className="mt-1">
                    <Badge variant="outline">{menu.type}</Badge>
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {menu.description && (
                <p className="text-sm text-muted-foreground mb-4">
                  {menu.description}
                </p>
              )}

              <div className="flex gap-4 mb-4 text-sm">
                <div>
                  <span className="font-semibold">{menu._count.items}</span>
                  <span className="text-muted-foreground ml-1">Items</span>
                </div>
                <div>
                  <span className="font-semibold">{menu._count.sections}</span>
                  <span className="text-muted-foreground ml-1">Sections</span>
                </div>
              </div>

              <div className="flex gap-2">
                <Link href={`/admin/menus/${menu.id}`} className="flex-1">
                  <Button variant="default" className="w-full">
                    <Edit className="mr-2 h-4 w-4" />
                    Edit
                  </Button>
                </Link>
                <Button variant="outline" size="icon">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}

        {menus.length === 0 && (
          <Card className="col-span-full">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <p className="text-muted-foreground mb-4">
                No menus created yet. Create your first menu to get started.
              </p>
              <Link href="/admin/menus/new">
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Your First Menu
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
