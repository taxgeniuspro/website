/**
 * Material Comparison Component
 *
 * Allows users to select and compare multiple materials side-by-side
 * Shows visual comparison charts and highlights best performers
 *
 * Part of Epic 6: Lead Tracking Dashboard Enhancement - Story 6.5
 */

'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { Trophy, TrendingUp, Loader2 } from 'lucide-react';
import { useMyTopMaterials } from '@/hooks/useMyMaterials';

interface MaterialComparisonProps {
  className?: string;
}

export function MaterialComparison({ className }: MaterialComparisonProps) {
  const [selectedMaterials, setSelectedMaterials] = useState<string[]>([]);
  const [showComparison, setShowComparison] = useState(false);

  const { data, isLoading } = useMyTopMaterials({
    limit: 30, // Get more materials for selection
    sortBy: 'returnsFiled',
    sortOrder: 'desc',
  });

  const materials = data?.materials || [];
  const selectedMaterialsData = materials.filter((m) => selectedMaterials.includes(m.id));

  const handleToggleMaterial = (materialId: string) => {
    if (selectedMaterials.includes(materialId)) {
      setSelectedMaterials(selectedMaterials.filter((id) => id !== materialId));
    } else {
      if (selectedMaterials.length < 10) {
        setSelectedMaterials([...selectedMaterials, materialId]);
      }
    }
  };

  const handleCompare = () => {
    if (selectedMaterials.length >= 2) {
      setShowComparison(true);
    }
  };

  const handleReset = () => {
    setSelectedMaterials([]);
    setShowComparison(false);
  };

  // Find winner for each metric
  const findWinner = (metric: keyof (typeof selectedMaterialsData)[0]['metrics']) => {
    if (selectedMaterialsData.length === 0) return null;
    return selectedMaterialsData.reduce((prev, current) => {
      return current.metrics[metric] > prev.metrics[metric] ? current : prev;
    });
  };

  const clicksWinner = findWinner('clicks');
  const conversionsWinner = findWinner('returnsFiled');
  const rateWinner = findWinner('conversionRate');

  // Prepare chart data
  const chartData = selectedMaterialsData.map((m) => ({
    name: m.title.length > 20 ? m.title.substring(0, 20) + '...' : m.title,
    clicks: m.metrics.clicks,
    conversions: m.metrics.returnsFiled,
    rate: m.metrics.conversionRate,
  }));

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Material Comparison</CardTitle>
          <CardDescription>Loading materials...</CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center py-8">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Material Comparison</CardTitle>
        <CardDescription>
          Select 2-10 materials to compare their performance side-by-side
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {!showComparison ? (
          <>
            {/* Material Selection */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label>Select Materials ({selectedMaterials.length}/10)</Label>
                {selectedMaterials.length > 0 && (
                  <Button variant="outline" size="sm" onClick={handleReset}>
                    Clear Selection
                  </Button>
                )}
              </div>

              <div className="border rounded-lg max-h-96 overflow-y-auto">
                <div className="divide-y">
                  {materials.map((material) => (
                    <div
                      key={material.id}
                      className="flex items-center space-x-3 p-3 hover:bg-muted/50 cursor-pointer"
                      onClick={() => handleToggleMaterial(material.id)}
                    >
                      <Checkbox
                        checked={selectedMaterials.includes(material.id)}
                        onCheckedChange={() => handleToggleMaterial(material.id)}
                        disabled={
                          !selectedMaterials.includes(material.id) && selectedMaterials.length >= 10
                        }
                      />
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{material.title}</span>
                          <Badge variant="outline" className="text-xs">
                            {formatType(material.type)}
                          </Badge>
                        </div>
                        <div className="text-xs text-muted-foreground space-x-4">
                          <span>{material.metrics.clicks} clicks</span>
                          <span>{material.metrics.returnsFiled} conversions</span>
                          <span>{material.metrics.conversionRate.toFixed(1)}% rate</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <Button
              onClick={handleCompare}
              disabled={selectedMaterials.length < 2}
              className="w-full"
              size="lg"
            >
              Compare {selectedMaterials.length} Material{selectedMaterials.length !== 1 ? 's' : ''}
            </Button>

            {selectedMaterials.length === 1 && (
              <Alert>
                <AlertDescription>Please select at least 2 materials to compare</AlertDescription>
              </Alert>
            )}
          </>
        ) : (
          <>
            {/* Comparison Results */}
            <div className="space-y-6">
              {/* Winner Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <WinnerCard
                  title="Most Clicks"
                  material={clicksWinner}
                  value={clicksWinner?.metrics.clicks.toLocaleString() || '0'}
                />
                <WinnerCard
                  title="Most Conversions"
                  material={conversionsWinner}
                  value={conversionsWinner?.metrics.returnsFiled.toLocaleString() || '0'}
                />
                <WinnerCard
                  title="Highest Rate"
                  material={rateWinner}
                  value={`${rateWinner?.metrics.conversionRate.toFixed(1) || '0'}%`}
                />
              </div>

              {/* Comparison Charts */}
              <div className="space-y-4">
                <h4 className="text-sm font-semibold">Performance Comparison</h4>

                {/* Clicks Chart */}
                <div>
                  <p className="text-xs text-muted-foreground mb-2">Total Clicks</p>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="clicks" fill="#3b82f6" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Conversions Chart */}
                <div>
                  <p className="text-xs text-muted-foreground mb-2">Conversions (Returns Filed)</p>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="conversions" fill="#10b981" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Conversion Rate Chart */}
                <div>
                  <p className="text-xs text-muted-foreground mb-2">Conversion Rate (%)</p>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="rate" fill="#f59e0b" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Detailed Comparison Table */}
              <div className="space-y-2">
                <h4 className="text-sm font-semibold">Detailed Comparison</h4>
                <div className="border rounded-lg overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Material</TableHead>
                        <TableHead className="text-right">Clicks</TableHead>
                        <TableHead className="text-right">Started</TableHead>
                        <TableHead className="text-right">Completed</TableHead>
                        <TableHead className="text-right">Filed</TableHead>
                        <TableHead className="text-right">Rate</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedMaterialsData.map((material) => (
                        <TableRow key={material.id}>
                          <TableCell className="font-medium max-w-[200px]">
                            <div className="flex flex-col">
                              <span className="truncate">{material.title}</span>
                              <span className="text-xs text-muted-foreground">
                                {formatType(material.type)}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            {material.metrics.clicks.toLocaleString()}
                            {material.id === clicksWinner?.id && (
                              <Trophy className="w-3 h-3 inline ml-1 text-yellow-500" />
                            )}
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            {material.metrics.intakeStarts.toLocaleString()}
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            {material.metrics.intakeCompletes.toLocaleString()}
                          </TableCell>
                          <TableCell className="text-right font-mono font-semibold">
                            {material.metrics.returnsFiled.toLocaleString()}
                            {material.id === conversionsWinner?.id && (
                              <Trophy className="w-3 h-3 inline ml-1 text-yellow-500" />
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <Badge
                              variant={
                                material.metrics.conversionRate > 10
                                  ? 'default'
                                  : material.metrics.conversionRate > 5
                                    ? 'secondary'
                                    : 'outline'
                              }
                            >
                              {material.metrics.conversionRate.toFixed(1)}%
                              {material.id === rateWinner?.id && (
                                <Trophy className="w-3 h-3 inline ml-1" />
                              )}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2">
                <Button variant="outline" onClick={handleReset} className="flex-1">
                  Start New Comparison
                </Button>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function WinnerCard({
  title,
  material,
  value,
}: {
  title: string;
  material: { id: string; title: string; type: string; metrics: Record<string, number> };
  value: string;
}) {
  if (!material) return null;

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Trophy className="w-4 h-4 text-yellow-500" />
            <span>{title}</span>
          </div>
          <div className="space-y-1">
            <p className="font-medium truncate">{material.title}</p>
            <p className="text-2xl font-bold">{value}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function formatType(type: string): string {
  return type
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (l) => l.toUpperCase());
}
