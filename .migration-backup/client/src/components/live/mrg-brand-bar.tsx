import { Link } from "wouter";

export function MRGBrandBar() {
  return <div className="mrg-legacy-brandbar">
    <Link href="/" className="mrg-legacy-brand" aria-label="Newsmaker MRG · overview">
      <img src="/newsmaker-logo-white.png" alt="Newsmaker" />
      <span><strong>NEWSMAKER</strong><small>MRG · MARKET CONTEXT & RISK LITERACY</small></span>
    </Link>
    <span className="mrg-brand-bar-note">INFORMATION · EDUCATION · NO ORDERS</span>
  </div>;
}
