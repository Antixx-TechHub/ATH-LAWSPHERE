"use client";

import Link from "next/link";
import { ArrowLeft, Scale, Shield, Users, Sparkles } from "lucide-react";
import { Button } from "../../components/ui/button";

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
          <div className="bg-primary-50 dark:bg-primary-900/20 rounded-xl p-8">
            <div className="flex items-center gap-3 mb-4">
              <Scale className="h-8 w-8 text-primary-600" />
              <h2 className="text-2xl font-semibold text-neutral-900 dark:text-white">
                Our Mission
              </h2>
            </div>
            <p className="text-neutral-700 dark:text-neutral-300 leading-relaxed">
              LawSphere is dedicated to democratizing legal knowledge through cutting-edge AI technology. 
              We believe that every legal professional deserves access to powerful tools that enhance their 
              practice, streamline research, and provide intelligent insights into complex legal matters.
            </p>
          </div>
        </section>

        {/* Features Section */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold text-neutral-900 dark:text-white mb-6">
            What Sets Us Apart
          </h2>
          <div className="grid gap-6 md:grid-cols-2">
            <div className="bg-white dark:bg-neutral-800 rounded-xl p-6 shadow-sm border border-neutral-200 dark:border-neutral-700">
              <Sparkles className="h-6 w-6 text-accent-600 mb-3" />
              <h3 className="text-lg font-medium text-neutral-900 dark:text-white mb-2">
                AI-Powered Research
              </h3>
              <p className="text-neutral-600 dark:text-neutral-400 text-sm">
                Advanced natural language processing for intelligent case law research and legal document analysis.
              </p>
            </div>
            <div className="bg-white dark:bg-neutral-800 rounded-xl p-6 shadow-sm border border-neutral-200 dark:border-neutral-700">
              <Shield className="h-6 w-6 text-accent-600 mb-3" />
              <h3 className="text-lg font-medium text-neutral-900 dark:text-white mb-2">
                Privacy First
              </h3>
              <p className="text-neutral-600 dark:text-neutral-400 text-sm">
                Your data stays yours. We employ state-of-the-art encryption and never share your information.
              </p>
            </div>
            <div className="bg-white dark:bg-neutral-800 rounded-xl p-6 shadow-sm border border-neutral-200 dark:border-neutral-700">
              <Users className="h-6 w-6 text-accent-600 mb-3" />
              <h3 className="text-lg font-medium text-neutral-900 dark:text-white mb-2">
                Built for Professionals
              </h3>
              <p className="text-neutral-600 dark:text-neutral-400 text-sm">
                Designed in collaboration with legal experts to meet the real needs of modern legal practice.
              </p>
            </div>
            <div className="bg-white dark:bg-neutral-800 rounded-xl p-6 shadow-sm border border-neutral-200 dark:border-neutral-700">
              <Scale className="h-6 w-6 text-accent-600 mb-3" />
              <h3 className="text-lg font-medium text-neutral-900 dark:text-white mb-2">
                Indian Law Focus
              </h3>
              <p className="text-neutral-600 dark:text-neutral-400 text-sm">
                Specialized knowledge base covering Indian legal codes, case law, and regulatory frameworks.
              </p>
            </div>
          </div>
        </section>

        {/* Contact Section */}
        <section className="text-center">
          <p className="text-neutral-600 dark:text-neutral-400 mb-4">
            Have questions? We would love to hear from you.
          </p>
          <Link href="/contact">
            <Button>Contact Us</Button>
          </Link>
        </section>
      </div>
    </div>
  );
}
