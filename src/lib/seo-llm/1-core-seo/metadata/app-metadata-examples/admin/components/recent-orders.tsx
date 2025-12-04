import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

const recentOrders = [
  {
    id: '1',
    customer: 'Olivia Martin',
    email: 'olivia.martin@email.com',
    product: 'Business Cards',
    amount: '$299.00',
  },
  {
    id: '2',
    customer: 'Jackson Lee',
    email: 'jackson.lee@email.com',
    product: 'Flyers',
    amount: '$450.00',
  },
  {
    id: '3',
    customer: 'Isabella Nguyen',
    email: 'isabella.nguyen@email.com',
    product: 'Posters',
    amount: '$350.00',
  },
  {
    id: '4',
    customer: 'William Kim',
    email: 'will@email.com',
    product: 'Banners',
    amount: '$999.00',
  },
  {
    id: '5',
    customer: 'Sofia Davis',
    email: 'sofia.davis@email.com',
    product: 'T-Shirts',
    amount: '$1,299.00',
  },
]

export function RecentOrders() {
  return (
    <div className="space-y-8">
      {recentOrders.map((order) => (
        <div key={order.id} className="flex items-center">
          <Avatar className="h-9 w-9">
            <AvatarImage alt="Avatar" src={`/avatars/${order.id}.png`} />
            <AvatarFallback>
              {order.customer
                .split(' ')
                .map((n) => n[0])
                .join('')}
            </AvatarFallback>
          </Avatar>
          <div className="ml-4 space-y-1">
            <p className="text-sm font-medium leading-none">{order.customer}</p>
            <p className="text-sm text-muted-foreground">{order.product}</p>
          </div>
          <div className="ml-auto font-medium">{order.amount}</div>
        </div>
      ))}
    </div>
  )
}
