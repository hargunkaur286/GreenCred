import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Building2, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import type { Database } from '@/integrations/supabase/types';

type CompanySize = Database['public']['Enums']['company_size'];

const sectors = [
  'Technology',
  'Manufacturing',
  'Energy',
  'Financial Services',
  'Healthcare',
  'Real Estate',
  'Retail',
  'Transportation',
  'Agriculture',
  'Other',
];

const countries = [
  'United States',
  'United Kingdom',
  'Germany',
  'France',
  'Netherlands',
  'Switzerland',
  'Singapore',
  'Japan',
  'Australia',
  'Canada',
];

interface CompanyProfileFormProps {
  onSuccess: () => void;
}

export function CompanyProfileForm({ onSuccess }: CompanyProfileFormProps) {
  const { user, refetchBorrower } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    sector: '',
    country: '',
    size: 'medium' as CompanySize,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast.error('You must be logged in to create a company profile');
      return;
    }

    if (!formData.name || !formData.sector || !formData.country) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsSubmitting(true);

    try {
      const { error } = await supabase.from('borrowers').insert({
        name: formData.name,
        sector: formData.sector,
        country: formData.country,
        size: formData.size,
        user_id: user.id,
      });

      if (error) throw error;

      toast.success('Company profile created successfully');
      refetchBorrower();
      onSuccess();
    } catch (error: any) {
      console.error('Error creating company:', error);
      toast.error('Failed to create company: ' + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="glass-card max-w-xl mx-auto">
      <CardHeader className="text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary text-primary-foreground mx-auto mb-4">
          <Building2 className="h-7 w-7" />
        </div>
        <CardTitle className="text-2xl">Create Company Profile</CardTitle>
        <CardDescription>
          Set up your company profile to start submitting ESG data and generating your passport.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Company Name *</Label>
            <Input
              id="name"
              placeholder="Enter your company name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="sector">Industry Sector *</Label>
            <Select
              value={formData.sector}
              onValueChange={(value) => setFormData({ ...formData, sector: value })}
            >
              <SelectTrigger id="sector">
                <SelectValue placeholder="Select your industry" />
              </SelectTrigger>
              <SelectContent>
                {sectors.map((sector) => (
                  <SelectItem key={sector} value={sector}>
                    {sector}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="country">Country *</Label>
            <Select
              value={formData.country}
              onValueChange={(value) => setFormData({ ...formData, country: value })}
            >
              <SelectTrigger id="country">
                <SelectValue placeholder="Select your country" />
              </SelectTrigger>
              <SelectContent>
                {countries.map((country) => (
                  <SelectItem key={country} value={country}>
                    {country}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="size">Company Size *</Label>
            <Select
              value={formData.size}
              onValueChange={(value) => setFormData({ ...formData, size: value as CompanySize })}
            >
              <SelectTrigger id="size">
                <SelectValue placeholder="Select company size" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="small">Small (1-50 employees)</SelectItem>
                <SelectItem value="medium">Medium (51-500 employees)</SelectItem>
                <SelectItem value="large">Large (500+ employees)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Creating Profile...
              </>
            ) : (
              'Create Company Profile'
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
