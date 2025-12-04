'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Calculator,
  DollarSign,
  Users,
  FileText,
  TrendingUp,
  ArrowRight,
  Phone,
  CheckCircle,
  Info,
  AlertCircle,
  PieChart,
  Percent,
  Shield,
} from 'lucide-react';
import Link from 'next/link';
import { Header } from '@/components/header';
import {
  calculateFederalTax,
  formatCurrency,
  formatPercentage,
  FilingStatus,
  TaxCalculationResult,
} from '@/lib/tax-data/tax-calculator';

export default function TaxCalculatorPage() {
  // Form state
  const [taxYear, setTaxYear] = useState<2024 | 2025>(2024);
  const [filingStatus, setFilingStatus] = useState<FilingStatus>('single');
  const [wages, setWages] = useState<string>('');
  const [otherIncome, setOtherIncome] = useState<string>('');
  const [adjustments, setAdjustments] = useState<string>('');
  const [itemizedDeductions, setItemizedDeductions] = useState<string>('');
  const [dependents, setDependents] = useState<string>('0');
  const [withholding, setWithholding] = useState<string>('');

  // Results state
  const [results, setResults] = useState<TaxCalculationResult | null>(null);
  const [showResults, setShowResults] = useState(false);

  const handleCalculate = (e: React.FormEvent) => {
    e.preventDefault();

    const calculationParams = {
      taxYear,
      filingStatus,
      wages: parseFloat(wages) || 0,
      otherIncome: parseFloat(otherIncome) || 0,
      adjustments: parseFloat(adjustments) || 0,
      itemizedDeductions: itemizedDeductions ? parseFloat(itemizedDeductions) : undefined,
      dependents: parseInt(dependents) || 0,
      withholding: parseFloat(withholding) || 0,
    };

    const calculatedResults = calculateFederalTax(calculationParams);
    setResults(calculatedResults);
    setShowResults(true);

    // Scroll to results
    setTimeout(() => {
      document.getElementById('results')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

  const handleReset = () => {
    setWages('');
    setOtherIncome('');
    setAdjustments('');
    setItemizedDeductions('');
    setDependents('0');
    setWithholding('');
    setResults(null);
    setShowResults(false);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Hero Section */}
      <section className="relative py-16 lg:py-20 overflow-hidden bg-background">
        <div className="container mx-auto px-4 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center max-w-4xl mx-auto"
          >
            <Badge className="mb-4 bg-primary/10 text-primary border-primary/20 text-base px-4 py-2">
              <Calculator className="w-4 h-4 mr-2" />
              Free Federal Tax Calculator
            </Badge>
            <h1 className="text-4xl lg:text-6xl font-bold text-foreground mb-6">
              Calculate Your Federal <span className="text-primary">Tax Estimate</span>
            </h1>
            <p className="text-xl text-muted-foreground mb-8 max-w-3xl mx-auto leading-relaxed">
              Get an instant estimate of your federal income tax, refund amount, and tax credits.
              100% free calculator based on official IRS tax brackets.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Calculator Section */}
      <section className="py-16 bg-background">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="grid lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
            {/* Left Side - Input Form */}
            <div className="lg:col-span-2">
              <Card className="border-2 shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-2xl">
                    <Calculator className="w-6 h-6 text-primary" />
                    Tax Calculator
                  </CardTitle>
                  <CardDescription>
                    Enter your tax information below to calculate your estimated federal tax
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleCalculate} className="space-y-6">
                    {/* Tax Year */}
                    <div className="space-y-2">
                      <Label htmlFor="taxYear">Tax Year</Label>
                      <Select
                        value={taxYear.toString()}
                        onValueChange={(value) => setTaxYear(parseInt(value) as 2024 | 2025)}
                      >
                        <SelectTrigger id="taxYear">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="2024">2024</SelectItem>
                          <SelectItem value="2025">2025</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Filing Status */}
                    <div className="space-y-2">
                      <Label htmlFor="filingStatus">Filing Status</Label>
                      <Select
                        value={filingStatus}
                        onValueChange={(value) => setFilingStatus(value as FilingStatus)}
                      >
                        <SelectTrigger id="filingStatus">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="single">Single</SelectItem>
                          <SelectItem value="marriedJoint">Married Filing Jointly</SelectItem>
                          <SelectItem value="marriedSeparate">Married Filing Separately</SelectItem>
                          <SelectItem value="headOfHousehold">Head of Household</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Income Section */}
                    <div className="space-y-4 pt-4 border-t">
                      <h3 className="font-semibold flex items-center gap-2">
                        <DollarSign className="w-5 h-5 text-primary" />
                        Income
                      </h3>

                      <div className="space-y-2">
                        <Label htmlFor="wages">Wages, Salaries, Tips (W-2 Income)</Label>
                        <Input
                          id="wages"
                          type="number"
                          placeholder="0"
                          value={wages}
                          onChange={(e) => setWages(e.target.value)}
                          min="0"
                          step="1"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="otherIncome">
                          Other Income (Interest, Dividends, Capital Gains)
                        </Label>
                        <Input
                          id="otherIncome"
                          type="number"
                          placeholder="0"
                          value={otherIncome}
                          onChange={(e) => setOtherIncome(e.target.value)}
                          min="0"
                          step="1"
                        />
                      </div>
                    </div>

                    {/* Deductions & Adjustments */}
                    <div className="space-y-4 pt-4 border-t">
                      <h3 className="font-semibold flex items-center gap-2">
                        <FileText className="w-5 h-5 text-primary" />
                        Deductions & Adjustments
                      </h3>

                      <div className="space-y-2">
                        <Label htmlFor="adjustments">
                          Adjustments to Income (IRA, Student Loan Interest, etc.)
                        </Label>
                        <Input
                          id="adjustments"
                          type="number"
                          placeholder="0"
                          value={adjustments}
                          onChange={(e) => setAdjustments(e.target.value)}
                          min="0"
                          step="1"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="itemizedDeductions">
                          Itemized Deductions (Optional - leave blank for standard)
                        </Label>
                        <Input
                          id="itemizedDeductions"
                          type="number"
                          placeholder="Leave blank to use standard deduction"
                          value={itemizedDeductions}
                          onChange={(e) => setItemizedDeductions(e.target.value)}
                          min="0"
                          step="1"
                        />
                        <p className="text-xs text-muted-foreground">
                          Standard deduction will be used if not specified or if larger
                        </p>
                      </div>
                    </div>

                    {/* Dependents & Credits */}
                    <div className="space-y-4 pt-4 border-t">
                      <h3 className="font-semibold flex items-center gap-2">
                        <Users className="w-5 h-5 text-primary" />
                        Dependents & Credits
                      </h3>

                      <div className="space-y-2">
                        <Label htmlFor="dependents">Number of Qualifying Children (Under 17)</Label>
                        <Input
                          id="dependents"
                          type="number"
                          placeholder="0"
                          value={dependents}
                          onChange={(e) => setDependents(e.target.value)}
                          min="0"
                          step="1"
                        />
                      </div>
                    </div>

                    {/* Withholding */}
                    <div className="space-y-4 pt-4 border-t">
                      <h3 className="font-semibold flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-primary" />
                        Tax Withholding
                      </h3>

                      <div className="space-y-2">
                        <Label htmlFor="withholding">
                          Federal Tax Already Withheld (From W-2 Box 2)
                        </Label>
                        <Input
                          id="withholding"
                          type="number"
                          placeholder="0"
                          value={withholding}
                          onChange={(e) => setWithholding(e.target.value)}
                          min="0"
                          step="1"
                        />
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-4 pt-6">
                      <Button type="submit" size="lg" className="flex-1">
                        <Calculator className="w-5 h-5 mr-2" />
                        Calculate My Taxes
                      </Button>
                      <Button type="button" size="lg" variant="outline" onClick={handleReset}>
                        Reset
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </div>

            {/* Right Side - Info & Help */}
            <div className="space-y-6">
              <Card className="border-primary/20 bg-primary/5">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Info className="w-5 h-5 text-primary" />
                    How to Use
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                    <p>Enter your income from all sources (W-2, interest, etc.)</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                    <p>Add any adjustments like IRA contributions</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                    <p>Enter qualifying children for tax credits</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                    <p>Add withholding to see refund or amount owed</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Shield className="w-5 h-5 text-primary" />
                    Need Professional Help?
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Get your taxes done by a certified tax professional. We guarantee 100% accuracy
                    and maximum refund.
                  </p>
                  <div className="space-y-2">
                    <Button className="w-full" variant="outline" asChild>
                      <Link href="/contact">
                        <Phone className="w-4 h-4 mr-2" />
                        Talk to a Tax Pro
                      </Link>
                    </Button>
                    <Button className="w-full" asChild>
                      <Link href="/start-filing">
                        Start Your Return
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Results Section */}
      {showResults && results && (
        <section id="results" className="py-16 bg-muted/50">
          <div className="container mx-auto px-4 lg:px-8">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="max-w-7xl mx-auto"
            >
              <div className="text-center mb-12">
                <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-4">
                  Your Tax Calculation Results
                </h2>
                <p className="text-lg text-muted-foreground">
                  Based on {taxYear} federal tax rates and your filing status
                </p>
              </div>

              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                {/* Total Tax */}
                <Card className="text-center border-2">
                  <CardHeader>
                    <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-2">
                      <DollarSign className="w-8 h-8 text-primary" />
                    </div>
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Total Tax Liability
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold text-foreground">
                      {formatCurrency(results.totalTaxLiability)}
                    </p>
                  </CardContent>
                </Card>

                {/* Effective Rate */}
                <Card className="text-center border-2">
                  <CardHeader>
                    <div className="w-16 h-16 bg-secondary/10 rounded-full flex items-center justify-center mx-auto mb-2">
                      <Percent className="w-8 h-8 text-secondary" />
                    </div>
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Effective Tax Rate
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold text-foreground">
                      {formatPercentage(results.effectiveRate)}
                    </p>
                  </CardContent>
                </Card>

                {/* Total Credits */}
                <Card className="text-center border-2">
                  <CardHeader>
                    <div className="w-16 h-16 bg-success/10 rounded-full flex items-center justify-center mx-auto mb-2">
                      <CheckCircle className="w-8 h-8 text-success" />
                    </div>
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Total Tax Credits
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold text-success">
                      {formatCurrency(results.totalCredits)}
                    </p>
                  </CardContent>
                </Card>

                {/* Refund or Owed */}
                <Card
                  className={`text-center border-2 ${results.refundOrOwed >= 0 ? 'border-success/50 bg-success/5' : 'border-destructive/50 bg-destructive/5'}`}
                >
                  <CardHeader>
                    <div
                      className={`w-16 h-16 ${results.refundOrOwed >= 0 ? 'bg-success/10' : 'bg-destructive/10'} rounded-full flex items-center justify-center mx-auto mb-2`}
                    >
                      <TrendingUp
                        className={`w-8 h-8 ${results.refundOrOwed >= 0 ? 'text-success' : 'text-destructive'}`}
                      />
                    </div>
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      {results.refundOrOwed >= 0 ? 'Estimated Refund' : 'Amount Owed'}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p
                      className={`text-3xl font-bold ${results.refundOrOwed >= 0 ? 'text-success' : 'text-destructive'}`}
                    >
                      {formatCurrency(Math.abs(results.refundOrOwed))}
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Detailed Breakdown */}
              <div className="grid md:grid-cols-2 gap-6">
                {/* Income Breakdown */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <PieChart className="w-5 h-5 text-primary" />
                      Income Breakdown
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between items-center pb-2 border-b">
                      <span className="text-muted-foreground">Total Income</span>
                      <span className="font-semibold">{formatCurrency(results.totalIncome)}</span>
                    </div>
                    <div className="flex justify-between items-center pb-2 border-b">
                      <span className="text-muted-foreground">Adjusted Gross Income (AGI)</span>
                      <span className="font-semibold">{formatCurrency(results.agi)}</span>
                    </div>
                    <div className="flex justify-between items-center pb-2 border-b">
                      <span className="text-muted-foreground">Total Deductions</span>
                      <span className="font-semibold">
                        {formatCurrency(results.totalDeductions)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center pt-2">
                      <span className="font-semibold">Taxable Income</span>
                      <span className="font-bold text-primary">
                        {formatCurrency(results.taxableIncome)}
                      </span>
                    </div>
                  </CardContent>
                </Card>

                {/* Tax Brackets */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Calculator className="w-5 h-5 text-primary" />
                      Tax by Bracket
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {results.bracketBreakdown.map((bracket, index) => (
                      <div
                        key={index}
                        className="flex justify-between items-center pb-2 border-b last:border-0"
                      >
                        <span className="text-muted-foreground">
                          {formatPercentage(bracket.rate * 100, 0)} on{' '}
                          {formatCurrency(bracket.income)}
                        </span>
                        <span className="font-semibold">{formatCurrency(bracket.tax)}</span>
                      </div>
                    ))}
                    <div className="flex justify-between items-center pt-2">
                      <span className="font-semibold">Total Income Tax</span>
                      <span className="font-bold text-primary">
                        {formatCurrency(results.incomeTax)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-muted-foreground">Marginal Tax Rate</span>
                      <span className="font-semibold">
                        {formatPercentage(results.marginalRate)}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Credits Breakdown */}
              {results.totalCredits > 0 && (
                <Card className="mt-6 border-success/20 bg-success/5">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <CheckCircle className="w-5 h-5 text-success" />
                      Tax Credits Applied
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {results.childTaxCredit > 0 && (
                      <div className="flex justify-between items-center pb-2 border-b border-success/20">
                        <span className="text-muted-foreground">Child Tax Credit</span>
                        <span className="font-semibold text-success">
                          {formatCurrency(results.childTaxCredit)}
                        </span>
                      </div>
                    )}
                    {results.eitc > 0 && (
                      <div className="flex justify-between items-center pb-2 border-b border-success/20">
                        <span className="text-muted-foreground">
                          Earned Income Tax Credit (EITC)
                        </span>
                        <span className="font-semibold text-success">
                          {formatCurrency(results.eitc)}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between items-center pt-2">
                      <span className="font-semibold">Total Credits</span>
                      <span className="font-bold text-success">
                        {formatCurrency(results.totalCredits)}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              )}
            </motion.div>
          </div>
        </section>
      )}

      {/* Disclaimer Section */}
      <section className="py-12 bg-muted/30 border-y">
        <div className="container mx-auto px-4 lg:px-8">
          <Alert className="max-w-5xl mx-auto">
            <AlertCircle className="h-5 w-5" />
            <AlertTitle className="text-lg font-semibold">Important Disclaimer</AlertTitle>
            <AlertDescription className="text-base leading-relaxed mt-2">
              This calculator provides estimates based on the information you provide and current
              federal tax rates. Actual tax liability may vary based on your complete financial
              situation, additional deductions, credits, state taxes, and other factors. This tool
              should not be used for actual tax preparation or filing. For accurate tax preparation
              and to maximize your refund,{' '}
              <Link href="/contact" className="underline font-semibold">
                consult with a Tax Genius Pro certified tax professional
              </Link>
              .
            </AlertDescription>
          </Alert>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-muted">
        <div className="container mx-auto px-4 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="text-center max-w-3xl mx-auto"
          >
            <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-6">
              Ready to File Your Actual Tax Return?
            </h2>
            <p className="text-lg text-muted-foreground mb-8 leading-relaxed">
              Get professional tax preparation from certified Tax Genius Pro tax professionals. We
              guarantee 100% accuracy and maximum refund.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" className="bg-primary hover:bg-primary/90 text-lg" asChild>
                <Link href="/start-filing">
                  Start Your Return
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" className="text-lg" asChild>
                <Link href="/contact">
                  <Phone className="w-5 h-5 mr-2" />
                  Talk to a Tax Pro
                </Link>
              </Button>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
