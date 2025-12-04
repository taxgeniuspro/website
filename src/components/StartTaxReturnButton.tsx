'use client';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Calendar, FileText, ChevronDown } from 'lucide-react';
import Link from 'next/link';

interface StartTaxReturnButtonProps {
  variant?: 'default' | 'professional' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg';
  className?: string;
  showIcon?: boolean;
}

export function StartTaxReturnButton({
  variant = 'professional',
  size = 'default',
  className = '',
  showIcon = true,
}: StartTaxReturnButtonProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant={variant} size={size} className={className}>
          Get Started
          {showIcon && <ChevronDown className="ml-2 w-4 h-4" />}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72">
        <DropdownMenuItem asChild className="cursor-pointer py-4">
          <Link href="/book-appointment" className="flex items-start gap-3">
            <div className="rounded-lg bg-green-100 dark:bg-green-900/30 p-2">
              <Calendar className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
            <div className="flex-1">
              <div className="font-semibold mb-1">Book Appointment</div>
              <div className="text-sm text-muted-foreground">
                Schedule a consultation with a tax expert
              </div>
            </div>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild className="cursor-pointer py-4">
          <Link href="/start-filing/form" className="flex items-start gap-3">
            <div className="rounded-lg bg-primary/10 p-2">
              <FileText className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1">
              <div className="font-semibold mb-1">Fill Out Tax Form</div>
              <div className="text-sm text-muted-foreground">
                Start your tax return online right now
              </div>
            </div>
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
