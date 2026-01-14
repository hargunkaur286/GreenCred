import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { 
  Leaf, Shield, Link as LinkIcon, Brain, ArrowRight, 
  CheckCircle2, Building2, Users, FileCheck, Sparkles,
  TrendingUp, Globe, Lock
} from 'lucide-react';

const features = [
  {
    icon: FileCheck,
    title: 'Standardized KPIs',
    description: 'Submit ESG metrics in LMA-compliant format. Scope 1/2/3 emissions, diversity, governance and more.',
  },
  {
    icon: Shield,
    title: 'Verified by Experts',
    description: 'Third-party verifiers digitally sign off on your data with confidence scores and audit trails.',
  },
  {
    icon: LinkIcon,
    title: 'Blockchain Proof',
    description: 'Every verification is recorded on Polygon blockchain for immutable, tamper-proof evidence.',
  },
  {
    icon: Brain,
    title: 'AI Validation',
    description: 'ML models detect anomalies and validate data consistency before submission.',
  },
];

const userTypes = [
  {
    icon: Building2,
    title: 'Borrowers',
    description: 'Submit ESG data once, share verified passports with all lenders.',
    link: '/borrower',
    cta: 'Submit KPIs',
  },
  {
    icon: Shield,
    title: 'Verifiers',
    description: 'Review and digitally sign ESG metrics with blockchain attestation.',
    link: '/verifier',
    cta: 'Verify Data',
  },
  {
    icon: Users,
    title: 'Lenders',
    description: 'Access verified ESG profiles for confident SLL structuring.',
    link: '/lender',
    cta: 'View Portfolios',
  },
];

const stats = [
  { value: '$450B+', label: 'Sustainability-Linked Loans Issued (2023)' },
  { value: '60%', label: 'Time Saved vs Traditional Verification' },
  { value: '100%', label: 'LMA SLL Principles Aligned' },
];

