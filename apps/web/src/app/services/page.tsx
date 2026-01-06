"use client";

import Link from "next/link";
import { ArrowLeft, FileText, MessageSquare, Search, BookOpen, Shield, Zap } from "lucide-react";
import { Button } from "../../components/ui/button";

const services = [
  {
    icon: MessageSquare,
    title: "AI Legal Chat",
    description: "Get instant answers to legal questions with our AI-powered chat assistant. Trained on legal knowledge to provide accurate, contextual responses.",
    features: ["24/7 availability", "Multi-language support", "Context-aware responses"],
  },
  {
    icon: FileText,
    title: "Document Analysis",
    description: "Upload legal documents for comprehensive AI analysis. Extract key clauses, identify risks, and get summaries in seconds.",
    features: ["Contract review", "Risk identification", "Key clause extraction"],
  },
  {
    icon: Search,
    title: "Legal Research",
    description: "Search through legal precedents, case law, and statutes with AI-enhanced research capabilities.",
    features: ["Case law search", "Statute lookup", "Precedent analysis"],
  },
  {
    icon: BookOpen,
    title: "Document Drafting",
    description: "Generate legal document drafts with AI assistance. Templates for common agreements, contracts, and legal correspondence.",
    features: ["Template library", "Custom drafting", "Format compliance"],
  },
  {
    icon: Shield,
    title: "Privacy Protection",
    description: "Trust-aware routing ensures sensitive information is handled with appropriate security measures.",
    features: ["PII detection", "Secure processing", "Audit logging"],
  },
  {
    icon: Zap,
    title: "Fast Processing",
    description: "Get results in seconds, not hours. Our optimized AI pipeline delivers quick turnaround on all requests.",
    features: ["Real-time analysis", "Batch processing", "Priority queuing"],
  },
];

export default function ServicesPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-neutral-50 to-white dark:from-neutral-950 dark:to-neutral-900">
      <div className="container mx-auto px-4 py-12 max-w-6xl">
        {/* Back Button */}
        <Link href="/">
          <Button variant="ghost" className="mb-8">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Home
          </Button>
        </Link>

        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-neutral-900 dark:text-white mb-4">
            Our Services
          </h1>
          <p className="text-xl text-neutral-600 dark:text-neutral-400 max-w-2xl mx-auto">
            Comprehensive AI-powered legal tools designed to streamline your legal workflow
          </p>
        </div>

        {/* Services Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          {services.map((service, index) => (
            <div
              key={index}
              className="p-6 bg-white dark:bg-neutral-800 rounded-lg border border-neutral-200 dark:border-neutral-700 hover:shadow-lg transition-shadow"
            >
              <service.icon className="h-10 w-10 text-primary-600 mb-4" />
              <h3 className="text-xl font-semibold text-neutral-900 dark:text-white mb-3">
                {service.title}
              </h3>
              <p className="text-neutral-600 dark:text-neutral-400 mb-4">
                {service.description}
              </p>
              <ul className="space-y-2">
                {service.features.map((feature, i) => (
                  <li key={i} className="flex items-center text-sm text-neutral-500 dark:text-neutral-400">
                    <span className="w-1.5 h-1.5 bg-primary-600 rounded-full mr-2"></span>
                    {feature}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="text-center">
          <Link href="/dashboard">
            <Button size="lg" className="px-8">
              Get Started
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
