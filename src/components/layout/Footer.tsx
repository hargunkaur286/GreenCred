import { Leaf } from 'lucide-react';
import { Link } from 'react-router-dom';

export function Footer() {
  return (
    <footer className="bg-primary text-primary-foreground">
      <div className="container mx-auto px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-foreground/10">
                <Leaf className="h-5 w-5" />
              </div>
              <span className="font-heading text-xl font-bold">GreenCred</span>
            </div>
            <p className="text-primary-foreground/70 max-w-md">
              ESG Data Passport for Sustainable Lending. One upload. One verification. Infinite reuse.
            </p>
            <p className="mt-4 text-sm text-primary-foreground/50">
              Built on LMA's SLL Principles & ESG IDP Standards
            </p>
          </div>

          {/* Platform */}
          <div>
            <h3 className="font-heading font-semibold mb-4">Platform</h3>
            <ul className="space-y-2 text-sm text-primary-foreground/70">
              <li><Link to="/borrower" className="hover:text-primary-foreground transition-colors">Borrower Portal</Link></li>
              <li><Link to="/verifier" className="hover:text-primary-foreground transition-colors">Verifier Dashboard</Link></li>
              <li><Link to="/lender" className="hover:text-primary-foreground transition-colors">Lender View</Link></li>
              <li><Link to="/passport/demo" className="hover:text-primary-foreground transition-colors">ESG Passport</Link></li>
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h3 className="font-heading font-semibold mb-4">Resources</h3>
            <ul className="space-y-2 text-sm text-primary-foreground/70">
              <li><a href="#" className="hover:text-primary-foreground transition-colors">Documentation</a></li>
              <li><a href="#" className="hover:text-primary-foreground transition-colors">API Reference</a></li>
              <li><a href="#" className="hover:text-primary-foreground transition-colors">LMA Guidelines</a></li>
              <li><a href="#" className="hover:text-primary-foreground transition-colors">Contact</a></li>
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-primary-foreground/10 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-sm text-primary-foreground/50">
            © 2024 GreenCred. All rights reserved.
          </p>
          <div className="flex gap-6 text-sm text-primary-foreground/50">
            <a href="#" className="hover:text-primary-foreground transition-colors">Privacy</a>
            <a href="#" className="hover:text-primary-foreground transition-colors">Terms</a>
            <a href="#" className="hover:text-primary-foreground transition-colors">Security</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