export default function Index() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      {/* Hero Section */}
      <section className="relative pt-24 pb-20 md:pt-32 md:pb-28 overflow-hidden">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-background to-background" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-primary/10 rounded-full blur-3xl opacity-30" />
        
        <div className="container relative mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto text-center">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 bg-primary/10 rounded-full px-4 py-2 mb-6 animate-fade-in">
              <Sparkles className="h-4 w-4 text-accent" />
              <span className="text-sm font-medium">LMA SLL Principles 2025 Compliant</span>
            </div>

            {/* Headline */}
            <h1 className="font-heading text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight mb-6 animate-slide-up">
              ESG Data Passport for{' '}
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary to-emerald">
                Sustainable Lending
              </span>
            </h1>

            {/* Subheadline */}
            <p className="text-xl md:text-2xl text-muted-foreground mb-8 max-w-2xl mx-auto animate-slide-up" style={{ animationDelay: '0.1s' }}>
              One upload. One verification. Infinite reuse.
              <br />
              <span className="text-foreground">Trust ESG data with confidence.</span>
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center animate-slide-up" style={{ animationDelay: '0.2s' }}>
              <Button asChild variant="hero" size="xl">
                <Link to="/borrower">
                  Get Started
                  <ArrowRight className="h-5 w-5 ml-2" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="xl">
                  <Link to="/passport/demo">
                  View Demo Passport
                </Link>
              </Button>
            </div>

            {/* Trust indicators */}
            <div className="mt-12 flex flex-wrap items-center justify-center gap-8 text-sm text-muted-foreground animate-fade-in" style={{ animationDelay: '0.3s' }}>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-verified" />
                <span>Built on LMA Standards</span>
              </div>
              <div className="flex items-center gap-2">
                <Lock className="h-4 w-4 text-verified" />
                <span>Blockchain Verified</span>
              </div>
              <div className="flex items-center gap-2">
                <Globe className="h-4 w-4 text-verified" />
                <span>EU CSRD Ready</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-12 bg-primary text-primary-foreground">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            {stats.map((stat, i) => (
              <div key={i}>
                <p className="text-4xl md:text-5xl font-heading font-bold mb-2">{stat.value}</p>
                <p className="text-primary-foreground/70">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 md:py-28">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="font-heading text-3xl md:text-4xl font-bold mb-4">
              Why GreenCred?
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              We solve the biggest bottlenecks in sustainability-linked lending: 
              data inconsistency, costly verification, and lack of comparability.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, i) => (
              <div 
                key={i}
                className="group p-6 bg-card rounded-2xl border border-border hover:border-primary/30 hover:shadow-lg transition-all duration-300"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary mb-4 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                  <feature.icon className="h-6 w-6" />
                </div>
                <h3 className="font-heading font-semibold text-lg mb-2">{feature.title}</h3>
                <p className="text-muted-foreground">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* User Types Section */}
      <section className="py-20 md:py-28 bg-muted/30">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="font-heading text-3xl md:text-4xl font-bold mb-4">
              Built for Every Stakeholder
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Whether you're submitting, verifying, or reviewing ESG data — 
              GreenCred streamlines your workflow.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {userTypes.map((user, i) => (
              <div 
                key={i}
                className="relative overflow-hidden p-8 bg-card rounded-2xl border border-border hover:border-primary/30 transition-all group"
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -translate-y-1/2 translate-x-1/2 group-hover:bg-primary/10 transition-colors" />
                <div className="relative">
                  <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary text-primary-foreground mb-6">
                    <user.icon className="h-7 w-7" />
                  </div>
                  <h3 className="font-heading font-semibold text-xl mb-3">{user.title}</h3>
                  <p className="text-muted-foreground mb-6">{user.description}</p>
                  <Button asChild variant="outline" className="group-hover:bg-primary group-hover:text-primary-foreground group-hover:border-primary transition-colors">
                    <Link to={user.link}>
                      {user.cta}
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Link>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Value Proposition Section */}
      <section className="py-20 md:py-28">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div>
                <h2 className="font-heading text-3xl md:text-4xl font-bold mb-6">
                  The Problem We Solve
                </h2>
                <div className="space-y-4 text-muted-foreground">
                  <p>
                    Today's sustainability-linked loans are slowed by <strong className="text-foreground">inconsistent ESG data</strong>, 
                    high-cost repetitive verification, and fragmented reporting formats.
                  </p>
                  <p>
                    Borrowers spend weeks gathering the same data for every lender. 
                    Verifiers duplicate effort across deals. 
                    Lenders struggle to compare ESG performance.
                  </p>
                </div>
              </div>
              <div className="bg-primary/5 rounded-2xl p-8 border border-primary/20">
                <h3 className="font-heading font-semibold text-xl mb-6 flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  The GreenCred Solution
                </h3>
                <ul className="space-y-4">
                  {[
                    'Borrowers submit ESG data once in standardized format',
                    'Third-party verifiers sign off with digital attestation',
                    'Blockchain records create tamper-proof audit trail',
                    'Lenders access verified passports instantly',
                    'ML validation catches anomalies automatically',
                  ].map((item, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <CheckCircle2 className="h-5 w-5 text-verified shrink-0 mt-0.5" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 md:py-28 bg-primary text-primary-foreground relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMiIvPjwvZz48L2c+PC9zdmc+')] opacity-50" />
        <div className="container relative mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-foreground/10 mx-auto mb-6">
            <Leaf className="h-8 w-8" />
          </div>
          <h2 className="font-heading text-3xl md:text-5xl font-bold mb-6">
            Ready to Transform ESG Lending?
          </h2>
          <p className="text-xl text-primary-foreground/80 mb-8 max-w-2xl mx-auto">
            Join the future of sustainable finance. Create your first ESG Passport 
            and share it with lenders worldwide.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild variant="gold" size="xl">
              <Link to="/borrower">
                Create ESG Passport
                <ArrowRight className="h-5 w-5 ml-2" />
              </Link>
            </Button>
            <Button asChild variant="heroOutline" size="xl">
                <Link to="/passport/demo">
                View Demo
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
