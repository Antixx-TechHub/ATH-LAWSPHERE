"use client";

import Link from "next/link";
import { ArrowLeft, Scale, Shield, Users, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-neutral-50 to-white dark:from-neutral-950 dark:to-neutral-900">
      <div className="container mx-auto px-4 py-12 max-w-4xl">
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
            About LawSphere
          </h1>
          <p className="text-xl text-neutral-600 dark:text-neutral-400">
            AI-Powered Legal Intelligence for Modern Legal Professionals
          </p>
        </div>

        {/* Mission Section */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold text-neutral-900 dark:text-white mb-4">
            Our Mission
          </h2>
          <p className="text-neutral-600 dark:text-neutral-400 leading-relaxed">
            LawSphere is built to democratize access to legal intelligence. We combine 
            cutting-edge AI technology with deep legal expertise to help lawyers, legal 
            professionals, and businesses navigate complex legal landscapes with confidence.
          </p>
        </section>

        {/* Features Grid */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold text-neutral-900 dark:text-white mb-6">
            What We Offer
          </h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="p-6 bg-white dark:bg-neutral-800 rounded-lg border border-neutral-200 dark:border-neutral-700">
              <Scale className="h-8 w-8 text-primary-600 mb-4" />
              <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-2">
                Legal Document Analysis
              </h3>
              <p className="text-neutral-600 dark:text-neutral-400">
                Upload contracts, agreements, and legal documents for instant AI-powered analysis 
                and insights.
              </p>
            </div>
            <div className="p-6 bg-white dark:bg-neutral-800 rounded-lg border border-neutral-200 dark:border-neutral-700">
              <Shield className="h-8 w-8 text-primary-600 mb-4" />
              <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-2">
                Privacy-First Approach
              </h3>
              <p className="text-neutral-600 dark:text-neutral-400">
                Your data stays secure. We use trust-aware routing to ensure sensitive 
                information is handled appropriately.
              </p>
            </div>
            <div className="p-6 bg-white dark:bg-neutral-800 rounded-lg border border-neutral-200 dark:border-neutral-700">
              <Users className="h-8 w-8 text-primary-600 mb-4" />
              <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-2">
                Built for Legal Professionals
              </h3>
              <p className="text-neutral-600 dark:text-neutral-400">
                Designed with input from lawyers and legal experts to meet real-world 
                practice needs.
              </p>
            </div>
            <div className="p-6 bg-white dark:bg-neutral-800 rounded-lg border border-neutral-200 dark:border-neutral-700">
              <Sparkles className="h-8 w-8 text-primary-600 mb-4" />
              <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-2">
                Powered by Advanced AI
              </h3>
              <p className="text-neutral-600 dark:text-neutral-400">
                Leveraging state-of-the-art language models to provide accurate, 
                contextual legal assistance.
              </p>
            </div>
          </div>
        </section>

        {/* Company Info */}
        <section className="text-center">
          <p className="text-neutral-600 dark:text-neutral-400">
            LawSphere is a product of{" "}
            <a 
              href="https://antixxtechhub.com" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-primary-600 hover:underline"
            >
              Antixx TechHub
            </a>
          </p>
        </section>
      </div>
    </div>
  );
}
