'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Mail,
  MessageSquare,
  Plus,
  Search,
  Filter,
  MoreHorizontal,
  Send,
  Pause,
  Play,
  Trash2,
  Copy,
  BarChart3,
  Eye,
  Edit,
} from 'lucide-react'

interface Campaign {
  id: string
  name: string
  type: 'EMAIL' | 'SMS' | 'PUSH'
  status: 'DRAFT' | 'SCHEDULED' | 'SENDING' | 'SENT' | 'PAUSED' | 'CANCELLED'
  subject?: string
  segmentId?: string
  scheduledAt?: string
  sentAt?: string
  createdAt: string
  segment?: {
    id: string
    name: string
    count: number
  }
  _count?: {
    sends: number
  }
}

const STATUS_COLORS = {
  DRAFT: 'bg-gray-100 text-gray-800',
  SCHEDULED: 'bg-blue-100 text-blue-800',
  SENDING: 'bg-yellow-100 text-yellow-800',
  SENT: 'bg-green-100 text-green-800',
  PAUSED: 'bg-orange-100 text-orange-800',
  CANCELLED: 'bg-red-100 text-red-800',
}

const TYPE_ICONS = {
  EMAIL: Mail,
  SMS: MessageSquare,
  PUSH: Mail,
}

export default function CampaignsPage() {
  const router = useRouter()
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [segments, setSegments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [newCampaign, setNewCampaign] = useState({
    name: '',
    type: 'EMAIL' as const,
    subject: '',
    previewText: '',
    segmentId: '',
    content: { type: 'html', html: '' },
  })

  useEffect(() => {
    fetchCampaigns()
    fetchSegments()
  }, [])

  const fetchCampaigns = async () => {
    try {
      const response = await fetch('/api/marketing/campaigns')
      if (response.ok) {
        const data = await response.json()
        setCampaigns(data.campaigns || [])
      }
    } catch (error) {
    } finally {
      setLoading(false)
    }
  }

  const fetchSegments = async () => {
    try {
      const response = await fetch('/api/marketing/segments')
      if (response.ok) {
        const data = await response.json()
        setSegments(data)
      }
    } catch (error) {}
  }

  const handleCreateCampaign = async () => {
    try {
      const response = await fetch('/api/marketing/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newCampaign),
      })

      if (response.ok) {
        const campaign = await response.json()
        setCampaigns((prev) => [campaign, ...prev])
        setShowCreateDialog(false)
        setNewCampaign({
          name: '',
          type: 'EMAIL',
          subject: '',
          previewText: '',
          segmentId: '',
          content: { type: 'html', html: '' },
        })

        // Navigate to email builder if it's an email campaign
        if (campaign.type === 'EMAIL') {
          router.push(`/admin/marketing/email-builder?campaignId=${campaign.id}`)
        }
      }
    } catch (error) {}
  }

  const handleSendCampaign = async (campaignId: string) => {
    try {
      const response = await fetch(`/api/marketing/campaigns/${campaignId}/send`, {
        method: 'POST',
      })

      if (response.ok) {
        fetchCampaigns() // Refresh the list
      }
    } catch (error) {}
  }

  const handleDeleteCampaign = async (campaignId: string) => {
    if (!confirm('Are you sure you want to delete this campaign?')) return

    try {
      const response = await fetch(`/api/marketing/campaigns/${campaignId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        setCampaigns((prev) => prev.filter((c) => c.id !== campaignId))
      }
    } catch (error) {}
  }

  const filteredCampaigns = campaigns.filter((campaign) => {
    const matchesSearch =
      campaign.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      campaign.subject?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === 'all' || campaign.status === statusFilter
    const matchesType = typeFilter === 'all' || campaign.type === typeFilter

    return matchesSearch && matchesStatus && matchesType
  })

  if (loading) {
    return <div className="p-6">Loading campaigns...</div>
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Email Campaigns</h1>
          <p className="text-gray-600 mt-2">Create and manage your marketing campaigns</p>
        </div>

        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Create Campaign
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Create New Campaign</DialogTitle>
              <DialogDescription>
                Set up the basic details for your marketing campaign
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div>
                <Label>Campaign Name</Label>
                <Input
                  placeholder="Enter campaign name"
                  value={newCampaign.name}
                  onChange={(e) => setNewCampaign((prev) => ({ ...prev, name: e.target.value }))}
                />
              </div>

              <div>
                <Label>Campaign Type</Label>
                <Select
                  value={newCampaign.type}
                  onValueChange={(value) =>
                    setNewCampaign((prev) => ({ ...prev, type: value as any }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="EMAIL">Email</SelectItem>
                    <SelectItem value="SMS">SMS</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {newCampaign.type === 'EMAIL' && (
                <>
                  <div>
                    <Label>Subject Line</Label>
                    <Input
                      placeholder="Email subject"
                      value={newCampaign.subject}
                      onChange={(e) =>
                        setNewCampaign((prev) => ({ ...prev, subject: e.target.value }))
                      }
                    />
                  </div>

                  <div>
                    <Label>Preview Text</Label>
                    <Input
                      placeholder="This appears in the inbox preview"
                      value={newCampaign.previewText}
                      onChange={(e) =>
                        setNewCampaign((prev) => ({ ...prev, previewText: e.target.value }))
                      }
                    />
                  </div>
                </>
              )}

              <div>
                <Label>Target Segment (Optional)</Label>
                <Select
                  value={newCampaign.segmentId}
                  onValueChange={(value) =>
                    setNewCampaign((prev) => ({ ...prev, segmentId: value === 'all' ? '' : value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All customers" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All customers</SelectItem>
                    {segments.map((segment) => (
                      <SelectItem key={segment.id} value={segment.id}>
                        {segment.name} ({segment.count} customers)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex gap-2 pt-4">
                <Button className="flex-1" onClick={handleCreateCampaign}>
                  Create Campaign
                </Button>
                <Button
                  className="flex-1"
                  variant="outline"
                  onClick={() => setShowCreateDialog(false)}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex gap-4 items-center">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                className="pl-10"
                placeholder="Search campaigns..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="DRAFT">Draft</SelectItem>
                <SelectItem value="SCHEDULED">Scheduled</SelectItem>
                <SelectItem value="SENDING">Sending</SelectItem>
                <SelectItem value="SENT">Sent</SelectItem>
                <SelectItem value="PAUSED">Paused</SelectItem>
                <SelectItem value="CANCELLED">Cancelled</SelectItem>
              </SelectContent>
            </Select>

            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="EMAIL">Email</SelectItem>
                <SelectItem value="SMS">SMS</SelectItem>
                <SelectItem value="PUSH">Push</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Campaigns Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Campaign</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Segment</TableHead>
                <TableHead>Recipients</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCampaigns.length === 0 ? (
                <TableRow>
                  <TableCell className="text-center py-8 text-gray-500" colSpan={7}>
                    No campaigns found
                  </TableCell>
                </TableRow>
              ) : (
                filteredCampaigns.map((campaign) => {
                  const TypeIcon = TYPE_ICONS[campaign.type]

                  return (
                    <TableRow key={campaign.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{campaign.name}</div>
                          {campaign.subject && (
                            <div className="text-sm text-gray-500">{campaign.subject}</div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <TypeIcon className="w-4 h-4" />
                          {campaign.type}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={STATUS_COLORS[campaign.status]}>{campaign.status}</Badge>
                      </TableCell>
                      <TableCell>
                        {campaign.segment ? (
                          <div>
                            <div className="font-medium">{campaign.segment.name}</div>
                            <div className="text-sm text-gray-500">
                              {campaign.segment.count} customers
                            </div>
                          </div>
                        ) : (
                          <span className="text-gray-500">All customers</span>
                        )}
                      </TableCell>
                      <TableCell>{campaign._count?.sends || 0}</TableCell>
                      <TableCell>{new Date(campaign.createdAt).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button className="h-8 w-8 p-0" variant="ghost">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() =>
                                router.push(`/admin/marketing/campaigns/${campaign.id}`)
                              }
                            >
                              <Eye className="mr-2 h-4 w-4" />
                              View Details
                            </DropdownMenuItem>

                            {campaign.type === 'EMAIL' && (
                              <DropdownMenuItem
                                onClick={() =>
                                  router.push(
                                    `/admin/marketing/email-builder?campaignId=${campaign.id}`
                                  )
                                }
                              >
                                <Edit className="mr-2 h-4 w-4" />
                                Edit Content
                              </DropdownMenuItem>
                            )}

                            <DropdownMenuItem
                              onClick={() =>
                                router.push(`/admin/marketing/campaigns/${campaign.id}/analytics`)
                              }
                            >
                              <BarChart3 className="mr-2 h-4 w-4" />
                              Analytics
                            </DropdownMenuItem>

                            {campaign.status === 'DRAFT' && (
                              <DropdownMenuItem onClick={() => handleSendCampaign(campaign.id)}>
                                <Send className="mr-2 h-4 w-4" />
                                Send Now
                              </DropdownMenuItem>
                            )}

                            <DropdownMenuItem onClick={() => handleDeleteCampaign(campaign.id)}>
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
