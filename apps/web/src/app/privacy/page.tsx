"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function PrivacyPage() {
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
        <div className="mb-12">
          <h1 className="text-4xl font-bold text-neutral-900 dark:text-white mb-4">
            Privacy Policy
          </h1>
          <p className="text-neutral-600 dark:text-neutral-400">
            Last updated: January 4, 2026
          </p>
        </div>

        {/* Content */}
        <div className="prose prose-neutral dark:prose-invert max-w-none">
          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-neutral-900 dark:text-white mb-4">
              1. Introduction
            </h2>
            <p className="text-neutral-600 dark:text-neutral-400 leading-relaxed">
              LawSphere (&quot;we,&quot; &quot;our,&quot; or &quot;us&quot;) is committed to protecting your privacy. 
              This Privacy Policy explains how we collect, use, disclose, and safeguard your 
              information when you use our AI-powered legal assistance platform.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-neutral-900 dark:text-white mb-4">
              2. Information We Collect
            </h2>
            <ul className="list-disc pl-6 text-neutral-600 dark:text-neutral-400 space-y-2">
              <li>Account information (email, name) when you register</li>
              <li>Documents and files you upload for analysis</li>
              <li>Chat conversations and queries</li>
              <li>Usage data and analytics</li>
              <li>Device and browser information</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-neutral-900 dark:text-white mb-4">
              3. How We Use Your Information
            </h2>
            <ul className="list-disc pl-6 text-neutral-600 dark:text-neutral-400 space-y-2">
              <li>To provide and improve our AI legal assistance services</li>
              <li>To process and analyze documents you submit</li>
              <li>To respond to your queries and provide support</li>
              <li>To maintain and improve our platform</li>
              <li>To comply with legal obligations</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-neutral-900 dark:text-white mb-4">
              4. Data Security
            </h2>
            <p className="text-neutral-600 dark:text-neutral-400 leading-relaxed">
              We implement industry-standard security measures to protect your data, including:
            </p>
            <ul className="list-disc pl-6 text-neutral-600 dark:text-neutral-400 space-y-2 mt-4">
              <li>Encryption in transit and at rest</li>
              <li>Trust-aware routing for sensitive information</li>
              <li>Regular security audits</li>
              <li>Access controls and authentication</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-neutral-900 dark:text-white mb-4">
              5. Data Retention
            </h2>
            <p className="text-neutral-600 dark:text-neutral-400 leading-relaxed">
              We retain your data only as long as necessary to provide our services and comply 
              with legal requirements. You can request deletion of your data at any time.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-neutral-900 dark:text-white mb-4">
              6. Third-Party Services
            </h2>
            <p className="text-neutral-600 dark:text-neutral-400 leading-relaxed">
              We may use third-party AI services to process your requests. When doing so, 
              we ensure these providers meet our security and privacy standards. Our 
              trust-aware routing system helps determine the appropriate processing pathway 
              based on data sensitivity.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-neutral-900 dark:text-white mb-4">
              7. Your Rights
            </h2>
            <p className="text-neutral-600 dark:text-neutral-400 leading-relaxed">
              You have the right to:
            </p>
            <ul className="list-disc pl-6 text-neutral-600 dark:text-neutral-400 space-y-2 mt-4">
              <li>Access your personal data</li>
              <li>Correct inaccurate data</li>
              <li>Request deletion of your data</li>
              <li>Export your data</li>
              <li>Opt out of certain data processing</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-neutral-900 dark:text-white mb-4">
              8. Contact Us
            </h2>
            <p className="text-neutral-600 dark:text-neutral-400 leading-relaxed">
              If you have questions about this Privacy Policy or our data practices, 
              please contact us at{" "}
              <a 
                href="mailto:privacy@antixxtechhub.com" 
                className="text-primary-600 hover:underline"
              >
                privacy@antixxtechhub.com
              </a>
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-neutral-900 dark:text-white mb-4">
              9. Changes to This Policy
            </h2>
            <p className="text-neutral-600 dark:text-neutral-400 leading-relaxed">
              We may update this Privacy Policy from time to time. We will notify you 
              of any changes by posting the new Privacy Policy on this page and updating 
              the &quot;Last updated&quot; date.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
