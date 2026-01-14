import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { ProgressRing } from '@/components/shared/ProgressRing';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { useBorrowers, useSimulatePricing } from '@/hooks/useBorrowers';
import { Search, Filter, Eye, DollarSign, TrendingUp, Building2, Loader2, Calculator } from 'lucide-react';
import { Link } from 'react-router-dom';
import { VerificationStatus } from '@/types/esg';

export function BorrowerList() {
  const { borrowers, isLoading } = useBorrowers();
  const simulatePricing = useSimulatePricing();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [sectorFilter, setSectorFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [pricingDialogOpen, setPricingDialogOpen] = useState(false);
  const [selectedBorrower, setSelectedBorrower] = useState<any>(null);
  const [baseRate, setBaseRate] = useState('5.5');
  const [loanAmount, setLoanAmount] = useState('50000000');
  const [pricingResult, setPricingResult] = useState<any>(null);

  const getVerificationStatus = (borrower: any): VerificationStatus => {
    if (!borrower.esg_passport) return 'pending';
    const validUntil = new Date(borrower.esg_passport.valid_until);
    if (validUntil < new Date()) return 'expired';
    if (borrower.verified_kpi_count > 0) return 'verified';
    return 'pending';
  };

  const filteredBorrowers = borrowers.filter(borrower => {
    const matchesSearch = borrower.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         borrower.sector.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSector = sectorFilter === 'all' || borrower.sector === sectorFilter;
    const status = getVerificationStatus(borrower);
    const matchesStatus = statusFilter === 'all' || status === statusFilter;
    return matchesSearch && matchesSector && matchesStatus;
  });

  const sectors = [...new Set(borrowers.map(b => b.sector))];

  const handleSimulatePricing = async () => {
    if (!selectedBorrower) return;
    
    try {
      const result = await simulatePricing.mutateAsync({
        borrowerId: selectedBorrower.id,
        baseRate: parseFloat(baseRate),
        loanAmount: parseFloat(loanAmount),
      });
      setPricingResult(result);
    } catch (error) {
      // Error handled by mutation
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search borrowers..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={sectorFilter} onValueChange={setSectorFilter}>
          <SelectTrigger className="w-[180px]">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Sector" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Sectors</SelectItem>
            {sectors.map(sector => (
              <SelectItem key={sector} value={sector}>{sector}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="verified">Verified</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="expired">Expired</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Borrower Cards */}
      <div className="grid gap-4">
        {filteredBorrowers.map((borrower) => {
          const status = getVerificationStatus(borrower);
          const esgScore = borrower.esg_passport?.overall_score || 0;
          
          return (
            <Card key={borrower.id} className="glass-card hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex flex-col md:flex-row md:items-center gap-6">
                  {/* ESG Score Ring */}
                  <ProgressRing progress={esgScore * 100} size="sm" />

                  {/* Borrower Info */}
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h3 className="font-heading font-semibold text-lg">{borrower.name}</h3>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Building2 className="h-4 w-4" />
                          <span>{borrower.sector}</span>
                          <span>•</span>
                          <span>{borrower.country}</span>
                        </div>
                      </div>
                      <StatusBadge status={status} />
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-4">
                      <div>
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <TrendingUp className="h-3 w-3" />
                          Verified KPIs
                        </p>
                        <p className="font-semibold">
                          {borrower.verified_kpi_count} / {borrower.kpi_count}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <DollarSign className="h-3 w-3" />
                          ESG Score
                        </p>
                        <p className="font-semibold">{(esgScore * 100).toFixed(0)}%</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Last Updated</p>
                        <p className="font-medium">
                          {borrower.esg_passport 
                            ? new Date(borrower.esg_passport.generated_at).toLocaleDateString()
                            : 'N/A'
                          }
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex md:flex-col gap-2">
                    {borrower.esg_passport?.id ? (
                      <Button asChild variant="default" size="sm">
                        <Link to={`/passport/${borrower.esg_passport.id}`}>
                          <Eye className="h-4 w-4 mr-2" />
                          View Passport
                        </Link>
                      </Button>
                    ) : (
                      <Button variant="default" size="sm" disabled>
                        <Eye className="h-4 w-4 mr-2" />
                        View Passport
                      </Button>
                    )}
                    <Dialog open={pricingDialogOpen && selectedBorrower?.id === borrower.id} onOpenChange={(open) => {
                      setPricingDialogOpen(open);
                      if (!open) {
                        setSelectedBorrower(null);
                        setPricingResult(null);
                      }
                    }}>
                      <DialogTrigger asChild>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => {
                            setSelectedBorrower(borrower);
                            setPricingDialogOpen(true);
                          }}
                        >
                          <Calculator className="h-4 w-4 mr-2" />
                          Simulate Pricing
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Pricing Simulation</DialogTitle>
                          <DialogDescription>
                            Calculate ESG-adjusted interest rates for {borrower.name}
                          </DialogDescription>
                        </DialogHeader>

                        <div className="space-y-4 py-4">
                          <div className="space-y-2">
                            <Label>Base Interest Rate (%)</Label>
                            <Input
                              type="number"
                              step="0.1"
                              value={baseRate}
                              onChange={(e) => setBaseRate(e.target.value)}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Loan Amount ($)</Label>
                            <Input
                              type="number"
                              value={loanAmount}
                              onChange={(e) => setLoanAmount(e.target.value)}
                            />
                          </div>
                          
                          <Button 
                            onClick={handleSimulatePricing} 
                            className="w-full"
                            disabled={simulatePricing.isPending}
                          >
                            {simulatePricing.isPending ? (
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            ) : (
                              <Calculator className="h-4 w-4 mr-2" />
                            )}
                            Calculate
                          </Button>

                          {pricingResult && (
                            <div className="mt-4 p-4 bg-primary/5 rounded-lg space-y-3">
                              <div className="flex justify-between">
                                <span>Base Rate</span>
                                <span className="font-semibold">{pricingResult.base_rate}%</span>
                              </div>
                              <div className="flex justify-between text-verified">
                                <span>ESG Discount</span>
                                <span className="font-semibold">-{pricingResult.esg_discount_bps} bps</span>
                              </div>
                              <div className="border-t pt-2 flex justify-between text-lg">
                                <span className="font-semibold">Final Rate</span>
                                <span className="font-bold text-primary">{pricingResult.final_rate}%</span>
                              </div>
                              {pricingResult.potential_annual_savings && (
                                <div className="bg-verified/10 p-3 rounded-lg text-center">
                                  <p className="text-sm text-muted-foreground">Annual Savings</p>
                                  <p className="text-xl font-bold text-verified">
                                    ${pricingResult.potential_annual_savings.toLocaleString()}
                                  </p>
                                </div>
                              )}
                              <div className="text-xs text-muted-foreground space-y-1">
                                <p>• Score discount: {pricingResult.breakdown?.score_discount || 0} bps</p>
                                <p>• Verification bonus: {pricingResult.breakdown?.verification_bonus || 0} bps</p>
                                <p>• Blockchain bonus: {pricingResult.breakdown?.blockchain_bonus || 0} bps</p>
                              </div>
                            </div>
                          )}
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {filteredBorrowers.length === 0 && (
        <Card className="glass-card">
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              {borrowers.length === 0 
                ? 'No borrowers in the system yet' 
                : 'No borrowers match your filters'}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
